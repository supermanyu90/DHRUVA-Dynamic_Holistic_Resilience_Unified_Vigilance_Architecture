/**
 * Native (Capacitor) helpers.
 *
 * IMPORTANT: this module has NO build-time dependency on any `@capacitor/*`
 * package. In the packaged Android/iOS app Capacitor injects a `window.Capacitor`
 * global whose `.Plugins` registry exposes every plugin registered in the native
 * project (via `npx cap sync`). We go through that global, so the web build never
 * needs the Capacitor packages resolved — on the web `window.Capacitor` is simply
 * undefined and every helper falls back to standard browser behaviour.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>;
}

function cap(): CapacitorGlobal | undefined {
  return (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** A plugin from the runtime registry, or undefined on the web. */
function plugin(name: string): any | undefined {
  return cap()?.Plugins?.[name];
}

/** True inside the packaged Android/iOS app; false in a browser. */
export function isNative(): boolean {
  const c = cap();
  return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
}

/** Current platform: 'ios' | 'android' | 'web'. */
export function platform(): string {
  const c = cap();
  return c && typeof c.getPlatform === 'function' ? c.getPlatform() : 'web';
}

/**
 * Open an external URL. In the native app this uses the system in-app browser
 * (so users never get trapped navigating away); on the web it opens a new tab.
 */
export async function openExternal(url: string): Promise<void> {
  if (!url) return;
  if (isNative()) {
    const Browser = plugin('Browser');
    if (Browser?.open) {
      try { await Browser.open({ url }); return; } catch { /* fall through */ }
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * One-time native shell setup: hide the native splash once the UI is up, set the
 * status bar to match the dark theme, and make the Android hardware back button
 * close overlays / step back instead of killing the app. All no-ops on the web.
 *
 * `onBack` returns true if it handled the press (an overlay was open), false to
 * allow the default (exit on the root view).
 */
export async function initNativeShell(onBack: () => boolean): Promise<() => void> {
  if (!isNative()) return () => {};
  const cleanups: Array<() => void> = [];

  const Splash = plugin('SplashScreen');
  if (Splash?.hide) { try { await Splash.hide(); } catch { /* optional */ } }

  const Status = plugin('StatusBar');
  if (Status?.setStyle) {
    try {
      await Status.setStyle({ style: 'DARK' }); // light text/icons on the dark ground
      if (platform() === 'android' && Status.setBackgroundColor) {
        await Status.setBackgroundColor({ color: '#0a0f1a' });
      }
    } catch { /* optional */ }
  }

  const App = plugin('App');
  if (App?.addListener) {
    try {
      const handle = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        const handled = onBack();
        if (!handled && !canGoBack && App.exitApp) App.exitApp();
      });
      cleanups.push(() => handle?.remove?.());
    } catch { /* optional */ }
  }

  return () => cleanups.forEach((fn) => fn());
}

/** The native Filesystem + Share plugins (native only), for the SITREP export. */
export function nativeFileShare(): { Filesystem?: any; Share?: any } {
  return { Filesystem: plugin('Filesystem'), Share: plugin('Share') };
}

/** The native Share plugin, or undefined on the web. */
export function nativeSharePlugin(): any | undefined {
  return plugin('Share');
}
