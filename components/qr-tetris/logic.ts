import QRCode from 'qrcode';

import { BLOCK_SIZE, SKY_ROWS } from './constants';
import type { CellCoord, GState, Piece } from './types';

const TETROMINO_BASES: CellCoord[][] = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
  [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
];

const BLOCK_FALLBACK: CellCoord[][] = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 3 }],
  [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 3, col: 0 }, { row: 3, col: 1 }],
  [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 3 }],
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

function buildBlockPlacements() {
  const placements: CellCoord[][] = [];

  for (const shape of buildTetrominoShapes()) {
    const maxRow = Math.max(...shape.map(cell => cell.row));
    const maxCol = Math.max(...shape.map(cell => cell.col));

    for (let rowOffset = 0; rowOffset <= BLOCK_SIZE - maxRow - 1; rowOffset++) {
      for (let colOffset = 0; colOffset <= BLOCK_SIZE - maxCol - 1; colOffset++) {
        placements.push(shape.map(cell => ({
          row: cell.row + rowOffset,
          col: cell.col + colOffset,
        })));
      }
    }
  }

  return placements;
}

const BLOCK_PLACEMENTS = buildBlockPlacements();

interface LocalPieceShape {
  cells: CellCoord[];
  mask: boolean[][];
  width: number;
  height: number;
  expectedRow: number;
  expectedCol: number;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tileFourByFour(): CellCoord[][] {
  const used = Array.from({ length: BLOCK_SIZE }, () => Array(BLOCK_SIZE).fill(false));
  const solution: CellCoord[][] = [];

  const search = (): boolean => {
    let next: CellCoord | null = null;

    for (let row = 0; row < BLOCK_SIZE && !next; row++) {
      for (let col = 0; col < BLOCK_SIZE; col++) {
        if (!used[row][col]) {
          next = { row, col };
          break;
        }
      }
    }

    if (!next) return true;

    const candidates = shuffle(
      BLOCK_PLACEMENTS.filter(placement =>
        placement.some(cell => cell.row === next.row && cell.col === next.col) &&
        placement.every(cell => !used[cell.row][cell.col])
      )
    );

    for (const placement of candidates) {
      for (const cell of placement) used[cell.row][cell.col] = true;
      solution.push(placement);
      if (search()) return true;
      solution.pop();
      for (const cell of placement) used[cell.row][cell.col] = false;
    }

    return false;
  };

  if (search()) return solution;
  return BLOCK_FALLBACK.map(piece => piece.map(cell => ({ ...cell })));
}

function toLocalPieceShape(cells: CellCoord[]): LocalPieceShape {
  const minRow = Math.min(...cells.map(cell => cell.row));
  const maxRow = Math.max(...cells.map(cell => cell.row));
  const minCol = Math.min(...cells.map(cell => cell.col));
  const maxCol = Math.max(...cells.map(cell => cell.col));
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  const occupied = new Set(cells.map(cell => `${cell.row}:${cell.col}`));

  return {
    cells,
    mask: Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => occupied.has(`${minRow + r}:${minCol + c}`))
    ),
    width,
    height,
    expectedRow: minRow,
    expectedCol: minCol,
  };
}

function canPlaceLocal(shape: LocalPieceShape, col: number, row: number, board: boolean[][]) {
  if (col < 0 || col + shape.width > BLOCK_SIZE || row < 0 || row + shape.height > BLOCK_SIZE) return false;

  for (let r = 0; r < shape.height; r++) {
    for (let c = 0; c < shape.width; c++) {
      if (shape.mask[r][c] && board[row + r][col + c]) return false;
    }
  }

  return true;
}

function calcLocalGhostRow(shape: LocalPieceShape, board: boolean[][]) {
  let last = 0;
  for (let row = 0; row <= BLOCK_SIZE - shape.height; row++) {
    if (canPlaceLocal(shape, shape.expectedCol, row, board)) last = row;
  }
  return last;
}

function buildPlayableBlockPatterns(maxPatterns = 24) {
  const results: CellCoord[][][] = [];
  const seen = new Set<string>();
  const board = Array.from({ length: BLOCK_SIZE }, () => Array(BLOCK_SIZE).fill(false));
  const sequence: CellCoord[][] = [];

  const mark = (cells: CellCoord[], value: boolean) => {
    for (const cell of cells) board[cell.row][cell.col] = value;
  };

  const search = () => {
    let next: CellCoord | null = null;
    for (let row = BLOCK_SIZE - 1; row >= 0 && !next; row--) {
      for (let col = 0; col < BLOCK_SIZE; col++) {
        if (!board[row][col]) {
          next = { row, col };
          break;
        }
      }
    }

    if (!next) {
      const signature = sequence
        .map(piece =>
          piece
            .slice()
            .sort((left, right) => left.row - right.row || left.col - right.col)
            .map(cell => `${cell.row}:${cell.col}`)
            .join(',')
        )
        .join('|');

      if (!seen.has(signature)) {
        seen.add(signature);
        results.push(sequence.map(piece => piece.map(cell => ({ ...cell }))));
      }
      return results.length >= maxPatterns;
    }

    const candidates = shuffle(
      BLOCK_PLACEMENTS.filter(placement => {
        if (!placement.some(cell => cell.row === next.row && cell.col === next.col)) return false;
        if (!placement.every(cell => !board[cell.row][cell.col])) return false;
        const shape = toLocalPieceShape(placement);
        return calcLocalGhostRow(shape, board) === shape.expectedRow;
      })
    );

    for (const placement of candidates) {
      mark(placement, true);
      sequence.push(placement);
      if (search()) return true;
      sequence.pop();
      mark(placement, false);
    }

    return false;
  };

  search();

  return results.length > 0 ? results : [tileFourByFour()];
}

const PLAYABLE_BLOCK_PATTERNS = buildPlayableBlockPatterns();

export function dividePieces(matrix: boolean[][], size: number): Piece[] {
  const pieces: Piece[] = [];
  let id = 0;

  const pushPiece = (coords: CellCoord[]) => {
    const minRow = Math.min(...coords.map(cell => cell.row));
    const maxRow = Math.max(...coords.map(cell => cell.row));
    const minCol = Math.min(...coords.map(cell => cell.col));
    const maxCol = Math.max(...coords.map(cell => cell.col));
    const width = maxCol - minCol + 1;
    const height = maxRow - minRow + 1;
    const occupied = new Set(coords.map(cell => `${cell.row}:${cell.col}`));

    pieces.push({
      id,
      cells: Array.from({ length: height }, (_, r) =>
        Array.from({ length: width }, (_, c) => matrix[minRow + r][minCol + c])
      ),
      mask: Array.from({ length: height }, (_, r) =>
        Array.from({ length: width }, (_, c) => occupied.has(`${minRow + r}:${minCol + c}`))
      ),
      expectedCol: minCol,
      expectedRow: SKY_ROWS + minRow,
      width,
      height,
      sortRow: maxRow,
    });
    id++;
  };

  const bottomRowCols = shuffle(Array.from({ length: (size - 1) / BLOCK_SIZE }, (_, index) => index * BLOCK_SIZE));
  for (const col of bottomRowCols) {
    pushPiece(Array.from({ length: BLOCK_SIZE }, (_, offset) => ({ row: size - 1, col: col + offset })));
  }

  for (let row = size - 1 - BLOCK_SIZE; row >= 0; row -= BLOCK_SIZE) {
    pushPiece(Array.from({ length: BLOCK_SIZE }, (_, offset) => ({ row: row + offset, col: size - 1 })));
  }

  for (let row = size - 1 - BLOCK_SIZE; row >= 0; row -= BLOCK_SIZE) {
    const cols = shuffle(Array.from({ length: (size - 1) / BLOCK_SIZE }, (_, index) => index * BLOCK_SIZE));
    for (const col of cols) {
      const pattern = PLAYABLE_BLOCK_PATTERNS[Math.floor(Math.random() * PLAYABLE_BLOCK_PATTERNS.length)];
      for (const placement of pattern) {
        pushPiece(placement.map(cell => ({ row: row + cell.row, col: col + cell.col })));
      }
    }
  }

  return pieces;
}

export function buildPlayablePieces(matrix: boolean[][], size: number): Piece[] {
  return dividePieces(matrix, size);
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

export function calcGhostRow(piece: Piece, col: number, board: (boolean | null)[][]): number {
  let last = 0;
  for (let row = 0; row <= board.length - piece.height; row++) {
    if (canPlace(piece, col, row, board)) last = row;
  }
  return last;
}

export function lockPiece(state: GState, col: number, row: number): GState {
  const { pieces, currentIndex, board, qrSize } = state;
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
    currentCol: Math.floor((qrSize - next.width) / 2),
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
