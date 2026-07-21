'use client';

import { useCallback, useEffect, useState } from 'react';

import { CELL_SIZE_MAX, CELL_SIZE_MIN, FALL_MS } from './qr-tetris/constants';
import GameBoard from './qr-tetris/GameBoard';
import { buildPlayablePieces, buildQR, calcDropRow, canPlace, lockPiece, seededBoard } from './qr-tetris/logic';
import { tk } from './qr-tetris/theme';
import { persistTheme, useThemeStore } from './qr-tetris/themeStore';
import type { GState } from './qr-tetris/types';
import { AppTitle, InputScreen, KeyboardHints, Legend, PiecePreview, SettingsPanel, TouchControls, VictoryPanel } from './qr-tetris/ui';

const INIT: GState = {
  status: 'input',
  qrMatrix: [],
  qrSize: 0,
  pieces: [],
  board: [],
  currentIndex: 0,
  currentCol: 0,
  currentRow: 0,
  inputText: 'https://example.com',
};

function getViewport() {
  if (typeof window === 'undefined') return { width: 1280, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function QrTetrisGame() {
  const [gs, setGs] = useState<GState>(INIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useThemeStore();
  const [viewport, setViewport] = useState(getViewport);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const handleTheme = useCallback((nextTheme: typeof theme) => {
    persistTheme(nextTheme);
  }, []);

  useEffect(() => {
    const onResize = () => setViewport(getViewport());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia('(pointer: coarse)');
    const updatePointerMode = () => setIsCoarsePointer(media.matches || navigator.maxTouchPoints > 0);

    updatePointerMode();
    media.addEventListener('change', updatePointerMode);
    return () => media.removeEventListener('change', updatePointerMode);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = tk(theme).bg;
  }, [theme]);

  useEffect(() => {
    const a = theme.accent;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216 216"><g transform="translate(24 24)"><rect width="24" height="24" fill="${a}"/><rect x="24" width="24" height="24" fill="${a}"/><rect x="48" width="24" height="24" fill="${a}"/><rect x="72" width="24" height="24" fill="${a}"/><rect x="96" width="24" height="24" fill="${a}"/><rect x="120" width="24" height="24" fill="${a}"/><rect x="144" width="24" height="24" fill="${a}"/><rect y="24" width="24" height="24" fill="${a}"/><rect x="144" y="24" width="24" height="24" fill="${a}"/><rect y="48" width="24" height="24" fill="${a}"/><rect x="48" y="48" width="24" height="24" fill="${a}"/><rect x="72" y="48" width="24" height="24" fill="${a}"/><rect x="96" y="48" width="24" height="24" fill="${a}"/><rect x="144" y="48" width="24" height="24" fill="${a}"/><rect y="72" width="24" height="24" fill="${a}"/><rect x="48" y="72" width="24" height="24" fill="${a}"/><rect x="72" y="72" width="24" height="24" fill="${a}"/><rect x="96" y="72" width="24" height="24" fill="${a}"/><rect x="48" y="96" width="24" height="24" fill="${a}"/><rect x="72" y="96" width="24" height="24" fill="${a}"/><rect x="96" y="96" width="24" height="24" fill="${a}"/><rect x="144" y="72" width="24" height="24" fill="${a}"/><rect y="96" width="24" height="24" fill="${a}"/><rect x="144" y="96" width="24" height="24" fill="${a}"/><rect y="120" width="24" height="24" fill="${a}"/><rect x="144" y="120" width="24" height="24" fill="${a}"/><rect y="144" width="24" height="24" fill="${a}"/><rect x="24" y="144" width="24" height="24" fill="${a}"/><rect x="48" y="144" width="24" height="24" fill="${a}"/><rect x="72" y="144" width="24" height="24" fill="${a}"/><rect x="96" y="144" width="24" height="24" fill="${a}"/><rect x="120" y="144" width="24" height="24" fill="${a}"/><rect x="144" y="144" width="24" height="24" fill="${a}"/></g><g transform="translate(150 150)"><rect width="30" height="30" rx="7" fill="#fff"/><rect x="30" width="30" height="30" rx="7" fill="#fff"/><rect y="30" width="30" height="30" rx="7" fill="#fff"/><rect x="30" y="30" width="30" height="30" rx="7" fill="#fff"/></g></svg>`;
    const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = href;
  }, [theme.accent]);

  useEffect(() => {
    if (gs.status !== 'playing') return;

    const timer = setInterval(() => {
      setGs(prev => {
        if (prev.status !== 'playing') return prev;
        const piece = prev.pieces[prev.currentIndex];
        const nextRow = prev.currentRow + 1;
        if (canPlace(piece, prev.currentCol, nextRow, prev.board)) {
          return { ...prev, currentRow: nextRow };
        }
        return lockPiece(prev, prev.currentCol, prev.currentRow);
      });
    }, FALL_MS);

    return () => clearInterval(timer);
  }, [gs.status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowDown', ' '].includes(event.key)) return;
      event.preventDefault();

      setGs(prev => {
        if (prev.status !== 'playing') return prev;
        const piece = prev.pieces[prev.currentIndex];

        if (event.key === 'ArrowLeft') {
          const nextCol = prev.currentCol - 1;
          return canPlace(piece, nextCol, prev.currentRow, prev.board) ? { ...prev, currentCol: nextCol } : prev;
        }

        if (event.key === 'ArrowRight') {
          const nextCol = prev.currentCol + 1;
          return canPlace(piece, nextCol, prev.currentRow, prev.board) ? { ...prev, currentCol: nextCol } : prev;
        }

        if (event.key === 'ArrowDown') {
          const nextRow = prev.currentRow + 1;
          if (canPlace(piece, prev.currentCol, nextRow, prev.board)) return { ...prev, currentRow: nextRow };
          return lockPiece(prev, prev.currentCol, prev.currentRow);
        }

        const ghostRow = calcDropRow(piece, prev.currentCol, prev.currentRow, prev.board);
        return lockPiece(prev, prev.currentCol, ghostRow);
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const startGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const text = gs.inputText.trim() || 'https://example.com';
      const { matrix, size } = await buildQR(text);
      // Yield to the event loop so the loading state renders before the synchronous solver runs.
      await new Promise(resolve => setTimeout(resolve, 0));
      const pieces = buildPlayablePieces(matrix, size);
      const first = pieces[0];

      setGs({
        status: 'playing',
        qrMatrix: matrix,
        qrSize: size,
        pieces,
        board: seededBoard(matrix, size),
        currentIndex: 0,
        currentCol: first.spawnCol,
        currentRow: 0,
        inputText: text,
      });
    } catch (err) {
      console.error('Failed to build a playable QR layout:', err);
      setError('Impossible de générer une partie pour ce texte. Vérifiez qu’il n’est pas trop long, puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, [gs.inputText]);

  const restart = useCallback(() => setGs(state => ({ ...INIT, inputText: state.inputText })), []);

  const moveLeft = useCallback(() => {
    setGs(prev => {
      if (prev.status !== 'playing') return prev;
      const piece = prev.pieces[prev.currentIndex];
      const nextCol = prev.currentCol - 1;
      return canPlace(piece, nextCol, prev.currentRow, prev.board) ? { ...prev, currentCol: nextCol } : prev;
    });
  }, []);

  const moveRight = useCallback(() => {
    setGs(prev => {
      if (prev.status !== 'playing') return prev;
      const piece = prev.pieces[prev.currentIndex];
      const nextCol = prev.currentCol + 1;
      return canPlace(piece, nextCol, prev.currentRow, prev.board) ? { ...prev, currentCol: nextCol } : prev;
    });
  }, []);

  const softDrop = useCallback(() => {
    setGs(prev => {
      if (prev.status !== 'playing') return prev;
      const piece = prev.pieces[prev.currentIndex];
      const nextRow = prev.currentRow + 1;
      if (canPlace(piece, prev.currentCol, nextRow, prev.board)) return { ...prev, currentRow: nextRow };
      return lockPiece(prev, prev.currentCol, prev.currentRow);
    });
  }, []);

  const hardDrop = useCallback(() => {
    setGs(prev => {
      if (prev.status !== 'playing') return prev;
      const piece = prev.pieces[prev.currentIndex];
      const ghostRow = calcDropRow(piece, prev.currentCol, prev.currentRow, prev.board);
      return lockPiece(prev, prev.currentCol, ghostRow);
    });
  }, []);

  if (gs.status === 'input') {
    return <InputScreen gs={gs} setGs={setGs} onStart={startGame} loading={loading} error={error} theme={theme} onThemeChange={handleTheme} />;
  }

  const colors = tk(theme);
  const isGameOver = gs.status === 'gameover';
  const isWin = gs.status === 'win';
  const showInteractivePanel = !isGameOver && !isWin;
  const piece = !isGameOver && !isWin ? (gs.pieces[gs.currentIndex] ?? null) : null;
  const nextPiece = !isGameOver && !isWin ? (gs.pieces[gs.currentIndex + 1] ?? null) : null;
  const boardHeight = gs.board.length;
  const completedPieces = isWin ? gs.pieces.length : gs.currentIndex;
  const ghostRow = piece ? calcDropRow(piece, gs.currentCol, gs.currentRow, gs.board) : -1;
  const compactLayout = viewport.width < 980;
  const showTouchControls = isCoarsePointer;
  const reservedHeight = compactLayout ? (showTouchControls ? 390 : 300) : 170;
  const reservedWidth = compactLayout ? 48 : 240;
  const availableWidth = Math.max(140, viewport.width - reservedWidth);
  const availableHeight = Math.max(180, viewport.height - reservedHeight);
  const cellSize = clamp(
    Math.floor(Math.min(availableWidth / gs.qrSize, availableHeight / boardHeight)),
    CELL_SIZE_MIN,
    CELL_SIZE_MAX,
  );
  const previewCellSize = Math.max(10, Math.min(cellSize, 18));

  return (
    <div
      style={{
        background: colors.bg,
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: compactLayout ? 12 : 16,
        gap: compactLayout ? 12 : 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0 }}>
        <AppTitle theme={theme} size="sm" />
        <SettingsPanel theme={theme} onChange={handleTheme} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: compactLayout ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compactLayout ? 12 : 18,
        }}
      >
        <GameBoard
          qrSize={gs.qrSize}
          boardHeight={boardHeight}
          board={gs.board}
          piece={piece}
          currentCol={gs.currentCol}
          currentRow={gs.currentRow}
          ghostRow={ghostRow}
          theme={theme}
          isGameOver={isGameOver}
          isWin={isWin}
          completedPieces={completedPieces}
          totalPieces={gs.pieces.length}
          cellSize={cellSize}
          onRestart={restart}
        />

        <div
          style={{
            width: compactLayout ? '100%' : 188,
            maxWidth: compactLayout ? 420 : 188,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            flexShrink: 0,
            alignSelf: compactLayout ? 'stretch' : 'center',
          }}
        >
          {isWin ? (
            <VictoryPanel inputText={gs.inputText} theme={theme} onRestart={restart} />
          ) : showInteractivePanel ? (
            <>
              {nextPiece && <PiecePreview piece={nextPiece} theme={theme} cellSize={previewCellSize} label="Pièce suivante" />}
              {!compactLayout && <KeyboardHints theme={theme} />}
              {showTouchControls && (
                <TouchControls
                  theme={theme}
                  onMoveLeft={moveLeft}
                  onMoveRight={moveRight}
                  onSoftDrop={softDrop}
                  onHardDrop={hardDrop}
                  compact={compactLayout}
                />
              )}
              {piece && <Legend theme={theme} />}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
