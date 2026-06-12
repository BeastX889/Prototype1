# Round Timer — Boxing / MMA Interval Timer

A cross-platform (iOS + Android) round timer for boxing, MMA, and interval training,
built with **React Native + Expo**. The timer keeps accurate time and keeps ringing
the bell **even when the app is minimized, the screen is off, or you're playing
music / YouTube** in another app.

## Features

- **Rounds + rest + prep** — fully configurable round length, rest length, number of
  rounds, and a get-ready countdown before round 1.
- **Sounds & warnings** — bell at the start of each round, a configurable "final
  seconds" warning during the round, an end-of-round bell, and countdown beeps in
  the last 3 seconds of prep/rest. Sounds **mix over** your own music instead of
  stopping it.
- **Presets** — built-in Boxing (Pro 12×3/1, Amateur 3×3/1), MMA (Regular 3×5/1,
  Championship 5×5/1), Tabata, and HIIT — plus save your own custom presets.
- **Visual cues** — full-screen color states: green = fight, blue = rest, amber =
  final-seconds warning, neutral = get ready.
- **Keep awake** — the screen stays on while a round is running.
- **Background operation** — see below.

## How background operation works

The OS does not let apps run arbitrary code in the background, so the timer is built
around three pieces that survive suspension:

1. **Timestamp-based engine** (`src/timer/engine.ts`) — the live state is derived from
   a single saved start-timestamp, so the displayed time is always correct on return,
   with no drift.
2. **Background audio session** (`src/audio/sounds.ts`) — `expo-audio` is configured
   with `shouldPlayInBackground` and a ducking interruption mode so bells play over
   your music.
3. **Pre-scheduled local notifications** (`src/notifications/schedule.ts`) — when the
   app goes to the background, one notification per upcoming sound event is scheduled
   so the OS fires the bells/beeps with sound at the exact right moments. They're
   cancelled when you return and in-app playback takes over again.

> **Note:** background audio and custom notification sounds require a **development
> build** (or a store build) — they do **not** work in Expo Go.

## Project structure

```
src/
  app/                 expo-router screens
    _layout.tsx        Stack navigator (dark theme)
    index.tsx          Timer screen (display, controls, color states)
    settings.tsx       Presets + customize (steppers, save custom)
  timer/
    engine.ts          Pure schedule/state/sound-timeline logic (unit-tested)
    engine.test.ts     node:test unit tests for the engine
    useTimer.ts        Hook: ticking, audio, notifications, app lifecycle, keep-awake
  audio/sounds.ts      expo-audio session + one-shot playback
  notifications/schedule.ts  expo-notifications scheduling/cancel
  storage/presets.ts   Built-in presets + custom presets (AsyncStorage)
  components/           TimeDisplay, Controls, Stepper, PresetCard
  theme.ts             Phase colors + palette
assets/sounds/         Generated WAV assets (see scripts/gen-sounds.mjs)
```

## Getting started

```bash
npm install
```

### Run on your phone (test build)

Background audio + custom notification sounds need a **dev build**, not Expo Go:

```bash
# Android device/emulator
npx expo run:android

# iOS (requires macOS + Xcode)
npx expo run:ios
```

Or build a dev client in the cloud with EAS (no Mac needed for Android):

```bash
npm install -g eas-cli
eas build --profile development --platform android   # or ios
```

### Useful scripts

```bash
npm run typecheck     # tsc --noEmit
npm run test:engine   # run the timer-engine unit tests (node:test)
npm run lint          # expo lint
npm start             # Metro dev server
node scripts/gen-sounds.mjs   # regenerate the WAV sound assets
```

## Verifying it works

1. Start the **Boxing — Amateur** preset and confirm the countdown, color states,
   round counter, warning at the end of the round, and bells on transitions.
2. **Background test:** start the timer, play music/YouTube, minimize the app, and
   confirm the bells/beeps still fire over your music at the round transitions, and
   that the time shown on returning matches real elapsed time.
3. Lock the screen mid-round and confirm time stays accurate.

## Publishing to the stores (later)

Requires paid developer accounts — **Apple Developer** ($99/yr) and **Google Play**
($25 one-time). Once those are ready:

```bash
eas build --profile production --platform all
eas submit --platform ios      # and: eas submit --platform android
```

The bundle identifiers are already set in `app.json` (`com.beastx889.roundtimer`).
