import { useState, type Dispatch, type SetStateAction } from 'react';

import { ACCENTS } from './constants';
import { tk } from './theme';
import type { GState, Piece, Theme } from './types';

const FINDER_PATTERN = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

function FinderIcon({ color, size = 5 }: { color: string; size?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${size}px)`, gap: '1px', lineHeight: 0, flexShrink: 0 }}>
      {FINDER_PATTERN.flat().map((value, index) => (
        <div key={index} style={{ width: size, height: size, backgroundColor: value ? color : 'transparent', borderRadius: 0.5 }} />
      ))}
    </div>
  );
}

export function AppTitle({ theme, size = 'lg' }: { theme: Theme; size?: 'sm' | 'lg' }) {
  const colors = tk(theme);
  const large = size === 'lg';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: large ? 16 : 10 }}>
      <FinderIcon color={theme.accent} size={large ? 6 : 4} />
      <div style={{ fontFamily: 'monospace', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span
          style={{
            color: theme.accent,
            fontSize: large ? 44 : 22,
            fontWeight: 900,
            letterSpacing: '-1px',
            textShadow: `0 0 24px ${theme.accent}55`,
          }}
        >
          QR
        </span>
        <span
          style={{
            color: colors.text,
            fontSize: large ? 18 : 12,
            fontWeight: 700,
            letterSpacing: large ? '8px' : '4px',
            opacity: 0.85,
          }}
        >
          TETRIS
        </span>
      </div>
    </div>
  );
}

export function SettingsPanel({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const [open, setOpen] = useState(false);
  const colors = tk(theme);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(current => !current)}
        style={{
          background: 'none',
          border: `1px solid ${colors.border}`,
          color: colors.textMuted,
          width: 34,
          height: 34,
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        title="Paramètres"
      >
        ⚙
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              background: colors.bgPanel,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              zIndex: 50,
              minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: colors.textMuted, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                Thème
              </span>
              <button
                onClick={() => onChange({ ...theme, mode: theme.mode === 'dark' ? 'light' : 'dark' })}
                style={{
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{theme.mode === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme.mode === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: colors.textMuted, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                Couleur
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {ACCENTS.map(accent => (
                  <button
                    key={accent.value}
                    onClick={() => onChange({ ...theme, accent: accent.value })}
                    title={accent.label}
                    style={{
                      height: 28,
                      borderRadius: 7,
                      backgroundColor: accent.value,
                      cursor: 'pointer',
                      border: theme.accent === accent.value ? `2px solid ${colors.text}` : '2px solid transparent',
                      outline: theme.accent === accent.value ? `2px solid ${accent.value}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function InputScreen({
  gs,
  setGs,
  onStart,
  loading = false,
  theme,
  onThemeChange,
}: {
  gs: GState;
  setGs: Dispatch<SetStateAction<GState>>;
  onStart: () => void;
  loading?: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  const colors = tk(theme);

  return (
    <div style={{ background: colors.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <SettingsPanel theme={theme} onChange={onThemeChange} />
      </div>

      <AppTitle theme={theme} size="lg" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, textAlign: 'center' }}>
        <p style={{ color: colors.text, fontFamily: 'monospace', fontSize: 14, lineHeight: 1.7, margin: 0, fontWeight: 700 }}>
          Générer un QR code, c&apos;était bien trop facile.
          <br />
          <span style={{ color: theme.accent }}>Il est temps de changer ça.</span>
        </p>
        <p style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, margin: 0 }}>
          Le QR est découpé en tétrominos qui tombent un à un.
          <br />
          Chaque pièce doit atterrir exactement à sa place.
          <br />
          Une erreur de placement et la partie est perdue.
        </p>
        <p style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 12, margin: 0, opacity: 0.7 }}>
          Si vous voulez votre QR code, méritez-le. Bonne chance.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        <label style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px' }}>
          URL ou texte
        </label>
        <input
          type="text"
          value={gs.inputText}
          onChange={event => setGs(state => ({ ...state, inputText: event.target.value }))}
          onKeyDown={event => event.key === 'Enter' && !loading && onStart()}
          style={{
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: '12px 16px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 14,
            textAlign: 'center',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
          autoFocus
          disabled={loading}
        />
        <button
          onClick={onStart}
          disabled={loading}
          style={{
            background: theme.accent,
            color: '#000000',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: '3px',
            boxShadow: `0 4px 20px ${theme.accent}55`,
            opacity: loading ? 0.75 : 1,
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '2px solid #00000040',
                  borderTopColor: '#000000',
                  display: 'inline-block',
                  animation: 'qrt-spin 0.7s linear infinite',
                  flexShrink: 0,
                }}
              />
              Génération en cours...
            </>
          ) : 'JOUER →'}
        </button>
      </div>

      <div style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', lineHeight: 2 }}>
        ← → déplacer · ↓ soft drop · ESPACE hard drop
      </div>
    </div>
  );
}

export function VictoryPanel({ inputText, theme, onRestart }: { inputText: string; theme: Theme; onRestart: () => void }) {
  const colors = tk(theme);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 16,
        background: colors.bgPanel,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        maxWidth: 280,
      }}
    >
      <div>
        <h2 style={{ color: theme.accent, fontFamily: 'monospace', fontWeight: 900, fontSize: 22, margin: '0 0 6px' }}>
          MÉRITÉ.
        </h2>
        <p style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, margin: 0 }}>
          Vous l&apos;avez gagné, pièce par pièce.
          <br />
          La grille bascule en QR final —
          <br />
          scanne directement le plateau.
        </p>
      </div>

      <p style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', margin: 0 }}>
        {inputText}
      </p>

      <button
        onClick={onRestart}
        style={{
          background: theme.accent,
          color: '#08101b',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        Rejouer
      </button>
    </div>
  );
}

export function PiecePreview({
  piece,
  theme,
  cellSize,
  label = 'Pièce',
}: {
  piece: Piece;
  theme: Theme;
  cellSize: number;
  label?: string;
}) {
  const colors = tk(theme);

  return (
    <div>
      <div style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${piece.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${piece.height}, ${cellSize}px)`,
          border: `1px solid ${colors.border}`,
          background: colors.skyBg,
        }}
      >
        {piece.cells.flatMap((rowCells, rowIdx) =>
          rowCells.map((isBlack, colIdx) => {
            const filled = piece.mask[rowIdx][colIdx];
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: filled ? (isBlack ? '#050505' : '#fffdfa') : 'transparent',
                  border: filled ? `1px solid ${isBlack ? theme.accent + 'cc' : theme.accent + '77'}` : '1px solid transparent',
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function TouchButton({ label, onPress, theme, grow = false }: { label: string; onPress: () => void; theme: Theme; grow?: boolean }) {
  const colors = tk(theme);

  return (
    <button
      onPointerDown={event => {
        event.preventDefault();
        onPress();
      }}
      style={{
        background: colors.bgPanel,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        minWidth: grow ? 0 : 56,
        width: grow ? '100%' : 56,
        height: 56,
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 700,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
      }}
    >
      {label}
    </button>
  );
}

export function TouchControls({
  theme,
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  compact,
}: {
  theme: Theme;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  compact: boolean;
}) {
  const colors = tk(theme);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: compact ? '100%' : 188 }}>
      <div style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Tactile
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <TouchButton label="←" onPress={onMoveLeft} theme={theme} />
        <TouchButton label="↓" onPress={onSoftDrop} theme={theme} />
        <TouchButton label="→" onPress={onMoveRight} theme={theme} />
      </div>
      <TouchButton label="DROP" onPress={onHardDrop} theme={theme} grow />
    </div>
  );
}

export function KeyboardHints({ theme }: { theme: Theme }) {
  const colors = tk(theme);

  return (
    <div style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.9 }}>
      <div style={{ color: colors.text, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>Clavier</div>
      <div>← → déplacer</div>
      <div>↓ soft drop</div>
      <div>ESPACE hard drop</div>
    </div>
  );
}

export function Legend({ theme }: { theme: Theme }) {
  const colors = tk(theme);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
      <div style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Légende
      </div>
      {[
        { color: `${theme.accent}20`, border: `2px solid ${theme.accent}70`, label: 'Cible' },
        { color: `${theme.accent}30`, border: `1px dashed ${theme.accent}55`, label: 'Ghost' },
      ].map(({ color, border, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: color, border, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ color: colors.textMuted, fontFamily: 'monospace', fontSize: 10 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
