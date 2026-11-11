import { generateGame } from './generate';
import type { GeneratedGame, GenerateRequest, GenerateResponse } from './generate';

// Rejection of a request that was superseded by a newer one, or dropped by dispose().
// It is not a failure of the solver: callers ignore it.
export class GenerationCancelledError extends Error {
  constructor() {
    super('Generation cancelled.');
    this.name = 'GenerationCancelledError';
  }
}

export interface GameGenerator {
  // Latest wins: calling generate() again cancels the request still in flight.
  generate(text: string): Promise<GeneratedGame>;
  dispose(): void;
}

export interface GameGeneratorOptions {
  createWorker?: () => Worker;
  runOnMainThread?: (text: string) => Promise<GeneratedGame>;
}

// The `new Worker(new URL(...))` expression must stay literal: it is what the bundler
// (Turbopack / webpack) detects to emit the worker as its own chunk.
function createDefaultWorker(): Worker {
  return new Worker(new URL('./generate.worker.ts', import.meta.url));
}

export function createGameGenerator(options: GameGeneratorOptions = {}): GameGenerator {
  const createWorker = options.createWorker ?? createDefaultWorker;
  const runOnMainThread = options.runOnMainThread ?? generateGame;

  let worker: Worker | null = null;
  let workerUnavailable = false;
  let disposed = false;
  let lastId = 0;
  let pending: { id: number; reject: (error: Error) => void } | null = null;

  const dropWorker = () => {
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    worker = null;
  };

  const cancelPending = () => {
    if (!pending) return;
    const { reject } = pending;
    pending = null;
    // Terminating is the only way to stop a solver that is already running.
    dropWorker();
    reject(new GenerationCancelledError());
  };

  const isStale = (id: number) => disposed || id !== lastId;

  // No worker (unsupported, blocked, or its script failed to load): the game must still
  // start, so solve on the main thread, at the cost of a frozen UI while it runs.
  const generateOnMainThread = async (id: number, text: string) => {
    // Yield once so the "generating" state is painted before the thread is blocked.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (isStale(id)) throw new GenerationCancelledError();
    const game = await runOnMainThread(text);
    if (isStale(id)) throw new GenerationCancelledError();
    return game;
  };

  const generate = (text: string): Promise<GeneratedGame> => {
    if (disposed) return Promise.reject(new GenerationCancelledError());

    cancelPending();
    const id = ++lastId;

    if (!worker && !workerUnavailable) {
      try {
        worker = createWorker();
      } catch (error) {
        workerUnavailable = true;
        console.warn('Web Worker unavailable, generating on the main thread:', error);
      }
    }

    if (!worker) return generateOnMainThread(id, text);
    const active = worker;

    return new Promise<GeneratedGame>((resolve, reject) => {
      pending = { id, reject };

      const onWorkerFailure = (reason: unknown) => {
        if (pending?.id !== id) return;
        pending = null;
        workerUnavailable = true;
        dropWorker();
        console.warn('Web Worker failed, generating on the main thread:', reason);
        generateOnMainThread(id, text).then(resolve, reject);
      };

      active.onmessage = (event: MessageEvent<GenerateResponse>) => {
        const response = event.data;
        if (!response || response.id !== id || pending?.id !== id) return;
        pending = null;
        // A solver failure (no layout found, text too long) is a real answer, not a worker failure.
        if (response.ok) resolve(response.game);
        else reject(new Error(response.message));
      };
      // The worker catches solver errors itself, so these only fire when the worker
      // script cannot be loaded or evaluated, or a message cannot be deserialised.
      active.onerror = onWorkerFailure;
      active.onmessageerror = onWorkerFailure;

      try {
        const request: GenerateRequest = { id, text };
        active.postMessage(request);
      } catch (error) {
        onWorkerFailure(error);
      }
    });
  };

  const dispose = () => {
    disposed = true;
    cancelPending();
    dropWorker();
  };

  return { generate, dispose };
}
