import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeading from '@/components/common/page-heading';
import Card from '@/components/common/card';
import { useEffect, useState } from 'react';
import AsyncSelect from 'react-select/async';
import { toast } from 'react-toastify';
import {
  usePreorderSettingsQuery,
  usePreorderQuoteMutation,
  useCreatePreorderMutation,
} from '@/data/integrations';
import { useExtractProductMutation } from '@/data/ai';
import { userClient } from '@/data/client/user';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/** wa.me wants a bare international number: 01712345678 → 8801712345678. */
const waNumber = (contact = '') => {
  const digits = String(contact).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return '88' + digits;
  return digits;
};
/** Amazon reports weight as text: "500 g", "0.45 Kilograms", "1.2 kg". We price per kg. */
const parseWeightKg = (raw: any): string => {
  if (raw == null) return '';
  const s = String(raw).toLowerCase();
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isFinite(n) || n <= 0) return '';
  const grams = /\bg\b|gram/.test(s) && !/\bkg\b|kilo/.test(s);
  return String(grams ? +(n / 1000).toFixed(3) : n);
};

const waLink = (contact: string, msg: string) =>
  `https://wa.me/${waNumber(contact)}?text=${encodeURIComponent(msg)}`;
const smsLink = (contact: string, msg: string) =>
  `sms:${String(contact ?? '').replace(/\s/g, '')}?&body=${encodeURIComponent(msg)}`;

const input =
  'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent';
const label = 'mb-1 block text-[11px] font-semibold uppercase text-slate-400';

interface Item {
  key: number;
  product_id?: number;
  title: string;
  source_url: string;
  image_url: string;
  author: string;
  source_price: string; // what Amazon lists it at
  weight_kg: string;
  price: string; // what we sell it at (BDT)
  quantity: number;
  stock_qty: string; // stock the NEW product is created with (blank ⇒ backend default)
  fetching?: boolean;
  note?: string;
}

const blankItem = (key: number): Item => ({
  key,
  title: '',
  source_url: '',
  image_url: '',
  author: '',
  source_price: '',
  weight_kg: '',
  price: '',
  quantity: 1,
  stock_qty: '1',
});

export default function PreorderCreate() {
  const { config } = usePreorderSettingsQuery();
  const { mutateAsync: quote } = usePreorderQuoteMutation();
  const { mutateAsync: extract } = useExtractProductMutation();
  const { mutate: createPreorder, isLoading: creating } = useCreatePreorderMutation();

  // customer
  const [customer, setCustomer] = useState<any>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');

  // books
  const [items, setItems] = useState<Item[]>([blankItem(1)]);

  // bill
  const [deliveryFee, setDeliveryFee] = useState('');
  const [discount, setDiscount] = useState('0');
  const [advanceMode, setAdvanceMode] = useState<'pct' | 'bdt'>('pct');
  const [advancePct, setAdvancePct] = useState('');
  const [advanceBdt, setAdvanceBdt] = useState('');
  const [payHours, setPayHours] = useState('');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');

  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');

  // Seed the bill fields from the admin's saved defaults once they load.
  useEffect(() => {
    if (!config) return;
    setDeliveryFee((v) => (v === '' ? String(config.delivery_fee ?? 60) : v));
    setAdvancePct((v) => (v === '' ? String(config.advance_pct ?? 50) : v));
    setPayHours((v) => (v === '' ? String(config.pay_hours ?? 8) : v));
    setEta((v) =>
      v === ''
        ? `পেমেন্ট কনফার্মের পর ${config.eta_min_days ?? 28}–${config.eta_max_days ?? 40} দিন`
        : v,
    );
  }, [config]);

  const patch = (key: number, next: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...next } : it)));

  /** Recompute the selling price from the source price + weight, server-side. */
  const reprice = async (it: Item, over: Partial<Item> = {}) => {
    const merged = { ...it, ...over };
    if (!merged.source_price) return;
    try {
      const q: any = await quote({
        source_price: Number(merged.source_price),
        weight_kg: Number(merged.weight_kg || 0),
        source_url: merged.source_url || undefined,
      });
      patch(it.key, {
        price: String(q.price),
        note: `${q.currency} ${merged.source_price} × ${q.rate} = ${bdt(q.base_bdt)} + ওজন ${q.weight_kg}kg × ${bdt(q.weight_per_kg)} = ${bdt(q.weight_bdt)}`,
      });
    } catch {
      /* the mutation already toasts */
    }
  };

  /** Paste an Amazon link → pull title/price/weight/image, then price it. */
  const fetchFromLink = async (it: Item) => {
    if (!it.source_url) {
      toast.error('আগে লিংকটা দিন');
      return;
    }
    patch(it.key, { fetching: true });
    try {
      const res: any = await extract({ product_url: it.source_url });
      const p = res?.product ?? res;
      if (!p?.name && !p?.price) {
        toast.error('লিংক থেকে কিছু পাওয়া গেল না — হাতে লিখুন');
        return;
      }
      // `price` comes back already marked up for the storefront. We want what Amazon
      // actually listed, because our own formula (× rate + weight charge) starts from that.
      const srcPrice = String(p.source_price ?? p.mrp ?? p.price ?? '');
      // item_weight arrives as free text ("500 g", "0.45 kg") — pull out the kilograms.
      const weight = parseWeightKg(p.item_weight);
      const next: Partial<Item> = {
        title: p.name ?? it.title,
        author: Array.isArray(p.authors) ? p.authors[0] ?? '' : p.authors ?? it.author,
        image_url: p.image_url ?? it.image_url,
        source_price: srcPrice,
        weight_kg: weight,
      };
      patch(it.key, next);
      await reprice(it, next);
      toast.success('লিংক থেকে তথ্য এসেছে — দাম মিলিয়ে নিন');
    } catch (e: any) {
      // Almost always this is an unconfigured AI provider, so say so instead of shrugging.
      const msg = e?.response?.data?.message ?? '';
      toast.error(
        /ai|key|provider|configur/i.test(msg) || !msg
          ? 'ফেচ করা যায়নি — Settings → AI Settings-এ provider ও API key দিন, নয়তো হাতে লিখুন।'
          : msg,
      );
    } finally {
      patch(it.key, { fetching: false });
    }
  };

  const subtotal = items.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0,
  );
  const total = Math.max(
    0,
    subtotal + (Number(deliveryFee) || 0) - (Number(discount) || 0),
  );
  // The admin picks either a percentage or a flat taka figure — never both at once.
  const advance = Math.min(
    total,
    advanceMode === 'bdt'
      ? Math.round(Number(advanceBdt) || 0)
      : Math.round((total * (Number(advancePct) || 0)) / 100),
  );
  const due = Math.max(0, total - advance);

  const loadUsers = async (q: string) => {
    const res: any = await userClient.fetchUsers({ name: q, page: 1 } as any);
    return (res?.data ?? []).map((u: any) => ({
      value: u.id,
      label: `${u.name} — ${u.email}`,
      user: u,
    }));
  };

  const submit = () => {
    const ready = items.filter((it) => it.title && Number(it.price) > 0);
    if (!ready.length) {
      toast.error('অন্তত একটি বই ও তার দাম দিন');
      return;
    }
    if (!contact) {
      toast.error('কাস্টমারের ফোন নম্বর দিন');
      return;
    }
    createPreorder(
      {
        customer_id: customer?.value,
        customer_name: customer?.user?.name || name,
        customer_contact: contact,
        customer_email: email || undefined,
        address: street ? { street_address: street, city } : undefined,
        items: ready.map((it) => ({
          product_id: it.product_id,
          title: it.title,
          price: Number(it.price),
          quantity: Number(it.quantity) || 1,
          stock_qty:
            it.stock_qty === '' ? undefined : Math.max(0, Number(it.stock_qty) || 0),
          source_url: it.source_url || undefined,
          image_url: it.image_url || undefined,
          author: it.author || undefined,
          weight_kg: it.weight_kg ? Number(it.weight_kg) : undefined,
        })),
        delivery_fee: Number(deliveryFee) || 0,
        discount: Number(discount) || 0,
        ...(advanceMode === 'bdt'
          ? { advance_bdt: Number(advanceBdt) || 0 }
          : { advance_percent: Number(advancePct) || 0 }),
        pay_hours: Number(payHours) || undefined,
        eta_text: eta || undefined,
        note: note || undefined,
      },
      {
        onSuccess: (r: any) => {
          setResult(r);
          setMessage(r?.message ?? '');
        },
      },
    );
  };

  // ---- success screen: hand the admin the link to send.
  if (result) {
    return (
      <>
        <Card className="mb-6">
          <PageHeading title="প্রি-অর্ডার তৈরি হয়েছে ✅" />
        </Card>
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            অর্ডার <b className="text-slate-800">#{result.tracking_number}</b> — মোট{' '}
            <b>{bdt(result.total)}</b>, অগ্রিম <b className="text-accent">{bdt(result.advance_bdt)}</b>,
            বাকি {bdt(result.due_bdt)}।
          </p>
          <p className="mt-1 text-xs text-slate-400">{result.eta}</p>

          <p className="mt-1 text-xs font-semibold text-amber-700">
            ⏳ লিংকটি {result.pay_hours} ঘণ্টা কাজ করবে।
          </p>

          <p className="mt-5 text-[11px] font-semibold uppercase text-slate-400">পেমেন্ট লিংক</p>
          <div className="mt-1 flex gap-2">
            <input readOnly value={result.pay_link} className={input} />
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.pay_link);
                toast.success('লিংক কপি হয়েছে');
              }}
              className="h-10 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            >
              কপি
            </button>
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase text-slate-400">
            মেসেজ (দরকার হলে এডিট করুন — লিংক ভেতরেই আছে)
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-accent"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={waLink(result.contact, message)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              💬 WhatsApp-এ পাঠান
            </a>
            <a
              href={smsLink(result.contact, message)}
              className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              📱 SMS-এ পাঠান
            </a>
            <button
              onClick={() => {
                // Messenger has no way to pre-fill a message from a link, so we put it on
                // the clipboard and open the chat — one paste and it's sent.
                navigator.clipboard.writeText(message);
                toast.success('মেসেজ কপি হয়েছে — Messenger-এ পেস্ট করুন');
                window.open('https://www.messenger.com/', '_blank');
              }}
              className="rounded-lg bg-[#0084FF] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              📨 Messenger (কপি করে খুলুন)
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(message);
                toast.success('মেসেজ কপি হয়েছে');
              }}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              📋 মেসেজ কপি
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setResult(null);
                setItems([blankItem(Date.now())]);
                setCustomer(null);
                setName('');
                setContact('');
                setEmail('');
                setStreet('');
                setCity('');
                setNote('');
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              আরেকটা প্রি-অর্ডার
            </button>
            <a
              href={`/orders/${result.order_id}`}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
            >
              অর্ডার দেখুন
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <PageHeading title="প্রি-অর্ডার তৈরি করুন" />
        <p className="mt-1 text-sm text-slate-500">
          কাস্টমার → বই (Amazon লিংক দিলে দাম নিজেই বসবে) → বিল → অগ্রিম। সাবমিট করলে পেমেন্ট
          লিংক তৈরি হবে; কাস্টমার অগ্রিম দিলেই অর্ডার কনফার্ম।
        </p>
      </Card>

      {/* ---------------- customer ---------------- */}
      <div className="mb-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">১. কাস্টমার</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <span className={label}>পুরোনো কাস্টমার খুঁজুন</span>
            <AsyncSelect
              cacheOptions
              defaultOptions
              isClearable
              loadOptions={loadUsers}
              value={customer}
              onChange={(v: any) => {
                setCustomer(v);
                if (v?.user) {
                  setName(v.user.name ?? '');
                  setEmail(v.user.email ?? '');
                  setContact(v.user.profile?.contact ?? contact);
                }
              }}
              placeholder="নাম বা ইমেইল দিয়ে খুঁজুন…"
            />
          </div>
          <div>
            <span className={label}>ফোন নম্বর *</span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={input}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>

        {!customer && (
          <>
            <p className="mt-4 text-xs text-slate-400">
              নতুন কাস্টমার — নিচের তথ্য দিলে অ্যাকাউন্ট নিজে থেকেই তৈরি হয়ে যাবে।
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <span className={label}>নাম</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </div>
              <div>
                <span className={label}>ইমেইল (optional)</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              </div>
            </div>
          </>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <span className={label}>ঠিকানা</span>
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={input}
              placeholder="বাসা, রোড, এলাকা"
            />
          </div>
          <div>
            <span className={label}>শহর</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={input} />
          </div>
        </div>
      </div>

      {/* ---------------- books ---------------- */}
      <div className="mb-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">২. বই</h3>

        {items.map((it, idx) => (
          <div key={it.key} className="mb-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">বই {idx + 1}</span>
              {items.length > 1 && (
                <button
                  onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  সরান
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={it.source_url}
                onChange={(e) => patch(it.key, { source_url: e.target.value })}
                className={input}
                placeholder="Amazon লিংক (amazon.in / amazon.com) — optional"
              />
              <button
                onClick={() => fetchFromLink(it)}
                disabled={it.fetching}
                className="h-10 shrink-0 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {it.fetching ? 'আনছি…' : '✨ ফেচ'}
              </button>
            </div>

            {/* Fetched cover — shown so the admin can see it was captured; it's downloaded
                onto the product server-side when the pre-order is created. */}
            {it.image_url && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.image_url}
                  alt="book cover"
                  className="h-16 w-12 shrink-0 rounded border border-slate-200 object-cover"
                />
                <p className="text-[11px] text-slate-500">
                  <span className="font-semibold text-[#1f7a52]">✓ কভার এসেছে</span> — প্রোডাক্টের
                  সাথে যোগ হবে।
                  <button
                    onClick={() => patch(it.key, { image_url: '' })}
                    className="ml-2 font-semibold text-red-500 hover:underline"
                  >
                    সরান
                  </button>
                </p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <span className={label}>বইয়ের নাম *</span>
                <input
                  value={it.title}
                  onChange={(e) => patch(it.key, { title: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <span className={label}>লেখক</span>
                <input
                  value={it.author}
                  onChange={(e) => patch(it.key, { author: e.target.value })}
                  className={input}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <span className={label}>Amazon দাম</span>
                <input
                  type="number"
                  value={it.source_price}
                  onChange={(e) => patch(it.key, { source_price: e.target.value })}
                  onBlur={() => reprice(it)}
                  className={input}
                />
              </div>
              <div>
                <span className={label}>ওজন (কেজি)</span>
                <input
                  type="number"
                  step="0.01"
                  value={it.weight_kg}
                  onChange={(e) => patch(it.key, { weight_kg: e.target.value })}
                  onBlur={() => reprice(it)}
                  className={input}
                />
              </div>
              <div>
                <span className={label}>বিক্রয় মূল্য (৳) *</span>
                <input
                  type="number"
                  value={it.price}
                  onChange={(e) => patch(it.key, { price: e.target.value })}
                  className={`${input} font-bold text-accent`}
                />
              </div>
              <div>
                <span className={label}>পরিমাণ</span>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => patch(it.key, { quantity: Number(e.target.value) || 1 })}
                  className={input}
                />
              </div>
              {/* Stock for the product that gets CREATED — separate from the order quantity
                  above. This used to be a hardcoded 100 on the backend, so every pre-order
                  book advertised 100 copies in stock. */}
              {!it.product_id && (
                <div>
                  <span className={label}>স্টক (নতুন বইয়ের)</span>
                  <input
                    type="number"
                    min={0}
                    value={it.stock_qty}
                    onChange={(e) => patch(it.key, { stock_qty: e.target.value })}
                    className={input}
                    placeholder="1"
                  />
                  <p className="mt-1 text-[10px] leading-tight text-slate-400">
                    ক্যাটালগে কত কপি দেখাবে
                  </p>
                </div>
              )}
            </div>

            {it.note && <p className="mt-2 text-[11px] text-slate-400">{it.note}</p>}
          </div>
        ))}

        <button
          onClick={() => setItems((p) => [...p, blankItem(Date.now())])}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 hover:border-accent hover:text-accent"
        >
          + আরও বই যোগ করুন
        </button>
      </div>

      {/* ---------------- bill ---------------- */}
      <div className="mb-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">৩. বিল ও অগ্রিম</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <span className={label}>ডেলিভারি চার্জ (৳)</span>
            <input
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <span className={label}>ডিসকাউন্ট (৳)</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <span className={label}>অগ্রিম</span>
            <div className="flex gap-1.5">
              <select
                value={advanceMode}
                onChange={(e) => setAdvanceMode(e.target.value as 'pct' | 'bdt')}
                className={`${input} w-20 shrink-0 px-1`}
              >
                <option value="pct">%</option>
                <option value="bdt">৳</option>
              </select>
              {advanceMode === 'pct' ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={advancePct}
                  onChange={(e) => setAdvancePct(e.target.value)}
                  className={input}
                  placeholder="৫০"
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  value={advanceBdt}
                  onChange={(e) => setAdvanceBdt(e.target.value)}
                  className={input}
                  placeholder="টাকার অঙ্ক"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <span className={label}>পেমেন্ট লিংক কত ঘণ্টা কাজ করবে</span>
          <input
            type="number"
            min={1}
            value={payHours}
            onChange={(e) => setPayHours(e.target.value)}
            className={`${input} md:w-48`}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            ⚠️ Amazon-এ দাম দ্রুত বদলায় — লিংকের মেয়াদ ছোট রাখলে কাস্টমার দ্রুত পেমেন্ট করবে।
          </p>
        </div>

        <div className="mt-3">
          <span className={label}>প্রত্যাশিত ডেলিভারি (optional)</span>
          <input value={eta} onChange={(e) => setEta(e.target.value)} className={input} />
        </div>

        <div className="mt-3">
          <span className={label}>নোট (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </div>

        <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>সাবটোটাল</span>
            <span className="font-semibold text-slate-700">{bdt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>ডেলিভারি চার্জ</span>
            <span className="font-semibold text-slate-700">{bdt(Number(deliveryFee) || 0)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>ডিসকাউন্ট</span>
            <span className="font-semibold text-[#1f7a52]">− {bdt(Number(discount) || 0)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 text-slate-500">
            <span>
              অগ্রিম{' '}
              {advanceMode === 'pct'
                ? `(${advancePct || 0}%)`
                : total > 0
                  ? `(${Math.round((advance / total) * 100)}%)`
                  : ''}
            </span>
            <span className="font-semibold text-accent">{bdt(advance)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>ডেলিভারিতে বাকি</span>
            <span>{bdt(due)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold text-slate-800">
            <span>মোট বিল</span>
            <span>{bdt(total)}</span>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={creating}
          className="mt-5 w-full rounded-lg bg-accent py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {creating ? 'তৈরি হচ্ছে…' : 'প্রি-অর্ডার তৈরি করে পেমেন্ট লিংক নিন'}
        </button>
      </div>
    </>
  );
}

PreorderCreate.authenticate = { permissions: adminOnly };
PreorderCreate.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
