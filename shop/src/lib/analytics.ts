import { HttpClient } from '@/framework/client/http-client';

// Anonymous, per-browser session id — tied to a logged-in account server-side when a token is
// sent, so the admin can see both named users and guest journeys.
function sid(): string {
  if (typeof window === 'undefined') return '';
  try {
    let s = localStorage.getItem('ib_sid');
    if (!s) {
      s = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('ib_sid', s);
    }
    return s;
  } catch {
    return 'anon';
  }
}

let lastPath = '';
let lastAt = 0;

export function track(event: string, extra: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  try {
    // fire-and-forget — analytics must never surface an error to the shopper
    HttpClient.post('track', { sid: sid(), event, ...extra }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const duration_ms = lastPath && lastAt ? now - lastAt : undefined;
  track('page_view', {
    path,
    referrer: lastPath || (typeof document !== 'undefined' ? document.referrer : '') || '',
    duration_ms,
  });
  lastPath = path;
  lastAt = now;
}
