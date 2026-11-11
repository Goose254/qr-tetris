# QR Tetris

Générer un QR code, c'était bien trop facile. **QR Tetris** est un générateur de QR code… jouable : le QR code de votre URL (ou de n'importe quel texte) est découpé en tétrominos qui tombent un à un, et c'est à vous de les placer, façon Tetris. Chaque pièce doit atterrir exactement à sa place — une erreur et la partie est perdue. À la fin, la grille reconstituée est un vrai QR code, scannable directement sur le plateau.

**➡️ Jouer maintenant : [qr-tetris.douay.me](https://qr-tetris.douay.me/)**

![Capture d'écran](./screenshot.png)

## English summary

**QR Tetris** is a playable QR code generator: the QR code of your URL (or of any text) is cut into tetrominoes that fall one by one, and you have to drop each of them exactly where it belongs, Tetris-style. One misplaced piece and the game is lost; once the grid is complete, it is a real QR code you can scan straight from the board. Play it at [qr-tetris.douay.me](https://qr-tetris.douay.me/). The rest of this README is in French.

How the solver works (`components/qr-tetris/logic.ts`):

- The text is encoded as a QR code (error correction level M); one "anchor" cell is pre-placed in the bottom-right corner so that the number of remaining cells is divisible by 4.
- The grid is split into random macro regions made of 4×4 blocks (1×1, 1×2 or 2×1 blocks), solved one after the other from bottom to top; a multi-block region that cannot be solved is split again into single blocks.
- Each region is an exact-cover problem solved by backtracking: the solver works on the lowest uncovered row, picks the cell with the fewest possible placements (minimum remaining values) and caches dead ends.
- A placement only counts if the piece is playable: a breadth-first search checks that it can travel from a spawn column to its target using left, right and down moves only, and that it locks there.
- Each region solve is bounded (3 s and 120,000 steps); 8 full attempts are always run and one of the distinct layouts found is picked at random.
- All of this runs in a Web Worker so the page stays responsive, with a fallback on the main thread.

How to run it:

```bash
npm install
npm run dev              # http://localhost:3000
npm test && npm run lint
npm run build && npm start
```

## Comment ça marche

Le cœur du projet est un solveur de pavage (`components/qr-tetris/logic.ts`) qui transforme un QR code en une partie de Tetris gagnable :

1. **Génération du QR** — Le texte saisi est encodé en QR code (niveau de correction M) via la bibliothèque [`qrcode`](https://www.npmjs.com/package/qrcode), ce qui donne une matrice carrée de modules noirs/blancs.

2. **Pavage en tétrominos** — La grille entière (moins une unique cellule « ancre » pré-posée dans le coin inférieur droit, pour que le nombre de cellules restantes soit divisible par 4) doit être recouverte par des tétrominos : les 7 pièces classiques du Tetris, dans toutes leurs rotations. C'est un problème de couverture exacte, résolu par **backtracking**.

3. **Découpage en régions macro** — Plutôt que d'attaquer toute la grille d'un coup (explosion combinatoire), la grille est découpée en régions de blocs 4×4 (regroupés en régions 1×1, 1×2 ou 2×1 blocs, tirées aléatoirement), résolues indépendamment du bas vers le haut. Si une région multi-blocs résiste, elle est re-découpée en blocs individuels. Les régions du dernier rang/colonne absorbent la bordure de la grille pour éviter un monopole de pièces « I ».

4. **Heuristique MRV et cache de dead-ends** — À chaque étape, le solveur traite la rangée non couverte la plus basse et y choisit la cellule qui a le **moins d'options de placement** (heuristique *Minimum Remaining Values*), ce qui détecte les impasses au plus tôt. Les états déjà identifiés comme sans issue sont mémorisés dans un **cache de dead-ends** pour ne jamais les ré-explorer. Un léger biais favorise les orientations de pièces encore peu utilisées, pour varier les formes.

5. **Jouabilité garantie** — Un pavage valide ne suffit pas : chaque pièce doit aussi être *jouable*. Le solveur vérifie par un parcours en largeur (BFS) qu'il existe une colonne d'apparition depuis laquelle la pièce peut réellement descendre jusqu'à sa position cible avec les seuls déplacements du Tetris (gauche, droite, descente), et qu'elle s'y verrouille naturellement. C'est pourquoi les pièces sont ordonnées de bas en haut.

6. **Garde-fous** — La borne en temps (3 s) et en nombre d'étapes (120 000) s'applique à **chaque résolution de région** (`solveCandidateSet`), pas à la tentative entière : une tentative enchaîne toutes les régions de la grille (plus les blocs individuels d'une région re-découpée), elle n'a donc pas de plafond global et peut durer bien plus de 3 s sur un grand QR code. Le solveur lance toujours 8 tentatives complètes, sans s'arrêter à la première réussite, puis tire une solution au hasard parmi les pavages distincts obtenus, pour que chaque partie soit différente ; si aucune tentative n'aboutit, la génération échoue avec un message d'erreur.

Tout ce calcul (encodage du QR + pavage) s'exécute dans un **Web Worker** (`components/qr-tetris/generate.worker.ts`, simple enveloppe autour de `logic.ts`) pour que l'interface reste fluide pendant la génération, avec repli sur le thread principal si le worker est indisponible.

## Stack technique

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/) (mode strict)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [qrcode](https://www.npmjs.com/package/qrcode) pour l'encodage QR
- [Vitest](https://vitest.dev/) pour les tests unitaires

## Installation

```bash
git clone https://github.com/Goose254/qr-tetris.git
cd qr-tetris
npm install
```

### Développement

```bash
npm run dev
```

Puis ouvrez [http://localhost:3000](http://localhost:3000).

### Build de production

```bash
npm run build
npm start
```

### Tests et lint

```bash
npm test
npm run lint
```

## Licence

Distribué sous licence [MIT](LICENSE). © 2026 Vincent Douay.
