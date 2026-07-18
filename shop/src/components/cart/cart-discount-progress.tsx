import { HttpClient } from '@/framework/client/http-client';
import { useCart } from '@/store/quick-cart/cart.context';
import { useQuery } from 'react-query';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/**
 * Bulk-purchase discount progress: shows the shopper how much more to add to
 * reach the next order-amount discount tier (admin-configured).
 */
export default function CartDiscountProgress() {
  const { total } = useCart();
  const { data } = useQuery(['order-discount-info'], () =>
    HttpClient.get<any>('order-discount-info'),
  );
  const tiers: any[] = (data as any)?.tiers ?? [];
  if (!tiers.length || !total) return null;

  // current = highest reached tier; next = first unreached
  const reached = [...tiers].filter((t) => total >= t.min);
  const current = reached.length ? reached[reached.length - 1] : null;
  const next = tiers.find((t) => total < t.min);

  const target = next ? next.min : current?.min ?? 0;
  const pct = Math.min(100, Math.round((total / (target || 1)) * 100));

  return (
    <div className="mx-4 mt-4 rounded-xl border border-emerald-300/60 bg-emerald-50 p-3">
      {current && (
        <p className="text-sm font-bold text-emerald-700">
          🎉 আপনি {current.pct}% ছাড় পাচ্ছেন! কুপন: <span className="font-mono">{current.code}</span>
        </p>
      )}
      {next ? (
        <>
          <p className={`text-xs text-body ${current ? 'mt-1' : ''}`}>
            আর <b className="text-emerald-700">{bdt(next.min - total)}</b> এর বই যোগ করলে{' '}
            <b className="text-emerald-700">{next.pct}%</b> ছাড় (কুপন {next.code})
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: pct + '%' }} />
          </div>
        </>
      ) : (
        current && <p className="mt-1 text-xs text-body">সর্বোচ্চ ছাড় আনলকড! চেকআউটে কুপনটি ব্যবহার করুন।</p>
      )}
      {!current && next && (
        <p className="mt-1 text-[11px] text-body">বেশি বই কিনলে বেশি ছাড় — এখন থেকেই সাশ্রয় শুরু করুন।</p>
      )}
    </div>
  );
}
