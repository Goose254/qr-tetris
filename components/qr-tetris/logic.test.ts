import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SKY_ROWS } from './constants';
import {
  buildPlayablePieces,
  buildQR,
  calcDropRow,
  canPlace,
  emptyBoard,
  lockPiece,
  mulberry32,
  seededBoard,
  shuffle,
} from './logic';
import type { GState, Piece } from './types';

// Graine fixe de tous les tests qui dépendent du hasard : leurs tirages sont reproductibles.
const SEED = 20260101;

// Pièce carrée 2×2 (O) entièrement noire, pratique pour les tests de placement.
function makeSquarePiece(overrides: Partial<Piece> = {}): Piece {
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
    expectedRow: 0,
    spawnCol: 0,
    width: 2,
    height: 2,
    sortRow: 1,
    ...overrides,
  };
}

describe('emptyBoard', () => {
  it('crée un plateau aux bonnes dimensions rempli de null', () => {
    const board = emptyBoard(3, 5);
    expect(board).toHaveLength(3);
    for (const row of board) {
      expect(row).toHaveLength(5);
      expect(row.every(cell => cell === null)).toBe(true);
    }
  });
});

describe('seededBoard', () => {
  it('ajoute les rangées de ciel et pré-remplit uniquement la cellule ancre', () => {
    const size = 5;
    const matrix = Array.from({ length: size }, () => Array(size).fill(true));
    const board = seededBoard(matrix, size);

    expect(board).toHaveLength(size + SKY_ROWS);
    expect(board[0]).toHaveLength(size);
    expect(board[SKY_ROWS + size - 1][size - 1]).toBe(matrix[size - 1][size - 1]);

    const filled = board.flat().filter(cell => cell !== null);
    expect(filled).toHaveLength(1);
  });
});

describe('canPlace', () => {
  it('accepte un placement dans les limites d’un plateau vide', () => {
    const board = emptyBoard(6, 4);
    expect(canPlace(makeSquarePiece(), 0, 0, board)).toBe(true);
    expect(canPlace(makeSquarePiece(), 2, 4, board)).toBe(true);
  });

  it('refuse un placement hors limites', () => {
    const board = emptyBoard(6, 4);
    const piece = makeSquarePiece();
    expect(canPlace(piece, -1, 0, board)).toBe(false);
    expect(canPlace(piece, 3, 0, board)).toBe(false); // dépasse à droite (largeur 2 sur 4 colonnes)
    expect(canPlace(piece, 0, 5, board)).toBe(false); // dépasse en bas
    expect(canPlace(piece, 0, -1, board)).toBe(false);
  });

  it('détecte la collision avec une cellule occupée, même blanche (false)', () => {
    const board = emptyBoard(6, 4);
    board[2][1] = false; // un module blanc occupe aussi la cellule
    expect(canPlace(makeSquarePiece(), 0, 1, board)).toBe(false);
    expect(canPlace(makeSquarePiece(), 2, 1, board)).toBe(true);
  });

  it('ignore les collisions sur les trous du masque', () => {
    const board = emptyBoard(6, 4);
    board[0][0] = true;
    // Pièce en L dont le coin haut-gauche est un trou du masque.
    const piece = makeSquarePiece({
      mask: [
        [false, true],
        [true, true],
      ],
    });
    expect(canPlace(piece, 0, 0, board)).toBe(true);
  });
});

describe('calcDropRow', () => {
  it('fait tomber la pièce jusqu’en bas d’un plateau vide', () => {
    const board = emptyBoard(6, 4);
    const piece = makeSquarePiece();
    expect(calcDropRow(piece, 0, 0, board)).toBe(4); // 6 rangées - hauteur 2
  });

  it('s’arrête au-dessus d’un obstacle', () => {
    const board = emptyBoard(6, 4);
    board[4][0] = true;
    const piece = makeSquarePiece();
    expect(calcDropRow(piece, 0, 0, board)).toBe(2);
    // Colonnes libres : la pièce tombe jusqu'en bas.
    expect(calcDropRow(piece, 2, 0, board)).toBe(4);
  });

  it('retourne la rangée courante si la pièce est déjà posée', () => {
    const board = emptyBoard(6, 4);
    board[3][0] = true;
    board[3][1] = true;
    const piece = makeSquarePiece();
    expect(calcDropRow(piece, 0, 1, board)).toBe(1);
  });
});

describe('lockPiece', () => {
  function makeState(pieces: Piece[], currentIndex = 0): GState {
    return {
      status: 'playing',
      qrMatrix: [],
      qrSize: 4,
      pieces,
      board: emptyBoard(6, 4),
      currentIndex,
      currentCol: pieces[currentIndex].expectedCol,
      currentRow: pieces[currentIndex].expectedRow,
      inputText: 'test',
    };
  }

  it('passe en gameover si la pièce est verrouillée au mauvais endroit', () => {
    const piece = makeSquarePiece({ expectedCol: 2, expectedRow: 4 });
    const state = makeState([piece]);
    const next = lockPiece(state, 0, 4); // mauvaise colonne
    expect(next.status).toBe('gameover');
  });

  it('écrit la pièce sur le plateau et passe à la pièce suivante', () => {
    const first = makeSquarePiece({ expectedCol: 0, expectedRow: 4 });
    const second = makeSquarePiece({ id: 1, expectedCol: 2, expectedRow: 4, spawnCol: 1 });
    const state = makeState([first, second]);

    const next = lockPiece(state, 0, 4);

    expect(next.status).toBe('playing');
    expect(next.currentIndex).toBe(1);
    expect(next.currentCol).toBe(second.spawnCol);
    expect(next.currentRow).toBe(0);
    expect(next.board[4][0]).toBe(true);
    expect(next.board[5][1]).toBe(true);
    // Le plateau d'origine n'est pas muté.
    expect(state.board[4][0]).toBeNull();
  });

  it('passe en win après la dernière pièce bien placée', () => {
    const piece = makeSquarePiece({ expectedCol: 1, expectedRow: 3 });
    const state = makeState([piece]);
    const next = lockPiece(state, 1, 3);
    expect(next.status).toBe('win');
    expect(next.board[3][1]).toBe(true);
  });
});

describe('mulberry32', () => {
  it('produit la même suite pour une même graine, dans [0, 1)', () => {
    const first = mulberry32(SEED);
    const second = mulberry32(SEED);

    for (let i = 0; i < 1000; i++) {
      const value = first();
      expect(value).toBe(second());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('produit des suites différentes pour des graines différentes', () => {
    const first = mulberry32(1);
    const second = mulberry32(2);
    const draws = (rng: () => number) => Array.from({ length: 8 }, () => rng());

    expect(draws(first)).not.toEqual(draws(second));
  });
});

describe('shuffle', () => {
  it('conserve tous les éléments sans muter le tableau d’origine', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const result = shuffle(input);

    expect(input).toEqual(copy);
    expect([...result].sort((a, b) => a - b)).toEqual(copy);
  });

  it('avec une source à graine, donne une permutation reproductible', () => {
    const input = Array.from({ length: 50 }, (_, index) => index);
    const first = shuffle(input, mulberry32(SEED));
    const second = shuffle(input, mulberry32(SEED));

    expect(first).toEqual(second);
    expect(first).not.toEqual(input); // 50! ordres possibles : l'identité serait un bug
    expect([...first].sort((a, b) => a - b)).toEqual(input);
    expect(shuffle(input, mulberry32(SEED + 1))).not.toEqual(first);
  });

  it('n’est pas visiblement biaisé : les 24 permutations de 4 éléments sortent à la même fréquence', () => {
    const rng = mulberry32(SEED);
    const runs = 24000;
    const counts = new Map<string, number>();

    for (let run = 0; run < runs; run++) {
      const key = shuffle([0, 1, 2, 3], rng).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // Attendu : 1000 tirages par permutation, écart-type ≈ 31. La tolérance de ±15 % (≈ 5 σ)
    // laisse passer un mélange uniforme et rejette un tri à comparateur aléatoire, dont les
    // permutations les plus fréquentes sortent plusieurs fois plus souvent que les plus rares.
    const expected = runs / 24;
    expect(counts.size).toBe(24);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.85);
      expect(count).toBeLessThan(expected * 1.15);
    }
  });
});

describe('buildQR', () => {
  it('produit une matrice carrée de taille valide avec les motifs de repérage', async () => {
    const { matrix, size } = await buildQR('https://example.com');

    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 21) % 4).toBe(0); // tailles QR valides : 21, 25, 29, …
    expect(matrix).toHaveLength(size);
    for (const row of matrix) expect(row).toHaveLength(size);

    // Coins des trois motifs de repérage (finder patterns) : modules noirs.
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][size - 1]).toBe(true);
    expect(matrix[size - 1][0]).toBe(true);
  });
});

// Vérifie qu'un jeu de pièces pave exactement la grille : tétrominos, dans les limites,
// sans chevauchement, aux couleurs du QR, toutes les cellules couvertes sauf l'ancre.
function expectValidTiling(matrix: boolean[][], size: number, pieces: Piece[]) {
  // Toutes les cellules sauf l'ancre pré-posée doivent être couvertes.
  expect(pieces.length * 4).toBe(size * size - 1);

  const covered = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  covered[size - 1][size - 1] = true; // cellule ancre pré-posée

  for (const piece of pieces) {
    let maskCells = 0;

    for (let r = 0; r < piece.height; r++) {
      for (let c = 0; c < piece.width; c++) {
        if (!piece.mask[r][c]) continue;
        maskCells++;

        const qrRow = piece.expectedRow - SKY_ROWS + r;
        const qrCol = piece.expectedCol + c;

        expect(qrRow).toBeGreaterThanOrEqual(0);
        expect(qrRow).toBeLessThan(size);
        expect(qrCol).toBeGreaterThanOrEqual(0);
        expect(qrCol).toBeLessThan(size);

        // Pas de chevauchement.
        expect(covered[qrRow][qrCol]).toBe(false);
        covered[qrRow][qrCol] = true;

        // La pièce transporte la couleur du module QR correspondant.
        expect(piece.cells[r][c]).toBe(matrix[qrRow][qrCol]);
      }
    }

    // Chaque pièce est bien un tétromino.
    expect(maskCells).toBe(4);
  }

  // Couverture totale.
  expect(covered.every(row => row.every(Boolean))).toBe(true);
}

// Rejoue les pièces dans l'ordre, chacune verrouillée à sa cible : la partie doit être gagnée.
function expectWinnableGame(matrix: boolean[][], size: number, pieces: Piece[]) {
  let state: GState = {
    status: 'playing',
    qrMatrix: matrix,
    qrSize: size,
    pieces,
    board: seededBoard(matrix, size),
    currentIndex: 0,
    currentCol: pieces[0].spawnCol,
    currentRow: 0,
    inputText: 'https://example.com',
  };

  for (const piece of pieces) {
    // La pièce doit pouvoir apparaître à sa colonne de spawn.
    expect(canPlace(piece, piece.spawnCol, 0, state.board)).toBe(true);
    // Verrouillée à sa position cible, la partie continue (ou se termine en win).
    state = lockPiece({ ...state, currentCol: piece.expectedCol }, piece.expectedCol, piece.expectedRow);
    expect(state.status).not.toBe('gameover');
  }

  expect(state.status).toBe('win');
}

// Le solveur tire tout son aléa d'une source injectable : avec mulberry32 et une graine fixe,
// ces tests rejouent toujours exactement le même pavage. (Seule la borne en temps d'une région,
// 3 s, pourrait faire diverger deux exécutions ; une génération entière dure ici ≈ 3 s pour
// quelques centaines de résolutions de région, donc aucune ne s'en approche.)
describe('buildPlayablePieces (solveur)', () => {
  let matrix: boolean[][];
  let size: number;
  let pieces: Piece[];

  beforeAll(async () => {
    ({ matrix, size } = await buildQR('https://example.com'));
    pieces = buildPlayablePieces(matrix, size, mulberry32(SEED));
  }, 60000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pave exactement tous les modules du QR avec des tétrominos, sans chevauchement', () => {
    expectValidTiling(matrix, size, pieces);
  });

  it('rejoue chaque pièce comme une partie de Tetris gagnante', () => {
    expectWinnableGame(matrix, size, pieces);
  });

  it(
    'donne exactement les mêmes pièces pour une même graine, sans jamais appeler Math.random',
    () => {
      const random = vi.spyOn(Math, 'random');
      const again = buildPlayablePieces(matrix, size, mulberry32(SEED));

      expect(again).toEqual(pieces);
      expect(random).not.toHaveBeenCalled();
    },
    60000,
  );

  it(
    'donne un autre pavage, tout aussi valide et gagnable, pour une autre graine',
    () => {
      const other = buildPlayablePieces(matrix, size, mulberry32(SEED + 1));

      expect(other).not.toEqual(pieces);
      expectValidTiling(matrix, size, other);
      expectWinnableGame(matrix, size, other);
    },
    60000,
  );

  it(
    'sans source fournie, tire son aléa de Math.random et reste valide (comportement de production)',
    async () => {
      const small = await buildQR('QR');
      const random = vi.spyOn(Math, 'random');
      const unseeded = buildPlayablePieces(small.matrix, small.size);

      expect(random).toHaveBeenCalled();
      expectValidTiling(small.matrix, small.size, unseeded);
      expectWinnableGame(small.matrix, small.size, unseeded);
    },
    60000,
  );
});
