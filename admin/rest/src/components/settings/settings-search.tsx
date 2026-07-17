import { useRouter } from 'next/router';
import { siteSettings } from '@/settings/site.settings';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Extra search terms per settings page, keyed by href.
 *
 * The page names alone are useless for finding anything: "free shipping" lives on a page called
 * "General", so searching the tab labels never finds it. These are the words someone actually
 * types when they're hunting for a setting.
 *
 * Only fields that genuinely exist on each page are listed — a keyword that leads somewhere
 * wrong is worse than no keyword.
 */
const KEYWORDS: Record<string, string[]> = {
  '/settings': [
    'free shipping', 'ফ্রি শিপিং', 'free delivery', 'shipping amount',
    'minimum order amount', 'সর্বনিম্ন অর্ডার', 'order amount',
    'currency', 'কারেন্সি', 'cash on delivery', 'cod',
    'wallet', 'logo', 'site title', 'tax', 'general',
  ],
  '/settings/payment': [
    'payment gateway', 'গেটওয়ে', 'default gateway', 'enable gateway',
    'currency', 'cash on delivery', 'cod', 'stripe',
  ],
  '/settings/integrations': [
    'bkash', 'বিকাশ', 'nagad', 'নগদ', 'bank', 'ব্যাংক', 'bank transfer',
    'courier', 'কুরিয়ার', 'redx', 'steadfast', 'pathao', 'paperfly', 'sundarban',
    'replygenie', 'api key', 'credentials', 'invoice',
  ],
  '/settings/conversion': [
    'mrp', 'এমআরপি', 'rate', 'রেট', 'price update', 'দাম', 'repricing',
    'membership card', 'coupon rate',
  ],
  '/settings/preorder': ['pre-order', 'প্রি-অর্ডার', 'advance', 'অগ্রিম', 'full pay discount'],
  '/settings/discount-tiers': ['discount', 'ছাড়', 'tier', 'bulk', 'buy more save more'],
  '/settings/notifications': ['notification', 'নোটিফিকেশন', 'order alert', 'telegram', 'sms'],
  '/settings/readers-club': ['readers club', 'club', 'membership', 'সদস্য'],
  '/settings/challenge': ['challenge', 'চ্যালেঞ্জ', '1 minute', 'game'],
  '/settings/image-sizes': ['image', 'ছবি', 'size', 'thumbnail', 'cover size'],
  '/settings/featured-books': ['featured', 'ফিচার্ড', 'home books', 'deal', 'fbt'],
  '/settings/landing-pages': ['landing', 'ল্যান্ডিং', 'campaign page'],
  '/settings/banners': ['banner', 'ব্যানার', 'home banner', 'hero'],
  '/settings/seo': ['seo', 'meta', 'og', 'twitter', 'search engine'],
  '/settings/maintenance': ['maintenance', 'মেইনটেন্যান্স', 'downtime', 'closed'],
  '/settings/company-information': ['company', 'address', 'ঠিকানা', 'phone', 'contact', 'email'],
  '/settings/promotion-popup': ['popup', 'পপআপ', 'promotion', 'newsletter'],
  '/settings/ai': ['ai', 'openai', 'openrouter', 'anthropic', 'api key', 'extract', 'field rules'],
  '/settings/shop': ['shop', 'দোকান', 'vendor', 'store'],
  '/settings/events': ['event', 'ইভেন্ট'],
  '/settings/updates': ['updates', 'changelog', 'release'],
};

export default function SettingsSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Same list the tab strip renders, so a new settings page is searchable the moment it is
  // added to the nav — no second list to forget to update.
  const items = useMemo(() => {
    const menu: any =
      siteSettings?.sidebarLinks?.admin?.settings?.childMenu?.[0]?.childMenu ?? [];
    return menu
      .filter((m: any) => m?.href)
      .map((m: any) => ({
        href: String(m.href),
        label: t(m.label),
        keywords: KEYWORDS[String(m.href)] ?? [],
      }));
  }, [t]);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return items
      .map((it: any) => {
        const label = it.label.toLowerCase();
        // Rank: a page-name hit beats a keyword hit, and a prefix beats a mid-word match.
        let score = -1;
        if (label.startsWith(q)) score = 0;
        else if (label.includes(q)) score = 1;
        else if (it.keywords.some((k: string) => k.toLowerCase().startsWith(q))) score = 2;
        else if (it.keywords.some((k: string) => k.toLowerCase().includes(q))) score = 3;
        const hit = it.keywords.find((k: string) => k.toLowerCase().includes(q));
        return { ...it, score, hit: score >= 2 ? hit : null };
      })
      .filter((it: any) => it.score >= 0)
      .sort((a: any, b: any) => a.score - b.score)
      .slice(0, 8);
  }, [term, items]);

  useEffect(() => setActive(0), [term]);

  // Click-away closes the panel.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setTerm('');
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative mb-5 w-full sm:max-w-md">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 flex items-center text-gray-400 start-3">
          🔍
        </span>
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => term && setOpen(true)}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(results[active].href);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="সেটিংস খুঁজুন — যেমন free shipping, bkash, MRP…"
          className="h-11 w-full rounded-lg border border-border-base bg-light ps-9 pe-3 text-sm text-heading outline-none focus:border-accent"
        />
      </div>

      {open && term.trim() !== '' && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border-base bg-light shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-body">কিছু মেলেনি — অন্য শব্দে চেষ্টা করুন।</div>
          ) : (
            results.map((r: any, i: number) => (
              <button
                key={r.href}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.href)}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-start ${
                  i === active ? 'bg-gray-100' : ''
                }`}
              >
                <span className="text-sm font-medium text-heading">{r.label}</span>
                {/* Say WHY this page matched — otherwise "free shipping → General" looks random. */}
                {r.hit && (
                  <span className="text-[11px] text-body">
                    {r.hit} · {r.href}
                  </span>
                )}
                {!r.hit && <span className="text-[11px] text-body">{r.href}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
