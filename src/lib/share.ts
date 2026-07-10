/**
 * Social sharing for alerts.
 *
 * Frontend-only: builds share-intent URLs for the major platforms, uses the
 * native Web Share API when available (mobile share sheet), and falls back to
 * clipboard copy. No backend, no SDKs, no tracking.
 */

export interface SharePayload {
  /** Short headline (used as the native-share title + email subject). */
  title: string;
  /** The composed message body shared to each platform. */
  text: string;
  /** Canonical link that accompanies the share (source article or the app). */
  url: string;
}

export interface ShareTarget {
  id: 'x' | 'whatsapp' | 'telegram' | 'linkedin' | 'facebook' | 'email';
  label: string;
  /** lucide-react icon name to render. */
  icon: 'twitter' | 'message-circle' | 'send' | 'linkedin' | 'facebook' | 'mail';
  /** Brand accent colour. */
  color: string;
  href: string;
}

const enc = encodeURIComponent;

/** Build the outbound share-intent links for the given payload. */
export function buildShareTargets(p: SharePayload): ShareTarget[] {
  const text = p.text;
  const url = p.url;
  const textUrl = `${text} ${url}`.trim();

  return [
    {
      id: 'x', label: 'X', icon: 'twitter', color: '#1d9bf0',
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}&hashtags=DHRUVA`,
    },
    {
      id: 'whatsapp', label: 'WhatsApp', icon: 'message-circle', color: '#25d366',
      href: `https://wa.me/?text=${enc(textUrl)}`,
    },
    {
      id: 'telegram', label: 'Telegram', icon: 'send', color: '#2aabee',
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    },
    {
      id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0a66c2',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
    {
      id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877f2',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`,
    },
    {
      id: 'email', label: 'Email', icon: 'mail', color: '#8b98a5',
      href: `mailto:?subject=${enc(p.title)}&body=${enc(`${text}\n\n${url}`)}`,
    },
  ];
}

/** True when the browser exposes the native Web Share API (typically mobile). */
export function hasNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export type NativeShareResult = 'shared' | 'cancelled' | 'unsupported' | 'error';

/** Invoke the native share sheet. Resolves with a status rather than throwing. */
export async function nativeShare(p: SharePayload): Promise<NativeShareResult> {
  if (!hasNativeShare()) return 'unsupported';
  try {
    await navigator.share({ title: p.title, text: p.text, url: p.url });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}

/** Copy "text + url" to the clipboard. Falls back to a hidden textarea. */
export async function copyShareText(p: SharePayload): Promise<boolean> {
  const str = `${p.text}\n${p.url}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(str);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
