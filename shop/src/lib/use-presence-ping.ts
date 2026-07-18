import { useEffect } from 'react';
import { HttpClient } from '@/framework/client/http-client';

const KEY = 'ib_visitor_id';
const BEAT_MS = 45_000; // must stay under the API's 120s "still here" window

/** One stable id per browser — so a shopper with three tabs open counts as one person. */
function visitorId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage blocked: fall back to a per-session id. They'll be counted, just
    // not de-duplicated across reloads — better than dropping them entirely.
    return 'anon-' + Math.random().toString(36).slice(2);
  }
}

/**
 * Tells the API this browser is currently on the site, so the admin command centre can show a
 * live visitor count.
 *
 * Deliberately silent: every failure is ignored. A visitor counter must never surface an error
 * to a shopper or block anything on the page.
 */
export function usePresencePing() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vid = visitorId();
    let stopped = false;

    const beat = () => {
      // Don't ping from a background tab — it isn't a person looking at the site, and it would
      // inflate the count for anyone who leaves tabs open all day.
      if (document.visibilityState !== 'visible') return;
      HttpClient.post('presence-ping', { vid }).catch(() => {});
    };

    beat();
    const t = setInterval(() => {
      if (!stopped) beat();
    }, BEAT_MS);
    // Coming back to the tab should register immediately, not up to 45s later.
    document.addEventListener('visibilitychange', beat);

    return () => {
      stopped = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', beat);
    };
  }, []);
}
