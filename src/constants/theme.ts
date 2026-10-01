/**
 * iOS-style semantic colors and type scale. Screens sit on the grouped `background`, content sits in
 * white `surface` sections, and `accent` is the single tint: keep it for primary actions, ticked sets
 * and progress, not decoration.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#6C6C70',
    /** Grouped background (systemGroupedBackground). */
    background: '#F2F2F7',
    /** Plain list background, for A–Z lists and full-bleed screens. */
    backgroundPlain: '#FFFFFF',
    /** Sections and cards on the grouped background. */
    surface: '#FFFFFF',
    /** Input wells, chips and empty states inside a surface. */
    fill: '#EFEFF4',
    /** Pressed rows and empty progress marks. */
    fillStrong: '#E3E3E8',
    separator: '#C6C6C8',
    /** Borders of empty controls, e.g. an unticked set. Meets 3:1 against surfaces. */
    outline: '#8E8E93',
    accent: '#1E7B34',
    onAccent: '#FFFFFF',
    /** Tinted buttons and ticked set rows. */
    accentSoft: '#1E7B341A',
    destructive: '#D70015',
    avatar: '#8E8E93',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    background: '#000000',
    backgroundPlain: '#000000',
    surface: '#1C1C1E',
    fill: '#2C2C2E',
    fillStrong: '#3A3A3C',
    separator: '#38383A',
    outline: '#8E8E93',
    accent: '#30D158',
    onAccent: '#000000',
    accentSoft: '#30D15829',
    destructive: '#FF453A',
    avatar: '#636366',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** The iOS text styles (Large Title through Caption). Pick one of these instead of a raw font size. */
export const TextStyles = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: 700 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: 600 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: 400 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: 400 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: 400 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
} satisfies Record<string, TextStyle>;

export type TextStyleName = keyof typeof TextStyles;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
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

/** Corner radius for inset sections and cards. */
export const Radius = 14;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
