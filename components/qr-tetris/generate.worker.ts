// Web Worker entry point: a thin wrapper around generateGame() so the solver runs off the
// main thread. All the logic stays in logic.ts, which remains a plain importable module.
import { generateGame } from './generate';
import type { GenerateRequest, GenerateResponse } from './generate';

self.addEventListener('message', (event: MessageEvent<GenerateRequest>) => {
  const { id, text } = event.data;
  const reply = (response: GenerateResponse) => self.postMessage(response);

  generateGame(text).then(
    game => reply({ id, ok: true, game }),
    (error: unknown) => reply({ id, ok: false, message: error instanceof Error ? error.message : String(error) }),
  );
});
