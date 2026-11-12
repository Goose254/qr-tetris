import { calcDropRow, canPlace, lockPiece } from './logic';
import type { GState } from './types';

// The four things a player can do to the falling piece. Gravity is a soft drop on a timer.
export type Move = 'left' | 'right' | 'softDrop' | 'hardDrop';

// Keyboard bindings, keyed by KeyboardEvent.key.
export const KEY_MOVES: ReadonlyMap<string, Move> = new Map<string, Move>([
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
  ['ArrowDown', 'softDrop'],
  [' ', 'hardDrop'],
]);

// Single transition for every way of moving the current piece (keyboard, on-screen
// controls, gravity). Pure: returns the same state object when the move changes nothing.
export function applyMove(state: GState, move: Move): GState {
  if (state.status !== 'playing') return state;

  const piece = state.pieces[state.currentIndex];
  const { currentCol, currentRow, board } = state;

  switch (move) {
    case 'left':
    case 'right': {
      const nextCol = currentCol + (move === 'left' ? -1 : 1);
      return canPlace(piece, nextCol, currentRow, board) ? { ...state, currentCol: nextCol } : state;
    }

    case 'softDrop': {
      const nextRow = currentRow + 1;
      if (canPlace(piece, currentCol, nextRow, board)) return { ...state, currentRow: nextRow };
      // Resting on something: the piece locks where it is (a wrong spot ends the game).
      return lockPiece(state, currentCol, currentRow);
    }

    case 'hardDrop':
      return lockPiece(state, currentCol, calcDropRow(piece, currentCol, currentRow, board));
  }
}
