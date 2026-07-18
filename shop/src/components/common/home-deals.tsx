import { HttpClient } from '@/framework/client/http-client';
import { useQuery, useMutation } from 'react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import Link from '@/components/ui/link';
import { useCart } from '@/store/quick-cart/cart.context';
import { generateCartItem } from '@/store/quick-cart/generate-cart-item';
import { useChallengeGate } from '@/lib/use-challenge-gate';
import { Routes } from '@/config/routes';

function ReadersClub() {
  const { data } = useQuery(['club-info'], () => HttpClient.get<any>('club-info'));
  const club = (data as any)?.club;
  const fee = club?.fee ?? 300;
  const discount = club?.discount_pct ?? 15;
  const [form, setForm] = useState({ name: '', contact: '', email: '' });
  const [open, setOpen] = useState(false);
  const { mutate, isLoading } = useMutation(
    (payload: any) => HttpClient.post<any>('club-start', payload),
    {
      onSuccess: (r: any) => {
        if (r?.pay_link) window.location.href = r.pay_link;
      },
    },
  );

  // Hidden entirely when the admin turns the Readers' Club off (settings.options.readers_club.enabled).
  if (!club || club.enabled === false) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#7d141d] to-[#530b12] p-6 text-white sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-yellow-300">
            IndoBangla Readers&apos; Club
          </p>
          <h3 className="text-2xl font-bold">Never run out of something to read.</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-white/85">
            <li>🏷️ সব বইয়ে সবসময় <b className="text-yellow-300">{discount}%</b> ছাড় (member coupon)</li>
            <li>⚡ নতুন বই ও প্রি-অর্ডারে আগে অ্যাক্সেস</li>
            <li>📚 প্রতি মাসে বাছাই করা বইয়ের সাজেশন</li>
          </ul>
        </div>

        {/* credit-card style membership card */}
        <div className="lg:w-96">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 p-5 text-[#4a1109] shadow-xl">
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest">Readers&apos; Club</span>
              <span className="text-xl">📖</span>
            </div>
            <div className="mt-6 font-mono text-lg font-bold tracking-widest">IB · MEMBER · CARD</div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase opacity-70">Member saves</div>
                <div className="text-2xl font-extrabold">{discount}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase opacity-70">Membership</div>
                <div className="text-lg font-bold">৳{Math.round(fee).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 w-full rounded-full bg-yellow-400 py-2.5 text-sm font-bold text-[#530b12]"
            >
              🪪 Become a member — pay ৳{Math.round(fee).toLocaleString('en-IN')}
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (form.contact) mutate(form);
              }}
              className="mt-3 space-y-2"
            >
              <input required placeholder="আপনার নাম" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full px-4 py-2 text-sm text-heading outline-none" />
              <input required placeholder="মোবাইল নম্বর" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full rounded-full px-4 py-2 text-sm text-heading outline-none" />
              <input type="email" placeholder="ইমেইল (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full px-4 py-2 text-sm text-heading outline-none" />
              <button type="submit" disabled={isLoading} className="w-full rounded-full bg-yellow-400 py-2.5 text-sm font-bold text-[#530b12] disabled:opacity-60">
                {isLoading ? 'প্রসেস হচ্ছে…' : `পেমেন্ট করে সদস্য হন →`}
              </button>
              <p className="text-center text-[11px] text-white/70">পেমেন্ট সম্পন্ন হলে সদস্যপদ স্বয়ংক্রিয়ভাবে চালু হবে।</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function useCountdown() {
  const [t, setT] = useState('00:00:00');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      let s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      setT(`${h}:${m}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Deal of the Day + Frequently Bought Together + buy-more-save-more coupon tiers.
 *  All backed by real endpoints (real products, real coupons). */
/** Isolated so the 1-second tick re-renders ONLY this text, not all of HomeDeals. */
function Countdown() {
  const cd = useCountdown();
  return <>{cd}</>;
}

export default function HomeDeals() {
  const { data: dealRes } = useQuery(['deal-of-the-day'], () =>
    HttpClient.get<any>('deal-of-the-day')
  );
  const { data: popRes } = useQuery(['popular-books'], () =>
    HttpClient.get<any>('popular-books', { limit: 3 })
  );
  const { data: tierRes } = useQuery(['bundle-coupons'], () =>
    HttpClient.get<any>('bundle-coupons')
  );

  const deal = (dealRes as any)?.deal;
  const tiers = (tierRes as any)?.tiers ?? [];

  // The bundle is seeded from the deal book: same-author titles first, and only if the
  // author doesn't have enough books do we fall back to the same category.
  const seed = deal ?? (popRes as any)?.products?.[0];
  const { data: relRes } = useQuery(
    ['bundle-related', seed?.id],
    () => HttpClient.get<any>('related-books', { product_id: seed.id }),
    { enabled: !!seed?.id },
  );
  const byAuthor = ((relRes as any)?.by_author ?? []) as any[];
  const byCategory = ((relRes as any)?.by_category ?? []) as any[];
  const companions = [...byAuthor, ...byCategory]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .filter((p) => p.id !== seed?.id)
    .slice(0, 2);
  const bundleSource = seed && companions.length ? [seed, ...companions] : ((popRes as any)?.products ?? []);
  const bundle = bundleSource.map((p: any) => ({
    ...p,
    url: p.url ?? `/products/${p.slug}`,
    image: p.image?.original ?? p.image ?? null,
  }));
  const bundledBy = seed && byAuthor.length ? 'author' : 'category';
  const bundleAuthorName = seed?.author?.name ?? byAuthor[0]?.author?.name ?? '';

  const bundleTotal = bundle.reduce((s: number, p: any) => s + (p.sale_price || p.price), 0);
  const bundleWas = bundle.reduce((s: number, p: any) => s + p.price, 0);
  const bundleSave = Math.max(0, bundleWas - bundleTotal);
  const bundleSavePct = bundleWas > 0 ? Math.round((bundleSave / bundleWas) * 100) : 0;

  // "Shop these books" used to be a Link to bundle[0].url — it just opened one book's page and
  // left the bundle behind, which next to a bundle total and a "You save" line reads as broken.
  // It now does what it says: puts the whole bundle in the cart and goes to checkout.
  const { addItemToCart } = useCart();
  const { guardAdd } = useChallengeGate();
  const router = useRouter();
  const [addingBundle, setAddingBundle] = useState(false);
  const addBundleToCart = async () => {
    // A bundle is not a discovery — during a challenge run these books earn nothing, so the
    // whole action is refused rather than quietly adding books that don't count.
    const ok = await guardAdd('bundle', bundle[0]?.id);
    if (!ok) return;
    setAddingBundle(true);
    try {
      // Reshape to what generateCartItem actually reads: it wants `shop.id` (we get a flat
      // `shop_id`) and `image.thumbnail` (these endpoints send a plain URL string). Passing the
      // raw payload silently produced items with no shop_id — which fail at checkout — and no
      // image. `quantity` is the stock figure; both endpoints now send it.
      bundle.forEach((p: any) =>
        addItemToCart(
          generateCartItem(
            {
              ...p,
              shop: { id: p.shop_id },
              image: { thumbnail: p.image, original: p.image },
            },
            {} as any,
          ),
          1,
        ),
      );
      toast.success(`${bundle.length}টি বই কার্টে যোগ হয়েছে`);
      router.push(Routes.checkout);
    } catch {
      toast.error('কার্টে যোগ করা যায়নি।');
    } finally {
      setAddingBundle(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-12">
      <div className="space-y-6">
        {/* ===== DEAL OF THE DAY ===== */}
        {deal && (
          <div className="overflow-hidden rounded-2xl border border-border-200 bg-gradient-to-br from-orange-50 to-red-50">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
              <div className="relative mx-auto shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={deal.image || '/product-placeholder.svg'}
                  alt={deal.name}
                  className="h-48 w-auto rounded-lg object-contain shadow-lg"
                />
                <span className="absolute -right-3 -top-3 grid h-16 w-16 place-items-center rounded-full bg-accent text-center text-xs font-bold leading-tight text-white shadow-lg">
                  SAVE
                  <br />
                  {deal.off}%
                </span>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
                  ⚡ Deal of the day · resets at midnight
                </p>
                <Link href={deal.url}>
                  <h3 className="text-xl font-bold text-heading hover:text-accent">
                    {deal.name}
                  </h3>
                </Link>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-accent">{bdt(deal.sale_price)}</span>
                  <span className="text-base text-body line-through">{bdt(deal.price)}</span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                    You save {bdt(deal.price - deal.sale_price)}
                  </span>
                </div>
                {deal.quantity <= 10 && (
                  <p className="mt-2 text-sm font-bold text-accent">
                    🔥 Only {deal.quantity} left at this price!
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-body">Ends in</span>
                  <span className="rounded-lg bg-heading px-3 py-1.5 font-mono text-sm font-bold text-white">
                    <Countdown />
                  </span>
                </div>
                <Link
                  href={deal.url}
                  className="mt-4 inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover"
                >
                  Grab this deal →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ===== FREQUENTLY BOUGHT TOGETHER ===== */}
        {bundle.length >= 2 && (
          <div className="rounded-2xl border border-border-200 bg-light p-5 sm:p-6">
            <h3 className="mb-1 text-lg font-bold text-heading">Frequently bought together</h3>
            <p className="mb-4 text-sm text-body">
              {bundledBy === 'author' && bundleAuthorName
                ? `একই লেখকের বই — ${bundleAuthorName}. একসাথে নিলে বেশি সাশ্রয়।`
                : 'একই ধরনের বই — একসাথে নিলে বেশি সাশ্রয়।'}
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              {/* On phones the covers scroll sideways instead of wrapping — a wrapped
                  row left the "+" signs stranded on their own line. */}
              <div className="-mx-1 flex flex-1 items-start gap-x-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:gap-x-2 sm:gap-y-3 sm:overflow-visible">
                {bundle.map((p: any, i: number) => (
                  <div key={p.id} className="flex shrink-0 items-start gap-1.5 sm:gap-2">
                    <Link href={p.url} className="w-[84px] text-center sm:w-24">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image || '/product-placeholder.svg'}
                        alt={p.name}
                        className="mx-auto mb-1.5 h-24 w-auto rounded object-contain shadow sm:h-28"
                      />
                      <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-heading">{p.name}</p>
                      <p className="text-xs font-bold text-accent">{bdt(p.sale_price || p.price)}</p>
                    </Link>
                    {i < bundle.length - 1 && <span className="mt-8 text-xl font-bold text-accent sm:mt-10">+</span>}
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-dashed border-accent bg-accent/5 p-4 lg:w-60">
                <div className="flex justify-between text-sm text-body">
                  <span>Items ({bundle.length})</span>
                  <span className="line-through">{bdt(bundleWas)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm font-bold text-[#1f7a52]">
                  <span>You save</span>
                  <span>{bdt(bundleSave)}{bundleSavePct > 0 ? ` (${bundleSavePct}%)` : ''}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border-200 pt-2 text-base font-bold text-heading">
                  <span>Total</span>
                  <span className="text-accent">{bdt(bundleTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={addBundleToCart}
                  disabled={addingBundle}
                  className="mt-3 block w-full rounded-full bg-accent py-2.5 text-center text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
                >
                  {addingBundle ? 'যোগ করা হচ্ছে…' : `${bundle.length}টি বই কার্টে যোগ করুন`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Buy-more-save-more moved to the end of the home page (see standard.tsx). */}

        {/* ===== READERS CLUB (real membership + coupon) ===== */}
        <ReadersClub />
      </div>
    </section>
  );
}
