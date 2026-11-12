import { describe, expect, it } from 'vitest';

import { emptyBoard } from './logic';
import { applyMove, KEY_MOVES } from './moves';
import type { GState, Piece } from './types';

// 2×2 square piece, all black. Its target is the bottom-left corner of a 4-wide, 6-high board.
function makeSquare(overrides: Partial<Piece> = {}): Piece {
  return {
    id: 0,
    cells: [
      [true, true],
      [true, true],
    ],
    mask: [
      [true, true],
      [true, true],
    ],
    expectedCol: 0,
    expectedRow: 4,
    spawnCol: 1,
    width: 2,
    height: 2,
    sortRow: 5,
    ...overrides,
  };
}

function makeState(overrides: Partial<GState> = {}): GState {
  const pieces = overrides.pieces ?? [makeSquare(), makeSquare({ id: 1, expectedCol: 2, spawnCol: 0 })];
  return {
    status: 'playing',
    qrMatrix: [],
    qrSize: 4,
    pieces,
    board: emptyBoard(6, 4),
    currentIndex: 0,
    currentCol: pieces[0].spawnCol,
    currentRow: 0,
    inputText: 'test',
    ...overrides,
  };
}

describe('KEY_MOVES', () => {
  it('binds the arrow keys and the space bar, and nothing else', () => {
    expect([...KEY_MOVES]).toEqual([
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
      ['ArrowDown', 'softDrop'],
      [' ', 'hardDrop'],
    ]);
    expect(KEY_MOVES.get('ArrowUp')).toBeUndefined();
    expect(KEY_MOVES.get('Enter')).toBeUndefined();
  });
});

describe('applyMove', () => {
  it('ignores every move unless a game is being played', () => {
    for (const status of ['input', 'gameover', 'win'] as const) {
      const state = makeState({ status });
      for (const move of ['left', 'right', 'softDrop', 'hardDrop'] as const) {
        expect(applyMove(state, move)).toBe(state);
      }
    }
  });

  describe('left and right', () => {
    it('shift the piece by one column and leave everything else untouched', () => {
      const state = makeState({ currentCol: 1, currentRow: 2 });

      const left = applyMove(state, 'left');
      expect(left).toEqual({ ...state, currentCol: 0 });

      const right = applyMove(state, 'right');
      expect(right).toEqual({ ...state, currentCol: 2 });

      // The previous state is not mutated.
      expect(state.currentCol).toBe(1);
    });

    it('are blocked by the walls: the state object is returned as is', () => {
      const atLeftWall = makeState({ currentCol: 0 });
      expect(applyMove(atLeftWall, 'left')).toBe(atLeftWall);

      const atRightWall = makeState({ currentCol: 2 }); // width 2 on 4 columns
      expect(applyMove(atRightWall, 'right')).toBe(atRightWall);
    });

    it('are blocked by placed cells, white ones included', () => {
      const board = emptyBoard(6, 4);
      board[3][0] = false; // a white module still occupies its cell
      board[2][3] = true;
      const state = makeState({ board, currentCol: 1, currentRow: 2 });

      expect(applyMove(state, 'left')).toBe(state);
      expect(applyMove(state, 'right')).toBe(state);

      // One row higher the left side is free, the right side is still blocked.
      const higher = { ...state, currentRow: 1 };
      expect(applyMove(higher, 'left').currentCol).toBe(0);
      expect(applyMove(higher, 'right')).toBe(higher);
    });
  });

  describe('soft drop', () => {
    it('moves the piece down by one row while there is room', () => {
      const state = makeState({ currentCol: 0, currentRow: 0 });
      const next = applyMove(state, 'softDrop');

      expect(next).toEqual({ ...state, currentRow: 1 });
      expect(next.board).toBe(state.board); // nothing is written before the piece locks
    });

    it('locks the piece at its target once it rests there, and spawns the next piece', () => {
      const state = makeState({ currentCol: 0, currentRow: 4 }); // on the floor, at the target
      const next = applyMove(state, 'softDrop');

      expect(next.status).toBe('playing');
      expect(next.currentIndex).toBe(1);
      expect(next.currentCol).toBe(state.pieces[1].spawnCol);
      expect(next.currentRow).toBe(0);
      expect(next.board[4][0]).toBe(true);
      expect(next.board[5][1]).toBe(true);
      expect(next.board[4][2]).toBeNull();
      expect(state.board[4][0]).toBeNull(); // the previous board is not mutated
    });

    it('ends the game when the piece comes to rest anywhere else', () => {
      const wrongColumn = makeState({ currentCol: 2, currentRow: 4 });
      expect(applyMove(wrongColumn, 'softDrop').status).toBe('gameover');

      // Right column, but resting on a placed cell two rows above the target.
      const board = emptyBoard(6, 4);
      board[4][0] = true;
      const tooHigh = makeState({ board, currentCol: 0, currentRow: 2 });
      const next = applyMove(tooHigh, 'softDrop');
      expect(next.status).toBe('gameover');
      expect(next.board).toBe(board); // a lost piece is not written on the board
    });
  });

  describe('hard drop', () => {
    it('drops the piece to the lowest free row of its column and locks it there', () => {
      const state = makeState({ currentCol: 0, currentRow: 0 });
      const next = applyMove(state, 'hardDrop');

      expect(next.status).toBe('playing');
      expect(next.currentIndex).toBe(1);
      expect(next.board[4][0]).toBe(true);
      expect(next.board[5][1]).toBe(true);
    });

    it('ends the game when the column is not the expected one', () => {
      const state = makeState({ currentCol: 1, currentRow: 0 });
      expect(applyMove(state, 'hardDrop').status).toBe('gameover');
    });

    it('stops on placed cells: landing above the target ends the game', () => {
      const board = emptyBoard(6, 4);
      board[5][1] = false;
      const state = makeState({ board, currentCol: 0, currentRow: 0 });

      expect(applyMove(state, 'hardDrop').status).toBe('gameover');
    });

    it('wins the game when the last piece lands on its target', () => {
      const first = applyMove(makeState({ currentCol: 0 }), 'hardDrop');
      expect(first.status).toBe('playing');

      // Second piece: spawns at column 0, target at column 2.
      const moved = applyMove(applyMove(first, 'right'), 'right');
      expect(moved.currentCol).toBe(2);

      const won = applyMove(moved, 'hardDrop');
      expect(won.status).toBe('win');
      expect(won.board[4].every(cell => cell === true)).toBe(true);
      expect(won.board[5].every(cell => cell === true)).toBe(true);
    });
  });

  it('plays a whole game with the moves a player would make', () => {
    // Left, then gravity (soft drops) until the piece locks; then right twice and a hard drop.
    let state = applyMove(makeState(), 'left');
    expect(state.currentCol).toBe(0);

    for (let tick = 0; tick < 4; tick++) state = applyMove(state, 'softDrop');
    expect(state.currentRow).toBe(4);
    expect(state.currentIndex).toBe(0);

    state = applyMove(state, 'softDrop'); // cannot go lower: locks
    expect(state.currentIndex).toBe(1);

    state = applyMove(state, 'right');
    state = applyMove(state, 'right');
    state = applyMove(state, 'hardDrop');
    expect(state.status).toBe('win');
  });
});
