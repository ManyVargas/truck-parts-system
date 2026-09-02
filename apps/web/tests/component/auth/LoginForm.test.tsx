// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginForm } from '../../../src/features/auth/LoginForm';
import { createAuthValue, renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('LoginForm', () => {
  it('normalizes the username and reports a successful login', async () => {
    const user = userEvent.setup();
    const auth = createAuthValue();
    auth.user = null;
    auth.session = null;
    auth.login = vi.fn().mockResolvedValue({
      ok: true,
      value: { userId: 'U-ADMIN', createdAt: '2026-08-25T16:00:00.000Z' },
    });
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />, { auth });

    await user.type(screen.getByLabelText('Usuario'), '  ADMIN  ');
    await user.type(screen.getByLabelText('Contraseña'), 'demo1234');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(auth.login).toHaveBeenCalledWith('ADMIN', 'demo1234');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('shows repository authentication errors', async () => {
    const user = userEvent.setup();
    const auth = createAuthValue();
    auth.user = null;
    auth.session = null;
    auth.login = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' },
    });
    renderWithProviders(<LoginForm />, { auth });

    await user.type(screen.getByLabelText('Usuario'), 'admin');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Usuario o contraseña incorrectos')).toBeVisible();
  });

  it('toggles password visibility without submitting the form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    const password = screen.getByLabelText('Contraseña');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
