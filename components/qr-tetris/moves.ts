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

// The move a key press triggers, or null when the key belongs to the browser: no game is
// running, or the focus is in a text field (a space typed in the QR text is a space, and
// the arrows move the caret).
export function moveForKey(key: string, playing: boolean, typing: boolean): Move | null {
  if (!playing || typing) return null;
  return KEY_MOVES.get(key) ?? null;
}

// True when a key press on this element is text entry.
export function isTextEntry(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

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
