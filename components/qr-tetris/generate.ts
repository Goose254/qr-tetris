import { buildPlayablePieces, buildQR } from './logic';
import type { Piece } from './types';

export interface GeneratedGame {
  matrix: boolean[][];
  size: number;
  pieces: Piece[];
}

// Messages exchanged with generate.worker.ts. `id` lets the caller match a reply to its request.
export interface GenerateRequest {
  id: number;
  text: string;
}

export type GenerateResponse =
  | { id: number; ok: true; game: GeneratedGame }
  | { id: number; ok: false; message: string };

// QR encoding + tetromino tiling for one text. The tiling is synchronous CPU work that can
// last several seconds: run it in the worker, and on the main thread only as a fallback.
export async function generateGame(text: string): Promise<GeneratedGame> {
  const { matrix, size } = await buildQR(text);
  const pieces = buildPlayablePieces(matrix, size);
  return { matrix, size, pieces };
}
