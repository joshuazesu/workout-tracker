---
name: Workout Tracker
description: A habit-first iPhone workout log in the native grouped-list idiom.
colors:
  tint-green: "#1E7B34"
  tint-green-dark: "#30D158"
  tint-green-soft: "#1E7B341A"
  on-tint: "#FFFFFF"
  label: "#000000"
  secondary-label: "#6C6C70"
  secondary-label-dark: "#AEAEB2"
  grouped-background: "#F2F2F7"
  plain-background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-dark: "#1C1C1E"
  fill: "#EFEFF4"
  fill-strong: "#E3E3E8"
  separator: "#C6C6C8"
  outline: "#8E8E93"
  destructive-red: "#D70015"
  destructive-red-dark: "#FF453A"
typography:
  large-title:
    fontFamily: "System (SF Pro)"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "41px"
  title1:
    fontFamily: "System (SF Pro)"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
  title2:
    fontFamily: "System (SF Pro)"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  title3:
    fontFamily: "System (SF Pro)"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "25px"
  headline:
    fontFamily: "System (SF Pro)"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "System (SF Pro)"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "22px"
  subheadline:
    fontFamily: "System (SF Pro)"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  footnote:
    fontFamily: "System (SF Pro)"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "System (SF Pro)"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
rounded:
  input: "8px"
  search: "10px"
  section: "14px"
  capsule: "999px"
spacing:
  hairline: "2px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.tint-green}"
    textColor: "{colors.on-tint}"
    typography: "{typography.headline}"
    rounded: "{rounded.section}"
    height: "50px"
  button-tinted:
    backgroundColor: "{colors.tint-green-soft}"
    textColor: "{colors.tint-green}"
    typography: "{typography.headline}"
    rounded: "{rounded.section}"
    height: "50px"
  button-tinted-small:
    backgroundColor: "{colors.tint-green-soft}"
    textColor: "{colors.tint-green}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.capsule}"
    height: "32px"
  section:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.section}"
    padding: "16px"
  set-input:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.input}"
    height: "36px"
  search-field:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.search}"
    height: "36px"
---

# Design System: Workout Tracker

## Overview

**Creative North Star: "The Quiet Logbook"**

The app should feel like it shipped on the iPhone, sitting between Apple Fitness and Health. Screens are inset grouped lists on the system grey. Content sits in white rounded sections with hairline separators, and SF Symbols are the only icons. The system type ramp carries the hierarchy, so there is no display face and no decoration.

Calm is the default. Green is the single tint, and it marks only what the user should act on or has earned: a Start or Resume button, a ticked set, challenge progress, a personal record. Everything else is label, secondary label and grey. The loudest moments are the ones the product is about: ticking a set, finishing a workout, winning a challenge.

**Key Characteristics:**
- Grouped grey background, white 14 pt continuous-corner sections, hairline separators inset to the text.
- The iOS text styles from Large Title down to Caption; no other sizes.
- One tint, rationed to about four uses per screen.
- SF Symbols on iOS, matching Material Symbols on Android and web; never emoji or text glyphs as icons.
- Light and dark appearances are both first-class.

## Colors

A neutral iOS system palette with one rationed green tint.

### Primary
- **Logbook Green** (#1E7B34 light / #30D158 dark): the only interactive tint. Used for filled primary buttons (white text, 5.3:1), tinted buttons, ticked sets, filled challenge dots, workout days in the calendar and consistency grid, header bar buttons and the active tab.
- **Soft Green** (#1E7B34 at 10% / #30D158 at 16%): tinted button fills and the wash behind a ticked set row.

### Neutral
- **Label** (#000000 / #FFFFFF): primary text.
- **Secondary Label** (#6C6C70 / #AEAEB2): metadata, captions, section trailing text. Passes 4.5:1 on both the grouped background and white sections.
- **Grouped Background** (#F2F2F7 / #000000): the field behind every grouped screen, and the navigation bar on those screens.
- **Plain Background** (#FFFFFF / #000000): A–Z lists, the exercise guide, Add Exercise and onboarding.
- **Surface** (#FFFFFF / #1C1C1E): sections, cards, the calendar, and the action sheet.
- **Fill** (#EFEFF4 / #2C2C2E) and **Fill Strong** (#E3E3E8 / #3A3A3C): set inputs, chips, search, step numbers; pressed rows and empty progress marks.
- **Separator** (#C6C6C8 / #38383A): hairlines between rows.
- **Outline** (#8E8E93): borders of empty controls such as an unticked set, which must meet 3:1.
- **Destructive Red** (#D70015 / #FF453A): Discard, Delete, Reset, and remove symbols only.

### Named Rules
**The Rationed Tint Rule.** Green marks action or achievement, roughly four times per screen. A navigation row, a section title, an exercise name or a stat is never green.

**The No Raw Hex Rule.** Screens read colors from `useTheme()`; only `constants/theme.ts` holds hex values.

## Typography

**Display Font:** none. The system font (SF Pro on iOS) carries everything.
**Body Font:** System (SF Pro), through `ThemedText`'s `type` prop.

**Character:** native and unbranded. Hierarchy comes from the Apple text-style steps and weight, not custom sizes.

### Hierarchy
- **Large Title** (700, 34/41): onboarding headlines and the Complete heading. Tab roots get theirs from the native large-title header.
- **Title 1** (700, 28/34): the workout name and the profile name.
- **Title 2** (700, 22/28): the live timer on the Resume card.
- **Title 3** (600, used at 700, 20/25): section titles in sentence case ("Templates", "Consistency", "Personal Records") and stat values.
- **Headline** (600, 17/22): row titles, exercise names, button labels.
- **Body** (400, 17/22): row labels, inputs and body copy.
- **Subheadline** (400, 15/20): row details, metadata, small button labels.
- **Footnote / Caption** (13/18, 12/16): section footers, template exercise lists, grid legend, the SET / KG / REPS column headers.

### Named Rules
**The Text Style Rule.** Every text element picks one of the ten text styles. A raw `fontSize` outside `theme.ts` is a defect; set inputs use 17 pt semibold tabular figures.

**The Tabular Numbers Rule.** Anything that changes in place (timer, weights, reps, counts, volume) uses tabular figures (`numeric`).

## Layout

Single-column phone layout, max 800 px wide and centred on larger screens. Screens have a 16 pt gutter. Sections are spaced 24 pt apart, and a section's title sits 8 pt above its surface. Padded sections use 16 pt insets and a 16 pt internal gap. Rows are at least 44 pt tall with 11 pt vertical padding. Separators start at the text, or 50 pt in when the row has a leading symbol (`RowIconInset`).

## Elevation & Depth

Flat. Depth comes from tone, not shadows: white sections on the grouped grey, fills inside sections, and the system's own modal presentation and dimming for sheets. No box shadows anywhere.

## Shapes

Continuous corners (`borderCurve: 'continuous'`) at 14 pt on sections, cards and large buttons. Set inputs and the tick box use 8 pt, the search field 10 pt, and small buttons and chips are full capsules. The calendar's workout days are full circles.

## Components

### Buttons
- **Primary:** filled green, white headline label, 50 pt tall, 14 pt corners. One per screen: Resume Workout, Done, Finish Workout, Get Started, or Add Exercise in an empty workout.
- **Tinted:** soft green fill with a green label. For secondary actions such as Start Challenge, Add Exercise, Start a Workout, Add Your Name, and the template Start capsule (small, 32 pt with a play symbol).
- **Plain / Destructive:** text only, green or red. Used for Not Now, Discard Workout, Cancel.
- **Press:** scale 0.97 and opacity 0.85, at once on press. Disabled is 40% opacity.

### Sections and Rows (`components/list.tsx`)
- `Section` gives a bold title3 heading with optional trailing text, a white rounded surface with automatic hairline separators, and an optional footnote.
- `Row` gives a 44 pt minimum height, an optional leading symbol (green for actions, grey for navigation), a label and detail, and trailing content or a chevron. Pressed rows turn Fill Strong.

### Inputs
- **Set fields:** Fill background, 36 pt tall, 8 pt corners, centred 17 pt semibold tabular figures. They go transparent once the set is ticked.
- **Search:** a 36 pt Fill capsule with a magnifying-glass symbol. On iOS the native header search bar is used instead.

### Navigation
- Native tabs (Profile, History, Start Workout, Exercises) with the green tint. Native stack headers: large titles on tab roots, sheets for the calendar, settings, template editor and Add Exercise. Header buttons are green SF Symbols or text (Finish, Save, Cancel), each 44 pt.

### Set Row (signature)
Set number, KG, REPS and a tick box. Unticked, the box is an empty rounded square with a 1.5 pt Outline border. Ticking it fills the box green with a white checkmark, washes the row in Soft Green, pops it with a spring (scale 1.2 → 1, skipped under Reduce Motion) and plays the set-done haptic and chime. Ticking with no reps shakes the box instead of showing a dialog.

### Workout Summary Row
Name, then a relative date with time, duration and volume, then a one-line exercise list. Tapping it fades in the condensed sets ("3 × 8 · 70 kg") over 180 ms; long-pressing deletes the workout.

## Do's and Don'ts

### Do:
- **Do** build new screens from `Section`, `Row`, `Button`, `Stat`, `Icon` and `ThemedText` types.
- **Do** give every empty state a symbol, a title3 line, one sentence and one action.
- **Do** report progress as what improved (personal records, extra volume), never as a loss.
- **Do** keep every tappable target at least 44 × 44 pt, and every text pair at 4.5:1 or better.

### Don't:
- **Don't** use emoji or text glyphs (✓ ✕ ‹ › •••) as icons; use `Icon` with an SF Symbol and Material name.
- **Don't** put grey cards on a white background or stack full-width green buttons; that was the incumbent look this system replaced.
- **Don't** tint exercise names, stats, section titles or navigation rows green.
- **Don't** add uppercase eyebrow labels above headings; section titles are sentence-case title3.
- **Don't** add shadows or gradients.
