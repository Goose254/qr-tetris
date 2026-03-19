import { SKY_ROWS } from './constants';
import { getPieceCell } from './logic';
import { tk } from './theme';
import type { Piece, Theme } from './types';

interface BoardCellProps {
  row: number;
  col: number;
  board: (boolean | null)[][];
  piece: Piece | null;
  currentCol: number;
  currentRow: number;
  ghostRow: number;
  theme: Theme;
  active: boolean;
  won: boolean;
  cellSize: number;
}

export default function BoardCell({
  row,
  col,
  board,
  piece,
  currentCol,
  currentRow,
  ghostRow,
  theme,
  active,
  won,
  cellSize,
}: BoardCellProps) {
  const colors = tk(theme);
  const placed = board[row][col];
  const guideRow = row - SKY_ROWS;
  const hasGuide = guideRow >= 0;
  const isAnchor = row === board.length - 1 && col === board[0].length - 1;
  const guideBg = hasGuide ? colors.cellBg : colors.skyBg;
  const targetBorder = theme.mode === 'light' ? `2px solid ${theme.accent}` : `1px solid ${theme.accent}9a`;
  const targetBg = theme.mode === 'light' ? `${theme.accent}30` : `${theme.accent}2f`;
  const targetOutline = theme.mode === 'light' ? 'inset 0 0 0 1px rgba(255,255,255,0.8)' : 'none';
  const ghostBorder = theme.mode === 'light' ? `2px dashed ${theme.accent}` : `1px dashed ${theme.accent}88`;
  const ghostBg = theme.mode === 'light' ? `${theme.accent}42` : `${theme.accent}34`;

  if (placed !== null) {
    const bg = won ? (placed ? '#000000' : '#ffffff') : (placed ? '#0b1220' : '#f7fbff');
    const border = won ? (placed ? '#000000' : '#ffffff') : (placed ? '#2c394b' : '#c6d1de');
    return (
      <div
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: bg,
          border: `1px solid ${border}`,
          boxShadow: won ? 'none' : `inset 0 0 0 1px ${placed ? theme.accent + '18' : '#ffffff66'}`,
          opacity: isAnchor && !won ? 0.72 : 1,
          transition: 'background-color 420ms ease, border-color 420ms ease, box-shadow 420ms ease, opacity 420ms ease',
        }}
      />
    );
  }

  if (!active || !piece) {
    return (
      <div
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: guideBg,
          border: `1px solid ${hasGuide ? colors.cellBorder : colors.skyBorder}`,
        }}
      />
    );
  }

  const fallingCell = getPieceCell(piece, row, col, currentRow, currentCol);
  if (fallingCell !== null) {
    return (
      <div
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: fallingCell ? '#050505' : '#fffdfa',
          border: `1px solid ${fallingCell ? theme.accent + 'ee' : theme.accent + '88'}`,
          boxShadow: `0 0 10px ${theme.accent}44`,
        }}
      />
    );
  }

  const ghostCell = ghostRow !== currentRow ? getPieceCell(piece, row, col, ghostRow, currentCol) : null;
  if (ghostCell !== null) {
    return (
      <div
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: ghostCell ? ghostBg : `${theme.accent}${theme.mode === 'light' ? '24' : '18'}`,
          border: ghostBorder,
        }}
      />
    );
  }

  const targetCell = getPieceCell(piece, row, col, piece.expectedRow, piece.expectedCol);
  if (targetCell !== null) {
    return (
      <div
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: targetCell ? targetBg : `${theme.accent}${theme.mode === 'light' ? '18' : '12'}`,
          border: targetBorder,
          boxShadow: targetOutline,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: guideBg,
        border: `1px solid ${hasGuide ? colors.cellBorder : colors.skyBorder}`,
      }}
    />
  );
}
