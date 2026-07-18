import { useState } from 'react';
import { useSettings } from '@/framework/settings';
import usePrice from '@/lib/use-price';
import cn from 'classnames';

/**
 * "এই অর্ডারেই যোগ করুন" — cross-sell / add-on offers on checkout.
 *
 * DORMANT BY DEFAULT: renders nothing until the store enables it from settings.
 * Flip on later (once the add-to-order backend exists) by adding to settings.options:
 *
 *   "checkoutOffers": {
 *     "enabled": true,
 *     "items": [
 *       { "id": "bundle", "title": "হুমায়ূন কালেকশন (৩ বই)", "sub": "...", "price": 240, "was": 480, "icon": "book" },
 *       { "id": "cover",  "title": "বুক কভার + বুকমার্ক",     "sub": "...", "price": 60,  "was": 120, "icon": "mark" },
 *       { "id": "club",   "title": "সিলভার ক্লাব — ১ বছর",     "sub": "...", "price": 99,  "was": 499, "icon": "crown", "hero": true }
 *     ]
 *   }
 *
 * TODO(backend): wire onToggle to actually add/remove the offer from the order
 * (cart line, club membership, rebate). Until then this only reflects UI selection.
 */

const ICONS: Record<string, string> = {
  book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17h14"/>',
  mark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4v10H3z"/>',
};

function OfferPrice({ price, was }: { price: number; was?: number }) {
  const { price: p } = usePrice({ amount: price });
  const { price: w } = usePrice({ amount: was ?? 0 });
  return (
    <span className="shrink-0 text-right">
      <b className="block text-[13.5px] font-bold text-accent">+{p}</b>
      {was ? <s className="block text-[11px] text-[#9A9899]">{w}</s> : null}
    </span>
  );
}

export default function OffersCard({ className }: { className?: string }) {
  const { settings } = useSettings() as any;
  const offers = settings?.checkoutOffers;
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  // Dormant until the store turns it on AND provides items.
  if (!offers?.enabled || !offers?.items?.length) return null;

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E63946"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-[17px] w-[17px]"
          >
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13M3 12h18" />
          </svg>
          <span className="text-base font-semibold text-heading">
            এই অর্ডারেই যোগ করুন
          </span>
        </div>
        <span className="text-xs text-[#9A9899]">
          আলাদা শিপিং চার্জ লাগবে না
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {offers.items.map((o: any) => {
          const on = !!picked[o.id];
          return (
            <label
              key={o.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 transition-colors',
                on
                  ? 'border-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent))]'
                  : 'border-[#E4E1DC] hover:border-[#CFCBC4]',
                o.hero && 'bg-accent/5'
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  setPicked((p) => ({ ...p, [o.id]: e.target.checked }))
                }
                className="ib-check h-4 w-4"
              />
              <span
                className={cn(
                  'flex h-11 w-9 shrink-0 items-center justify-center rounded',
                  o.hero ? 'bg-[#F8D4D7] text-accent' : 'bg-[#F3F0EA] text-[#6E6C6D]'
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[17px] w-[17px]"
                  dangerouslySetInnerHTML={{
                    __html: ICONS[o.icon] ?? ICONS.book,
                  }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-heading">
                  {o.title}
                </span>
                {o.sub ? (
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-[#6E6C6D]">
                    {o.sub}
                  </span>
                ) : null}
              </span>
              <OfferPrice price={o.price} was={o.was} />
            </label>
          );
        })}
      </div>
    </section>
  );
}
