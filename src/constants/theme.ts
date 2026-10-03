/**
 * "Logbook": a training ledger. Screens are plain paper (white, or near-black in dark mode) with ink
 * rules instead of cards; Archivo for text and Archivo Narrow for the big condensed headings and
 * numbers. `accent` (blue) is the single tint: keep it for primary actions, progress and records.
 * Anything filled with the tint and carrying text uses `accentFill`. Blue is only the default: the
 * user can pick another tint in Settings, and `useTheme()` swaps all four accent tokens for it, so
 * read colours through `useTheme()`, never `Colors[...]`.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    /** Ink: primary text, heavy rules, ticked set boxes. */
    text: '#0E1116',
    textSecondary: '#5B6470',
    /** Text and checkmarks drawn on an ink fill. */
    onText: '#FFFFFF',
    background: '#FFFFFF',
    backgroundPlain: '#FFFFFF',
    /** Raised surfaces: trophy cards, sheets, dialogs, the calendar. */
    surface: '#F4F6F9',
    /** Empty progress marks and input wells; the lowest step of the habit-grid ramp. */
    fill: '#E9EDF2',
    /** Pressed rows. */
    fillStrong: '#DCE1E8',
    /** Light rules between rows. */
    separator: '#D9DEE5',
    /** Borders of empty controls, e.g. an unticked set. Meets 3:1 against the page. */
    outline: '#7D8592',
    /** Tint for text, icons and outlines. 5.8:1 on white. */
    accent: '#0B5FD6',
    /** Tint as a fill behind `onAccent` text (primary buttons, the rest band, calendar days). */
    accentFill: '#0B5FD6',
    onAccent: '#FFFFFF',
    accentSoft: '#0B5FD61A',
    /** Habit grid: a day with one workout. Days with more use `accent`. */
    accentMid: '#7FA9EA',
    destructive: '#D70015',
    /** Body weight going down (the profile weight delta); going up uses `destructive`. */
    positive: '#1A7F37',
    avatar: '#7D8592',
    /** The LogMyLift log (welcome screen): bark, cut end, growth rings, the crack, and its outline. */
    bark: '#6B4226',
    wood: '#E2B47A',
    woodRing: '#A8743F',
    woodPith: '#7A4B22',
    woodOutline: '#0E1116',
  },
  dark: {
    text: '#F1F3F6',
    textSecondary: '#9AA3AF',
    onText: '#0B0D10',
    background: '#0B0D10',
    backgroundPlain: '#0B0D10',
    surface: '#151A21',
    fill: '#1A2029',
    fillStrong: '#262C35',
    separator: '#262C35',
    outline: '#6B7583',
    accent: '#4C95FF',
    // The text-weight blue is too light for white text, so fills use a deeper blue (4.6:1 with white).
    accentFill: '#1F6FEB',
    onAccent: '#FFFFFF',
    accentSoft: '#4C95FF29',
    accentMid: '#2D6FD6',
    destructive: '#FF453A',
    positive: '#3FB950',
    avatar: '#5C6673',
    bark: '#7A4C2C',
    wood: '#D9A86C',
    woodRing: '#9C6B3A',
    woodPith: '#6E431F',
    // Near-black brown: no visible outline against the dark page.
    woodOutline: '#1A0F06',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

const BODY: Record<number, string> = {
  400: 'Archivo_400Regular',
  500: 'Archivo_500Medium',
  600: 'Archivo_600SemiBold',
  700: 'Archivo_700Bold',
  800: 'Archivo_800ExtraBold',
};
const NARROW: Record<number, string> = {
  400: 'ArchivoNarrow_400Regular',
  500: 'ArchivoNarrow_500Medium',
  600: 'ArchivoNarrow_600SemiBold',
  700: 'ArchivoNarrow_700Bold',
  800: 'ArchivoNarrow_700Bold',
};

/**
 * The font family for a weight. Archivo ships one family per weight, so set this instead of
 * `fontWeight` on anything that isn't a `ThemedText` (inputs, native header titles).
 */
export function font(weight: number | string = 400, narrow = false): TextStyle {
  const w = Math.min(800, Math.max(400, Math.round(Number(weight) / 100) * 100 || 400));
  return { fontFamily: (narrow ? NARROW : BODY)[w] };
}

type TextStyleSpec = TextStyle & { narrow?: boolean };

/** The type scale. Pick one of these instead of a raw font size. */
export const TextStyles = {
  /** Screen titles: "Today’s log", the workout name, the profile name. */
  display: { fontSize: 48, lineHeight: 50, fontWeight: 700, letterSpacing: -1, narrow: true },
  largeTitle: { fontSize: 38, lineHeight: 42, fontWeight: 700, letterSpacing: -0.5, narrow: true },
  /** Ledger entries: template names. */
  title1: { fontSize: 28, lineHeight: 32, fontWeight: 700, letterSpacing: -0.3, narrow: true },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: 800, letterSpacing: -0.3 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: 700 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: 400 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: 400 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: 400 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
} satisfies Record<string, TextStyleSpec>;

export type TextStyleName = keyof typeof TextStyles;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Screen side margin. */
export const Gutter = 22;

/** Corner radius for the few raised surfaces (trophy cards, sheets). The ledger itself is square. */
export const Radius = 14;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** A type-scale entry as a plain style with its font family resolved, for inputs and other non-ThemedText text. */
export function textStyle(name: TextStyleName, weight?: number): TextStyle {
  const { narrow, fontWeight, ...rest } = TextStyles[name] as TextStyleSpec;
  return { ...rest, ...font(weight ?? fontWeight, narrow) };
}
