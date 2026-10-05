# Workout Tracker

A simple Hevy-style workout tracker for iOS and Android, built with Expo, React Native and Expo Router. Log sets and reps, reuse workout templates, browse an illustrated exercise catalogue, and build a habit with day-streak challenges.

## Features

- **Log workouts.** Start a blank workout or one from a template, add exercises and record each set's weight (kg) and reps. Only sets marked done are saved, and finishing shows a celebration screen.
- **Templates.** Save up to 5 routines, then rename, edit, duplicate or delete them. Starting from a template prefills each exercise with the sets you logged last time.
- **History.** Browse every past workout with its exercises and sets, or open the calendar to see which days you trained.
- **Exercise catalogue.** 54 exercises with start and end position images, muscle and equipment tags, step-by-step instructions and your own history for each. You can also log custom exercises.
- **Challenges and trophies.** Chained "work out on N different days" challenges award trophies, and the profile shows a consistency grid.
- **Feedback and reminders.** Sounds and haptics when you complete a set or workout (your music keeps playing), plus local notifications for challenge check-ins and inactivity nudges.
- **Light and dark mode.**

You sign in with an account, and your workouts, templates, weight log and settings sync to [Supabase](https://supabase.com) in the background. The app still works offline: every change saves on the phone first and syncs when you're back online.

## Tech stack

- [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19, TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) with native tabs and typed routes
- React Compiler
- [Supabase](https://supabase.com) for accounts and sync, with Row Level Security so each user only sees their own rows
- `expo-sqlite` (synchronous `localStorage` on native), `expo-audio`, `expo-haptics`, `expo-notifications`, `expo-image-picker`, `expo-file-system`

## Getting started

You need Node.js and the [Expo Go](https://expo.dev/go) app on your phone.

```bash
npm install
cp .env.example .env.development.local   # then fill in your Supabase project URL and publishable key
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Your phone and computer must be on the same Wi‑Fi network. If they can't connect, use a tunnel instead:

```bash
npx expo start --tunnel
```

To try it in a browser, run `npx expo start --web`. On web, the tab bar renders at the top.

> **Warning:** don't run `npm run reset-project`. It's left over from the Expo template and moves or deletes `src/`, wiping out the app.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npx expo-doctor` | Check dependencies and config |

## Project structure

```
src/
  app/          Screens and layouts (Expo Router file-based routes)
    (tabs)/     Profile, History, Start Workout, Exercises
    workout.tsx, add-exercise.tsx, routine.tsx, complete.tsx, onboarding.tsx
  components/   Shared UI (cards, lists, sheets, buttons, confetti)
  constants/    Theme tokens and the exercise catalogue
  hooks/        Theme, color scheme, useNow
  lib/          Store (workouts.ts), storage, feedback, reminders
assets/
  exercises/    Exercise demo images
  sounds/       Reward chimes
```

All app state lives in a single store in `src/lib/workouts.ts`. Screens read it with `useWorkoutStore()` and change it only through the exported actions, and every change is saved to storage immediately. See [CLAUDE.md](CLAUDE.md) for detailed architecture notes.

## Credits

Exercise data and images come from the public-domain [Free Exercise DB](https://github.com/yuhonas/free-exercise-db).

## License

All rights reserved. The code is public to read, but it isn't licensed for reuse or redistribution.
