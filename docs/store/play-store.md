# Google Play — submission details

Everything to fill into the **Google Play Console** for DHRUVA. Character limits are
Google's. Copy is drafted and ready; ✍️ marks fields only you can supply.

---

## Store listing

**App name** (≤30): `DHRUVA — Threat Intelligence` *(27)*

**Short description** (≤80):
> Live global disaster, weather & cyber-threat intelligence in one radar.

**Full description** (≤4000):
```
DHRUVA — Dynamic Holistic Resilience & Unified Vigilance Architecture — is a real-time
global disaster and threat-intelligence console. It fuses the live feeds that analysts
usually track across a dozen different sites into one persistent, operational picture.

WHAT YOU GET
• A live world map and a cinematic 3D globe plotting events as they happen
• Earthquakes (USGS), natural disasters & volcanoes (NASA EONET / GDACS)
• World news & geopolitical signals (GDELT)
• Cyber threats — live botnet command servers and malware hosts (abuse.ch), plus
  open-source cyber news, each written in plain language with a recommended action
• Weather alerts for India (SACHET / NDMA) and official government advisories
• Undersea cables, chokepoints and strategic layers you can toggle on the map

BUILT FOR THE INDIAN CONTEXT
Generic dashboards treat every event the same. DHRUVA's regions, filters and threat
weighting are tuned to India's strategic neighbourhood, with an at-a-glance India posture
score and threat arcs radiating from a New Delhi command hub.

WORK THE PICTURE
• Tap any event for a detailed dossier and its source report
• Build a watchlist of regions and keywords so your priorities rise to the top
• Generate a one-tap Situation Report (SITREP) and share any alert to your team
• A built-in guided tour walks you through everything

PRIVATE BY DESIGN
No account. No sign-up. No ads, no tracking. DHRUVA collects no personal information —
your preferences stay on your device.

Data is sourced from public and official providers; see in-app attribution.
```

- **App category:** News & Magazines · **Tags:** news, weather, tools
- **✍️ Contact email:** (required, shown publicly)
- **✍️ Privacy Policy URL:** (required) — the hosted [`privacy-policy.md`](privacy-policy.md)
- **✍️ Website:** (optional) — e.g. `https://dhruva-dashboard-abhimanyu.bolt.host`

---

## Data safety

Complete the Data safety form as follows:

- **Does your app collect or share any of the required user data types?** → **No**
- **Data collected:** none · **Data shared:** none
- **Security practices:**
  - *Is your data encrypted in transit?* → **Yes** (all requests use HTTPS/TLS)
  - *Can users request that data be deleted?* → not applicable (no account / no
    server-side user data; on-device preferences are removed on uninstall / clear data)

Rationale in [`README.md`](README.md) §2. If you add analytics, ads, accounts or push
later, this form **must** be updated.

---

## Content rating (IARC questionnaire)

Category: **Utility, Productivity, Communication, or Other** → treat as a news/reference
app. Answer honestly; expected result: **Teen** (PEGI 12 / ESRB Teen), driven by
real-world news content.

- References to violence / disasters via news headlines → **Yes, mild / infrequent**
- Sexual content, nudity, gambling, controlled substances, profanity, user-generated
  content, in-app purchases → **No**
- Shares user location → **No** · Contains ads → **No**

---

## Target audience & content

- **Target age group:** 13+ (the app carries real-world news content)
- **Appeals to children?** → **No**
- **Ads present?** → **No**
- **Government app?** → **No** (independent tool; uses public/official data sources)

---

## App content declarations

- **Ads:** No ads.
- **Permissions:** only `INTERNET`. Remove any unused Capacitor-added permissions
  (e.g. `ACCESS_NETWORK_STATE`) if the corresponding plugin isn't used, and be ready to
  justify each permission in the console.
- **News apps:** if prompted for the News declaration, DHRUVA aggregates public feeds and
  is not a primary news publisher — answer per Google's current definitions.

---

## Android build formalities (Android Studio)

Set in `android/app/build.gradle` (`defaultConfig`) before building:

| Setting | Value |
|---------|-------|
| `applicationId` | your final App ID (matches `capacitor.config.ts`) |
| `versionName` | `"1.0.0"` |
| `versionCode` | `1` (increment every upload) |
| `minSdkVersion` | Capacitor 8 default (23) is fine |
| `targetSdkVersion` | the level Google currently requires (35+ for 2026 submissions) |

Also: adaptive launcher icon (see [`assets.md`](assets.md)), and an **upload keystore**
(enroll in **Play App Signing**). Build a **signed Android App Bundle**:
**Build → Generate Signed Bundle/APK → Android App Bundle** → upload the `.aab`.
