import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpAuthRepository as repository } from '../../../src/api/http/repositories';

const identity = {
  id: 'real-user',
  name: 'Usuario',
  username: 'usuario',
  role: 'MECHANIC',
  mustChangePassword: true,
};
const profile = {
  ...identity,
  active: true,
  phone: null,
  email: null,
  createdAt: '2026-09-07',
  updatedAt: '2026-09-07',
};
function respond(body: unknown, status = 200) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
afterEach(() => vi.unstubAllGlobals());

describe('HTTP authentication contract', () => {
  it('logs in with browser credentials and the real public identity', async () => {
    const fetchMock = respond(identity);
    expect(await repository.login('usuario', ' secret ')).toEqual({ ok: true, value: identity });
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/auth/login');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ username: 'usuario', password: ' secret ' });
    expect(init.headers.get('Content-Type')).toBe('application/json');
  });
  it('restores the restricted Mechanic projection without adding contact or credentials', async () => {
    respond(identity);
    expect(await repository.getSession()).toEqual({ ok: true, value: identity });
  });
  it('treats a session 401 as signed out', async () => {
    respond({ error: { code: 'UNAUTHORIZED' } }, 401);
    expect(await repository.getSession()).toEqual({ ok: true, value: null });
  });
  it('keeps invalid login generic and preserves a profile 401', async () => {
    respond({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, 401);
    expect(await repository.login('unknown', 'secret')).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos.' },
    });
    expect(await repository.getCurrentUser()).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });
  it('maps the own profile without password or null contacts', async () => {
    respond({ ...profile, passwordHash: 'must-not-copy' });
    expect(await repository.getCurrentUser()).toEqual({
      ok: true,
      value: { ...identity, active: true, phone: undefined, email: undefined },
    });
  });
  it('maps Unicode password changes without trimming secrets or sending confirmation', async () => {
    const fetchMock = respond(profile);
    const result = await repository.updateOwnProfile({
      name: 'Usuario',
      phone: '',
      email: '',
      currentPassword: 'old secret',
      newPassword: ' 🔧🔧🔧🔧 ',
      confirmPassword: ' 🔧🔧🔧🔧 ',
    });
    expect(result.ok).toBe(true);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/auth/me');
    expect(init.method).toBe('PATCH');
    expect(init.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Usuario',
      phone: '',
      email: '',
      currentPassword: 'old secret',
      password: ' 🔧🔧🔧🔧 ',
    });
  });
  it.each([
    { newPassword: '🔧🔧🔧', currentPassword: 'old', confirmPassword: '🔧🔧🔧' },
    { newPassword: 'abcdef', currentPassword: 'old', confirmPassword: 'different' },
    { newPassword: 'abcdef', confirmPassword: 'abcdef' },
    { currentPassword: 'old' },
  ])('rejects incomplete or invalid password changes before sending: %j', async (input) => {
    const fetchMock = respond(profile);
    expect(await repository.updateOwnProfile({ name: 'Usuario', ...input })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('omits credential fields during contact-only editing', async () => {
    const fetchMock = respond(profile);
    await repository.updateOwnProfile({ name: 'Nuevo nombre', phone: '' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Nuevo nombre',
      phone: '',
    });
  });
  it('handles logout 204 with the required CSRF header', async () => {
    const fetchMock = respond(null, 204);
    expect(await repository.logout()).toEqual({ ok: true, value: undefined });
    expect(fetchMock.mock.calls[0][1].headers.get('X-Requested-With')).toBe('XMLHttpRequest');
  });
  it('submits only username and ignores recovery response data', async () => {
    const fetchMock = respond({ message: 'Generic confirmation' }, 202);
    expect(await repository.requestRecovery('usuario')).toEqual({ ok: true, value: undefined });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/recovery-requests');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'usuario' });
  });
  it.each([400, 403, 409, 429, 500])('preserves structured HTTP failure %i', async (status) => {
    const code = (
      {
        400: 'VALIDATION',
        403: 'FORBIDDEN',
        409: 'CONFLICT',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL',
      } as Record<number, string>
    )[status];
    respond(
      {
        error: {
          code,
          message: 'internal text',
          details: { reason: 'PASSWORD_CHANGE_REQUIRED' },
          errorId: 'reference',
        },
      },
      status,
    );
    expect(await repository.requestRecovery('usuario')).toMatchObject({
      ok: false,
      error: { code, errorId: 'reference', details: { reason: 'PASSWORD_CHANGE_REQUIRED' } },
    });
  });
  it('does not disguise server or connection failure as signed out', async () => {
    respond({ error: { code: 'INTERNAL', errorId: 'reference' } }, 500);
    expect(await repository.getSession()).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    expect(await repository.getSession()).toMatchObject({ ok: false, error: { code: 'NETWORK' } });
  });
  it('reports malformed responses safely and exposes the server error reference', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 200 })));
    expect(await repository.getSession()).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    respond(
      { error: { code: 'INTERNAL', errorId: 'reference', message: 'private internals' } },
      500,
    );
    expect(await repository.getSession()).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('Referencia: reference') },
    });
  });
});
