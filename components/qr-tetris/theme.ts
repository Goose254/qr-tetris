import type { Theme, ThemeTokens } from './types';

export const DARK: ThemeTokens = {
  bg: '#060b12',
  bgPanel: '#0f1724',
  bgInput: '#111c2d',
  border: '#314056',
  text: '#ecf2ff',
  textMuted: '#90a2bc',
  cellBg: '#101928',
  cellBorder: '#223047',
  skyBg: '#08101b',
  skyBorder: '#172437',
};

export const LIGHT: ThemeTokens = {
  bg: '#e9eef5',
  bgPanel: '#ffffff',
  bgInput: '#f6f8fb',
  border: '#a9b6c8',
  text: '#102036',
  textMuted: '#516177',
  cellBg: '#dce5ef',
  cellBorder: '#acb9ca',
  skyBg: '#edf3f9',
  skyBorder: '#c8d4e3',
};

export function tk(theme: Theme) {
  return theme.mode === 'dark' ? DARK : LIGHT;
}
