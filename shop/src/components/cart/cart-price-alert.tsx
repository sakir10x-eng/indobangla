import { HttpClient } from '@/framework/client/http-client';
import { useCart } from '@/store/quick-cart/cart.context';
import { useQuery } from 'react-query';
import { useMemo, useState } from 'react';

const bdt = (n: number) => '৳' + (Number(n) || 0).toLocaleString('en-IN');

/**
 * Item 11 — price-change notification panel. Compares each cart item's stored
 * price against the live price and, if any changed, shows a panel letting the
 * shopper refresh to the current price.
 */
export default function CartPriceAlert() {
  const { items, clearItemFromCart, addItemToCart } = useCart();
  const [dismissed, setDismissed] = useState(false);

  const ids = useMemo(
    () => items.map((i: any) => String(i.id).split('.')[0]).filter(Boolean),
    [items],
  );

  const { data } = useQuery(
    ['cart-price-check', ids.join(',')],
    () => HttpClient.get<any>('price-check', { ids: ids.join(',') }),
    { enabled: ids.length > 0, staleTime: 30_000 },
  );

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    ((data as any)?.prices ?? []).forEach((p: any) => {
      m[String(p.id)] = p.sale_price > 0 ? p.sale_price : p.price;
    });
    return m;
  }, [data]);

  const changed = useMemo(() => {
    return items
      .map((it: any) => {
        const pid = String(it.id).split('.')[0];
        const now = priceMap[pid];
        if (now == null) return null;
        const old = Number(it.price) || 0;
        if (Math.round(now) === Math.round(old)) return null;
        return { it, old, now };
      })
      .filter(Boolean) as { it: any; old: number; now: number }[];
  }, [items, priceMap]);

  if (dismissed || changed.length === 0) return null;

  const refreshAll = () => {
    changed.forEach(({ it, now }) => {
      const qty = it.quantity || 1;
      clearItemFromCart(it.id);
      addItemToCart({ ...it, price: now }, qty);
    });
  };

  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">দাম পরিবর্তন হয়েছে</p>
          <p className="mt-0.5 text-xs text-amber-700">
            আপনার কার্টের কিছু বইয়ের দাম আপডেট হয়েছে। নতুন দামে আপডেট করুন।
          </p>
          <ul className="mt-2 space-y-1">
            {changed.map(({ it, old, now }) => (
              <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="line-clamp-1 text-body">{it.name}</span>
                <span className="shrink-0 font-semibold">
                  <span className="text-gray-400 line-through">{bdt(old)}</span>{' '}
                  <span className={now > old ? 'text-rose-600' : 'text-green-600'}>{bdt(now)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              onClick={refreshAll}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              দাম আপডেট করুন
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
