import { createApp } from './app.js';

const DEFAULT_PORT = 3000;

const port = Number(process.env.PORT ?? DEFAULT_PORT);

const app = createApp();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
