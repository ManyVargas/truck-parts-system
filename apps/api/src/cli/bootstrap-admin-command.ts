import { ZodError } from 'zod';

import type { BootstrapAdminResult } from '../features/users/bootstrap.js';
import { AppError } from '../infrastructure/errors/app-error.js';

export class PromptCancelledError extends Error {}

export type BootstrapIO = {
  question: (label: string, hidden?: boolean) => Promise<string>;
  write: (message: string) => void;
  error: (message: string) => void;
};

type Dependencies = {
  hasAnyUsers: () => Promise<boolean>;
  bootstrap: (input: unknown) => Promise<BootstrapAdminResult>;
  disconnect: () => Promise<void>;
};

// Returns a process exit code; never logs raw input, database errors or credentials.
export async function runBootstrapAdmin(
  io: BootstrapIO,
  dependencies: Dependencies,
): Promise<number> {
  let exitCode = 0;
  try {
    if (await dependencies.hasAnyUsers()) {
      throw AppError.conflict('El bootstrap requiere una base sin usuarios, incluidos inactivos.');
    }
    io.write('Crear el primer Administrator en la base configurada por DATABASE_URL.');
    const name = await io.question('Nombre: ');
    const username = await io.question('Usuario: ');
    const phone = await io.question('Teléfono (opcional): ');
    const email = await io.question('Email (opcional): ');
    const password = await io.question('Contraseña (mínimo 6 caracteres): ', true);
    const confirmation = await io.question('Confirmar contraseña: ', true);
    if (password !== confirmation) {
      throw AppError.validation('Las contraseñas no coinciden.');
    }
    await dependencies.bootstrap({ name, username, phone, email, password });
    io.write('Administrador inicial creado correctamente.');
  } catch (error) {
    exitCode = 1;
    if (error instanceof PromptCancelledError) {
      exitCode = 130;
      io.error('Operación cancelada.');
    } else if (error instanceof ZodError) {
      const fields = [...new Set(error.issues.map((issue) => issue.path.join('.') || 'datos'))];
      io.error(`Datos inválidos: ${fields.join(', ')}. Revisa los valores e inténtalo de nuevo.`);
    } else if (error instanceof AppError && ['CONFLICT', 'VALIDATION'].includes(error.code)) {
      io.error(error.message);
    } else {
      io.error('No se pudo completar el bootstrap. Revisa la conexión y las migraciones.');
    }
  } finally {
    try {
      await dependencies.disconnect();
    } catch {
      exitCode = 1;
      io.error('No se pudo cerrar la conexión con la base de datos.');
    }
  }
  return exitCode;
}
