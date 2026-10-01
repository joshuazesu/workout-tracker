---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface brief: whole app (iOS)

Scope: every screen in src/app (Start, Workout, Complete, History, Calendar, Exercises, Exercise detail, Profile, Settings, Onboarding, Template editor, Add Exercise, menus). Visitor mode: Operate.
Audience and job: the developer now, App Store users later; log sets mid-workout one-handed, then browse progress between sessions.
Constraints: Expo Go only, tab layout fixed (Profile, History, Start Workout, Exercises), kg only, 5-template limit, behaviour and store untouched.
Pinned by the user: bold redesign, calm native iOS, alongside Apple Fitness and Apple Health. Build path: code-led (no image generation).

## Direction contract

THESIS: The app should feel like it shipped with the iPhone: grouped lists on the system grey, white rounded sections, SF Symbols and the system type scale. Green is saved for the few moments that matter. It refuses the incumbent stack of grey cards on white, each with a full-width green button.

OWN-WORLD: The grouped background is #F2F2F7 (black in dark mode), with #FFFFFF / #1C1C1E inset sections at a continuous 12–14 pt corner radius and hairline separators. Text uses label and secondaryLabel (#6C6C70 / #AEAEB2). The one tint is #1E7B34 (#30D158 in dark mode). The destructive color is #D70015 / #FF453A. Icons are SF Symbols only. Section titles are Fitness-style title3 bold, in sentence case.

STORY: Open the app, see your challenge and your templates, and start one with a small tinted Start capsule. While logging, ticking a set is the loudest thing on screen. Afterwards, History reads as short summaries you can expand. The finish screen shows what improved.

FIRST VIEWPORT: Start uses the large title "Start Workout". Next comes a Resume section while a workout is running: name, a live timer and one filled Resume button. Then a challenge section showing progress dots, the day count and days left. Then a Templates group: a row per template with its name, its exercises and a trailing tinted Start capsule, with an ellipsis menu button and a "New Template" row last. The empty workout sits in its own one-row group below.

FORM: canon (the user took the standing exit by pinning the iOS world); position 1 of 1. Seed key 09ea1934. Kept from the declined monochrome-product challenger: the accent is rationed to roughly four uses per screen.

SIGNATURE INTERACTION: ticking a set. An outlined empty square becomes a filled tint square with a checkmark, with a spring pop and haptic, and the row washes in tint. Motion grammar: press scale of 0.97, short fades for expanding content, springs only for the set tick and the finish badge, and Reduce Motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
