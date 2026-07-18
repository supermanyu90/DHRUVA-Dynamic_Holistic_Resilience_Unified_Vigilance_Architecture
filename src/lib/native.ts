/**
 * Native (Capacitor) helpers.
 *
 * On the web these are no-ops / browser fallbacks, so the same code runs in a
 * normal browser and inside the packaged Android/iOS app. Plugin modules are
 * imported dynamically so they are only pulled in on a native platform and
 * never bloat (or break) the web bundle.
 */
import { Capacitor } from '@capacitor/core';

/** True inside the packaged Android/iOS app; false in a browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Current platform: 'ios' | 'android' | 'web'. */
export function platform(): string {
  return Capacitor.getPlatform();
}

/**
 * Open an external URL. In the native app this uses the system in-app browser
 * (so users never get trapped navigating away from the app); on the web it
 * opens a new tab, matching the previous behaviour.
 */
export async function openExternal(url: string): Promise<void> {
  if (!url) return;
  if (isNative()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      /* fall through to window.open */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * One-time native shell setup: hide the native splash once the UI is up, set
 * the status bar to match the dark theme, and make the Android hardware back
 * button close overlays / step back instead of killing the app.
 *
 * `onBack` should return true if it handled the press (an overlay was open),
 * false to allow the default (exit on the root view).
 */
export async function initNativeShell(onBack: () => boolean): Promise<() => void> {
  if (!isNative()) return () => {};
  const cleanups: Array<() => void> = [];

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* plugin optional */ }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Dark style = light text/icons, for our dark background.
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0a0f1a' });
    }
  } catch { /* plugin optional */ }

  try {
    const { App } = await import('@capacitor/app');
    const handle = await App.addListener('backButton', ({ canGoBack }) => {
      const handled = onBack();
      if (!handled && !canGoBack) App.exitApp();
    });
    cleanups.push(() => handle.remove());
  } catch { /* plugin optional */ }

  return () => cleanups.forEach(fn => fn());
}
