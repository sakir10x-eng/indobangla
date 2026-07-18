import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import { toast } from 'react-toastify';

/**
 * Mode B — reseller/commission business. Open a reseller account (fee), add
 * IndoBangla books to your shop at your price (up to the admin markup cap),
 * earn margin on each sale (held, then released), and request bKash payouts.
 */

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// Effective selling price — mirrors the backend (`sale_price ?: price`). All
// reseller math (cost, cap, margin) is based on the sale price, not the MRP.
const eff = (p: any) => (Number(p?.sale_price) > 0 ? Number(p.sale_price) : Number(p?.price));

const check = (res: any): boolean => {
  if (res?.errors?.length) {
    toast.error(res.errors[0]?.message || 'কাজটি করা যায়নি।');
    return false;
  }
  return true;
};

export default function ResellerDashboard() {
  const qc = useQueryClient();
  const { data } = useQuery(['reseller-status'], () => HttpClient.get<any>('reseller/status'));
  const cfg = (data as any)?.config;
  const meta = (data as any)?.meta;

  const [opening, setOpening] = useState(false);
  const [term, setTerm] = useState('');
  const { data: search } = useQuery(
    ['reseller-search', term],
    () => HttpClient.get<any>('books-listing', { text: term, limit: 6 }),
    { enabled: term.trim().length > 1 },
  );
  const results: any[] = (search as any)?.data ?? [];

  const [priceFor, setPriceFor] = useState<any>(null);
  const [myPrice, setMyPrice] = useState('');
  const [qty, setQty] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [bkash, setBkash] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [loadingUp, setLoadingUp] = useState(false);

  const refresh = () => qc.invalidateQueries(['reseller-status']);

  // The account no longer opens on click — it opens when the fee is actually paid, so this
  // just hands the customer to the pay screen (bKash or bank transfer).
  const open = async () => {
    setOpening(true);
    try {
      const res: any = await HttpClient.post('reseller/open', {});
      if (res?.pay_link) {
        window.location.href = res.pay_link;
        return;
      }
      if (res?.status === 'already_open') refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'পেমেন্ট শুরু করা যায়নি।');
    } finally {
      setOpening(false);
    }
  };

  const topup = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount < 1) return toast.error('কত টাকা লোড করবেন লিখুন।');
    setLoadingUp(true);
    try {
      const res: any = await HttpClient.post('reseller/topup', { amount });
      if (res?.pay_link) {
        window.location.href = res.pay_link;
        return;
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'ব্যালান্স লোড শুরু করা যায়নি।');
    } finally {
      setLoadingUp(false);
    }
  };

  const addProduct = async () => {
    if (!priceFor) return;
    const base = eff(priceFor);
    const cap = base * (1 + (cfg?.markup_cap_pct ?? 5) / 100);
    if (Number(myPrice) < base || Number(myPrice) > cap) {
      return toast.error(`দাম ${bdt(base)} থেকে ${bdt(cap)} এর মধ্যে হতে হবে।`);
    }
    // Checked here only to save a round-trip; the API enforces the same minimum, because this
    // form is not the only way to reach that endpoint.
    const wanted = Number(qty || minQty);
    if (wanted < minQty) {
      return toast.error(`যেকোনো বইয়ের অন্তত ${minQty} কপি নিতে হবে।`);
    }
    const res: any = await HttpClient.post('reseller/add-product', {
      product_id: priceFor.id,
      my_price: Number(myPrice),
      qty: wanted,
    });
    if (check(res)) { toast.success('প্রোডাক্ট যোগ হয়েছে।'); setPriceFor(null); setMyPrice(''); setQty(''); setTerm(''); refresh(); }
  };

  const removeProduct = async (id: number) => {
    const res: any = await HttpClient.post('reseller/remove-product', { product_id: id });
    if (check(res)) refresh();
  };

  const requestPayout = async () => {
    if (!payAmount || !bkash) return toast.error('অ্যামাউন্ট ও বিকাশ নম্বর দিন।');
    const res: any = await HttpClient.post('reseller/request-payout', { amount: Number(payAmount), bkash });
    if (check(res)) { toast.success('পেআউট রিকোয়েস্ট জমা হয়েছে।'); setPayAmount(''); setBkash(''); refresh(); }
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent';

  if (!data) return <div className="p-8 text-gray-400">লোড হচ্ছে…</div>;

  // ---- signup (not a reseller yet) ----
  if (!meta?.is_reseller) {
    return (
      <div className="mx-auto max-w-lg space-y-5 p-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <div className="text-4xl">🏪</div>
          <h2 className="mt-3 text-xl font-bold text-heading">রিসেলার হয়ে আয় করুন</h2>
          <p className="mt-2 text-sm text-gray-500">
            IndoBangla-র যেকোনো বই আপনার শপে যোগ করুন, নিজের দাম বসান, প্রতি বিক্রিতে
            কমিশন নিন — বিক্রি হলে ডেলিভারির {cfg?.hold_days} দিন পর টাকা তুলতে পারবেন।
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-left text-sm">
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-400">রিসেলার ছাড়</div><div className="font-bold text-heading">{cfg?.discount_pct}% কমে পাবেন</div></div>
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-400">দাম বাড়ানো যাবে</div><div className="font-bold text-heading">সর্বোচ্চ {cfg?.markup_cap_pct}%</div></div>
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-400">প্রতি বইয়ে কমপক্ষে</div><div className="font-bold text-heading">{Math.max(1, Number(cfg?.min_qty ?? 3))} কপি</div></div>
          </div>
          <button onClick={open} disabled={opening}
            className="mt-5 w-full rounded-lg bg-accent py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60">
            {opening ? 'পেমেন্টে নেওয়া হচ্ছে…' : `${bdt(cfg?.open_fee ?? 1000)} দিয়ে অ্যাকাউন্ট চালু করুন`}
          </button>
          <p className="mt-2 text-xs text-gray-400">
            বিকাশ বা ব্যাংক ট্রান্সফারে ওপেনিং ফি দিন — পেমেন্ট নিশ্চিত হলেই অ্যাকাউন্ট চালু হবে।
          </p>
        </div>
      </div>
    );
  }

  // ---- reseller panel ----
  const base = priceFor ? eff(priceFor) : 0;
  const cap = base * (1 + (cfg?.markup_cap_pct ?? 5) / 100);
  const cost = base * (1 - (cfg?.discount_pct ?? 5) / 100);
  const minQty = Math.max(1, Number(cfg?.min_qty ?? 3));

  return (
    <div className="space-y-6">
      {/* balances */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-accent to-accent-hover p-5 text-white">
          <div className="text-xs opacity-80">উত্তোলনযোগ্য ব্যালান্স</div>
          <div className="mt-1 text-3xl font-bold">{bdt(meta.available)}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="text-xs text-gray-400">অপেক্ষমাণ (হোল্ডে)</div>
          <div className="mt-1 text-3xl font-bold text-heading">{bdt(meta.pending)}</div>
          <div className="mt-1 text-xs text-gray-400">ডেলিভারির {cfg?.hold_days} দিন পর যোগ হবে</div>
        </div>
      </div>

      {/* balance load — same pay screen as the opening fee (bKash or bank transfer) */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <h3 className="text-sm font-bold text-heading">💳 ব্যালান্স লোড করুন</h3>
        <p className="mt-1 text-xs text-gray-400">
          বিকাশ বা ব্যাংক ট্রান্সফারে টাকা লোড করুন — পেমেন্ট নিশ্চিত হলেই ব্যালান্সে যোগ হবে।
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min={1}
            className={`${inputCls} flex-1`}
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            placeholder="কত টাকা লোড করবেন?"
          />
          <button
            onClick={topup}
            disabled={loadingUp}
            className="shrink-0 rounded-lg bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {loadingUp ? 'অপেক্ষা করুন…' : 'লোড করুন'}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[500, 1000, 2000, 5000].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setTopupAmount(String(a))}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 hover:border-accent hover:text-accent"
            >
              {bdt(a)}
            </button>
          ))}
        </div>
      </div>

      {/* add product */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-heading">➕ শপে বই যোগ করুন</h2>
        <input className={inputCls} value={term} onChange={(e) => { setTerm(e.target.value); setPriceFor(null); }} placeholder="বই সার্চ করুন…" />
        {term.trim().length > 1 && !priceFor && (
          <div className="mt-2 divide-y divide-gray-50 rounded-lg border border-gray-100">
            {results.length === 0 ? <div className="p-3 text-xs text-gray-400">কিছু পাওয়া যায়নি।</div> :
              results.map((p) => (
                <button key={p.id} onClick={() => { setPriceFor(p); setMyPrice(String(Math.round(eff(p)))); }}
                  className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-gray-50">
                  {p.image?.original && <img src={p.image.original} alt="" className="h-10 w-8 rounded object-cover" />}
                  <span className="flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-sm font-semibold text-heading">{bdt(eff(p))}</span>
                </button>
              ))}
          </div>
        )}
        {priceFor && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <div className="mb-2 text-sm font-semibold">{priceFor.name}</div>
            <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-gray-400">আপনার খরচ</span><div className="font-bold text-green-600">{bdt(cost)}</div></div>
              <div><span className="text-gray-400">সর্বোচ্চ দাম</span><div className="font-bold text-heading">{bdt(cap)}</div></div>
              <div><span className="text-gray-400">মার্জিন</span><div className="font-bold text-accent">{bdt(Number(myPrice) - cost)}</div></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-0.5 block text-[10px] font-semibold text-gray-400">আপনার দাম</label>
                <input type="number" className={inputCls} value={myPrice} onChange={(e) => setMyPrice(e.target.value)} placeholder={`${Math.round(base)}–${Math.round(cap)}`} />
              </div>
              <div className="w-24">
                <label className="mb-0.5 block text-[10px] font-semibold text-gray-400">কপি (কমপক্ষে {minQty})</label>
                <input type="number" min={minQty} className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} placeholder={String(minQty)} />
              </div>
              <button onClick={addProduct} className="mt-4 h-fit whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover">যোগ করুন</button>
              <button onClick={() => setPriceFor(null)} className="mt-4 h-fit text-sm text-gray-400">✕</button>
            </div>
            <div className="mt-1.5 text-[11px] text-gray-400">
              যেকোনো বইয়ের অন্তত <b className="text-heading">{minQty} কপি</b> নিতে হবে। খালি রাখলে {minQty} কপি ধরা হবে।
            </div>
          </div>
        )}
      </div>

      {/* my products */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-heading">আমার শপের বই ({meta.products?.length ?? 0})</h2>
        {(!meta.products || meta.products.length === 0) ? (
          <p className="text-sm text-gray-500">এখনো কোনো বই যোগ করেননি।</p>
        ) : (
          <div className="space-y-2">
            {meta.products.map((p: any) => (
              <div key={p.product_id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                {p.image && <img src={p.image} alt="" className="h-12 w-9 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-400">খরচ {bdt(p.cost)} · দাম {bdt(p.my_price)} · মার্জিন <b className="text-accent">{bdt(p.margin)}</b>{p.qty ? ` · কপি ${p.qty}` : ''} · বিক্রি {p.sold_count ?? 0}</div>
                </div>
                <button onClick={() => removeProduct(p.product_id)} className="text-xs text-gray-400 hover:text-red-500">সরান</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* payout */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-heading">💸 বিকাশে টাকা তুলুন</h2>
        <div className="flex flex-wrap gap-2">
          <input type="number" className={`${inputCls} flex-1`} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={`অ্যামাউন্ট (সর্বোচ্চ ${bdt(meta.available)})`} />
          <input className={`${inputCls} flex-1`} value={bkash} onChange={(e) => setBkash(e.target.value)} placeholder="বিকাশ নম্বর" />
          <button onClick={requestPayout} className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover">রিকোয়েস্ট</button>
        </div>
        {meta.payouts?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {meta.payouts.slice().reverse().map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{bdt(p.amount)} → {p.bkash}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${p.status === 'paid' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {p.status === 'paid' ? 'পরিশোধিত' : p.status === 'rejected' ? 'বাতিল' : 'অপেক্ষমাণ'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
