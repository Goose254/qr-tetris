import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from './constants';
import { buildFaviconSvg, faviconHref } from './favicon';

interface Shape {
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  fill: string;
}

// Every <rect> of an SVG, with the transform of its group, in a canonical order: two
// drawings with the same list render the same picture whatever the order of their markup.
function shapes(svg: string): Shape[] {
  const list: Shape[] = [];

  for (const group of svg.matchAll(/<g transform="([^"]*)">([\s\S]*?)<\/g>/g)) {
    for (const rect of group[2].matchAll(/<rect\b([^>]*)\/>/g)) {
      const attribute = (name: string) => rect[1].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
      list.push({
        group: group[1],
        x: Number(attribute('x') ?? 0),
        y: Number(attribute('y') ?? 0),
        width: Number(attribute('width')),
        height: Number(attribute('height')),
        rx: Number(attribute('rx') ?? 0),
        fill: attribute('fill') ?? '',
      });
    }
  }

  return list.sort((a, b) => a.group.localeCompare(b.group) || a.y - b.y || a.x - b.x);
}

describe('buildFaviconSvg', () => {
  it('draws the finder pattern in the accent colour and a white O tetromino', () => {
    const svg = buildFaviconSvg('#3b82f6');
    const drawn = shapes(svg);

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216 216">')).toBe(true);

    const finder = drawn.filter(shape => shape.group === 'translate(24 24)');
    expect(finder).toHaveLength(33); // 24 modules of the outer ring + the 3×3 centre
    expect(finder.every(shape => shape.fill === '#3b82f6' && shape.width === 24 && shape.height === 24)).toBe(true);

    const tetromino = drawn.filter(shape => shape.group === 'translate(150 150)');
    expect(tetromino.map(({ x, y }) => [x, y])).toEqual([[0, 0], [30, 0], [0, 30], [30, 30]]);
    expect(tetromino.every(shape => shape.fill === '#ffffff' && shape.rx === 7)).toBe(true);

    expect(drawn).toHaveLength(37);
  });

  it('draws the same picture as the static app/icon.svg for the default accent', () => {
    const staticIcon = readFileSync(new URL('../../app/icon.svg', import.meta.url), 'utf8');

    expect(staticIcon).toContain('viewBox="0 0 216 216"');
    expect(shapes(buildFaviconSvg(DEFAULT_THEME.accent))).toEqual(shapes(staticIcon));
  });
});

describe('faviconHref', () => {
  it('is an SVG data URI that decodes back to the drawing', () => {
    const href = faviconHref('#f97316');
    const prefix = 'data:image/svg+xml;charset=utf-8,';

    expect(href.startsWith(prefix)).toBe(true);
    expect(decodeURIComponent(href.slice(prefix.length))).toBe(buildFaviconSvg('#f97316'));
  });
});
