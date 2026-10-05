# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Today the primary user is the developer, logging their own workouts on their own iPhone through Expo Go. The intent is to release it publicly once it works the way they want, so every decision should hold up for a stranger who downloads it from the App Store. The public audience is not yet defined beyond that (open decision).

## Product Purpose

A simple workout tracker in the spirit of Hevy: pick a template or start empty, log weight and reps per set, tick each set off, and build a consistent training habit. Success is a person coming back on enough different days to finish the challenges, with logging fast enough that it never gets in the way of the lift.

## Positioning

Habit first, numbers second. Progress is framed as showing up on different days (the chained 3-Day Kickstart → 7-Day Builder → 30-Day Habit challenges, trophies, the consistency grid and local reminders) rather than as a dense analytics product.

## Operating Context

Used mid-workout on a phone, often one-handed, between sets, under gym lighting, with music playing (feedback sounds mix with other audio). Templates are set up occasionally; logging happens many times per session; history and the calendar are browsed between sessions.

## Capabilities and Constraints

- Expo SDK 57, React Native, Expo Router; runs in Expo Go, so only Expo Go-bundled native modules are available until the project moves to a development build. No Xcode or Android Studio on the dev machine.
- Tabs, left to right: Profile, History, Start Workout, Exercises. The user chose this layout.
- Up to 5 templates. Weights are kg only. Custom exercises are allowed and have no guide.
- 54 bundled catalogue exercises with start/end photos (Free Exercise DB, public domain) and hand-written 4-step instructions.
- Reminders are local notifications, not push.
- Data is saved on-device first (localStorage via expo-sqlite), then synced to the user's Supabase account in the background.

## Evidence on Hand

Exercise photos in `assets/exercises/`; synthesized chimes in `assets/sounds/`. No real users, testimonials or usage data yet; do not invent any.

## Product Principles

1. Logging a set must never slow the lift: the fewest taps, prefilled from last time.
2. Reward consistency over intensity; the habit is the product.
3. Native before novel: an iPhone user should trust it on sight.
4. Calm by default, celebratory only at earned moments (a finished workout, a won challenge).

## Accessibility & Inclusion

Must remain legible in gym lighting and work one-handed: WCAG AA contrast, 44 pt touch targets, Dynamic Type-friendly sizing, and Reduce Motion respected.
