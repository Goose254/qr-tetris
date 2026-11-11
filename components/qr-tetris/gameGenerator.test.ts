import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGameGenerator, GenerationCancelledError } from './gameGenerator';
import type { GeneratedGame, GenerateRequest, GenerateResponse } from './generate';

// Minimal stand-in for a dedicated Worker: records what it receives and lets the test
// decide when (and how) it answers.
class FakeWorker {
  onmessage: ((event: MessageEvent<GenerateResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  requests: GenerateRequest[] = [];
  terminated = false;

  postMessage(request: GenerateRequest) {
    this.requests.push(request);
  }

  terminate() {
    this.terminated = true;
  }

  reply(response: GenerateResponse) {
    this.onmessage?.({ data: response } as MessageEvent<GenerateResponse>);
  }

  fail() {
    this.onerror?.({ message: 'worker script failed to load' } as ErrorEvent);
  }
}

function makeGame(size: number): GeneratedGame {
  return { matrix: [], size, pieces: [] };
}

function setup(runOnMainThread = vi.fn(async () => makeGame(99))) {
  const workers: FakeWorker[] = [];
  const createWorker = vi.fn(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker as unknown as Worker;
  });
  const generator = createGameGenerator({ createWorker, runOnMainThread });
  return { generator, workers, createWorker, runOnMainThread };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createGameGenerator', () => {
  it('resolves with the game posted by the worker and reuses the worker afterwards', async () => {
    const { generator, workers, createWorker, runOnMainThread } = setup();

    const first = generator.generate('a');
    expect(workers[0].requests).toEqual([{ id: 1, text: 'a' }]);
    workers[0].reply({ id: 1, ok: true, game: makeGame(21) });
    await expect(first).resolves.toEqual(makeGame(21));

    const second = generator.generate('b');
    workers[0].reply({ id: 2, ok: true, game: makeGame(25) });
    await expect(second).resolves.toEqual(makeGame(25));

    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(runOnMainThread).not.toHaveBeenCalled();
  });

  it('lets the latest request win: the one in flight is cancelled and its worker terminated', async () => {
    const { generator, workers } = setup();

    const stale = generator.generate('old');
    const latest = generator.generate('new');

    await expect(stale).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);

    // A late answer from the terminated worker must not leak into the new request.
    workers[0].reply({ id: 1, ok: true, game: makeGame(21) });
    workers[1].reply({ id: 2, ok: true, game: makeGame(29) });
    await expect(latest).resolves.toEqual(makeGame(29));
  });

  it('rejects with the solver message when no layout is found, without falling back', async () => {
    const { generator, workers, runOnMainThread } = setup();

    const result = generator.generate('a');
    workers[0].reply({ id: 1, ok: false, message: 'Unable to generate a playable tetromino layout.' });

    await expect(result).rejects.toThrow('Unable to generate a playable tetromino layout.');
    expect(runOnMainThread).not.toHaveBeenCalled();
    expect(workers[0].terminated).toBe(false);
  });

  it('falls back to the main thread when the worker cannot be created', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const runOnMainThread = vi.fn(async () => makeGame(33));
    const createWorker = vi.fn((): Worker => {
      throw new Error('Worker is not defined');
    });
    const generator = createGameGenerator({ createWorker, runOnMainThread });

    await expect(generator.generate('a')).resolves.toEqual(makeGame(33));
    await expect(generator.generate('b')).resolves.toEqual(makeGame(33));

    // The failure is remembered: no second attempt at creating a worker.
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(runOnMainThread).toHaveBeenCalledTimes(2);
  });

  it('falls back to the main thread when the worker script fails to load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { generator, workers, createWorker, runOnMainThread } = setup();

    const result = generator.generate('a');
    workers[0].fail();

    await expect(result).resolves.toEqual(makeGame(99));
    expect(workers[0].terminated).toBe(true);
    expect(runOnMainThread).toHaveBeenCalledWith('a');

    await expect(generator.generate('b')).resolves.toEqual(makeGame(99));
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('propagates a solver failure raised by the main-thread fallback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const runOnMainThread = vi.fn(async (): Promise<GeneratedGame> => {
      throw new Error('Unable to generate a playable tetromino layout.');
    });
    const generator = createGameGenerator({
      createWorker: () => {
        throw new Error('blocked');
      },
      runOnMainThread,
    });

    await expect(generator.generate('a')).rejects.toThrow('Unable to generate a playable tetromino layout.');
  });

  it('dispose() cancels the request in flight, terminates the worker and refuses new requests', async () => {
    const { generator, workers, createWorker } = setup();

    const inFlight = generator.generate('a');
    generator.dispose();

    await expect(inFlight).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(workers[0].terminated).toBe(true);
    await expect(generator.generate('b')).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('dispose() during a main-thread fallback drops its result', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const runOnMainThread = vi.fn(async () => makeGame(33));
    const generator = createGameGenerator({
      createWorker: () => {
        throw new Error('blocked');
      },
      runOnMainThread,
    });

    const inFlight = generator.generate('a');
    generator.dispose();

    await expect(inFlight).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(runOnMainThread).not.toHaveBeenCalled();
  });
});
