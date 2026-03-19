import BoardCell from './BoardCell';
import { SKY_ROWS } from './constants';
import { tk } from './theme';
import type { Piece, Theme } from './types';

interface GameBoardProps {
  qrSize: number;
  boardHeight: number;
  board: (boolean | null)[][];
  piece: Piece | null;
  currentCol: number;
  currentRow: number;
  ghostRow: number;
  theme: Theme;
  isGameOver: boolean;
  isWin: boolean;
  completedPieces: number;
  totalPieces: number;
  cellSize: number;
  onRestart: () => void;
}

export default function GameBoard({
  qrSize,
  boardHeight,
  board,
  piece,
  currentCol,
  currentRow,
  ghostRow,
  theme,
  isGameOver,
  isWin,
  completedPieces,
  totalPieces,
  cellSize,
  onRestart,
}: GameBoardProps) {
  const colors = tk(theme);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          position: 'relative',
          padding: 10,
          borderRadius: 18,
          background: isWin ? '#ffffff' : colors.bgPanel,
          boxShadow: isWin ? '0 24px 60px rgba(0, 0, 0, 0.28)' : `0 14px 32px ${theme.accent}12`,
          transition: 'background-color 500ms ease, box-shadow 500ms ease',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${qrSize}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${boardHeight}, ${cellSize}px)`,
            border: `2px solid ${isWin ? '#ffffff' : colors.border}`,
            filter: isGameOver ? 'brightness(0.6)' : 'none',
            transition: 'filter 0.3s, border-color 500ms ease',
          }}
        >
          {Array.from({ length: boardHeight * qrSize }, (_, index) => {
            const row = Math.floor(index / qrSize);
            const col = index % qrSize;

            return (
              <BoardCell
                key={index}
                row={row}
                col={col}
                board={board}
                piece={piece}
                currentCol={currentCol}
                currentRow={currentRow}
                ghostRow={ghostRow}
                theme={theme}
                active={!isGameOver && !isWin}
                won={isWin}
                cellSize={cellSize}
              />
            );
          })}
        </div>

        {!isWin && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 10 + SKY_ROWS * cellSize - 1,
                left: 10,
                right: 10,
                borderTop: `2px dashed ${theme.accent}77`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                padding: '3px 7px',
                borderRadius: 999,
                border: `1px solid ${theme.accent}55`,
                background: colors.bgPanel,
                color: colors.textMuted,
                fontFamily: 'monospace',
                fontSize: 9,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              Zone de chute
            </div>
            <div
              style={{
                position: 'absolute',
                top: 18 + SKY_ROWS * cellSize,
                right: 18,
                padding: '3px 7px',
                borderRadius: 999,
                border: `1px solid ${theme.accent}55`,
                background: colors.bgPanel,
                color: colors.textMuted,
                fontFamily: 'monospace',
                fontSize: 9,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              Zone QR
            </div>
          </>
        )}

        {isGameOver && (
          <div
            style={{
              position: 'absolute',
              inset: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(5, 10, 18, 0.56)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <div
              style={{
                minWidth: 220,
                padding: '14px 18px',
                borderRadius: 14,
                background: '#230b11',
                border: '1px solid #ef4444',
                textAlign: 'center',
                boxShadow: '0 18px 34px rgba(0, 0, 0, 0.34)',
              }}
            >
              <div style={{ color: '#fecaca', fontFamily: 'monospace', fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
                Mauvaise position
              </div>
              <button
                onClick={onRestart}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Recommencer
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontFamily: 'monospace', fontSize: 10 }}>
          <span>PROGRESSION</span>
          <span>{completedPieces} / {totalPieces}</span>
        </div>
        <div style={{ height: 3, background: colors.border, borderRadius: 2 }}>
          <div
            style={{
              height: '100%',
              width: `${(completedPieces / totalPieces) * 100}%`,
              borderRadius: 2,
              background: theme.accent,
              transition: 'width 0.3s ease',
              boxShadow: `0 0 8px ${theme.accent}88`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
