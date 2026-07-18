# DHRUVA — Native App (Capacitor)

DHRUVA ships as a web app **and** as native Android/iOS apps via
[Capacitor](https://capacitorjs.com). The native apps use the **bundled** model:
the built `dist/` is packaged inside the app and served locally, while live data
is fetched over the network. Same React codebase for web and native — native-only
behavior is guarded by `isNative()` so the web build is unchanged.

- Capacitor **8.4.2**, `appId: com.dhruva.app` *(placeholder — see To-dos)*, `appName: DHRUVA`, `webDir: dist`
- `android/` — Gradle project (build in Android Studio)
- `ios/` — Xcode project using **Swift Package Manager** (no CocoaPods needed)

---

## 1. Prerequisites

| Target | Needs |
|--------|-------|
| Android | [Android Studio](https://developer.android.com/studio) (+ a JDK & Android SDK, installed with it) |
| iOS | macOS + [Xcode](https://developer.apple.com/xcode/) (SPM handles native deps — no CocoaPods) |
| Both | Node + `npm install` already run in this repo |

## 2. The `.env` (required for live feeds)

"Bolt's database" **is** a Bolt-managed **Supabase** project. The proxied feeds
call `${VITE_SUPABASE_URL}/functions/v1/…`, and Bolt injects these values at
deploy time — so a fresh clone has no `.env` and shows empty feeds until you add
one. The file is **git-ignored**; the anon key is a public client value.

```dotenv
# .env  (project root, git-ignored)
VITE_SUPABASE_URL=https://vimihczgbklcmjefovip.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key — a ~208-char JWT>
```

> Get the values from your Bolt project's database/Supabase panel, or read them
> from the live deployed JS bundle (they're public). They must be present at
> **build time** (Vite bakes them into `dist/`).

### What needs the backend vs. what doesn't

| Works with **no** backend (direct public APIs) | Needs the Supabase URL baked in |
|---|---|
| Quakes (USGS), Disasters + Volcanoes (NASA EONET), World news + Geopolitical (GDELT) | News RSS, Gov, Cyber, Info Ops, Weather/SACHET, SEWA |

## 3. The build loop

**Any time you change web code or `.env`, rebuild and sync before running the app:**

```bash
npm run build      # produce dist/ (bakes in VITE_SUPABASE_* )
npx cap sync       # copy dist/ into android/ and ios/, refresh native plugins
```

## 4. Open / run

```bash
npx cap open android    # → Run ▶ in Android Studio (emulator or device)
npx cap open ios        # → Run ▶ in Xcode (simulator or device)
```

`npx cap run android` / `npx cap run ios` can build+launch from the CLI once the
toolchains are set up.

---

## 5. What's wired for native

All in `src/lib/native.ts` (+ call sites), guarded by `isNative()` so web behavior
is identical:

| Feature | Native behavior | Plugin |
|---|---|---|
| Share (cards, drawer, weather, cyber, gov) | Real OS share sheet | `@capacitor/share` |
| SITREP export | Saves report to device → share sheet (WebViews can't print/download) | `@capacitor/filesystem` + `@capacitor/share` |
| External links (X, gov.uk, news sources) | Open in system in-app browser (no getting trapped) | `@capacitor/browser` |
| Splash screen | Hidden once React mounts (no blank flash) | `@capacitor/splash-screen` |
| Status bar | Dark style to match the theme | `@capacitor/status-bar` |
| Android back button | Closes drawers / steps back to Map, exits only at root | `@capacitor/app` |
| (installed, ready to use) | Keyboard, Network | `@capacitor/keyboard`, `@capacitor/network` |

## 6. Project files

```
capacitor.config.ts     # bundled config (appId, webDir, splash, status bar)
src/lib/native.ts        # isNative(), openExternal(), initNativeShell()
src/lib/share.ts         # nativeShare() → Capacitor Share on native
src/lib/situation-report.ts  # native export path (Filesystem + Share)
src/App.tsx              # shell init + external-link interceptor (native only)
android/                 # Gradle project (git-ignored build artifacts)
ios/                     # Xcode/SPM project (git-ignored build artifacts)
```

---

## 7. To-dos before publishing

- [ ] **App ID** — change the placeholder `com.dhruva.app` in `capacitor.config.ts`
      to your real reverse-DNS id, **before** any store submission (trivial now,
      painful after). Then `npx cap sync`.
- [ ] **OTA live updates** — add [Capgo](https://capgo.app) (`@capgo/capacitor-updater`)
      to push JS/CSS bundle updates without a store resubmission — restoring your
      "push and it's live" loop while staying a bundled, store-approvable app.
- [ ] **Push notifications** — `@capacitor/push-notifications` + FCM/APNs + a
      Supabase sender function, for real critical-event alerts (high value for an
      intel app; needs a Firebase/APNs setup).
- [ ] **App icons & splash art** — replace the defaults (e.g. via
      `@capacitor/assets`).
- [ ] **Commit the native projects?** — currently uncommitted. Standard Capacitor
      practice commits `android/`+`ios/`; given this repo round-trips through the
      Bolt web editor, you may prefer to keep them out and regenerate with
      `npx cap add`. Your call.

## 8. Gotchas

- **Rebuild + `npx cap sync` after every web change** — the app serves a *copy* of
  `dist/`; editing source alone won't update the running app.
- **`.env` must exist at build time** or the packaged app opens with empty proxied
  feeds.
- **Bolt editor vs. GitHub** — if you edit in the Bolt web editor, make it pull
  from GitHub first, or it can re-push stale files and revert changes.
- The **web deploy is unaffected** by any of this — the Capacitor plugins are
  code-split and only load on a native platform.
