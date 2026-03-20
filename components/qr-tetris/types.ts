export interface Piece {
  id: number;
  cells: boolean[][];
  mask: boolean[][];
  expectedCol: number;
  expectedRow: number;
  spawnCol: number;
  width: number;
  height: number;
  sortRow: number;
}

export type Status = 'input' | 'playing' | 'gameover' | 'win';

export interface Theme {
  mode: 'dark' | 'light';
  accent: string;
}

export interface ThemeTokens {
  bg: string;
  bgPanel: string;
  bgInput: string;
  border: string;
  text: string;
  textMuted: string;
  cellBg: string;
  cellBorder: string;
  skyBg: string;
  skyBorder: string;
}

export interface GState {
  status: Status;
  qrMatrix: boolean[][];
  qrSize: number;
  pieces: Piece[];
  board: (boolean | null)[][];
  currentIndex: number;
  currentCol: number;
  currentRow: number;
  inputText: string;
}

export interface CellCoord {
  row: number;
  col: number;
}
