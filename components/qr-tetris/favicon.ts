import { FINDER_PATTERN } from './constants';

// The tab icon follows the accent colour chosen in the settings, so it cannot be a static
// file: it is rebuilt as an SVG data URI and swapped into <link rel="icon"> on the client.
// app/icon.svg is the same drawing with the default accent; it is what the server sends
// (and what a crawler or a browser without JavaScript sees). Keep the two in step:
// favicon.test.ts compares them.

const MODULE = 24; // side of one finder module
const MARGIN = 24; // empty border around the finder
const TILE = 30; // side of one cell of the white O tetromino laid over the bottom-right corner
const TILE_ORIGIN = 150;
const TILE_RADIUS = 7;
const TILE_FILL = '#ffffff';
const VIEW_BOX = MARGIN * 2 + FINDER_PATTERN.length * MODULE;

export function buildFaviconSvg(accent: string): string {
  const modules = FINDER_PATTERN.flatMap((row, y) =>
    row.flatMap((filled, x) =>
      filled ? [`<rect x="${x * MODULE}" y="${y * MODULE}" width="${MODULE}" height="${MODULE}" fill="${accent}"/>`] : []
    )
  );

  const tetromino = [0, 1].flatMap(y =>
    [0, 1].map(x => `<rect x="${x * TILE}" y="${y * TILE}" width="${TILE}" height="${TILE}" rx="${TILE_RADIUS}" fill="${TILE_FILL}"/>`)
  );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_BOX} ${VIEW_BOX}">` +
    `<g transform="translate(${MARGIN} ${MARGIN})">${modules.join('')}</g>` +
    `<g transform="translate(${TILE_ORIGIN} ${TILE_ORIGIN})">${tetromino.join('')}</g>` +
    '</svg>'
  );
}

export function faviconHref(accent: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildFaviconSvg(accent))}`;
}

// Points the document's icon at the themed drawing, creating the <link> if the page has none.
export function applyFavicon(accent: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = faviconHref(accent);
}
