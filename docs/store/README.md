# DHRUVA — App Store & Google Play submission guide

Everything needed to submit the DHRUVA native apps (built with Capacitor — see
[`README-mobile.md`](../../README-mobile.md)) to the **Apple App Store** and
**Google Play**. This folder is the single source of truth for store metadata,
legal/compliance answers, and the pre-flight checklist.

| Doc | What it covers |
|-----|----------------|
| [`app-store.md`](app-store.md) | Apple listing copy, App Privacy answers, age rating, export compliance, iOS build settings, review notes |
| [`play-store.md`](play-store.md) | Google listing copy, Data safety answers, content rating, target audience, Android build settings |
| [`privacy-policy.md`](privacy-policy.md) | The privacy policy — **required by both stores**; host it at a public URL |
| [`assets.md`](assets.md) | Exact icon / screenshot / feature-graphic sizes + how to generate them |

---

## 0. App identity — decide these FIRST (they can't change after publish)

| Field | Current | Action |
|-------|---------|--------|
| **App ID / package** | `com.dhruva.app` *(placeholder in `capacitor.config.ts`)* | ⚠️ **Set a real, reverse-DNS id you own** (e.g. `in.dhruva.app` or `<yourdomain-reversed>.dhruva`). It is **permanent** on both stores. Then `npx cap sync`. |
| **App name** | DHRUVA | Confirmed |
| **Version name** | `1.0.0` (recommended) | Set in iOS (Version) & Android (`versionName`) |
| **Build number / versionCode** | `1` | Set in iOS (Build) & Android (`versionCode`); increment every upload |

---

## 1. Master checklist

Legend: ✅ prepared here · ✍️ **you** must do (account/art/hosting/signing) · ⚙️ set in the native project

### Both stores
- ✅ App description, subtitle, keywords — drafted (see per-store docs)
- ✅ Privacy policy — drafted ([`privacy-policy.md`](privacy-policy.md)); ✍️ **host it at a public HTTPS URL** and paste that URL into both consoles
- ✅ Data-collection disclosure — answered ("no data collected"); see per-store docs
- ✅ Content/age rating — guidance + recommended answers per store
- ✍️ App icon + screenshots + (Play) feature graphic — specs in [`assets.md`](assets.md)
- ⚙️ App ID, version, build number set in the native projects
- ✍️ Code signing (Apple certificates / Android keystore)

### Apple App Store
- ✍️ **Apple Developer Program** membership ($99/yr) + App Store Connect app record
- ⚙️ `ITSAppUsesNonExemptEncryption = NO` in `Info.plist` (standard TLS only — exempt)
- ⚙️ No `NS*UsageDescription` keys needed (app uses **no** device sensors/permissions)
- ✅ Export-compliance, App Privacy, review notes — [`app-store.md`](app-store.md)

### Google Play
- ✍️ **Google Play Console** account ($25 one-time) + app record
- ⚙️ Only the `INTERNET` permission declared (drop any unused Capacitor permissions)
- ⚙️ `targetSdkVersion` at the level Google currently requires (35+ for 2026 submissions)
- ✅ Data safety, content rating, target audience — [`play-store.md`](play-store.md)
- ✍️ Enroll in **Play App Signing** (recommended) and upload an AAB (`.aab`, not APK)

---

## 2. Compliance summary (why the disclosures are simple)

Verified against the source on 2026-07-18:

- **No account / login / sign-up / password** — the app is fully anonymous.
- **No personal data collected or transmitted** to the developer.
- **No device permissions** — no location, camera, microphone, contacts, or Bluetooth.
  (The only "camera" in the code is the three.js 3D-globe camera.)
- **No ads, no analytics, no crash-reporting, no third-party tracking SDKs.**
- **On-device storage only** (browser `localStorage`): theme, content-zoom, tutorial-seen,
  watchlist, notification preferences, and a locally-generated session id — none of it
  leaves the device or is sent to the developer.
- **Network:** read-only requests to public intelligence feeds (USGS, NASA EONET, GDELT,
  abuse.ch/CISA, SACHET/NDMA) and the app's hosted backend (Bolt-managed Supabase edge
  functions). Standard TLS/HTTPS. As with any networked app, the destination servers see
  the device IP — that is not data *you* collect.

➡️ **Apple App Privacy: "Data Not Collected." · Google Data safety: no data collected, no data shared, encrypted in transit.**

> If you later add analytics, crash reporting, ads, accounts, or push notifications,
> you **must** update the App Privacy / Data safety answers and this document.

---

## 3. Native build formalities (before you archive)

See per-store docs for the exact fields. In short:

**iOS** (`npx cap open ios` → Xcode): set Bundle Identifier (= App ID), Display Name
(DHRUVA), Version (1.0.0), Build (1), a Team for signing, App Icon set, and
`ITSAppUsesNonExemptEncryption = NO`. Archive → distribute to App Store Connect.

**Android** (`npx cap open android` → Android Studio): set `applicationId`, `versionName`
"1.0.0", `versionCode` 1, `targetSdkVersion` to the current Play requirement, adaptive
icon, and an upload signing key. Build a **signed AAB** → upload to Play Console.

> Reminder: the Capacitor packages are not in the Bolt-deployed branch. Reinstall them on
> a local/native branch first (see `README-mobile.md`) so `npx cap open …` works.
