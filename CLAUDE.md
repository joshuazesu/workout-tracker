# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Pending (added 2026-10-02):** At the start of the next session, remind the user where they left off. Supabase accounts and sync are live and tested on their phone (email-code sign-in via Resend SMTP, first upload, sync within ~2 s, offline queue). Account deletion is done and tested. Still to do: (1) a `pg_cron` job that permanently purges rows with `deleted_at` older than 30 days, (2) separate dev and production Supabase projects, (3) untested: sync between two devices. Before others can sign in: verify a domain in Resend (`onboarding@resend.dev` only delivers to the owner's email), then move to EAS builds. Remove this note once these are addressed or the user declines.

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

**State lives in one module-level store**, `src/lib/workouts.ts`, exposed with `useSyncExternalStore` (`useWorkoutStore()`). All mutations go through `workoutActions`, `routineActions` or `profileActions`, and every mutation writes the whole state to storage synchronously. Screens never hold workout data in local state; they read the store and call actions, which is how tabs, the workout screen and modals stay in sync without context or params.

**Persistence** uses `localStorage`. `src/lib/storage.ts` imports `expo-sqlite/localStorage/install` to provide a synchronous one on native; `storage.web.ts` is empty because importing expo-sqlite on web breaks the web bundle. The key is versioned (`workouts.v2`). `load()` fills missing fields from `initialState()`, so adding a field with a default needs no bump; changing the shape of an existing field does (or a migration). The profile photo is copied into `Paths.document` because image-picker URIs live in a purgeable cache.

**Accounts and sync** (`src/lib/sync.ts`, schema in `supabase/migrations/`): sign-in is required, by emailed code (`signInWithOtp` + `verifyOtp`; no deep links, so it works in Expo Go). The local store stays the source of truth for the UI. Every `setState` passes `(prev, next)` to `storeSync.onChange`, which diffs them by reference (updates are immutable) into pending keys (`profile`, `workout:<id>`, `routine:<id>`, `weight:<day>`), pushed 1.5 s later. Each sync pushes, then pulls rows with `updated_at` newer than the cursor (minus a minute) and applies them with `storeSync.applyRemote`, which doesn't re-queue them. A pull never overwrites a record with unpushed edits. Deletes are `deleted_at` tombstones. The in-progress workout, template draft and profile photo are not synced.
- The app unlocks on `meta.userId` (local, so it opens offline), not on the Supabase session. `meta.owner` is whose data is on the phone: the first sign-in uploads everything to a new account, or for an existing account takes its templates, settings and profile and adds this phone's workouts and weights. Signing out clears the phone. Delete account calls the `delete_account()` RPC (a `security definer` function that deletes the `auth.users` row, cascading to every table), then clears the phone; it needs a connection.
- A new field in `State` that should sync needs a column, a line in `profileRow`/`applyChanges` (or its own table), and a check in `changedKeys`.
- Supabase config comes from `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`). New tables need explicit `grant`s and RLS policies; Supabase no longer exposes them automatically.

**Invariants worth knowing:**
- Body height and weight are always stored in cm and kg; `state.units` only changes display and entry (`src/lib/units.ts`). Pounds are saved as kg to two decimals so they read back exactly. Set weights are kg only.
- Set `weight`/`reps` are strings (friendly to text inputs), converted to numbers only in calculations.
- `finish()` keeps only `done` sets, drops empty exercises, and returns null (discarding the workout) if nothing was done. It also strips the template bookkeeping fields (`routineId`, `templateSets`, `setsChangedAt`) from history.
- Challenge progress is derived from history by `challengeProgress()`, never stored. A challenge is only complete once `finish()` sets `completedAt` and awards the trophy, so the UI and trophy count can't disagree.
- `active.restUntil` is a timestamp, so the rest countdown survives leaving the screen.
- `load()` seeds the weight log from an existing profile weight only when the saved state has no `weights` key, so a reset stays empty.
- `routineActions.edit()` and `duplicate()` return false at the `MAX_ROUTINES` (5) limit; the caller shows the alert.

**Gotchas:**
- `SortableList` (`components/sortable-list.tsx`): row heights are collected in React state from `onLayout` and then copied to a shared value. Don't set the shared value from each `onLayout`: on native, rows measured in the same frame overwrite each other and the unmeasured ones stay invisible.
- `ActionMenu` (`components/sheet.tsx`) runs the chosen option 300 ms after it has slid out, because iOS can't present a screen or alert while a modal is still dismissing.
- `lastSets()` is passed to the memoized `ExerciseCard` as a prop so it doesn't re-render on every store change.
- The root layout is wrapped in `GestureHandlerRootView` because `SwipeAction` and `SortableList` need it.
- Reminders are local scheduled notifications (remote push isn't available in Expo Go on Android), skipped on web. `_layout.tsx` re-syncs them whenever history or the challenge changes.
- Sounds play through `expo-audio` in `mixWithOthers` mode so the user's music keeps playing. Rewards go through `src/lib/feedback.ts` (sound + haptics together).
- To add a catalogue exercise, add an entry in `src/constants/exercises.ts` with a static `require` for both images in `assets/exercises/`.

**Routing:**
- The root `src/app/_layout.tsx` is a native `Stack` with three `Stack.Protected` groups: `sign-in` (signed out), `onboarding` (signed in, not onboarded) and everything else, so signing in and `completeOnboarding()` route on their own.
- Tabs use `NativeTabs` from `expo-router/unstable-native-tabs`; each tab folder has its own `Stack`. `/` resolves to `(tabs)/(start)/index`. Tab roots have no native header (hidden for `(tabs)` in both `screenOptions` and the screen, so "(tabs)" never shows); they draw `ScreenHeader` instead.
- The user explicitly chose the current tab layout. Still prefer adding to an existing screen over adding a new one.
- Per-screen header buttons are set with `<Stack.Screen options={...}>` inside the screen. Pushed screens and modals use `useHeaderOptions()`.
- Only route files belong in `src/app/`.

## Styling

The full design system is in `DESIGN.md` and product context in `PRODUCT.md`; read them before UI work. The rules that are easy to break:

- The look is "Logbook": plain paper with ink rules instead of cards, built from `Section`/`Row`/`Separator` (`components/list.tsx`). Raised `surface` is only for trophy cards, sheets, dialogs and the calendar.
- Colours come from `useTheme()` tokens. No raw hex in screens (except white on the blue rest band). One blue tint (`accent`); anything blue-filled behind white text uses `accentFill`. Ticked sets and earned challenge days are ink-filled, not blue. `positive` green is only for the weight change. A lighter session is stated in grey, never red.
- Text uses `ThemedText` with a `type`; don't set a raw `fontSize` except for deliberate big numerals. Custom fonts ship one family per weight, so for `TextInput`s and other non-`ThemedText` text use `textStyle('<type>')` or `font(weight, narrow)` from `theme.ts`, not `fontWeight`. Screen side margin is `Gutter`.
- Empty states get a symbol, a title3 line, one sentence and one action.
- Motion (Reanimated 4) stays small and under 300 ms, with curves from `constants/motion.ts`; never `Easing.in` on UI. Things that happen 20 times a workout get no wobble; bigger moments belong on Complete only. Every animation checks `useReducedMotion`. On web, a card mounted behind a modal collapses under Reanimated's entering animation, so cards skip their entrance there.
- Use `useNow(intervalMs)` instead of calling `Date.now()` during render; the React Compiler purity lint rejects that.
- `src/hooks/use-color-scheme.web.ts` uses `useSyncExternalStore`. Don't revert it to `useEffect`+`setState`; the `react-hooks/set-state-in-effect` lint rule rejects it.
- `.impeccable/` holds design-workflow artifacts; it isn't app code.

**Platform conventions:**
- `src/lib/confirm.ts` wraps destructive confirmations, because `Alert.alert` buttons don't work on web.
- Haptics calls are skipped on web.
- Files ending in `.web.tsx`/`.web.ts` are web-specific overrides.
- `TextInput`s inside flex rows need `minWidth: 0` or they overflow on web.
- Icons: use `Icon` (`components/icon.tsx`) with `{ ios: '<SF Symbol>', md: '<material_symbol>' }`. No emoji or text glyphs (✓ ✕ ‹ ›) as icons. Tab icons use the `sf`/`md` props.
