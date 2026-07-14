import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';

/** Buy-more-save-more coupon tiers — shown near the bottom of the home page. */
export default function BuyMoreSaveMore() {
  const { data } = useQuery(['bundle-coupons'], () =>
    HttpClient.get<any>('bundle-coupons'),
  );
  const tiers = (data as any)?.tiers ?? [];
  if (!tiers.length) return null;

  return (
    <section className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-12">
      <h3 className="mb-1 text-lg font-bold text-heading sm:text-xl">Buy more, save more</h3>
      <p className="mb-4 text-sm text-body">
        Add books to your cart and apply the coupon at checkout — the more you read, the more you save.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiers.map((t: any, i: number) => (
          <div
            key={t.code}
            className={`rounded-2xl border p-5 text-center ${
              i === 1 ? 'border-accent bg-accent/5 shadow-lg' : 'border-border-200 bg-light'
            }`}
          >
            {i === 1 && (
              <span className="mb-2 inline-block rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase text-white">
                Most popular
              </span>
            )}
            <div className="text-3xl font-extrabold text-heading">{t.label}</div>
            <div className="mt-1 text-2xl font-bold text-green-700">{t.amount}% off</div>
            <div className="mt-3 text-xs text-body">Use coupon at checkout</div>
            <div className="mt-1 inline-block rounded-lg border-2 border-dashed border-accent px-4 py-1.5 font-mono text-sm font-bold text-accent">
              {t.code}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
