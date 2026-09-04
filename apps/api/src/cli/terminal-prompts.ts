import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

import { PromptCancelledError } from './bootstrap-admin-command.js';

export function createTerminalPrompts(
  input: NodeJS.ReadStream = process.stdin,
  destination: NodeJS.WriteStream = process.stdout,
) {
  if (!input.isTTY || !destination.isTTY) {
    throw new Error(
      'El bootstrap requiere una terminal interactiva; no acepta contraseñas por argumentos o pipes.',
    );
  }
  let hidden = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!hidden) destination.write(chunk);
      callback();
    },
  });
  const terminal = createInterface({ input, output, terminal: true, historySize: 0 });

  return {
    async question(label: string, secret = false): Promise<string> {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      terminal.once('SIGINT', cancel);
      terminal.once('close', cancel);
      if (secret) destination.write(label);
      hidden = secret;
      try {
        return await terminal.question(secret ? '' : label, { signal: controller.signal });
      } catch {
        throw new PromptCancelledError();
      } finally {
        hidden = false;
        terminal.removeListener('SIGINT', cancel);
        terminal.removeListener('close', cancel);
        if (secret) destination.write('\n');
      }
    },
    close() {
      hidden = false;
      terminal.close();
      output.end();
    },
  };
}
