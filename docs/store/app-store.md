# Apple App Store — submission details

Everything to fill into **App Store Connect** for DHRUVA. Character limits are Apple's.
Copy is drafted and ready; ✍️ marks fields only you can supply.

---

## Listing copy

**App Name** (≤30): `DHRUVA: Global Threat Intel` *(27)*

**Subtitle** (≤30): `Live disaster & threat radar` *(28)*

**Promotional Text** (≤170, editable anytime):
> One live picture of the world's disasters, weather, cyber threats and geopolitics —
> fused from official feeds, weighted for the Indian strategic context.

**Keywords** (≤100, comma-separated, no spaces):
```
disaster,earthquake,threat,intelligence,cyber,weather,alert,news,geopolitics,OSINT,monitoring,radar,India,SITREP
```

**Description** (≤4000):
```
DHRUVA — Dynamic Holistic Resilience & Unified Vigilance Architecture — is a real-time
global disaster and threat-intelligence console. It fuses live feeds that analysts
usually track across a dozen sites into one persistent, operational picture.

WHAT YOU GET
• A live world map and a cinematic 3D globe plotting events as they happen
• Earthquakes (USGS), natural disasters & volcanoes (NASA EONET / GDACS)
• World news & geopolitical signals (GDELT)
• Cyber threats — live botnet C2s and malware hosts (abuse.ch), plus open-source
  cyber news, written in plain language with a recommended action for each alert
• Weather alerts for India (SACHET / NDMA) and official government advisories
• Undersea cables, chokepoints and strategic layers you can toggle on the map

BUILT FOR THE INDIAN CONTEXT
Generic dashboards treat every event the same. DHRUVA's regions, filters and threat
weighting are tuned to India's strategic neighbourhood, with an at-a-glance India
posture score and threat arcs radiating from a New Delhi command hub.

WORK THE PICTURE
• Tap any event for a detailed dossier and its source report
• Build a watchlist of regions and keywords so your priorities rise to the top
• Generate a one-tap Situation Report (SITREP)
• Share any alert to your team in a tap
• A built-in guided tour walks you through everything

PRIVATE BY DESIGN
No account. No sign-up. No ads, no tracking. DHRUVA collects no personal information —
your preferences stay on your device.

Data is sourced from public and official providers; see in-app attribution.
```

**What's New** (for v1.0.0):
> First public release of DHRUVA — live global disaster & threat intelligence, a
> shader-driven 3D command globe, human-readable cyber alerts, watchlist, one-tap
> SITREP, and a guided tour.

---

## Categorisation & URLs

- **Primary category:** News · **Secondary category:** Weather
- **✍️ Support URL:** (required) — a page where users can get help
- **✍️ Marketing URL:** (optional) — e.g. `https://dhruva-dashboard-abhimanyu.bolt.host`
- **✍️ Privacy Policy URL:** (required) — the hosted [`privacy-policy.md`](privacy-policy.md)
- **Copyright:** `2026 Abhimanyu Mathur`

---

## App Privacy ("nutrition label")

Answer the App Privacy questionnaire as: **Data Not Collected.**

- Do you or your partners collect data from this app? → **No**
- (Consequently there is no data to categorise, link to identity, or use for tracking.)

Rationale: no account, no PII, no device sensors, no ads/analytics/tracking SDKs; only
on-device preference storage. See [`README.md`](README.md) §2.

---

## Age rating

Answer the questionnaire honestly. Expected result: **12+**, driven by the news nature of
the content:

- Realistic Violence / Horror/Fear Themes → **Infrequent/Mild** (real-world news headlines
  about disasters and conflict may appear)
- Mature/Suggestive Themes, Profanity, Gambling, Contests, Drugs, Sexual Content → **None**
- **Unrestricted Web Access → No.** The app opens only specific source/report links in the
  system browser; it is not a general-purpose web browser. (If you ever add a full
  in-app browser, this becomes **Yes** and forces a 17+ rating.)

---

## Export compliance (encryption)

The app uses only standard HTTPS/TLS provided by the OS — this is **exempt**. To avoid the
manual question on every submission, add to `ios/App/App/Info.plist`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

---

## App Review notes (paste into "Notes")

> DHRUVA is an anonymous, read-only intelligence dashboard. **No account or login is
> required — no demo credentials are needed.** All data is fetched from public/official
> feeds and the app's hosted backend over HTTPS. The app requests no device permissions
> and collects no personal data. A guided tour opens automatically on first launch and can
> be reopened from the "?" button in the header.

---

## iOS build formalities (Xcode)

Set on the **App** target before archiving:

| Setting | Value |
|---------|-------|
| Bundle Identifier | your final App ID (matches `capacitor.config.ts`) |
| Display Name | DHRUVA |
| Version | 1.0.0 |
| Build | 1 (increment every upload) |
| Deployment target | iOS 14.0+ (Capacitor 8 default is fine) |
| Signing | your Team + automatically-managed signing |
| App Icons | 1024×1024 + all sizes (see [`assets.md`](assets.md)) |
| `Info.plist` | `ITSAppUsesNonExemptEncryption = NO`; **no** `NS*UsageDescription` keys (none needed) |

Then: **Product → Archive → Distribute App → App Store Connect**.
