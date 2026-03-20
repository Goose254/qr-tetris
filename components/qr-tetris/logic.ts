import QRCode from 'qrcode';

import { SKY_ROWS } from './constants';
import type { CellCoord, GState, Piece } from './types';

const SOLVE_ATTEMPTS = 8;
const SOLVE_MAX_STEPS = 120000;
const SOLVE_MAX_MS = 3000;
const TETROMINO_CELLS = 4;
const ANCHOR_KEY = (size: number) => `${size - 1}:${size - 1}`;

const TETROMINO_BASES: CellCoord[][] = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
  [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
];

interface PlacementCandidate {
  key: string;
  coords: CellCoord[];
  piece: Piece;
}

interface PlacementIndex {
  all: PlacementCandidate[];
  byCell: Map<string, PlacementCandidate[]>;
}

interface PlayableOption {
  key: string;
  coords: CellCoord[];
  piece: Piece;
}

interface MacroRegion {
  top: number;
  left: number;
  height: number;
  width: number;
}

const REGION_SHAPES: Array<{ height: number; width: number }> = [
  { height: 1, width: 2 },
  { height: 2, width: 1 },
  { height: 1, width: 1 },
];

export async function buildQR(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const matrix: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => Boolean(qr.modules.data[r * size + c]))
  );
  return { matrix, size };
}

function normalizeShape(cells: CellCoord[]): CellCoord[] {
  const minRow = Math.min(...cells.map(cell => cell.row));
  const minCol = Math.min(...cells.map(cell => cell.col));
  return cells
    .map(cell => ({ row: cell.row - minRow, col: cell.col - minCol }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

function rotateShape(cells: CellCoord[]): CellCoord[] {
  return normalizeShape(cells.map(cell => ({ row: cell.col, col: -cell.row })));
}

function buildTetrominoShapes() {
  const unique = new Map<string, CellCoord[]>();

  for (const base of TETROMINO_BASES) {
    let current = normalizeShape(base);
    for (let i = 0; i < 4; i++) {
      const key = current.map(cell => `${cell.row}:${cell.col}`).join('|');
      if (!unique.has(key)) unique.set(key, current);
      current = rotateShape(current);
    }
  }

  return [...unique.values()];
}

function cellKey(cell: CellCoord) {
  return `${cell.row}:${cell.col}`;
}

function placementKey(cells: CellCoord[]) {
  return cells
    .slice()
    .sort((left, right) => left.row - right.row || left.col - right.col)
    .map(cell => cellKey(cell))
    .join('|');
}

function getShapeKey(coords: CellCoord[]): string {
  const minRow = Math.min(...coords.map(c => c.row));
  const minCol = Math.min(...coords.map(c => c.col));
  return coords
    .map(c => `${c.row - minRow}:${c.col - minCol}`)
    .sort()
    .join('|');
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPiece(matrix: boolean[][], coords: CellCoord[], id = -1, spawnCol = 0): Piece {
  const minRow = Math.min(...coords.map(cell => cell.row));
  const maxRow = Math.max(...coords.map(cell => cell.row));
  const minCol = Math.min(...coords.map(cell => cell.col));
  const maxCol = Math.max(...coords.map(cell => cell.col));
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  const occupied = new Set(coords.map(cell => cellKey(cell)));

  return {
    id,
    cells: Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => matrix[minRow + r][minCol + c])
    ),
    mask: Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => occupied.has(cellKey({ row: minRow + r, col: minCol + c })))
    ),
    expectedCol: minCol,
    expectedRow: SKY_ROWS + minRow,
    spawnCol,
    width,
    height,
    sortRow: maxRow,
  };
}

function buildPlacementIndex(matrix: boolean[][], size: number): PlacementIndex {
  const all = new Map<string, PlacementCandidate>();
  const anchor = ANCHOR_KEY(size);

  for (const shape of buildTetrominoShapes()) {
    const maxRow = Math.max(...shape.map(cell => cell.row));
    const maxCol = Math.max(...shape.map(cell => cell.col));

    for (let rowOffset = 0; rowOffset <= size - maxRow - 1; rowOffset++) {
      for (let colOffset = 0; colOffset <= size - maxCol - 1; colOffset++) {
        const coords = shape.map(cell => ({
          row: rowOffset + cell.row,
          col: colOffset + cell.col,
        }));

        if (coords.some(cell => cellKey(cell) === anchor)) continue;

        const key = placementKey(coords);
        if (all.has(key)) continue;

        all.set(key, {
          key,
          coords,
          piece: buildPiece(matrix, coords),
        });
      }
    }
  }

  const byCell = new Map<string, PlacementCandidate[]>();

  for (const candidate of all.values()) {
    for (const coord of candidate.coords) {
      const key = cellKey(coord);
      const list = byCell.get(key);
      if (list) list.push(candidate);
      else byCell.set(key, [candidate]);
    }
  }

  return { all: [...all.values()], byCell };
}

function buildSubsetIndex(candidates: PlacementCandidate[]): PlacementIndex {
  const byCell = new Map<string, PlacementCandidate[]>();

  for (const candidate of candidates) {
    for (const coord of candidate.coords) {
      const key = cellKey(coord);
      const list = byCell.get(key);
      if (list) list.push(candidate);
      else byCell.set(key, [candidate]);
    }
  }

  return { all: candidates, byCell };
}

function applyPiece(board: (boolean | null)[][], piece: Piece) {
  const touched: CellCoord[] = [];

  for (let r = 0; r < piece.height; r++) {
    for (let c = 0; c < piece.width; c++) {
      if (!piece.mask[r][c]) continue;
      const row = piece.expectedRow + r;
      const col = piece.expectedCol + c;
      board[row][col] = piece.cells[r][c];
      touched.push({ row, col });
    }
  }

  return touched;
}

function revertPiece(board: (boolean | null)[][], cells: CellCoord[]) {
  for (const cell of cells) board[cell.row][cell.col] = null;
}

function markCovered(covered: boolean[][], coords: CellCoord[], value: boolean) {
  for (const coord of coords) covered[coord.row][coord.col] = value;
}

function preferredSpawnColumns(piece: Piece, qrSize: number) {
  const centered = Math.floor((qrSize - piece.width) / 2);

  return Array.from({ length: qrSize - piece.width + 1 }, (_, col) => col).sort((left, right) => {
    const centeredDiff = Math.abs(left - centered) - Math.abs(right - centered);
    if (centeredDiff !== 0) return centeredDiff;
    return Math.abs(left - piece.expectedCol) - Math.abs(right - piece.expectedCol);
  });
}

function calcLockRow(piece: Piece, col: number, board: (boolean | null)[][]) {
  let last = 0;
  for (let row = 0; row <= board.length - piece.height; row++) {
    if (canPlace(piece, col, row, board)) last = row;
  }
  return last;
}

function canReachTarget(piece: Piece, startCol: number, board: (boolean | null)[][]): boolean {
  if (!canPlace(piece, startCol, 0, board)) return false;

  const maxRow = board.length - piece.height;
  const maxCol = board[0].length - piece.width;
  const seen = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(false));
  const queue: Array<{ row: number; col: number }> = [{ row: 0, col: startCol }];
  let index = 0;

  seen[0][startCol] = true;

  while (index < queue.length) {
    const current = queue[index++];
    if (current.row === piece.expectedRow && current.col === piece.expectedCol) return true;

    for (const move of [
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
      { row: current.row + 1, col: current.col },
    ]) {
      if (move.row < 0 || move.row > maxRow || move.col < 0 || move.col > maxCol) continue;
      if (seen[move.row][move.col]) continue;
      if (!canPlace(piece, move.col, move.row, board)) continue;

      seen[move.row][move.col] = true;
      queue.push(move);
    }
  }

  return false;
}

function findSpawnCol(piece: Piece, board: (boolean | null)[][], qrSize: number) {
  if (calcLockRow(piece, piece.expectedCol, board) !== piece.expectedRow) return null;

  for (const startCol of preferredSpawnColumns(piece, qrSize)) {
    if (canReachTarget(piece, startCol, board)) return startCol;
  }

  return null;
}

function resolvePlayableOption(candidate: PlacementCandidate, board: (boolean | null)[][], size: number): PlayableOption | null {
  const spawnCol = findSpawnCol(candidate.piece, board, size);
  if (spawnCol === null) return null;

  return {
    key: candidate.key,
    coords: candidate.coords,
    piece: { ...candidate.piece, spawnCol },
  };
}

function isPlacementAvailable(candidate: PlacementCandidate, covered: boolean[][]) {
  return candidate.coords.every(coord => !covered[coord.row][coord.col]);
}

function chooseNextCell(
  size: number,
  covered: boolean[][],
  board: (boolean | null)[][],
  placementsByCell: Map<string, PlacementCandidate[]>,
): { cell: CellCoord; options: PlayableOption[] } | null {
  const optionCache = new Map<string, PlayableOption | null>();

  // Process only the bottom-most uncovered row. Pieces must be placed bottom-up so
  // that the lock-row playability check is satisfied: a piece at row R can only lock
  // there once the rows below it (R+1 … size-1) are already filled in the board.
  // Scanning upper rows for zero-options would give false dead-ends because those
  // cells temporarily have no playable options until the rows below are covered.
  for (let row = size - 1; row >= 0; row--) {
    const rowCells = shuffle(
      Array.from({ length: size }, (_, col) => ({ row, col })).filter(cell => !covered[cell.row][cell.col])
    );

    if (rowCells.length === 0) continue;

    // Apply MRV within this row only and return immediately (don't scan higher rows).
    let best: { cell: CellCoord; options: PlayableOption[] } | null = null;

    for (const cell of rowCells) {
      const options: PlayableOption[] = [];
      const candidates = placementsByCell.get(cellKey(cell)) ?? [];

      for (const candidate of candidates) {
        if (!isPlacementAvailable(candidate, covered)) continue;

        if (!optionCache.has(candidate.key)) {
          optionCache.set(candidate.key, resolvePlayableOption(candidate, board, size));
        }

        const resolved = optionCache.get(candidate.key);
        if (resolved) options.push(resolved);
      }

      if (options.length === 0) return { cell, options: [] };

      if (best === null || options.length < best.options.length) {
        best = { cell, options: shuffle(options) };
        if (best.options.length === 1) return best;
      }
    }

    return best;
  }

  return null;
}

function coveredStateKey(covered: boolean[][]) {
  return covered.map(row => row.map(cell => (cell ? '1' : '0')).join('')).join('|');
}

function solveCandidateSet(size: number, board: (boolean | null)[][], index: PlacementIndex, covered: boolean[][]): Piece[] | null {
  const deadline = Date.now() + SOLVE_MAX_MS;
  const deadEnds = new Set<string>();
  const shapeUsage = new Map<string, number>();
  let steps = 0;

  const search = (): Piece[] | null => {
    steps++;
    if (steps > SOLVE_MAX_STEPS || Date.now() > deadline) return null;

    const stateKey = coveredStateKey(covered);
    if (deadEnds.has(stateKey)) return null;

    const choice = chooseNextCell(size, covered, board, index.byCell);
    if (!choice) return [];
    if (choice.options.length === 0) {
      deadEnds.add(stateKey);
      return null;
    }

    // Prefer shape orientations not yet (or rarely) used in this region — stable sort
    // preserves the randomisation already applied by chooseNextCell for equal counts.
    const options = choice.options.slice().sort((a, b) => {
      const au = shapeUsage.get(getShapeKey(a.coords)) ?? 0;
      const bu = shapeUsage.get(getShapeKey(b.coords)) ?? 0;
      return au - bu;
    });

    for (const option of options) {
      const sk = getShapeKey(option.coords);
      shapeUsage.set(sk, (shapeUsage.get(sk) ?? 0) + 1);
      markCovered(covered, option.coords, true);
      const touched = applyPiece(board, option.piece);
      const tail = search();

      if (tail) return [option.piece, ...tail];

      shapeUsage.set(sk, shapeUsage.get(sk)! - 1);
      revertPiece(board, touched);
      markCovered(covered, option.coords, false);
    }

    deadEnds.add(stateKey);
    return null;
  };

  return search();
}


function buildRegionPlan(blockCount: number): MacroRegion[] {
  const covered = Array.from({ length: blockCount }, () => Array(blockCount).fill(false));
  const regions: MacroRegion[] = [];

  for (let row = 0; row < blockCount; row++) {
    for (let col = 0; col < blockCount; col++) {
      if (covered[row][col]) continue;

      const shape =
        shuffle(REGION_SHAPES).find(candidate => {
          if (row + candidate.height > blockCount || col + candidate.width > blockCount) return false;
          // Multi-block regions must not absorb the border row/col — those extra cells
          // (row/col size-1) are handled exclusively by the 1×1 blocks at the last
          // block row/col. Mixing them into wider regions creates non-4-divisible cell
          // counts or regions too large for the solver.
          if (candidate.height > 1 && row + candidate.height >= blockCount) return false;
          if (candidate.width > 1 && col + candidate.width >= blockCount) return false;

          for (let r = row; r < row + candidate.height; r++) {
            for (let c = col; c < col + candidate.width; c++) {
              if (covered[r][c]) return false;
            }
          }

          return true;
        }) ?? { height: 1, width: 1 };

      for (let r = row; r < row + shape.height; r++) {
        for (let c = col; c < col + shape.width; c++) covered[r][c] = true;
      }

      regions.push({ top: row, left: col, height: shape.height, width: shape.width });
    }
  }

  return regions.sort((left, right) => {
    const leftBottom = left.top + left.height;
    const rightBottom = right.top + right.height;
    if (leftBottom !== rightBottom) return rightBottom - leftBottom;
    return Math.random() < 0.5 ? -1 : 1;
  });
}

// Cells for a region, extending into the QR border row/col for the last block row/col.
// This lets tetrominoes span the interior AND the border, breaking the I-piece monopoly.
function buildRegionCells(region: MacroRegion, size: number): CellCoord[] {
  const blockCount = (size - 1) / TETROMINO_CELLS;
  const cells: CellCoord[] = [];

  const rowEnd =
    region.top + region.height >= blockCount
      ? size - 1 // extend to include the border row
      : (region.top + region.height) * TETROMINO_CELLS - 1;

  const colEnd =
    region.left + region.width >= blockCount
      ? size - 1 // extend to include the border column
      : (region.left + region.width) * TETROMINO_CELLS - 1;

  for (let row = region.top * TETROMINO_CELLS; row <= rowEnd; row++) {
    for (let col = region.left * TETROMINO_CELLS; col <= colEnd; col++) {
      if (row === size - 1 && col === size - 1) continue; // anchor cell stays pre-seeded
      cells.push({ row, col });
    }
  }

  return cells;
}

function solveRegion(size: number, board: (boolean | null)[][], index: PlacementIndex, region: MacroRegion) {
  const regionCells = buildRegionCells(region, size);
  const allowed = new Set(regionCells.map(cell => cellKey(cell)));
  const candidates = index.all.filter(candidate => candidate.coords.every(coord => allowed.has(cellKey(coord))));
  const covered = Array.from({ length: size }, () => Array(size).fill(true));

  for (const cell of regionCells) covered[cell.row][cell.col] = false;

  return solveCandidateSet(size, board, buildSubsetIndex(candidates), covered);
}

function splitRegion(region: MacroRegion): MacroRegion[] {
  const blocks: MacroRegion[] = [];

  for (let row = region.top; row < region.top + region.height; row++) {
    for (let col = region.left; col < region.left + region.width; col++) {
      blocks.push({ top: row, left: col, height: 1, width: 1 });
    }
  }

  return blocks.sort((left, right) => {
    if (left.top !== right.top) return right.top - left.top;
    return Math.random() < 0.5 ? -1 : 1;
  });
}

export function buildPlayablePieces(matrix: boolean[][], size: number): Piece[] {
  if (((size * size) - 1) % TETROMINO_CELLS !== 0) {
    throw new Error('QR grid cannot be tiled by tetrominoes with a single anchor cell.');
  }

  const index = buildPlacementIndex(matrix, size);
  const attempts = new Map<string, Piece[]>();
  const blockCount = (size - 1) / TETROMINO_CELLS;

  for (let attempt = 0; attempt < SOLVE_ATTEMPTS; attempt++) {
    const board = seededBoard(matrix, size);
    const solved: Piece[] = [];
    let failed = false;

    for (const region of buildRegionPlan(blockCount)) {
      const regionPieces = solveRegion(size, board, index, region);
      if (regionPieces) {
        solved.push(...regionPieces);
        continue;
      }

      let splitFailed = false;

      for (const singleBlock of splitRegion(region)) {
        const blockPieces = solveRegion(size, board, index, singleBlock);
        if (!blockPieces) {
          splitFailed = true;
          break;
        }

        solved.push(...blockPieces);
      }

      if (splitFailed) {
        failed = true;
        break;
      }
    }

    if (failed) continue;

    const withIds = solved.map((piece, current) => ({ ...piece, id: current }));
    const signature = withIds
      .map(piece => `${piece.expectedRow}:${piece.expectedCol}:${piece.spawnCol}:${piece.mask.map(row => row.map(cell => (cell ? '1' : '0')).join('')).join('/')}`)
      .join('|');

    attempts.set(signature, withIds);
  }

  const candidates = [...attempts.values()];
  if (candidates.length === 0) throw new Error('Unable to generate a playable tetromino layout.');
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const emptyBoard = (height: number, width: number): (boolean | null)[][] =>
  Array.from({ length: height }, () => Array(width).fill(null));

export function seededBoard(matrix: boolean[][], size: number) {
  const board = emptyBoard(size + SKY_ROWS, size);
  board[SKY_ROWS + size - 1][size - 1] = matrix[size - 1][size - 1];
  return board;
}

export function canPlace(piece: Piece, col: number, row: number, board: (boolean | null)[][]): boolean {
  const boardHeight = board.length;
  const boardWidth = board[0]?.length ?? 0;
  if (col < 0 || col + piece.width > boardWidth || row < 0 || row + piece.height > boardHeight) return false;

  for (let r = 0; r < piece.height; r++) {
    for (let c = 0; c < piece.width; c++) {
      if (piece.mask[r][c] && board[row + r][col + c] !== null) return false;
    }
  }

  return true;
}

export function calcDropRow(piece: Piece, col: number, row: number, board: (boolean | null)[][]): number {
  let last = row;
  while (last + 1 <= board.length - piece.height && canPlace(piece, col, last + 1, board)) last++;
  return last;
}

export function lockPiece(state: GState, col: number, row: number): GState {
  const { pieces, currentIndex, board } = state;
  const piece = pieces[currentIndex];

  if (col !== piece.expectedCol || row !== piece.expectedRow) {
    return { ...state, status: 'gameover' };
  }

  const newBoard = board.map(current => [...current]);
  for (let r = 0; r < piece.height; r++) {
    for (let c = 0; c < piece.width; c++) {
      if (piece.mask[r][c]) newBoard[row + r][col + c] = piece.cells[r][c];
    }
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex >= pieces.length) return { ...state, board: newBoard, status: 'win' };

  const next = pieces[nextIndex];
  return {
    ...state,
    board: newBoard,
    currentIndex: nextIndex,
    currentCol: next.spawnCol,
    currentRow: 0,
  };
}

export function getPieceCell(piece: Piece, absRow: number, absCol: number, originRow: number, originCol: number) {
  const row = absRow - originRow;
  const col = absCol - originCol;
  if (row < 0 || row >= piece.height || col < 0 || col >= piece.width) return null;
  if (!piece.mask[row][col]) return null;
  return piece.cells[row][col];
}
