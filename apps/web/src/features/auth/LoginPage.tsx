import { APP_NAME } from '../../shared/config/brand';
import { Logo } from '../../shared/ui';
import { DemoCredentialsPanel } from './DemoCredentialsPanel';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-shell px-4 py-10 text-white">
      <div className="w-full max-w-sm space-y-5">
        <header className="space-y-4 text-center">
          <Logo size="lg" className="mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
            <p className="mt-2 text-sm text-white/70">
              Inicie sesión con usuario y contraseña.
            </p>
          </div>
        </header>

        <div className="rounded-xl border border-shell-border bg-white p-6 shadow-lg">
          <LoginForm />
        </div>

        <DemoCredentialsPanel />
      </div>
    </div>
  );
}
