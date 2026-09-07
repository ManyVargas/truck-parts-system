import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import {
  PromptCancelledError,
  runBootstrapAdmin,
} from '../../../src/cli/bootstrap-admin-command.js';
import { createTerminalPrompts } from '../../../src/cli/terminal-prompts.js';
import { bootstrapAdminSchema } from '../../../src/features/users/bootstrap.js';

function fixture() {
  const answers = ['Ana', 'admin', '', '', ' AbC12 ', ' AbC12 '];
  const io = { question: vi.fn(async () => answers.shift()!), write: vi.fn(), error: vi.fn() };
  const dependencies = {
    hasAnyUsers: vi.fn(async () => false),
    bootstrap: vi.fn(async (_input: unknown) => ({ id: 'id', username: 'admin' })),
    disconnect: vi.fn(async () => {}),
  };
  return { io, dependencies };
}

describe('bootstrap CLI orchestration', () => {
  it('requests hidden password confirmation, succeeds without printing credentials and disconnects', async () => {
    const { io, dependencies } = fixture();
    expect(await runBootstrapAdmin(io, dependencies)).toBe(0);
    expect(io.question.mock.calls.slice(-2)).toEqual([
      ['Contraseña (mínimo 6 caracteres): ', true],
      ['Confirmar contraseña: ', true],
    ]);
    expect(dependencies.bootstrap).toHaveBeenCalledWith({
      name: 'Ana',
      username: 'admin',
      phone: '',
      email: '',
      password: ' AbC12 ',
    });
    expect(JSON.stringify(io.write.mock.calls)).not.toContain(' AbC12 ');
    expect(dependencies.disconnect).toHaveBeenCalledOnce();
  });

  it('rejects a populated database before requesting credentials', async () => {
    const { io, dependencies } = fixture();
    dependencies.hasAnyUsers.mockResolvedValue(true);
    expect(await runBootstrapAdmin(io, dependencies)).toBe(1);
    expect(io.question).not.toHaveBeenCalled();
    expect(dependencies.bootstrap).not.toHaveBeenCalled();
    expect(dependencies.disconnect).toHaveBeenCalledOnce();
  });

  it('rejects mismatched passwords without calling the service', async () => {
    const { io, dependencies } = fixture();
    io.question
      .mockResolvedValueOnce('Ana')
      .mockResolvedValueOnce('admin')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('secret1')
      .mockResolvedValueOnce('secret2');
    expect(await runBootstrapAdmin(io, dependencies)).toBe(1);
    expect(dependencies.bootstrap).not.toHaveBeenCalled();
    expect(dependencies.disconnect).toHaveBeenCalledOnce();
  });

  it('cancels without mutation and closes the database connection', async () => {
    const { io, dependencies } = fixture();
    io.question.mockRejectedValueOnce(new PromptCancelledError());
    expect(await runBootstrapAdmin(io, dependencies)).toBe(130);
    expect(dependencies.bootstrap).not.toHaveBeenCalled();
    expect(dependencies.disconnect).toHaveBeenCalledOnce();
  });

  it('does not print secrets from unexpected database failures', async () => {
    const { io, dependencies } = fixture();
    dependencies.bootstrap.mockRejectedValue(new Error('postgres://private-password secret-hash'));
    expect(await runBootstrapAdmin(io, dependencies)).toBe(1);
    expect(JSON.stringify(io.error.mock.calls)).not.toMatch(/private-password|secret-hash/);
    expect(dependencies.disconnect).toHaveBeenCalledOnce();
  });

  it('reports validation fields without their input values', async () => {
    const { io, dependencies } = fixture();
    const parsed = bootstrapAdminSchema.safeParse({
      name: 'Ana',
      username: 'admin',
      password: 'x',
    });
    if (parsed.success) throw new Error('Expected invalid fixture');
    dependencies.bootstrap.mockRejectedValue(parsed.error);
    expect(await runBootstrapAdmin(io, dependencies)).toBe(1);
    expect(io.error).toHaveBeenCalledWith(
      'Datos inválidos: password. Revisa los valores e inténtalo de nuevo.',
    );
  });
});

function terminalFixture() {
  const input = Object.assign(new PassThrough(), { isTTY: true, setRawMode: vi.fn() });
  const output = Object.assign(new PassThrough(), { isTTY: true });
  let captured = '';
  output.on('data', (chunk) => {
    captured += chunk.toString();
  });
  const prompts = createTerminalPrompts(
    input as unknown as NodeJS.ReadStream,
    output as unknown as NodeJS.WriteStream,
  );
  return { input, output, prompts, captured: () => captured };
}

describe('terminal password input', () => {
  it('hides typing and preserves password whitespace, then restores visible input', async () => {
    const terminal = terminalFixture();
    try {
      const secret = terminal.prompts.question('Contraseña: ', true);
      terminal.input.write(' AbC12 \r');
      expect(await secret).toBe(' AbC12 ');
      expect(terminal.captured()).toBe('Contraseña: \n');
      const visible = terminal.prompts.question('Nombre: ');
      terminal.input.write('Ana\r');
      expect(await visible).toBe('Ana');
      expect(terminal.captured()).toContain('Ana');
    } finally {
      terminal.prompts.close();
    }
  });

  it('handles Ctrl+C while a secret is being entered without echoing it', async () => {
    const terminal = terminalFixture();
    try {
      const secret = terminal.prompts.question('Contraseña: ', true);
      const rejected = expect(secret).rejects.toBeInstanceOf(PromptCancelledError);
      terminal.input.write('private\x03');
      await rejected;
      expect(terminal.captured()).not.toContain('private');
    } finally {
      terminal.prompts.close();
    }
  });

  it('rejects noninteractive input', () => {
    expect(() =>
      createTerminalPrompts(
        new PassThrough() as unknown as NodeJS.ReadStream,
        new PassThrough() as unknown as NodeJS.WriteStream,
      ),
    ).toThrow('terminal interactiva');
  });
});
