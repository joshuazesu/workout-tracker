---
name: Workout Tracker
description: A habit-first iPhone workout log, set like a training ledger.
colors:
  ink: "#0E1116"
  ink-dark: "#F1F3F6"
  muted: "#5B6470"
  muted-dark: "#9AA3AF"
  paper: "#FFFFFF"
  paper-dark: "#0B0D10"
  surface: "#F4F6F9"
  surface-dark: "#151A21"
  fill: "#E9EDF2"
  fill-dark: "#1A2029"
  rule: "#D9DEE5"
  rule-dark: "#262C35"
  outline: "#7D8592"
  outline-dark: "#6B7583"
  blue: "#0B5FD6"
  blue-dark: "#4C95FF"
  blue-fill-dark: "#1F6FEB"
  blue-mid: "#7FA9EA"
  blue-mid-dark: "#2D6FD6"
  destructive: "#D70015"
  destructive-dark: "#FF453A"
typography:
  display:
    fontFamily: "Archivo Narrow"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "50px"
    letterSpacing: "-1px"
  large-title:
    fontFamily: "Archivo Narrow"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: "42px"
  title1:
    fontFamily: "Archivo Narrow"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "32px"
  title2:
    fontFamily: "Archivo"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: "28px"
  title3:
    fontFamily: "Archivo"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "25px"
  headline:
    fontFamily: "Archivo"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "Archivo"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "22px"
  subheadline:
    fontFamily: "Archivo"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  footnote:
    fontFamily: "Archivo"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "Archivo"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
rounded:
  box: "4px"
  surface: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  gutter: "22px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    typography: "{typography.headline}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-tinted:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.pill}"
    height: "52px"
  play-button:
    backgroundColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    size: "52px"
  set-box:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.box}"
    size: "36px"
  trophy-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "14px"
  rest-band:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
---

# Design System: Workout Tracker

## Overview

**Creative North Star: "The Logbook"**

A training ledger on a phone. Each screen is plain paper with ink rules: a big condensed title closed by a heavy rule, then ruled lists. Blue marks what you act on and what you've built up: the play button for the suggested workout, the habit grid, records and the rest band. Ink marks what's done: ticked sets and earned challenge days fill black (white in dark mode), the way you'd fill in a box on a log sheet.

It's a mix of three explored directions. The overall ledger is from "Logbook". The habit grid's blue ramp and the trophy cards are from "Night Session". The workout's progress-ring status band is from "Bright Calm".

**Key Characteristics:**
- Paper and ink, with no cards in the main flow. Rules carry the structure.
- Archivo Narrow for titles and big numbers, Archivo for everything else.
- One blue, used sparingly. Ink, not blue, for completion.
- Pills and circles for buttons, square 4 px boxes for things you tick.
- Light and dark appearances are both first-class (Settings › Appearance).

## Colors

### Primary
- **Logbook Blue** (#0B5FD6 light / #4C95FF dark): text, icons and outlines in the tint. The rest band, primary pills and the suggested play button use **Blue Fill** (#0B5FD6 / #1F6FEB), which keeps white text at 4.6:1 or better.
- **Blue Mid** (#7FA9EA / #2D6FD6): the middle step of the habit grid (one workout that day).

### Neutral
- **Ink** (#0E1116 / #F1F3F6): text, the heavy rules under headers and section titles, ticked boxes, the Finish pill.
- **Muted** (#5B6470 / #9AA3AF): metadata and captions, 6:1 or better on paper.
- **Paper** (#FFFFFF / #0B0D10): every screen.
- **Surface** (#F4F6F9 / #151A21): the few raised things: trophy cards, sheets, dialogs, the calendar.
- **Fill** (#E9EDF2 / #1A2029): empty habit-grid days, search field, ring track.
- **Rule** (#D9DEE5 / #262C35): light rules between rows.
- **Outline** (#7D8592 / #6B7583): empty future challenge days and locked trophies (3:1 or better).
- **Destructive** (#D70015 / #FF453A): Discard, Delete, Reset.

### Named Rules
**The Ink Means Done Rule.** Completed sets and earned days are ink-filled; blue is for action and accumulation. Don't tick things in blue.

**The One Blue Rule.** Blue appears a handful of times per screen. Exercise names, section titles, stats and navigation rows are ink.

## Typography

**Display:** Archivo Narrow 700. **Body:** Archivo 400–800. Both come from `@expo-google-fonts` and load before the splash hides.

### Hierarchy
- **Display** (Narrow 700, 48/50, −1 tracking): screen titles ("Today’s log", "History", your name) and the workout name (44 pt). The rest band uses it at 52 pt for the countdown.
- **Large Title** (Narrow 700, 38/42): the timer on the In progress block.
- **Title 1** (Narrow 700, 28/32): ledger entries (template names, workout names in History).
- **Title 2** (800, 22/28): exercise names on the workout screen, set values, totals.
- **Title 3** (700, 20/25): section titles, in sentence case.
- **Headline / Body / Subheadline / Footnote / Caption** (17 600, 17 400, 15, 13, 12 600): rows, details, metadata, column headers (SET, LAST, KG, REPS).

### Named Rules
**The Family Per Weight Rule.** Archivo ships one family per weight. `ThemedText` maps `fontWeight` to the family. Inputs use `textStyle()` or `font()`; never rely on `fontWeight` with a custom family.

## Layout

Single column with a 22 pt gutter, max 800 px wide. Tab roots open with `ScreenHeader`: title, a line of context, a 2 pt ink rule. Sections sit 26 pt apart. A section title sits over a 1 pt ink rule, and rows (min 48 pt) are divided by light rules running the full width.

## Elevation & Depth

Flat. No shadows. Depth is the difference between paper and surface, and rules do the grouping.

## Shapes

Square ledger. Tick boxes and challenge days are 4 pt squares. Buttons are pills or 52 pt circles. Raised surfaces (trophy cards, sheets) use 14 pt corners. Locked trophies have a dashed border.

## Components

### Buttons
- **Primary:** Blue Fill pill, white headline, 52 pt. One per screen (Resume workout, Done, Finish workout, Get started).
- **Tinted:** ink-outlined pill (1.5 pt) with ink label, for secondary actions.
- **Play:** a 52 pt circle on each template row. It's filled blue for the suggested template (the one done longest ago) and ink-outlined for the rest.
- **Finish:** an ink pill in the workout header.
- **Plain / Destructive:** text only, blue or red.

### Challenge Day Boxes
One 36 pt square per required day, labelled 1…N. Earned days are ink with a check, today's open slot is outlined blue and labelled "Today", and future days have an outline. Used on Start, Complete and onboarding.

### Habit Grid
The last 12 weeks: one column per week, one 4 pt-radius square per day. Fill for none, Blue Mid for one workout, Blue for two or more; today is outlined in ink. A "12 weeks ago" label and a Less → More key sit under it.

### Trophy Cards
Surface cards with a rule-colored border: blue trophy, title, date. The current challenge shows as a dashed card with an outline trophy and "N days to go".

### Workout Status Band
A 68 pt progress ring (sets done of total, blue on a Fill track) beside the editable workout name (Display 44) and "N kg lifted · Exercise next", closed by a 2 pt ink rule.

### Set Rows
SET · LAST · KG · REPS · tick box, under a column header with an ink rule. Open values are underlined in blue like blanks on a sheet, and ticked values lose the underline. Tapping LAST copies last time's set. Swipe left to delete. Ticking starts the rest timer.

### Rest Band
A full-width Blue Fill band at the bottom: "Rest · then set N", the countdown in Display 52, outlined −15 / +15 circles and a white Skip pill.

### Swipe Actions, Stepper, Appearance
These are unchanged in behavior. Swipe left reveals one red action (Delete, Discard). The template editor uses a − | + stepper for set counts. Settings has System / Light / Dark.

## Do's and Don'ts

### Do:
- **Do** build screens from `ScreenHeader`, `Section`, `Row`, `Button`, `Icon` and `ThemedText` types.
- **Do** describe templates by counts ("4 exercises · 13 sets"), not exercise lists, so rows never overflow.
- **Do** give every empty state a symbol, a title3 line, one sentence and one action.
- **Do** state progress plainly: gains get blue, a lighter session is grey, never red.
- **Do** keep tap targets at 44 pt or larger, and text at 4.5:1 or better.

### Don't:
- **Don't** put content in cards on the main flow; use rules. Surfaces are for trophies, sheets, dialogs and the calendar.
- **Don't** tick or fill completion in blue; completion is ink.
- **Don't** set `fontWeight` on inputs or native header titles; use `font()` / `textStyle()`.
- **Don't** use emoji or text glyphs as icons, uppercase eyebrows above headings, shadows or gradients.
