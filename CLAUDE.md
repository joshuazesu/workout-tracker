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
- `src/app/workout.tsx` navigates back on its own once `active` becomes null (discard). On finish it replaces itself with `/complete?id=…`, the celebration screen. The live timer is the header title and the workout name is an editable title1 field in the body. Complete shows duration, volume and sets, any personal records with their gain over the previous best (`personalRecords()` returns `previous`), extra volume versus the last workout with the same name (only when it went up), and challenge progress. Confetti plays on every finish (more for a won challenge).

**Logging shortcuts** (workout screen):
- Each set row shows PREVIOUS: the same set index from the last time the exercise was logged (`lastSets()` in `workouts.ts`, passed in as a prop so the memoized `ExerciseCard` doesn't re-render on every store change). Tapping it copies the weight and reps.
- Swiping a set left reveals a delete action (`ReanimatedSwipeable` from react-native-gesture-handler, which is why the root layout is wrapped in `GestureHandlerRootView`). Screen readers get a "Delete set" accessibility action.
- Ticking a set starts the rest timer (`workoutActions.startRest()`). `active.restUntil` is a timestamp, so the countdown survives leaving the screen. `state.restSeconds` (default 90) is the length; −15/+15 in `RestTimer` (`components/rest-timer.tsx`) adjust the running rest and the saved length. When it ends it plays `feedback.restDone()` and clears itself. It doesn't notify while the app is in the background.

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
  - `profile/index`: avatar and name (or an "Add Your Name" button), the Consistency section (this week, week streak, all time, 12-week grid), the Trophies list, and the reminders prompt. `profile/settings` (modal) edits the name, photo, height and weight, and has "Reset tracking history" (`workoutActions.resetHistory()`, which keeps the profile and templates).
  - `history/index`: workouts grouped by month as summary rows (`WorkoutSummary`: relative date, duration, volume, exercise list). Tapping a row expands its condensed sets ("3 × 8 · 70 kg", `summarizeSets` in `lib/format.ts`); long-pressing deletes it. `history/calendar` (modal) is a month grid with workout days as filled tint circles; tapping a day shows that day's workouts, expanded.
  - `(start)/index`: an "In Progress" card (timer and the only filled button, Resume) while a workout runs, the Challenge section, the Templates group (one row per template with a small tinted Start capsule and a "•••" menu for rename, edit, duplicate and delete; a "New Template" row last), and a "Start Empty Workout" row. Start capsules hide while a workout is active.
  - `exercises/index`: A–Z `ExerciseList` with search in the native header (`headerSearchBarOptions`; web falls back to an inline field). `exercises/[name]` shows the alternating demo images, muscle and equipment chips, steps and the user's history for that exercise.
- The user explicitly chose this tab layout, which raised the original "5–7 screens" budget. Still prefer adding to an existing screen over adding a new one.
- Per-screen header buttons are set with `<Stack.Screen options={...}>` inside the screen.
- Only route files belong in `src/app/`.

**Shared components**: `Section`, `Row`, `Separator` and `RowIconInset` (`components/list.tsx`, the iOS inset-grouped list every screen is built from), `Icon` (SF Symbol / Material Symbol), `Button` (`primary`, `tinted`, `plain`, `destructive`; `size="small"` is the capsule), `Stat`, `ChallengeCard`, `ConsistencyCard` and `RemindersPrompt` (`components/cards.tsx`), `ExerciseList`, `WorkoutSummary`, `Avatar`, `ActionMenu`/`PromptDialog` (`components/sheet.tsx`), `ChallengeDots` and `Confetti` (only when a challenge is won). Use `useNow(intervalMs)` (`hooks/use-now.ts`) instead of calling `Date.now()` during render; the React Compiler purity lint rejects that.

**Styling and theming** (the full system is in `DESIGN.md`; product context in `PRODUCT.md`):
- The look is calm native iOS, like Apple Fitness and Health: grouped `background` (#F2F2F7), white `surface` sections at `Radius` (14) with hairline `separator`s, SF Symbols, and one green tint (`accent` #1E7B34 light / #30D158 dark) kept for primary actions, ticked sets, progress and records. Exercise names, stats, section titles and navigation rows are never green.
- Plain `StyleSheet` with the semantic tokens in `src/constants/theme.ts` through `useTheme()`: `text`, `textSecondary`, `background`, `backgroundPlain` (A–Z lists, guide, onboarding), `surface`, `fill`/`fillStrong`, `separator`, `outline`, `accent`/`onAccent`/`accentSoft`, `destructive`, `avatar`. No raw hex in screens.
- Text: `ThemedText` with `type` set to an iOS text style (`largeTitle`, `title1`–`title3`, `headline`, `body` (default), `callout`, `subheadline`, `footnote`, `caption`) from `TextStyles`, and `numeric` for tabular figures. Don't set a raw `fontSize`. Section titles are sentence-case title3 at weight 700, never uppercase eyebrows.
- Empty states get a symbol, a title3 line, one sentence and one action. Gains get the tint; a lighter session is stated in grey, never red.
- The root `_layout.tsx` builds the navigation theme from these tokens so headers match the grouped background; the Exercises stack and Add Exercise use `backgroundPlain`.
- `.impeccable/` holds design-workflow artifacts (critique snapshots, the surface brief, `design.json`); it isn't app code.
- `src/hooks/use-color-scheme.web.ts` uses `useSyncExternalStore` for hydration-safe web rendering. Don't revert it to the `useEffect`+`setState` pattern, because the `react-hooks/set-state-in-effect` lint rule rejects it.

**Platform conventions:**
- `src/lib/confirm.ts` wraps destructive confirmations, because `Alert.alert` buttons don't work on web.
- Haptics calls are skipped on web.
- Files ending in `.web.tsx`/`.web.ts` are web-specific overrides.
- `TextInput`s inside flex rows need `minWidth: 0` or they overflow on web.
- Icons: use `Icon` (`components/icon.tsx`) with `{ ios: '<SF Symbol>', md: '<material_symbol>' }`; it wraps `SymbolView` for iOS, Android and web. No emoji or text glyphs (✓ ✕ ‹ ›) as icons. Tab icons use the `sf`/`md` props.
