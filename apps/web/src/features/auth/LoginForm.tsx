import { useState, type FormEvent } from 'react';

import { Button, Field, Info, Input } from '../../shared/ui';
import { useAuth } from './useAuth';

export type LoginFormProps = {
  onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const normalizedUsername = username.trim();
    setUsername(normalizedUsername);

    const result = await login(normalizedUsername, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Usuario" htmlFor="username">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="Ej: admin"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </Field>

      <Field label="Contraseña" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="demo1234"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-10"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-navy-400 hover:text-navy"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      </Field>

      {error && (
        <Info tone="error" title="No se pudo iniciar sesión">
          {error}
        </Info>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
