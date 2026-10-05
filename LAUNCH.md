# LAUNCH.md — Publishing Round Timer on Google Play

> **Update 5 Oct 2026:** the app is on Play under the **LumioLab** account
> (package `com.lumiolab.roundtimer`, Console app id 4972956148274814937). The
> v1 bundle was rebuilt locally and signed with a new upload key at
> `~/keystores/roundtimer-upload.jks` (alias `upload`; passwords in the gitignored
> repo-root `key.properties`). The earlier cloud-built bundle and its key were
> never uploaded and are obsolete. Local builds: `npx expo prebuild -p android`,
> then `./gradlew :app:bundleRelease` with JDK 21 (Android Studio's JBR) and the
> `-Pandroid.injected.signing.*` flags, as in the CI workflow.

Everything code-side is done. The signed bundle for version 1 was built on
GitHub's runners and signed with your private upload key. These are the steps
only you can do: the Play Console account, the forms, and clicking upload.

**What you need in hand**

| Item | Where |
|---|---|
| Signed bundle `round-timer-1.0.0-vc1-play.aab` | Delivered to you directly as two parts (`.part0`, `.part1`); see "Rejoin the bundle" below |
| Upload key `roundtimer-upload.jks` + `KEYSTORE-CREDENTIALS.txt` | Delivered to you directly. **Back these up somewhere safe now.** |
| Listing text and form answers | `store/listing.md` |
| Icon 512×512, feature graphic, 5 phone screenshots | `store/assets/` (`play-icon-512.png`, `feature-graphic.png`, `play-*.png`) |
| Privacy policy URL | https://beastx889.github.io/Prototype1/privacy.html |

> **Package name `com.lumiolab.roundtimer` is permanent** once the first bundle
> is uploaded. It can never be changed for this listing.

### Rejoin the bundle

The bundle was too large to send as one file, so it arrived in two parts. Put
both in the same folder, then:

- **Windows (Command Prompt):**
  `copy /b round-timer-1.0.0-vc1-play.aab.part0 + round-timer-1.0.0-vc1-play.aab.part1 round-timer-1.0.0-vc1-play.aab`
- **macOS / Linux:**
  `cat round-timer-1.0.0-vc1-play.aab.part0 round-timer-1.0.0-vc1-play.aab.part1 > round-timer-1.0.0-vc1-play.aab`

Check the result before uploading. Run `certutil -hashfile round-timer-1.0.0-vc1-play.aab SHA256`
on Windows, or `shasum -a 256 …` on macOS/Linux. It must print
`35fd068358db1341a957fd0e8e09c4394fdd6e51c5cc6f03f95578d514c22b79` (48.7 MiB).

About this bundle: version 1.0.0, versionCode 1, target Android 16 (API 36),
minimum Android 7 (API 24), and native code for arm64-v8a, armeabi-v7a, x86
and x86_64. It's signed with your upload key (certificate SHA-256
`FF:A3:4F:88:…:58:A4`) and validated with bundletool 1.18.3. Native debug
symbols were left out to keep the file small. If Play Console shows a "native
debug symbols" warning, you can safely ignore it.

> **Don't use the GitHub pre-release `android-vc1-run2`.** That copy is signed
> with a throwaway debug key and Play will reject it. Please delete it under
> **Releases** on GitHub; this session isn't allowed to.

---

## 1. Create the developer account (one time)

1. Go to https://play.google.com/console and sign up. It costs **$25 once**.
2. Choose a **Personal** account and complete identity verification. This can
   take a few days.

## 2. Create the app

1. **Create app**. Name: `Round Timer — Boxing & MMA`. Default language: English (US).
   Type: **App**. Price: **Free**. Accept the declarations.

## 3. Upload the bundle to Internal testing first

1. **Test and release → Testing → Internal testing → Create new release.**
2. When asked about app signing, keep **"Use Google-generated key"** (Play App
   Signing). Google holds the final signing key. Your `.jks` is only the
   **upload key**, so it can be reset if it's ever lost.
3. Upload `round-timer-1.0.0-vc1-play.aab`. Release name: `1.0.0 (1)`. Notes: `First release.`
4. **Next → Save and publish.** Add yourself as a tester (Testers tab → email
   list), open the opt-in link on your phone, and install from Play.

**Test on your phone before going further:** start a round, lock the screen,
and confirm the bell rings at round end. Play Spotify and confirm the bell is
audible (try Setup → Over music → Duck vs Solo). Leave the phone locked through
a 10-minute session and confirm the time and bells stay accurate.

## 4. Fill in "App content" (Policy → App content)

Answers are also in `store/listing.md`.

| Form | Answer |
|---|---|
| Privacy policy | `https://beastx889.github.io/Prototype1/privacy.html` |
| App access | All functionality is available without special access |
| Ads | No, the app has no ads |
| Content rating | Questionnaire: category "All other app types", answer No to everything → Everyone / PEGI 3 |
| Target audience | **13 and over** (choosing under-13 pulls in the Families policy) |
| Data safety | **No data collected, no data shared** |
| **Exact alarms** | Declare that the core functionality is a **timer**: "Interval timer for boxing/MMA. Exact alarms ring the round-start/round-end bells at the exact second while the app is in the background." |
| Health apps | Activity & fitness: workout timer only, no health data |
| Government / financial / news | No |

## 5. Store listing (Grow → Store presence → Main store listing)

- **App name / short description / full description:** copy from `store/listing.md`.
- **App icon:** `store/assets/play-icon-512.png`
- **Feature graphic:** `store/assets/feature-graphic.png`
- **Phone screenshots:** `store/assets/play-1-idle.png` … `play-5-history.png`
- **Category:** Health & Fitness. **Contact email:** yours.

## 6. Closed test → production

New **personal** developer accounts must run a **closed test with at least 12
testers who stay opted in for 14 consecutive days** before Play lets you apply
for production.

1. **Testing → Closed testing → Create track.** Promote the same release (or
   upload it again), add a Google Group or email list of 12+ friends, and share
   the opt-in link.
2. After 14 days, go to **Dashboard → Apply for production** and answer the
   short questionnaire about the test.
3. Once approved, **Production → Create new release → add from library →
   rollout.** The first review usually takes a few days.

---

## Shipping updates later

1. Make your changes, then raise `version` in `app.json` (e.g. `1.0.1`).
2. **One-time setup for automatic signing.** In GitHub, open the repo →
   **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `ANDROID_UPLOAD_KEYSTORE_BASE64` = the contents of `roundtimer-upload.jks.base64.txt`
   - `ANDROID_UPLOAD_KEYSTORE_PASSWORD` = the store password from `KEYSTORE-CREDENTIALS.txt`

   You can do this from a phone browser. Secrets are encrypted and never shown
   in logs.
3. Go to **Actions → Android release bundle → Run workflow** and set
   `version_code` higher than any previous upload (2, 3, …). This also works
   from a phone browser.
4. Download the `app-release-aab` artifact when the run finishes (~20 min) and
   upload it as a new release in Play Console.

Without the secrets, the workflow still builds, but the bundle is signed with a
throwaway debug key and Play will reject it. A Claude session can re-sign it
for you if you provide the key.

## Apple App Store (later)

Requires the Apple Developer Program ($99/year) and, realistically, an iPhone to
test on. The iOS bundle ID `com.lumiolab.roundtimer` is configured. Use
`eas build -p ios --profile production` and `eas submit -p ios` from your
laptop. Listing text and 6.7" screenshots (`store/assets/ios-*.png`) are ready.

## Known limitations (honest list)

- **Deep Doze.** If the phone sits completely still with the screen off for a
  long time (roughly 30+ minutes), Android can still rate-limit even exact
  alarms. Short and medium sessions are fine. A foreground service ("timer
  running" notification) would close this gap if testers report late bells on
  long sessions.
- **Voice and combo calls** only speak while the app is in the foreground.
  Background transitions are covered by the bells.
