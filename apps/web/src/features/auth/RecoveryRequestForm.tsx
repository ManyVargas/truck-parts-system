import { useState, type FormEvent } from 'react';
import { authRepository } from '../../api/repositories';
import { Button, Field, Info, Input } from '../../shared/ui';

export function RecoveryRequestForm() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authRepository.requestRecovery(username.trim());
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSubmitted(true);
    setUsername('');
  }

  if (!open)
    return (
      <Button variant="ghost" className="mt-3 w-full" onClick={() => setOpen(true)}>
        ¿Olvidó su contraseña?
      </Button>
    );
  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-navy-100 pt-4">
      {submitted ? (
        <Info tone="info" title="Solicitud recibida">
          Si la cuenta permite recuperación, la solicitud será atendida por un administrador.
          Contacte a otro administrador para verificar su identidad.
        </Info>
      ) : (
        <>
          <p className="text-sm text-navy">
            Solicite a otro administrador ayuda para recuperar su acceso.
          </p>
          {error && (
            <Info tone="error" title="No se pudo enviar">
              {error}
            </Info>
          )}
          <Field label="Usuario para recuperación" htmlFor="recovery-username">
            <Input
              id="recovery-username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Solicitar recuperación'}
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setSubmitted(false);
          setError(null);
        }}
      >
        Volver al inicio de sesión
      </Button>
    </form>
  );
}
