import '../infrastructure/config/load-env.js';

import { bootstrapAdministrator } from '../features/users/bootstrap.js';
import { UserRepository } from '../features/users/repository.js';
import { disconnectPrisma } from '../infrastructure/database/index.js';
import { runBootstrapAdmin } from './bootstrap-admin-command.js';
import { createTerminalPrompts } from './terminal-prompts.js';

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    console.error(
      'Este comando no acepta argumentos. Introduce los datos en la terminal interactiva.',
    );
    process.exitCode = 1;
    return;
  }
  let prompts: ReturnType<typeof createTerminalPrompts> | undefined;
  try {
    prompts = createTerminalPrompts();
    process.exitCode = await runBootstrapAdmin(
      {
        question: prompts.question,
        write: (message) => console.log(message),
        error: (message) => console.error(message),
      },
      {
        hasAnyUsers: () => new UserRepository().hasAnyUsers(),
        bootstrap: bootstrapAdministrator,
        disconnect: disconnectPrisma,
      },
    );
  } catch {
    console.error('No se pudo iniciar el bootstrap. Usa una terminal interactiva.');
    process.exitCode = 1;
  } finally {
    prompts?.close();
  }
}

void main();
