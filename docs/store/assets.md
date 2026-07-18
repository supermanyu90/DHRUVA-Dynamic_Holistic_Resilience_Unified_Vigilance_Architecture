# Store assets — required sizes & how to generate them

The listing copy and compliance answers are ready. These **visual assets** are the last
piece and must be produced (they can't be auto-drafted). Exact specs below.

---

## App icon

| Store | Size | Format | Notes |
|-------|------|--------|-------|
| Apple | **1024×1024** | PNG, **no alpha/transparency**, sRGB, flattened, square (no rounded corners — Apple rounds them) |
| Google | **512×512** | 32-bit PNG **with** alpha |
| Android (in-app) | adaptive icon | foreground + background layers, 108×108 dp safe zone |

**Generate all sizes from one source** with `@capacitor/assets` (on the native branch):

```bash
npm i -D @capacitor/assets
mkdir -p resources
# put a 1024×1024 icon at resources/icon.png (and optionally resources/splash.png 2732×2732)
npx capacitor-assets generate --iconBackgroundColor '#0a0f1a' --iconBackgroundColorDark '#0a0f1a'
```

This writes the iOS `AppIcon` set and the Android mipmap/adaptive icons. You still upload
the **1024** (Apple) and **512** (Google) marketing icons in the consoles separately.

> The app currently ships only a web favicon/PWA icon — a dedicated **1024×1024 store
> icon** must be designed (DHRUVA wordmark / radar mark on the `#0a0f1a` ground).

---

## Screenshots

Capture in **portrait** (the app supports portrait on phones). Good screens to show:
the **3D Command Globe**, the **live map + event feed**, **Cyber Watch** (human-readable
alerts), an **event dossier**, and the **guided tour**.

### Apple (iPhone) — required
At least one size set, 3–10 images each. Use the largest and Apple down-scales:

| Device class | Resolution (portrait) |
|--------------|-----------------------|
| **6.9" iPhone** (16 Pro Max) | **1320 × 2868** |
| 6.7" iPhone | 1290 × 2796 |
| 6.5" iPhone (optional) | 1242 × 2688 |
| 12.9" iPad (only if you enable iPad) | 2048 × 2732 |

### Google Play (phone) — required
- **2–8 screenshots**, PNG or JPEG
- 9:16 portrait, each side **320–3840 px** — e.g. **1080 × 2400** or **1080 × 1920**

### Google Play — Feature graphic (REQUIRED to publish)
- **1024 × 500**, JPG or 24-bit PNG (no alpha). A DHRUVA hero banner (globe + wordmark).

---

## Generating a starter screenshot set

The app + a headless browser can produce device-resolution screenshots directly. Run the
web app (`npm run dev`) and capture each key view at the target size, e.g. iPhone 6.9"
`1320×2868` and Play phone `1080×2400`. Frame/annotate them in any tool before upload.

> Ask and I can generate a first pass of portrait screenshots (globe, map, cyber, tutorial)
> at the Apple 6.9" and Play phone resolutions to use as a starting point.

---

## Asset checklist

- [ ] 1024×1024 iOS marketing icon (no alpha)
- [ ] 512×512 Play icon (with alpha)
- [ ] Adaptive Android icon (via `@capacitor/assets`)
- [ ] iPhone 6.9" screenshots ×3–10
- [ ] Play phone screenshots ×2–8
- [ ] Play feature graphic 1024×500
- [ ] (optional) iPad / tablet screenshots if those form factors are enabled
