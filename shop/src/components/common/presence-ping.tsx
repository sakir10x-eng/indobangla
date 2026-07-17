import { useEffect } from 'react';
import { HttpClient } from '@/framework/rest/client/http-client';

// A visitor counts as "here" for 120s on the API (PRESENCE_WINDOW), so beat well inside that.
const BEAT_MS = 60_000;
const VID_KEY = 'ib_vid';

/**
 * Sitewide heartbeat that feeds the admin command-centre's live-visitor counter.
 *
 * Renders nothing. Client-only (mounted via _app with ssr:false) — it touches
 * localStorage and must never run during the static build. Every failure is
 * swallowed: a visitor counter must never disrupt browsing, and the API answers
 * 200 even when the write fails, so there's nothing here worth surfacing.
 */
export default function PresencePing() {
  useEffect(() => {
    // Stable-per-browser anonymous token. No crypto dependency needed — this is a
    // presence tally, not a security identifier.
    let vid = '';
    try {
      vid = localStorage.getItem(VID_KEY) || '';
      if (!vid) {
        vid =
          Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2);
        localStorage.setItem(VID_KEY, vid);
      }
    } catch {
      return; // Private-mode / storage-blocked — skip silently.
    }

    const beat = () => {
      HttpClient.post('presence-ping', { vid }).catch(() => {});
    };

    beat(); // first beat on mount
    const timer = setInterval(() => {
      // Don't beat for a backgrounded tab — it isn't really "here".
      if (typeof document === 'undefined' || !document.hidden) beat();
    }, BEAT_MS);

    // Beat immediately when the tab comes back to the foreground.
    const onVisible = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
