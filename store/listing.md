# Store Listing — Round Timer

Copy for both Google Play and the Apple App Store. Assets live in `store/assets/`
(regenerate with `node scripts/gen-store-assets.mjs` after a web export).

## App name (30 chars max both stores)

> Round Timer — Boxing & MMA

## Short description (Play, 80 chars) / Subtitle (iOS, 30 chars)

Play:
> The bell always rings — over your music, screen locked. Boxing & MMA rounds.

iOS subtitle:
> Boxing rounds. Reliable bells.

## Full description

**The round timer whose bell always rings.**

Most interval timers go quiet the moment you lock your screen or open Spotify. Round Timer was built around one promise: you will never miss the end of a round — screen locked, phone in your pocket, music playing.

**RELIABLE BELLS**
• Bells and warnings keep firing with the screen off or the app in the background
• Mix, duck, or pause your music for the bell — you choose how loud it cuts through
• Sound check button so you know it's audible before you wrap your hands

**BUILT FOR FIGHT TRAINING**
• Boxing, MMA, Muay Thai, HIIT and Tabata presets — or build your own
• Warm-up and cool-down blocks, custom time for every round
• Voice announcements: "Round 2 — fight!", "10 seconds", "Rest"
• Combo caller speaks boxing combinations while you work
• End-of-round warning with screen flash and vibration
• Distinct final bell so you know the whole workout is done

**SEE YOUR WORK**
• Big high-contrast display with a progress ring — readable from across the gym
• Round dots show where you are in the session
• Workout history with totals and a daily streak

**NO NONSENSE**
• No account. No ads. No tracking. Everything stays on your phone.
• Free.

Whether you're shadowboxing at home, hitting the heavy bag, or running pads, Round Timer keeps the rounds honest so you can focus on the work.

## Keywords (iOS, 100 chars)

> boxing,timer,round,interval,mma,muay thai,hiit,tabata,bell,workout,combo,fight

## Category

- Play: Health & Fitness
- iOS: Health & Fitness (secondary: Sports)

## Content rating / age

- No objectionable content; questionnaire answers: no violence, no user content, no data collection → Everyone / 4+.
- Play **Target audience: 13 and over**. Choosing under-13 pulls in the Families policy.

## Data safety (Play) & App Privacy (iOS) answers

- Does the app collect or share user data? **No.**
- All settings/history stored locally on device only; no analytics, no ads SDKs, no network calls.
- iOS "Data Not Collected" label applies.
- Privacy policy URL: https://beastx889.github.io/Prototype1/privacy.html

## Play permission declarations

- **Exact alarms (`USE_EXACT_ALARM`)**: core functionality = **timer**.
  Justification: "Round Timer is an interval timer for boxing/MMA. Exact alarms
  ring the round-start and round-end bells at the exact second while the app is
  in the background; inexact alarms would ring the bell late and break the
  timer's core function."
- **Health apps**: Activity & fitness, workout timer only. No health data is
  read, stored, or shared.
- Effective Android permissions in the built bundle (checked with bundletool):
  - **App:** POST_NOTIFICATIONS, USE_EXACT_ALARM, SCHEDULE_EXACT_ALARM
    (Android ≤ 12L only), VIBRATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS.
  - **Added by the notifications library:** RECEIVE_BOOT_COMPLETED (restores
    scheduled bells after a reboot), launcher-badge permissions for various
    phone makers, and an unused Firebase push receiver (c2dm RECEIVE,
    ACCESS_NETWORK_STATE). The app has no Firebase configuration and never
    registers for push.
  - **Framework default:** INTERNET. The app makes no network requests.
  - **None** of these is a runtime prompt except notifications. No microphone,
    camera, location, storage, or contacts.

## Review notes (both stores)

"Round Timer is an offline interval timer for boxing/MMA training. It uses local
notifications with exact alarms to ring round bells on time while backgrounded,
and text-to-speech for optional voice announcements. It has no login, no network
access, and collects no data. To test: tap START, then lock the screen mid-round
to hear the bell fire as a notification."
