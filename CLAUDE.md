# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Pending (updated 2026-10-03):** At the start of the next session, remind the user where they left off. Done: Supabase accounts and sync (tested on the phone), account deletion, a daily `pg_cron` purge of 30-day-old tombstones, and separate dev (`workout-app-dev`) and production (`workout-app`) projects. Dev sign-in is tested on the phone (dev has its own Resend key). Template reorder (press and hold) is tested on the phone alongside tab swiping. Still to do: untested: sync between two devices. Branding: welcome concept C (rolling log) is in the app; D (woodpile) and E1 (title crushes the logs) stay shortlisted on the design canvas. Before others can sign in: verify a domain in Resend (`onboarding@resend.dev` only delivers to the owner's email), then move to EAS builds (set the production env vars in EAS). Remove this note once these are addressed or the user declines.

General Expo rules (check versioned docs before touching Expo APIs, use `npx expo install`, Expo Go limitations, EAS) live in AGENTS.md:

@AGENTS.md

## Project

**LogMyLift**, a simple Hevy-style workout tracker built with Expo SDK 57, React Native 0.86, React 19, TypeScript and Expo Router. It is developed and demoed on a physical phone via Expo Go, so new dependencies must be ones bundled in Expo Go unless the project moves to a development build. There is no Xcode or Android Studio on this machine.

Brand: the log is the currency. The app is "your Logbook" (capital L in copy, e.g. the sign-in title "Sign in to your Logbook"), and the mark is a wooden log on the heavy ink rule (see the welcome lockup under Styling).

## Commands

```bash
npm start                # dev server on the dev Supabase project; scan the QR code with Expo Go (same Wi‑Fi), or use --tunnel
npm run start:prod       # same, on the production Supabase project (your real account)
npm run lint             # ESLint (eslint-config-expo, flat config)
npx tsc --noEmit         # typecheck
npx expo-doctor          # dependency/config health check
```

There is no test runner set up.

### Which environment to use

When the user asks which environment fits a task, answer from this. Dev is `workout-app-dev` (ref `cmzqukdtfgvgvaexoxei`, `npm start`), production is `workout-app` (ref `xqutywwgxtmyuznqvyfd`, `npm run start:prod`). Each keeps its own data on the phone, so switching is safe.

- **Building or testing features, UI work, bug repros:** dev (`npm start`). Dev data is throwaway.
- **Anything destructive** (sign out, delete account, reset, sync edge cases, two-device sync tests): dev. Sign both phones into the same dev account.
- **Logging real workouts or looking at real data:** production (`npm run start:prod`). Investigate a bug seen there read-only, then reproduce it in dev.
- **Database changes:** write a migration, apply it to dev first (`npx supabase db push --project-ref cmzqukdtfgvgvaexoxei`), test with `npm start`, then apply it to production (`npx supabase db push`) before app code that needs it runs against production. Dry-run first (`--dry-run`).
- **Auth or email settings:** change dev first (`npx supabase config push --project-ref cmzqukdtfgvgvaexoxei`, decline the storage change). Production's auth settings were set in the dashboard, so preview a config push there (answer `n`) and expect differences beyond the change you meant.
- **Productionising (release builds, inviting other people):** production. EAS builds need the values from `.env.production.local` (including `EXPO_PUBLIC_APP_ENV=production`) set as EAS environment variables, and production needs a verified Resend domain first. Smoke-test with `npm run start:prod` before building.
- The Supabase CLI is linked to production, so a CLI command without `--project-ref cmzqukdtfgvgvaexoxei` (e.g. `db push`, `db query --linked`) hits production. For dev queries use `db query --linked --project-ref cmzqukdtfgvgvaexoxei`.

Expo Router's typed routes (`expo-env.d.ts`, `.expo/types`) are regenerated only while the dev server runs. After adding a screen, `router.push('/new-route')` fails typechecking until `expo start` has run once.

The Metro file watcher on this machine sometimes misses edits (the served bundle stays stale). If a change doesn't show up, restart `expo start` before debugging the code.

For a visual check without a phone, run `npx expo start --web` and drive it with `playwright-cli`. No Playwright browsers are installed; point it at Brave via a config with `launchOptions.executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"`.

Do not run `npm run reset-project`: it's leftover from the template and moves all of `src/` and `scripts/` into `example/` (or deletes them), wiping out the app.

## Architecture

**State lives in one module-level store**, `src/lib/workouts.ts`, exposed with `useSyncExternalStore` (`useWorkoutStore()`). All mutations go through `workoutActions`, `routineActions` or `profileActions`, and every mutation writes the whole state to storage synchronously. Screens never hold workout data in local state; they read the store and call actions, which is how tabs, the workout screen and modals stay in sync without context or params.

**Persistence** uses `localStorage`. `src/lib/storage.ts` imports `expo-sqlite/localStorage/install` to provide a synchronous one on native; `storage.web.ts` is empty because importing expo-sqlite on web breaks the web bundle. The key is versioned (`workouts.v2`). `load()` fills missing fields from `initialState()`, so adding a field with a default needs no bump; changing the shape of an existing field does (or a migration). The profile photo is copied into `Paths.document` because image-picker URIs live in a purgeable cache.

**Accounts and sync** (`src/lib/sync.ts`, schema in `supabase/migrations/`): sign-in is required, by emailed code (`signInWithOtp` + `verifyOtp`; no deep links, so it works in Expo Go). The local store stays the source of truth for the UI. Every `setState` passes `(prev, next)` to `storeSync.onChange`, which diffs them by reference (updates are immutable) into pending keys (`profile`, `workout:<id>`, `routine:<id>`, `weight:<day>`), pushed 1.5 s later. Each sync pushes, then pulls rows with `updated_at` newer than the cursor (minus a minute) and applies them with `storeSync.applyRemote`, which doesn't re-queue them. A pull never overwrites a record with unpushed edits. Deletes are `deleted_at` tombstones. The in-progress workout, template draft and profile photo are not synced.
- The app unlocks on `meta.userId` (local, so it opens offline), not on the Supabase session. `meta.owner` is whose data is on the phone: the first sign-in uploads everything to a new account, or for an existing account takes its templates, settings and profile and adds this phone's workouts and weights. Signing out clears the phone. Delete account calls the `delete_account()` RPC (a `security definer` function that deletes the `auth.users` row, cascading to every table), then clears the phone; it needs a connection.
- `state.accent` (Settings → Accent colour: default blue, 8 presets in `ACCENT_PRESETS`, or any `#RRGGBB` from the colour wheel in `components/color-wheel.tsx`) syncs in the `accent` column of `profiles` (null is default blue).
- A new field in `State` that should sync needs a column, a line in `profileRow`/`applyChanges` (or its own table), and a check in `changedKeys`.
- Two Supabase projects: `workout-app-dev` (`.env.development.local`, used by `npm start`) and `workout-app` (`.env.production.local`, used by `npm run start:prod` and production builds); see `.env.example`. Each env file sets `EXPO_PUBLIC_APP_ENV`, and `storageKey()` (`src/lib/env.ts`) gives dev its own local keys (`workouts.v2.dev`, `sync.v1.dev`), so switching backends on one phone never mixes accounts. The CLI is linked to production: apply migrations to both (`npx supabase db push`, then `npx supabase db push --project-ref cmzqukdtfgvgvaexoxei`). New tables need explicit `grant`s and RLS policies; Supabase no longer exposes them automatically.
- A `pg_cron` job (`purge-deleted-rows`, daily 03:00 UTC) permanently deletes tombstones older than 30 days. A phone that hasn't synced for longer keeps its copy of those records.
- Sign-in emails use `supabase/templates/code.html` (`{{ .Token }}`), set in `config.toml` and applied with `npx supabase config push --project-ref <ref>` (decline the storage-analytics change). Both projects send through Resend SMTP, set in the dashboard (free projects can't change templates on Supabase's built-in email).

**Invariants worth knowing:**
- Body height and weight are always stored in cm and kg; `state.units` only changes display and entry (`src/lib/units.ts`). Pounds are saved as kg to two decimals so they read back exactly. Set weights are kg only.
- Set `weight`/`reps` are strings (friendly to text inputs), converted to numbers only in calculations.
- `finish()` keeps only `done` sets, drops empty exercises, and returns null (discarding the workout) if nothing was done. It also strips the template bookkeeping fields (`routineId`, `templateSets`, `setsChangedAt`) from history.
- The Challenges tab (`(tabs)/challenges/index.tsx`) holds the current `ChallengeCard`, the ladder (kickstart → builder → habit) and the trophy shelf; none of these are on Today's log or Profile any more.
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
- Onboarding (`onboarding.tsx`) is a horizontal paging `ScrollView`: pages are swiped (or the dots tapped) both ways. Only the challenge and reminders pages have buttons, and only the last page's buttons finish. On web there's no reminders page, so the challenge buttons finish there.
- Body height and weight are picked on wheels (`@react-native-picker/picker`, in Expo Go; a dropdown on Android and web) in a `BottomSheet` (`components/sheet.tsx`), via the shared fields in `components/profile-fields.tsx`. BMI is derived with `bmi()` in `units.ts`, never stored; `state.showBmi` hides it.
- Sign-in `TextInput`s drop `lineHeight` (`inputText()`) and are `multiline`, because iOS clips a single-line TextInput's text (and the placeholder) in that font.
- To add a catalogue exercise, add an entry in `src/constants/exercises.ts` with a static `require` for both images in `assets/exercises/`.

**Routing:**
- The root `src/app/_layout.tsx` is a native `Stack` with three `Stack.Protected` groups: `sign-in` (signed out), `onboarding` (signed in, not onboarded) and everything else, so signing in and `completeOnboarding()` route on their own.
- The welcome screen (`components/welcome-screen.tsx`) opens every launch. Signed out, it is the sign-in screen's first step. Already signed in, the root layout draws it over the app (`welcome` state, set once at launch) and a tap fades it to the Start tab. A tap before the lockup settles cuts `WelcomeMark` to its final frame (`settled` prop), holds it briefly, then continues.
- Tabs are `PagerTabs` (`components/pager-tabs.tsx`, built on `unstable_createStandardRouterNavigator` + `TabRouter`, tab order and icons in `TABS`): the five tab pages (Profile, History, Workout, Exercises, Challenges) sit side by side and follow the finger (one page per swipe), with a bottom bar drawn to look like the native one; each tab's grey-to-blue crossfade is driven by the page offset (no highlight pill; the user didn't want one), so swipes, taps and the settle all animate together. Each tab folder has its own `Stack`. `/` resolves to `(tabs)/(start)/index`. Tab roots have no native header (hidden for `(tabs)` in both `screenOptions` and the screen, so "(tabs)" never shows); they draw `ScreenHeader` instead.
- Tab labels must fit 75pt (a fifth of an SE/mini screen) in the 12pt caption font. That's why the Start tab is labelled "Workout"; "Start Workout" measured 76pt.
- Tab dots: `useTabBadges()` (`hooks/use-tab-badges.ts`) derives, per tab name, whether something is waiting. Challenges shows a dot when there's no challenge running, or one is complete or has ended. Profile shows one when there's no name, or reminders are off (never on web). A dot only shows while that tab isn't on screen. It's derived, never stored, so it clears as soon as the thing is dealt with. These are the two triggers the user chose; ask before adding more.
- The user explicitly chose the tab order (Challenges as its own tab, from the Challenge placement canvas https://claude.ai/artifact/7BFemCC4hMnrdfcT4e4FcF) and the swipeable pager over the native tab bar (which can't follow a finger). Still prefer adding to an existing screen over adding a new one.
- Swipe rows vs the pager (`SwipeAction`, `usePageGesture()`): a guard pan that only activates on leftward drags blocks the pager, so a left swipe starting on a template or the in-progress card opens Delete/Discard; a closed row ignores rightward drags (`dragOffsetFromLeftEdge` 10000), so a right swipe there still goes to the previous tab, and an open row closes on a right swipe. The pager activates at 12 pt sideways and gives up after 20 pt vertical (thumbs swipe in an arc). Tappable rows on tab pages (`Row`, `ExerciseList`, `WorkoutSummary`) use `useTapGuard()` so a touch that moved more than 10 pt isn't a tap; a failed sideways swipe would otherwise open the row.
- Per-screen header buttons are set with `<Stack.Screen options={...}>` inside the screen. Pushed screens and modals use `useHeaderOptions()`.
- Only route files belong in `src/app/`.

## Styling

The full design system is in `DESIGN.md` and product context in `PRODUCT.md`; read them before UI work. The rules that are easy to break:

- The look is "Logbook": plain paper with ink rules instead of cards, built from `Section`/`Row`/`Separator` (`components/list.tsx`). Raised `surface` is only for trophy cards, sheets, dialogs and the calendar.
- Colours come from `useTheme()` tokens. No raw hex in screens (except white on the blue rest band). The tint is user-selectable: `useTheme()` replaces `accent`, `accentFill`, `accentSoft` and `accentMid` with `accentTokens(state.accent)` (`src/lib/accent.ts`, contrast-adjusted per scheme), so never read `Colors[...]` for colours in UI. One tint (`accent`); anything blue-filled behind white text uses `accentFill`. Ticked sets and earned challenge days are ink-filled, not blue. `positive` green is only for the weight change. A lighter session is stated in grey, never red.
- Text uses `ThemedText` with a `type`; don't set a raw `fontSize` except for deliberate big numerals. Custom fonts ship one family per weight, so for `TextInput`s and other non-`ThemedText` text use `textStyle('<type>')` or `font(weight, narrow)` from `theme.ts`, not `fontWeight`. Screen side margin is `Gutter`.
- Empty states get a symbol, a title3 line, one sentence and one action.
- Motion (Reanimated 4) stays small and under 300 ms, with curves from `constants/motion.ts`; never `Easing.in` on UI. Give every `entering`/`exiting` builder `.easing(EASE_OUT)`: Reanimated's default is `inOut(quad)`, which starts slow. CSS transitions (`transitionTimingFunction`) take `EASE_OUT_CSS`. Press feedback is a CSS transition, 100 ms in and 150 ms out (`Button`). Anything a finger releases settles with a spring carrying `velocity` (pager, sortable list). Things that happen 20 times a workout get no wobble; bigger moments belong on Complete only. The one exception is the welcome screen's brand lockup (`components/welcome-mark.tsx`): a log rolls in along the heavy rule (~1.7 s) and the name rises in; the welcome screen's "Tap to continue" waits for `WELCOME_SETTLED_MS`. Its log colours are theme tokens (`bark`, `wood`, `woodRing`, `woodPith`, `woodOutline`, which is near-black in dark mode so the log has no visible outline). Other welcome concepts (woodpile, title crushing a log pile) are on the design canvas https://claude.ai/artifact/QSCF5RJuZgEpWNAKHgNYLN. Every animation checks `useReducedMotion`. On web, a card mounted behind a modal collapses under Reanimated's entering animation, so cards skip their entrance there.
- Use `useNow(intervalMs)` instead of calling `Date.now()` during render; the React Compiler purity lint rejects that.
- `src/hooks/use-color-scheme.web.ts` uses `useSyncExternalStore`. Don't revert it to `useEffect`+`setState`; the `react-hooks/set-state-in-effect` lint rule rejects it.
- `.impeccable/` holds design-workflow artifacts; it isn't app code.

**Platform conventions:**
- `src/lib/confirm.ts` wraps destructive confirmations, because `Alert.alert` buttons don't work on web.
- Haptics calls are skipped on web.
- Files ending in `.web.tsx`/`.web.ts` are web-specific overrides.
- `TextInput`s inside flex rows need `minWidth: 0` or they overflow on web.
- Icons: use `Icon` (`components/icon.tsx`) with `{ ios: '<SF Symbol>', md: '<material_symbol>' }`. No emoji or text glyphs (✓ ✕ ‹ ›) as icons. Tab icons live in `TABS` (`components/pager-tabs.tsx`), each with an outline and a filled (selected) variant.
