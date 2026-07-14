import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/ui/link';
import { useUser } from '@/framework/user';
import { useWishlist } from '@/framework/wishlist';

/**
 * #7 — Amazon-style price alerts for a shopper's saved (wishlisted) books. We
 * snapshot each wishlisted book's price in localStorage; on the next visit we
 * compare to the live price and show a bar — price DROPS on top, rises below.
 * Fully client-side (no extra backend), only for logged-in shoppers.
 */

const SNAP_KEY = 'ib_wishlist_prices';
const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

type Change = { slug: string; name: string; image?: string; old: number; now: number; delta: number };

export default function WishlistPriceAlerts() {
  const { isAuthorized } = useUser();
  const { wishlists } = useWishlist(isAuthorized ? {} : undefined);
  const [dismissed, setDismissed] = useState(false);

  const items = useMemo(
    () =>
      (wishlists ?? []).map((w: any) => {
        const p = w?.product ?? w;
        return {
          id: p?.id,
          slug: p?.slug,
          name: p?.name,
          image: p?.image?.original,
          price: Number(p?.sale_price || p?.price) || 0,
        };
      }).filter((x: any) => x.id && x.price > 0),
    [wishlists],
  );

  const [changes, setChanges] = useState<Change[]>([]);

  useEffect(() => {
    if (!isAuthorized || items.length === 0) return;
    let snap: Record<string, number> = {};
    try {
      snap = JSON.parse(localStorage.getItem(SNAP_KEY) || '{}');
    } catch {
      snap = {};
    }
    const found: Change[] = [];
    const next: Record<string, number> = {};
    items.forEach((it: any) => {
      next[it.id] = it.price;
      const prev = snap[it.id];
      if (typeof prev === 'number' && prev !== it.price) {
        found.push({ slug: it.slug, name: it.name, image: it.image, old: prev, now: it.price, delta: it.price - prev });
      }
    });
    // drops first (most negative delta), then rises
    found.sort((a, b) => a.delta - b.delta);
    setChanges(found);
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, items.length]);

  if (!isAuthorized || dismissed || changes.length === 0) return null;

  const drops = changes.filter((c) => c.delta < 0).length;

  return (
    <div className="mx-auto max-w-[1500px] px-5 pt-4 sm:px-8 lg:px-12">
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 text-lg leading-none text-gray-400 hover:text-gray-600"
          aria-label="dismiss"
        >
          ✕
        </button>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-heading">
          🔔 আপনার সেভ করা বইয়ের দাম বদলেছে
          {drops > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{drops}টি দাম কমেছে</span>}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {changes.map((c) => {
            const down = c.delta < 0;
            return (
              <Link
                key={c.slug}
                href={`/products/${c.slug}`}
                className="flex w-56 shrink-0 items-center gap-3 rounded-xl border border-gray-100 bg-white p-2.5 transition hover:border-accent"
              >
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-gray-100">
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-xs font-semibold text-heading">{c.name}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${down ? 'text-green-600' : 'text-red-600'}`}>{bdt(c.now)}</span>
                    <span className="text-[11px] text-gray-400 line-through">{bdt(c.old)}</span>
                    <span className={`text-[11px] font-bold ${down ? 'text-green-600' : 'text-red-600'}`}>
                      {down ? '↓' : '↑'} {bdt(Math.abs(c.delta))}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
