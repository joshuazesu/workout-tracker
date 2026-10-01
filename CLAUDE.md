# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

General Expo rules (check versioned docs before touching Expo APIs, use `npx expo install`, Expo Go limitations, EAS) live in AGENTS.md:

@AGENTS.md

## Project

A simple Hevy-style workout tracker built with Expo SDK 57, React Native 0.86, React 19, TypeScript and Expo Router. It is developed and demoed on a physical phone via Expo Go, so new dependencies must be ones bundled in Expo Go unless the project moves to a development build. There is no Xcode or Android Studio on this machine.

## Commands

```bash
npm start                # dev server; scan the QR code with Expo Go (same Wi‑Fi), or use --tunnel
npm run lint             # ESLint (eslint-config-expo, flat config)
npx tsc --noEmit         # typecheck
npx expo-doctor          # dependency/config health check
```

There is no test runner set up.

Expo Router's typed routes (`expo-env.d.ts`, `.expo/types`) are regenerated only while the dev server runs. After adding a screen, `router.push('/new-route')` fails typechecking until `expo start` has run once.

The Metro file watcher on this machine sometimes misses edits (the served bundle stays stale). If a change doesn't show up, restart `expo start` before debugging the code.

For a visual check without a phone, run `npx expo start --web` and drive it with `playwright-cli`. No Playwright browsers are installed; point it at Brave via a config with `launchOptions.executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"`. On web, native tabs render as a bar at the top. That's expected, and on a phone they're at the bottom.

Do not run `npm run reset-project`: it's leftover from the template and moves all of `src/` and `scripts/` into `example/` (or deletes them), wiping out the app.

## Architecture

**State lives in one module-level store**, `src/lib/workouts.ts`. It holds the `profile` (name, photo URI, height cm, weight kg), the active workout, history, routines (workout templates, max `MAX_ROUTINES` = 5), a routine `draft` being edited, the current challenge, trophies and the `onboarded` flag, and exposes it to React with `useSyncExternalStore` (`useWorkoutStore()`). All mutations go through `workoutActions`, `routineActions` or `profileActions`, and every mutation writes the whole state to storage synchronously. Screens never hold workout data in local state. They read the store and call actions, which is how the tabs, the workout screen and the modals stay in sync without context or params.

**Persistence** uses `localStorage`. `src/lib/storage.ts` imports `expo-sqlite/localStorage/install` to provide a synchronous one on native, and `storage.web.ts` is empty because the browser has its own (importing expo-sqlite on web breaks the web bundle). The storage key is versioned (`workouts.v2`; `load()` migrates `v1` and fills missing fields from `initialState()`, so adding a field with a default needs no bump). Bump it, or migrate, when changing the shape of existing fields. The profile photo is copied into `Paths.document` (expo-file-system) because image-picker URIs live in a purgeable cache.

**Workout lifecycle:**
- `start()` creates `active`, which is a no-op if one already exists.
- `start(routineId?)` names the workout after the template and prefills each exercise's sets from the last time it was logged. The user can rename it on the workout screen (`workoutActions.rename`).
- Multiple workouts per day are fine. History is a flat list, and the calendar and stats group by local day (`dayKey`).
- `finish()` keeps only sets marked `done`, drops exercises left with no sets, prepends the workout to `history`, marks the challenge complete if this workout won it, and returns the saved id. If nothing is done it discards the workout and returns null.
- `src/app/workout.tsx` navigates back on its own once `active` becomes null (discard). On finish it replaces itself with `/complete?id=…`, the celebration screen.

**Challenges** (`CHALLENGES` in `workouts.ts`) are "work out on N different days within a window", chained kickstart → builder → habit. Progress is derived from history by `challengeProgress()`, never stored. A challenge is only "complete" once `finish()` sets `completedAt` and awards the trophy, so the UI and the trophy count can't disagree.

**Templates**: `routineActions.edit()` and `duplicate()` return false at the 5-template limit, and the caller shows the limit alert. Rename uses `renameSaved()` through `PromptDialog`. The "•••" menu is `ActionMenu` (`src/components/sheet.tsx`, built on RN Modal so it works on every platform). It runs the chosen option after a 300 ms delay, because iOS can't present a screen or alert while the modal is still dismissing.

**Exercise catalogue**: `src/constants/exercises.ts` (54 exercises, A–Z) was generated from the public-domain Free Exercise DB. Images (start and end positions) are bundled in `assets/exercises/<slug>-0|1.jpg`; the 4-step instructions were written by hand. `EXERCISES` in `workouts.ts` is derived from it. To add an exercise, add an entry with a static `require` for both images. Users can still log custom exercises that aren't in the catalogue, and those have no guide.

**Rewards** go through `src/lib/feedback.ts` (sound + haptics together): `setDone`, `workoutDone`, `challengeDone`. Chimes are synthesized WAVs in `assets/sounds/`, played with `expo-audio` in `mixWithOthers` mode so the user's music keeps playing.

**Reminders** (`src/lib/reminders.ts`) are local scheduled notifications, not remote push (remote push isn't available in Expo Go on Android). `_layout.tsx` calls `syncReminders()` whenever history or the challenge changes; it cancels everything and reschedules challenge check-ins plus inactivity nudges counted from the last workout. They're skipped on web.

Set `weight`/`reps` are stored as strings so they're friendly to text inputs, and they're converted to numbers only in calculations such as `workoutVolume`. Weights are kg only.

**Routing:**
- The root `src/app/_layout.tsx` is a native `Stack`. `onboarding` is behind `Stack.Protected guard={!onboarded}`; everything else is behind `guard={onboarded}`, so `completeOnboarding()` routes into the tabs on its own.
- Root stack screens that cover the tab bar: `(tabs)`, `workout`, `add-exercise` (modal; `?target=routine` adds to the routine draft instead of the active workout), `routine` (modal template editor), `complete` (full-screen celebration).
- `src/app/(tabs)/_layout.tsx` uses `NativeTabs` from `expo-router/unstable-native-tabs`. Left to right: `profile`, `history`, `(start)`, `exercises`. Each tab folder has its own `Stack` `_layout.tsx` for headers and pushes. The app opens on Start Workout because `/` resolves to `(tabs)/(start)/index`.
  - `profile/index`: avatar, name, workout and trophy counts, trophies, consistency grid, reminders prompt. `profile/settings` (modal) edits the name, photo, height and weight, and has "Reset tracking history" (`workoutActions.resetHistory()`, which keeps the profile and templates).
  - `history/index`: every workout with its exercises, sets and reps (`WorkoutSummary`). `history/calendar` (modal) is a month grid that shades worked-out days with a green tick, and tapping a day shows that day's workouts.
  - `(start)/index`: resume banner, challenge card, templates with the "•••" menu (rename, edit, duplicate, delete), "+ Template", and an empty workout.
  - `exercises/index`: A–Z `ExerciseList` with search in the native header (`headerSearchBarOptions`; web falls back to an inline field). `exercises/[name]` shows the alternating demo images, muscle and equipment chips, steps and the user's history for that exercise.
- The user explicitly chose this tab layout, which raised the original "5–7 screens" budget. Still prefer adding to an existing screen over adding a new one.
- Per-screen header buttons are set with `<Stack.Screen options={...}>` inside the screen.
- Only route files belong in `src/app/`.

**Shared components**: `ChallengeCard`, `ConsistencyCard` and `RemindersPrompt` (`components/cards.tsx`), `ExerciseList`, `WorkoutSummary`, `Avatar`, `Button`, `Stat`, `ActionMenu`/`PromptDialog` (`components/sheet.tsx`), `ChallengeDots` and `Confetti`. Use `useNow(intervalMs)` (`hooks/use-now.ts`) instead of calling `Date.now()` during render; the React Compiler purity lint rejects that.

**Styling and theming:**
- Plain `StyleSheet`, using the color tokens in `src/constants/theme.ts` (light and dark, including `accent`/`onAccent`) through `useTheme()`, and the `Spacing` scale.
- Use `ThemedText` for text.
- `src/hooks/use-color-scheme.web.ts` uses `useSyncExternalStore` for hydration-safe web rendering. Don't revert it to the `useEffect`+`setState` pattern, because the `react-hooks/set-state-in-effect` lint rule rejects it.

**Platform conventions:**
- `src/lib/confirm.ts` wraps destructive confirmations, because `Alert.alert` buttons don't work on web.
- Haptics calls are skipped on web.
- Files ending in `.web.tsx`/`.web.ts` are web-specific overrides.
- `TextInput`s inside flex rows need `minWidth: 0` or they overflow on web.
- Icons: header buttons use `SymbolView` from `expo-symbols` with `{ ios, android, web }` names and an emoji `fallback`. Tab icons use the `sf`/`md` props.
