# LAUNCH.md — Shipping Round Timer to Google Play & the Apple App Store

Everything code-side is done. The steps below are split into **things only you
can do** (accounts, payments, console forms) and commands you run. Store copy,
privacy policy, and asset files are already prepared:

- Listing copy & questionnaire answers: `store/listing.md`
- Screenshots + feature graphic: `store/assets/` (regenerate: `npm run gen:store-assets`)
- Privacy policy (live after any master deploy): https://beastx889.github.io/Prototype1/privacy.html
- Icons/splash/notification icon: `assets/images/` (regenerate: `node scripts/gen-icons.mjs`)

> Note: `app.json` has `experiments.baseUrl: "/Prototype1"` **only on master** for
> the GitHub Pages web build. It affects web exports only — it is harmless to the
> Android/iOS builds and needs no change for the stores.

---

## 0. One-time EAS setup (you)

```bash
npm i -g eas-cli
eas login          # free Expo account
eas init           # links the project (writes projectId into app.json)
```

## 1. Google Play (do this first — you can test on your own phone)

**You:** create a [Play Console](https://play.google.com/console) developer
account — $25 one-time. Identity verification can take a day or two.

1. **Test build on your phone first** (the reliability promise must be verified
   on a real device before submitting):
   ```bash
   eas build -p android --profile preview     # installable APK
   ```
   Install it, then check: bells ring with the screen locked; bells audible over
   Spotify (try Duck vs Solo in Setup); timer accurate after 10+ min locked.
2. **Production build** (Play requires an app bundle):
   ```bash
   eas build -p android --profile production
   ```
3. In Play Console → Create app → fill the listing from `store/listing.md`
   (name, short/full description, category Health & Fitness).
4. Upload graphics from `store/assets/`: feature graphic (1024×500) + phone
   screenshots.
5. **Data safety form:** answer "does not collect or share any user data" (see
   `store/listing.md`); privacy policy URL:
   `https://beastx889.github.io/Prototype1/privacy.html`.
6. Content rating questionnaire → Everyone. App access → "All functionality
   available without special access."
7. Submit either by uploading the `.aab` from the EAS build page, or:
   ```bash
   eas submit -p android    # needs a service-account key; EAS walks you through it
   ```
8. Start with **Internal testing** track (instant), then promote to Production.
   First production review typically takes a few days; new personal accounts may
   need 14 days of closed testing with 12+ testers before production — Play
   Console will tell you if that applies.

## 2. Apple App Store

**You:** enroll in the [Apple Developer Program](https://developer.apple.com/programs/)
— $99/year. No Mac is required when building with EAS, but be aware:
**without an iPhone you cannot test the iOS build yourself** — you'd be
submitting untested-on-device software. If possible, borrow an iPhone and use
TestFlight before release.

1. ```bash
   eas build -p ios --profile production
   ```
   EAS prompts for your Apple ID and creates certificates/profiles for
   `com.beastx889.roundtimer` automatically.
2. Create the app record in [App Store Connect](https://appstoreconnect.apple.com)
   (name, bundle ID, category) — or let `eas submit` create it:
   ```bash
   eas submit -p ios
   ```
3. Fill the listing from `store/listing.md` (subtitle, description, keywords),
   upload the 6.7" screenshots from `store/assets/`.
4. **App Privacy:** "Data Not Collected." Privacy policy URL as above.
5. Add the review notes from `store/listing.md` (explains the notification bells).
6. TestFlight first if you can get an iPhone; otherwise submit for review.

## 3. After launch

- Every future release: bump nothing manually — EAS `autoIncrement` manages
  versionCode/buildNumber; just run the production builds + submit again.
- Watch Play Console "Android vitals" / App Store crash reports. (When you want
  proper crash reporting, ask me to add Sentry — deliberately left out so the
  "no data leaves your device" privacy declaration stays exactly true.)
- Review replies matter for ranking — answer the first ones personally.

## Known review risks (honest list)

- **iOS untested on device** (no iPhone): TTS voice, notification sounds, and
  haptics are all standard APIs, but Apple review may catch device-specific
  issues we can't see. Fixable per rejection feedback.
- Play may ask why the app schedules exact-ish notifications — the review note
  in `store/listing.md` covers it (round bells).
- The app declares no background modes and requests only notifications +
  vibration — permission review should be clean (microphone permission was
  explicitly disabled in `app.json`).
