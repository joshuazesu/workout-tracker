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

**State lives in one module-level store**, `src/lib/workouts.ts`. It holds the `profile` (name, photo URI, height cm, weight kg), the body-weight log (`weights`), the active workout, history, routines (workout templates, max `MAX_ROUTINES` = 5), a routine `draft` being edited, the current challenge, trophies and the `onboarded` flag, and exposes it to React with `useSyncExternalStore` (`useWorkoutStore()`). All mutations go through `workoutActions`, `routineActions` or `profileActions`, and every mutation writes the whole state to storage synchronously. Screens never hold workout data in local state. They read the store and call actions, which is how the tabs, the workout screen and the modals stay in sync without context or params.

**Persistence** uses `localStorage`. `src/lib/storage.ts` imports `expo-sqlite/localStorage/install` to provide a synchronous one on native, and `storage.web.ts` is empty because the browser has its own (importing expo-sqlite on web breaks the web bundle). The storage key is versioned (`workouts.v2`; `load()` migrates `v1` and fills missing fields from `initialState()`, so adding a field with a default needs no bump). Bump it, or migrate, when changing the shape of existing fields. The profile photo is copied into `Paths.document` (expo-file-system) because image-picker URIs live in a purgeable cache.

**Body weight:** `weights` is one `{ day, kg }` per local day (`day` = `startOfDay`), oldest first. `profileActions.logWeight()` (the Profile "Log weight" dialog) and `editWeight()` (the Settings field, which keeps the text as typed) both replace today's reading and keep `profile.weightKg` equal to it. `load()` seeds the log from an existing profile weight once (only when the saved state has no `weights` key, so a reset stays empty). `weightChanges()` gives the change since the first reading and over the last 7, 12 and 30 days; a window only appears when there's a reading from before it and one inside it. `WeightDelta` (`components/weight.tsx`) rotates through them every 5 s under the profile name (tap for the next; gain and loss are coloured from `state.weightColors`, each `'green' | 'red' | 'neutral'`, default red gain and green loss, set in Settings), and `WeightCard` draws the chart: a monotone-cubic SVG line spaced by date with a blue gradient wash.

**Units:** `state.units` (`'metric' | 'imperial'`) only changes how body height and weight are shown and entered; they're always stored in cm and kg (`profile.heightCm`, `profile.weightKg`, `weights`). Conversions and formatting live in `src/lib/units.ts` (`formatHeight`, `formatBodyWeight`, `toDisplayWeight`, `fromDisplayWeight`). Pounds are saved as kg to two decimals so they read back exactly. Settings' height and weight fields hold local text and remount when the units change. Lifting weights (sets) stay kg-only.

**Workout lifecycle:**
- `start()` creates `active`, which is a no-op if one already exists.
- `start(routineId?)` names the workout after the template and prefills each exercise's sets from the last time it was logged. The user can rename it on the workout screen (`workoutActions.rename`).
- Multiple workouts per day are fine. History is a flat list, and the calendar and stats group by local day (`dayKey`).
- `finish()` keeps only sets marked `done`, drops exercises left with no sets, prepends the workout to `history`, marks the challenge complete if this workout won it, and returns the saved id. If nothing is done it discards the workout and returns null.
- `src/app/workout.tsx` navigates back on its own once `active` becomes null (discard). On finish it replaces itself with `/complete?id=…`, the celebration screen. The live timer is the header title and the workout name is an editable title1 field in the body. Complete shows duration, volume and sets, any personal records with their gain over the previous best (`personalRecords()` returns `previous`), extra volume versus the last workout with the same name (only when it went up), and challenge progress. Confetti plays on every finish (more for a won challenge). The challenge appears as `DayBoxes` on Start, Complete and onboarding.

**Template set counts:** `Routine.sets` maps exercise name to set count. It's optional, so old templates fall back to `defaultSetCount()` (last time's count, else 3), and `routineActions.edit()` fills it in so the editor's `Stepper` shows exact numbers. `start(routineId)` records `routineId` on the workout and `templateSets` on each exercise; adding or removing a set stamps `setsChangedAt`. When finishing, `templateSetChanges()` lists the template exercises whose count changed, in the order they were changed, and the workout screen asks (via `ChoiceDialog` in `components/sheet.tsx`) whether to save them with `routineActions.updateSetCounts()` before calling `finish()`. `finish()` strips these bookkeeping fields from history.

**Appearance:** `state.appearance` (`'system' | 'light' | 'dark'`) is set in Settings. Both `useColorScheme` hooks return it unless it's `'system'`, and the root layout calls `Appearance.setColorScheme` on native so native chrome follows it.

**Logging shortcuts** (workout screen):
- Each set row shows PREVIOUS: the same set index from the last time the exercise was logged (`lastSets()` in `workouts.ts`, passed in as a prop so the memoized `ExerciseCard` doesn't re-render on every store change). Tapping it copies the weight and reps.
- Swipe left reveals one red action via `SwipeAction` (`components/swipe-action.tsx`, built on `ReanimatedSwipeable`, which is why the root layout is wrapped in `GestureHandlerRootView`). It's used to delete a set (no confirmation), delete a template, and discard the in-progress workout from the Start screen's card (both confirmed). Each swipe row also exposes the action to screen readers through `accessibilityActions`.
- Suggestions: `updateSet` carries a non-empty weight or reps edit down to later sets that still hold the old value and aren't ticked. An empty field's placeholder suggests the nearest earlier set's value for that field (else last time's), and ticking a set with empty fields accepts those suggestions.
- Ticking a set starts the rest timer (`workoutActions.startRest()`). `active.restUntil` is a timestamp, so the countdown survives leaving the screen. `state.restSeconds` (default 90) is the length; −15/+15 in `RestTimer` (`components/rest-timer.tsx`) adjust the running rest and the saved length. When it ends it plays `feedback.restDone()` and clears itself. It doesn't notify while the app is in the background.

**Challenges** (`CHALLENGES` in `workouts.ts`) are "work out on N different days within a window", chained kickstart → builder → habit. Progress is derived from history by `challengeProgress()`, never stored. A challenge is only "complete" once `finish()` sets `completedAt` and awards the trophy, so the UI and the trophy count can't disagree.

**Reordering**: templates on Start and exercises in the template editor are reordered by holding a row for 300 ms and dragging it (`SortableList`, `components/sortable-list.tsx`, built on Gesture Handler's `Pan().activateAfterLongPress` and Reanimated). Rows are absolutely positioned from a shared `order` on the UI thread, so the other rows make room while you drag and nothing jumps when the store re-renders in the new order. Row heights are collected in React state from `onLayout` and then copied to a shared value. Don't set the shared value from each `onLayout`: on native, rows measured in the same frame overwrite each other and the unmeasured ones stay invisible. A held row lifts onto a rounded paper card 12 px wider than the row, with a soft shadow and a hairline edge. On release it calls `routineActions.move()` or `moveExercise()`. Moving before the hold time ends scrolls or swipes as normal. The screen passes `onDragChange` to turn off scrolling (and the editor's swipe-to-close) while a row is held. Haptics: `feedback.lift()` when a row is picked up, `tap()` each time it passes another slot, `drop()` on release. Screen readers get "Move up/down" accessibility actions instead.

**Templates**: `routineActions.edit()` and `duplicate()` return false at the 5-template limit, and the caller shows the limit alert. Rename uses `renameSaved()` through `PromptDialog`. The "•••" menu is `ActionMenu` (`src/components/sheet.tsx`, built on RN Modal so it works on every platform). It slides up from the bottom (scrim fades) and keeps the Modal mounted until it has slid back out (200 ms), then runs the chosen option after a 300 ms delay, because iOS can't present a screen or alert while the modal is still dismissing.

**Exercise catalogue**: `src/constants/exercises.ts` (54 exercises, A–Z) was generated from the public-domain Free Exercise DB. Images (start and end positions) are bundled in `assets/exercises/<slug>-0|1.jpg`; the 4-step instructions were written by hand. `EXERCISES` in `workouts.ts` is derived from it. To add an exercise, add an entry with a static `require` for both images. Users can still log custom exercises that aren't in the catalogue, and those have no guide.

**Rewards** go through `src/lib/feedback.ts` (sound + haptics together): `setDone`, `workoutDone`, `challengeDone`. Chimes are synthesized WAVs in `assets/sounds/`, played with `expo-audio` in `mixWithOthers` mode so the user's music keeps playing.

**Reminders** (`src/lib/reminders.ts`) are local scheduled notifications, not remote push (remote push isn't available in Expo Go on Android). `_layout.tsx` calls `syncReminders()` whenever history or the challenge changes; it cancels everything and reschedules challenge check-ins plus inactivity nudges counted from the last workout. They're skipped on web.

Set `weight`/`reps` are stored as strings so they're friendly to text inputs, and they're converted to numbers only in calculations such as `workoutVolume`. Weights are kg only.

**Routing:**
- The root `src/app/_layout.tsx` is a native `Stack`. `onboarding` is behind `Stack.Protected guard={!onboarded}`; everything else is behind `guard={onboarded}`, so `completeOnboarding()` routes into the tabs on its own.
- Root stack screens that cover the tab bar: `(tabs)`, `workout`, `add-exercise` (modal; `?target=routine` adds to the routine draft instead of the active workout), `routine` (modal template editor), `complete` (full-screen celebration).
- `src/app/(tabs)/_layout.tsx` uses `NativeTabs` from `expo-router/unstable-native-tabs`. Left to right: `profile`, `history`, `(start)`, `exercises`. Each tab folder has its own `Stack` `_layout.tsx` for headers and pushes. The app opens on Start Workout because `/` resolves to `(tabs)/(start)/index`.
  - `profile/index`: the name as the screen title (with the photo if set, or an "Add your name" button) and the rotating weight change under it, a totals ledger (workouts, week streak), the weight chart, the 12-week habit grid shaded in blue by workouts per day with a Less→More key, trophy cards (earned, plus a dashed card for the current challenge), and the reminders prompt. `profile/settings` (modal) edits the name, photo, height and weight, has the Appearance picker (System, Light, Dark), the Units picker (Metric, Imperial), the weight-change colour pickers (Gain, Loss: Green, Red, Neutral), and has "Reset tracking history" (`workoutActions.resetHistory()`, which also wipes the weight log and current weight but keeps the name, photo, height and templates).
  - `history/index`: workouts grouped by month as summary rows (`WorkoutSummary`: relative date, duration, volume, exercise list). Tapping a row expands its condensed sets ("3 × 8 · 70 kg", `summarizeSets` in `lib/format.ts`); long-pressing deletes it. `history/calendar` (modal) is a month grid with workout days as filled tint circles; tapping a day shows that day's workouts, expanded.
  - `(start)/index`: "Today’s log" header, an "In progress" block (timer and the only filled button, Resume) while a workout runs, the challenge as day boxes, and the Templates ledger: each row shows the name, "N exercises · N sets", a "•••" menu (rename, edit, duplicate, delete) and a round play button, filled blue on every template. "New template" and "Empty workout" link rows close it. Play buttons hide while a workout is active.
  - `exercises/index`: A–Z `ExerciseList` with search in the native header (`headerSearchBarOptions`; web falls back to an inline field). `exercises/[name]` shows the alternating demo images, muscle and equipment chips, steps and the user's history for that exercise.
- The user explicitly chose this tab layout, which raised the original "5–7 screens" budget. Still prefer adding to an existing screen over adding a new one.
- Per-screen header buttons are set with `<Stack.Screen options={...}>` inside the screen.
- Only route files belong in `src/app/`.

**Shared components**: `ScreenHeader` (tab-root ledger header), `Section`, `Row` and `Separator` (`components/list.tsx`, the ledger every screen is built from), `Icon` (SF Symbol / Material Symbol), `Button` (`primary` blue pill, `tinted` ink-outlined pill, `plain`, `destructive`; `size="small"`), `Stat`, `ProgressRing`, `Stepper`, `SwipeAction`, `SortableList`, `RestTimer`, `ChallengeCard`, `DayBoxes`, `ConsistencyCard` (the habit grid) and `RemindersPrompt` (`components/cards.tsx`), `WeightCard`/`WeightDelta` (`components/weight.tsx`), `ExerciseList`, `ExerciseCard`, `WorkoutSummary`, `Avatar`, `ActionMenu`/`PromptDialog`/`ChoiceDialog` (`components/sheet.tsx`) and `Confetti`. Use `useNow(intervalMs)` (`hooks/use-now.ts`) instead of calling `Date.now()` during render; the React Compiler purity lint rejects that.

**Styling and theming** (the full system is in `DESIGN.md`; product context in `PRODUCT.md`):
- The look is "Logbook", a training ledger: plain paper (`background` #FFFFFF, #0B0D10 in dark mode) with ink rules instead of cards. Each tab root has its own `ScreenHeader` (`components/screen-header.tsx`, tab stacks set `headerShown: false`): a big condensed title, a line of context and a 2 px ink rule. `Section` (`components/list.tsx`) is a bold title over a 1 px ink rule, then rows split by light `separator` rules. The only raised surfaces are trophy cards, sheets, dialogs and the calendar (`surface`).
- One blue tint (`accent` #0B5FD6 light / #4C95FF dark) for primary actions, progress, the habit grid and records. Anything filled with it behind white text uses `accentFill` (#1F6FEB in dark mode). Ticked sets and earned challenge days are ink-filled (`text` with `onText` checkmarks), not blue. Buttons are pills: `primary` blue-filled, `tinted` ink-outlined.
- Fonts: Archivo (body) and Archivo Narrow (condensed headings and big numbers) from `@expo-google-fonts`, loaded in the root layout before the splash hides. Custom fonts ship one family per weight, so `ThemedText` maps the final `fontWeight` to a family; for `TextInput`s and other non-`ThemedText` text use `textStyle('<type>')` or `font(weight, narrow)` from `theme.ts` rather than `fontWeight`.
- Text: `ThemedText` with `type` from `TextStyles` (`display`, `largeTitle`, `title1` (Narrow), `title2`, `title3`, `headline`, `body` (default), `callout`, `subheadline`, `footnote`, `caption`) and `numeric` for tabular figures. Don't set a raw `fontSize` except for deliberate big numerals.
- Semantic tokens via `useTheme()`: `text`, `textSecondary`, `onText`, `background`, `backgroundPlain`, `surface`, `fill`/`fillStrong`, `separator`, `outline`, `accent`/`accentFill`/`onAccent`/`accentSoft`/`accentMid`, `destructive`, `positive` (green, only for the weight change), `avatar`. No raw hex in screens except white on the blue rest band. Screen side margin is `Gutter` (22).
- Native headers on pushed screens and modals share `useHeaderOptions()` (paper background, no shadow, Archivo title).
- Workout screen: the status band is a `ProgressRing` (react-native-svg) of sets done next to the editable workout name and "kg lifted · next exercise"; the rest timer is a full-width blue band at the bottom.
- Empty states get a symbol, a title3 line, one sentence and one action. Gains get the tint; a lighter session is stated in grey, never red.
- Motion (Reanimated 4) is kept small and under 300 ms. Curves live in `constants/motion.ts` (`EASE_OUT`, `EASE_SHEET`); never `Easing.in` on UI. Things that happen 20 times a workout get no wobble: the set tick dips to 0.94 on press, swells to 1.08 and settles in about 260 ms, and an empty tick shakes sideways. The progress ring's arc glides (300 ms), set rows and exercise cards fade in or out while the rows below glide (`rowLayout`), and new cards wait 250 ms for the add-exercise modal to close, then scroll into view. `LayoutAnimationConfig skipEntering` stops all of this replaying when the workout screen opens. The bigger moments are on Complete only: badge spring, staggered sections, confetti, and the challenge box this workout earned filling in at 850 ms (`DayBoxes earnIndex`, with `feedback.dayEarned()`). Every animation checks `useReducedMotion` (fade instead of slide/scale). On web, a card mounted behind the modal collapses under Reanimated's entering animation, so cards skip their entrance there.
- `.impeccable/` holds design-workflow artifacts (critique snapshots, the surface brief, `design.json`); it isn't app code.
- `src/hooks/use-color-scheme.web.ts` uses `useSyncExternalStore` for hydration-safe web rendering. Don't revert it to the `useEffect`+`setState` pattern, because the `react-hooks/set-state-in-effect` lint rule rejects it.
- On web, native tabs render as a bar across the top, so `ScreenHeader` adds 64 px of top padding there.
- Tab roots have no native header (the root stack hides it for `(tabs)` in both `screenOptions` and the screen, so "(tabs)" never shows). Start, History and Profile instead use `useCollapsingTitle()` + `CompactTitle` (`components/screen-header.tsx`): pass `collapse` to `ScreenHeader` and `onScroll` to an Animated scroll view, and a slim bar with the screen name fades in (150 ms) only once the big title has scrolled under it. Exercises keeps its header fixed above the list, so it doesn't need one.

**Platform conventions:**
- `src/lib/confirm.ts` wraps destructive confirmations, because `Alert.alert` buttons don't work on web.
- Haptics calls are skipped on web.
- Files ending in `.web.tsx`/`.web.ts` are web-specific overrides.
- `TextInput`s inside flex rows need `minWidth: 0` or they overflow on web.
- Icons: use `Icon` (`components/icon.tsx`) with `{ ios: '<SF Symbol>', md: '<material_symbol>' }`; it wraps `SymbolView` for iOS, Android and web. No emoji or text glyphs (✓ ✕ ‹ ›) as icons. Tab icons use the `sf`/`md` props.
