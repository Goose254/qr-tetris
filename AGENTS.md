# Working on QR Tetris

A playable QR code generator: the QR code of a text is cut into tetrominoes that fall one by
one, and the player drops each of them exactly where it belongs, Tetris-style. One static page,
no backend, live at <https://qr-tetris.douay.me>. Next.js 16 (App Router, Turbopack), React 19,
TypeScript strict, Vitest. MIT.

The interface and the README are in French (the README has an English summary). Code, comments
and commit messages are in English; `logic.test.ts` still has French test titles, so keep the
language of the file you edit. Commits follow Conventional Commits (`perf(solver): ...`,
`chore(repo): ...`) with a body that says why.

## Layout

| Path | What |
|---|---|
| `app/layout.tsx`, `app/page.tsx` | root layout (metadata, global CSS) and the single page |
| `app/globals.css` | the only stylesheet: base reset, page frame, spinner keyframes |
| `app/icon.svg` | static tab icon, default accent |
| `components/QrTetrisGame.tsx` | the client component: game state, gravity timer, keyboard, screen layout |
| `components/qr-tetris/logic.ts` | QR encoding, the tiling solver, board primitives (`canPlace`, `calcDropRow`, `lockPiece`) |
| `components/qr-tetris/moves.ts` | `applyMove`: the one transition for left, right, soft drop and hard drop |
| `components/qr-tetris/generate.ts`, `generate.worker.ts`, `gameGenerator.ts` | game generation off the main thread (see below) |
| `components/qr-tetris/ui.tsx`, `GameBoard.tsx`, `BoardCell.tsx` | presentational components |
| `components/qr-tetris/theme.ts`, `themeStore.ts`, `favicon.ts` | colour tokens, the stored theme, the tab icon redrawn in the accent colour |
| `components/qr-tetris/constants.ts`, `types.ts` | shared constants and types |

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint, must stay clean
npm test         # Vitest, one run
npm run build    # production build; `npm start` serves it
```

CI (`.github/workflows/ci.yml`, Node 22) runs `npm ci`, lint, test and build on every push and
pull request. Run lint, test and build before handing work over.

## Rules to keep

- **`logic.ts` stays a plain importable module with stable exports.** Another project vendors a
  copy of this file. No React, no DOM, no worker API in it; it imports only `qrcode`,
  `./constants` and `./types`. Do not rename or remove an export or reorder its parameters; a
  new parameter is optional and comes last. Exports: `buildQR`, `RandomSource`, `mulberry32`,
  `shuffle`, `buildPlayablePieces`, `emptyBoard`, `seededBoard`, `canPlace`, `calcDropRow`,
  `lockPiece`, `getPieceCell`. Say so in your report when a signature changes, so that the
  copy can be re-synced.
- **Randomness in the solver goes through the `rng` parameter**, never through `Math.random`
  directly: it defaults to `Math.random` in production and is seeded (`mulberry32`) in tests.
  How the solver works is explained in the README; keep that text true if you change it.
- **The worker.** `generate.worker.ts` is a thin wrapper around `generateGame()` in
  `generate.ts`, which also holds the message types. `gameGenerator.ts` owns the worker:
  latest request wins, and it falls back to the main thread if the worker cannot start. Its
  `new Worker(new URL('./generate.worker.ts', import.meta.url))` expression must stay literal,
  it is what the bundler detects to emit the worker chunk.
- **Styling is inline `style` props** with the tokens of `theme.ts` (`tk(theme)`) and
  `theme.accent`; there is no CSS framework. The inline styles assume the reset in
  `app/globals.css` (buttons without padding, line height inherited from `html`).
- `app/icon.svg` and `favicon.ts` draw the same icon; `favicon.test.ts` fails if they drift.

## Tests

Vitest in the Node environment (no DOM), one `*.test.ts` next to the module it covers:
`logic.test.ts` (board primitives, PRNG, shuffle, and the solver on a fixed seed),
`moves.test.ts`, `gameGenerator.test.ts` (with a fake `Worker`), `favicon.test.ts`. A solver
generation takes a few seconds. There are no component or end-to-end tests: check a change to
the interface in a browser against the production build, in dark and light themes and at a
phone width, and say in your report what you ran and what you only read.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
