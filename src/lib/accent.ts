/**
 * The user's accent colour (Settings → Accent colour). One picked colour becomes the four tint
 * tokens for a scheme, nudged darker or lighter so they keep the contrast the default blue has:
 * `accent` 4.5:1 against the page, `accentFill` 4.5:1 behind white text.
 */

import { Colors } from '@/constants/theme';

type Scheme = 'light' | 'dark';
type Rgb = [number, number, number];

export type AccentTokens = { accent: string; accentFill: string; accentSoft: string; accentMid: string };

/** The presets after the default blue. Each is adjusted per scheme by `accentTokens`. */
export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Red', hex: '#E03131' },
  { name: 'Orange', hex: '#F76707' },
  { name: 'Amber', hex: '#F59F00' },
  { name: 'Green', hex: '#2F9E44' },
  { name: 'Teal', hex: '#0C8599' },
  { name: 'Purple', hex: '#7048E8' },
  { name: 'Pink', hex: '#D6336C' },
  { name: 'Graphite', hex: '#495057' },
];

const HEX = /^#?([0-9a-f]{6})$/i;

/** `#RRGGBB` (upper case) from loose input like "e4572e", or null if it isn't a six-digit hex. */
export function normalizeHex(text: string): string | null {
  const match = HEX.exec(text.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Hue in degrees (0–360), saturation and value 0–1. */
export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToHex([f(5) * 255, f(3) * 255, f(1) * 255]);
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `amount` 0 is `a`, 1 is `b`. */
function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
}

/** Steps `hex` towards `toward` until it reaches `ratio` against `against`. */
function untilContrast(hex: string, against: string, toward: string, ratio: number): string {
  for (let step = 0; step <= 20; step++) {
    const c = mix(hex, toward, step / 20);
    if (contrast(c, against) >= ratio) return c;
  }
  return toward;
}

/** The tint tokens for a picked colour, readable in the given scheme. */
export function accentTokens(hex: string, scheme: Scheme): AccentTokens {
  const { background, onAccent } = Colors[scheme];
  const light = scheme === 'light';
  const accent = untilContrast(hex, background, light ? '#000000' : '#FFFFFF', 4.5);
  return {
    accent,
    accentFill: untilContrast(hex, onAccent, '#000000', 4.5),
    accentSoft: `${accent}${light ? '1A' : '29'}`,
    accentMid: mix(accent, background, 0.5),
  };
}
