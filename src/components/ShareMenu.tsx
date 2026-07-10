import { useState, type CSSProperties } from 'react';
import {
  Twitter, MessageCircle, Send, Linkedin, Facebook, Mail,
  Share2, Copy, Check, Smartphone,
} from 'lucide-react';
import {
  SharePayload, ShareTarget, buildShareTargets, hasNativeShare, nativeShare, copyShareText,
} from '../lib/share';

const ICONS: Record<ShareTarget['icon'], typeof Twitter> = {
  twitter: Twitter,
  'message-circle': MessageCircle,
  send: Send,
  linkedin: Linkedin,
  facebook: Facebook,
  mail: Mail,
};

interface Props {
  payload: SharePayload;
  onClose: () => void;
  /** Override the menu's position (defaults to top-right, tuned for the detail drawer). */
  anchorStyle?: CSSProperties;
}

export function ShareMenu({ payload, onClose, anchorStyle }: Props) {
  const [copied, setCopied] = useState(false);
  const targets = buildShareTargets(payload);
  const canNativeShare = hasNativeShare();

  const handleCopy = async () => {
    const ok = await copyShareText(payload);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1600);
  };

  const handleNative = async () => {
    const res = await nativeShare(payload);
    if (res === 'shared') onClose();
  };

  return (
    <>
      {/* Outside-click catcher (stopPropagation so it never triggers a clickable card behind it) */}
      <div
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'transparent' }}
        aria-hidden="true"
      />
      <div
        role="menu"
        aria-label="Share this alert"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: '38px', right: '10px', zIndex: 60,
          width: '232px', background: 'rgba(6,12,18,0.99)',
          border: '1px solid rgba(0,212,160,0.3)', borderRadius: '5px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)', padding: '10px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          ...anchorStyle,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px',
          letterSpacing: '2px', color: 'var(--accent)',
        }}>
          <Share2 size={11} />
          SHARE ALERT
        </div>

        {canNativeShare && (
          <button
            onClick={handleNative}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              background: 'rgba(0,212,160,0.14)', border: '1px solid rgba(0,212,160,0.4)',
              borderRadius: '4px', padding: '8px', color: 'var(--accent)', cursor: 'pointer',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '1.5px',
            }}
          >
            <Smartphone size={12} />
            SHARE VIA DEVICE…
          </button>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {targets.map(t => {
            const Icon = ICONS[t.icon];
            return (
              <a
                key={t.id}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                role="menuitem"
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  background: `${t.color}14`, border: `1px solid ${t.color}44`,
                  borderRadius: '4px', padding: '7px 9px', color: t.color,
                  textDecoration: 'none', fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '10px', letterSpacing: '0.5px', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${t.color}26`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${t.color}14`; }}
              >
                <Icon size={13} style={{ flexShrink: 0 }} />
                {t.label}
              </a>
            );
          })}
        </div>

        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            background: copied ? 'rgba(0,212,160,0.16)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '4px', padding: '8px', cursor: 'pointer',
            color: copied ? 'var(--accent)' : 'var(--dim)',
            fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', letterSpacing: '1px',
            transition: 'all 0.15s',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'COPIED TO CLIPBOARD' : 'COPY TEXT + LINK'}
        </button>
      </div>
    </>
  );
}
