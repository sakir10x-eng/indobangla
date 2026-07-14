import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';
import {
  useConversionQuery,
  useUpdateConversionMutation,
  useConversionApplyMutation,
  useConversionStatusQuery,
  useConversionCouponMutation,
  useMembershipTiersQuery,
  useUpdateMembershipTiersMutation,
  useMembershipSearchQuery,
  useMembershipAssignMutation,
  useQuickPriceMutation,
} from '@/data/integrations';
import { useAuthorsQuery } from '@/data/author';
import { useManufacturersQuery } from '@/data/manufacturer';
import { useCategoriesQuery } from '@/data/category';
import { useProductsQuery } from '@/data/product';

const RED = '#e63946';
const fld = 'w-full h-11 rounded-lg border border-[#d8d8dc] bg-[#fafafb] px-3 text-[15px] font-medium outline-none focus:border-[#e63946] focus:bg-white focus:ring-4 focus:ring-[#e63946]/10';
const lab = 'mb-1.5 block text-xs font-semibold text-[#5f5f66]';
const card = 'mb-4 rounded-2xl border border-[#e6e6e8] bg-white p-6';
const bdt = (n: any) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/** Same rounding the API uses: floor, then 0–1 → x0, 2–6 → x5, 7–9 → next x0 (71.75→70, 72→75, 77→80). */
const roundPrice = (n: number) => {
  const v = Math.floor(n);
  if (v <= 0) return 0;
  const d = v % 10;
  const base = v - d;
  const r = d <= 1 ? base : d <= 6 ? base + 5 : base + 10;
  return r > 0 ? r : 5;
};

type Override = { type: string; id: number; id2: number; label: string; rate: number; sale_rate: number };

function TargetPicker({ type, placeholder, onPick }: { type: string; placeholder: string; onPick: (id: number, label: string) => void }) {
  const [term, setTerm] = useState('');
  const on = term.trim().length > 1;
  const authors = useAuthorsQuery({ name: term, limit: 6, language: 'en' } as any);
  const mans = useManufacturersQuery({ name: term, limit: 6, language: 'en' } as any);
  const cats = useCategoriesQuery({ name: term, limit: 6, language: 'en' } as any);
  const prods = useProductsQuery({ name: term, limit: 6, status: 'publish' } as any, { enabled: on && type === 'product' });
  const results: { id: number; name: string }[] =
    !on ? [] :
    type === 'author' ? (authors.authors as any[]) :
    type === 'publisher' ? (mans.manufacturers as any[]) :
    type === 'category' ? (cats.categories as any[]) :
    type === 'product' ? (prods.products as any[]) : [];
  return (
    <div className="relative min-w-[200px] flex-1">
      <input className={`${fld} bg-white pl-9`} value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a6]">⌕</span>
      {on && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#e6e6e8] bg-white shadow-lg">
          {results.slice(0, 6).map((r) => (
            <button key={r.id} onClick={() => { onPick(r.id, r.name); setTerm(''); }}
              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-[#fdf0f1]">{r.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Step({ n, amber }: { n: number; amber?: boolean }) {
  return (
    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: amber ? '#c98a1a' : RED }}>{n}</span>
  );
}

function RowPrice({ item }: { item: any }) {
  const { mutate, isLoading } = useQuickPriceMutation();
  const [price, setPrice] = useState(String(item.new_price));
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="rounded border border-[#e6e6e8] px-2 py-1 text-xs font-medium text-[#5f5f66] hover:border-[#e63946] hover:text-[#e63946]">Edit</button>;
  return (
    <div className="flex items-center gap-1.5">
      <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="w-20 rounded border border-[#d8d8dc] px-2 py-1 text-xs outline-none focus:border-[#e63946]" />
      <button disabled={isLoading} onClick={() => { mutate({ product_id: item.product_id, price: Number(price) }); setOpen(false); }}
        className="rounded px-2 py-1 text-xs font-semibold text-white disabled:opacity-60" style={{ background: RED }}>Save</button>
    </div>
  );
}

export default function ConversionPage() {
  const { config, loading } = useConversionQuery();
  const { mutate: save, isLoading: saving } = useUpdateConversionMutation();
  const apply = useConversionApplyMutation();
  const { total, withMrp, withoutMrp } = useConversionStatusQuery();

  const [rate, setRate] = useState(2);
  const [bdRate, setBdRate] = useState(1);
  const [saleRate, setSaleRate] = useState(0);
  const [overrides, setOverrides] = useState<Override[]>([]);

  // scheduled rate
  const [schOn, setSchOn] = useState(false);
  const [schMode, setSchMode] = useState<'duration' | 'range'>('duration');
  const [schAmount, setSchAmount] = useState('24');
  const [schUnit, setSchUnit] = useState('hour');
  const [schEnd, setSchEnd] = useState('');
  const [schUntil, setSchUntil] = useState<string | null>(null);

  const [crit, setCrit] = useState<{ type: string; id: number; label: string }[]>([]);
  const [addType, setAddType] = useState('category');
  const [excl, setExcl] = useState<{ type: string; id: number; label: string }[]>([]);
  const [exType, setExType] = useState('category');
  const [assumedRate, setAssumedRate] = useState('2');

  const { info: memberInfo } = useMembershipTiersQuery();
  const { mutate: saveTiers, isLoading: savingTiers } = useUpdateMembershipTiersMutation();
  const assign = useMembershipAssignMutation();
  const [tiers, setTiers] = useState<any>({});
  const [mq, setMq] = useState('');
  const [picked, setPicked] = useState<any>(null);
  const members = useMembershipSearchQuery(picked ? '' : mq);
  useEffect(() => { if (memberInfo?.tiers) setTiers(memberInfo.tiers); }, [memberInfo]);

  const [changeQ, setChangeQ] = useState('');

  const coupon = useConversionCouponMutation();
  const [cCode, setCCode] = useState('');
  const [cRate, setCRate] = useState('1.6');
  const [cExp, setCExp] = useState('');

  const [nType, setNType] = useState('category');
  const [nTarget, setNTarget] = useState<{ id: number; id2: number; label: string }>({ id: 0, id2: 0, label: '' });
  const [nRate, setNRate] = useState(2);
  const [nSale, setNSale] = useState(0);

  useEffect(() => {
    if (config) {
      setRate(Number(config.rate) || 2);
      setBdRate(Number(config.bd_rate) || 1);
      setSaleRate(Number(config.sale_rate) || 0);
      setOverrides((config.overrides ?? []) as Override[]);
      setAssumedRate(String(Number(config.rate) || 2));
      setSchUntil((config as any).schedule?.until ?? null);
      setSchOn(Boolean((config as any).schedule?.enabled));
    }
  }, [config]);

  const schedule = schOn
    ? { enabled: true, mode: schMode, amount: Number(schAmount), unit: schUnit, end: schEnd }
    : { enabled: false };
  const payload = { rate, bd_rate: bdRate, sale_rate: saleRate, overrides, schedule };

  const TYPE_KEY: any = { category: 'categories', author: 'authors', publisher: 'publishers', product: 'products' };
  const buildFilters = () => {
    const f: any = { categories: [], authors: [], publishers: [], products: [] };
    crit.forEach((c) => f[TYPE_KEY[c.type]].push(c.id));
    return f;
  };
  const buildExclude = () => {
    const f: any = { categories: [], authors: [], publishers: [], products: [] };
    excl.forEach((c) => f[TYPE_KEY[c.type]].push(c.id));
    return f;
  };
  const scopeArg = () => ({
    ...(crit.length ? { filters: buildFilters() } : { scope: 'all' }),
    ...(excl.length ? { exclude: buildExclude() } : {}),
  });
  const result = apply.data as any;
  const allChanges: any[] = result?.changes ?? [];
  const cq = changeQ.trim().toLowerCase();
  const changes: any[] = cq
    ? allChanges.filter((c) =>
        [c.name, c.author, c.publisher].some((f) => String(f ?? '').toLowerCase().includes(cq)),
      )
    : allChanges;

  const addOverride = () => {
    if (nType === 'author_in_publisher' ? (!nTarget.id || !nTarget.id2) : !nTarget.id) return;
    setOverrides((o) => [...o, { type: nType, id: nTarget.id, id2: nTarget.id2, label: nTarget.label, rate: nRate, sale_rate: nSale }]);
    setNTarget({ id: 0, id2: 0, label: '' });
  };

  return (
    <>
      <SettingsPageHeader pageTitle="দাম নির্ধারণ" />
      {loading ? (
        <div className="p-8 text-[#8a8a90]">Loading…</div>
      ) : (
        <div className="mx-auto max-w-[920px]">
          {/* summary */}
          <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
            <div className="mb-1 text-[15px] font-semibold">🧮 দাম কীভাবে হিসাব হয়</div>
            <div className="mb-3 text-sm leading-relaxed text-[#4a1417]">
              বিক্রয়মূল্য = <b>MRP × রেট</b>। যেমন MRP ৫০০ × {rate} = <b>{bdt(roundPrice(500 * rate))}</b>। ইন্ডিয়ান বই ×{rate}, বাংলাদেশি বই ×{bdRate}।
              <br />দাম কখনো ভগ্নাংশ হবে না — সবসময় ৫ বা ০-তে শেষ হবে <span className="text-[#8a4048]">(৭২→৭৫, ৭৬→৭৫, ৭৭→৮০)</span>।
            </div>
            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px]">📚 মোট বই: <b>{total}</b></span>
              <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px]">✅ MRP সেট আছে: <b className="text-[#2a9d68]">{withMrp}</b></span>
              <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px]">⚠️ MRP নেই: <b style={{ color: withoutMrp ? '#c98a1a' : '#a0a0a6' }}>{withoutMrp}</b></span>
            </div>
          </div>

          {/* step 1 */}
          <div className={card}>
            <h2 className="mb-1 flex items-center gap-2.5 text-[17px] font-semibold"><Step n={1} /> রেট ঠিক করুন</h2>
            <p className="mb-4 text-[13px] text-[#8a8a90]">এখানে শুধু রেট সেভ হয় — দাম বদলাতে Step 3 চাপুন।</p>
            <div className="mb-4 grid gap-3.5 sm:grid-cols-3">
              <div><label className={lab}>ইন্ডিয়ান বই ×</label><input type="number" step="0.05" min="0" className={fld} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></div>
              <div><label className={lab}>বাংলাদেশি বই ×</label><input type="number" step="0.05" min="0" className={fld} value={bdRate} onChange={(e) => setBdRate(Number(e.target.value))} /></div>
              <div><label className={lab}>সেল প্রাইস × <span className="font-normal text-[#a0a0a6]">(0 = বন্ধ)</span></label><input type="number" step="0.05" min="0" className={fld} value={saleRate} onChange={(e) => setSaleRate(Number(e.target.value))} /></div>
            </div>

            {/* schedule */}
            <div className="mb-4 rounded-xl border border-[#ececee] bg-[#fafafb] p-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                <input type="checkbox" className="h-[17px] w-[17px] accent-[#e63946]" checked={schOn} onChange={(e) => setSchOn(e.target.checked)} />
                🕒 সময় নির্ধারণ করুন <span className="font-normal text-[#a0a0a6]">(Scheduled rate)</span>
              </label>
              {schOn && (
                <div className="mt-4">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(['duration', 'range'] as const).map((m) => (
                      <span key={m} onClick={() => setSchMode(m)}
                        className={`cursor-pointer select-none rounded-lg border px-3.5 py-2 text-[13px] font-semibold ${schMode === m ? 'border-[#5a2b2f] bg-[#2e1518] text-[#f2969d]' : 'border-[#e6e6e8] bg-white text-[#5f5f66]'}`}>
                        {m === 'duration' ? '⏱ নির্দিষ্ট সময় পর ফিরবে' : '📅 তারিখ থেকে তারিখ'}
                      </span>
                    ))}
                  </div>
                  {schMode === 'duration' ? (
                    <>
                      <label className={lab}>এই রেট কতক্ষণ থাকবে?</label>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <input type="number" min="1" className={`${fld} max-w-[110px]`} value={schAmount} onChange={(e) => setSchAmount(e.target.value)} />
                        <select className={`${fld} max-w-[130px]`} value={schUnit} onChange={(e) => setSchUnit(e.target.value)}>
                          <option value="hour">ঘণ্টা</option><option value="day">দিন</option>
                        </select>
                        <span className="text-[13px] text-[#8a8a90]">→ এরপর <b>আগের রেটে</b> ফিরে যাবে</span>
                      </div>
                      <div className="mt-2.5 inline-block rounded-lg bg-[#fdf0f1] px-3 py-2 text-[13px] text-[#4a1417]">
                        রেট ×{rate} এখন থেকে {schAmount} {schUnit === 'day' ? 'দিন' : 'ঘণ্টা'} চালু থাকবে, তারপর আগের রেটে ফিরবে।
                      </div>
                    </>
                  ) : (
                    <div className="max-w-[420px]">
                      <label className={lab}>শেষ তারিখ</label>
                      <input type="date" className={fld} value={schEnd} onChange={(e) => setSchEnd(e.target.value)} />
                      <p className="mt-2.5 text-[13px] text-[#8a8a90]">এই তারিখ শেষ হলে <b className="text-[#e63946]">আগের রেটে</b> ফিরবে।</p>
                    </div>
                  )}
                  {schUntil && <div className="mt-2 text-[13px] font-semibold text-[#c98a1a]">⏳ চালু আছে — {new Date(schUntil).toLocaleString('en-GB')} পর্যন্ত</div>}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => save(payload)} disabled={saving} className="rounded-lg bg-[#1a1a1c] px-5 py-3 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-60">
                {saving ? 'সেভ হচ্ছে…' : '💾 রেট সেভ করুন'}
              </button>
              <span className="inline-flex items-center gap-2.5 rounded-lg bg-[#f7f7f8] px-4 py-3 text-[15px] font-medium">
                Preview — MRP 500 × {rate} = <b style={{ color: RED }}>{bdt(roundPrice(500 * rate))}</b>
              </span>
            </div>
          </div>

          {/* scope */}
          <div className={card}>
            <h2 className="mb-1 flex items-center gap-2.5 text-base font-semibold"><span style={{ color: RED }}>⛃</span> কোন বইগুলোতে কাজ করবে?</h2>
            <p className="mb-4 text-[13px] leading-relaxed text-[#8a8a90]">একাধিক criteria দেওয়া যায়। একই ধরনের একাধিক দিলে যেকোনো একটা মিললেই হবে; ভিন্ন ধরন দিলে দুটোই মিলতে হবে। কোনো criteria না দিলে <b className="text-[#5f5f66]">সব বই</b>-তে কাজ করবে।</p>
            {crit.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {crit.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f7f8] px-3 py-1 text-xs">
                    <b className="capitalize text-[#8a8a90]">{c.type}:</b> {c.label}
                    <button onClick={() => setCrit((a) => a.filter((_, idx) => idx !== i))} className="text-[#a0a0a6] hover:text-[#e63946]">✕</button>
                  </span>
                ))}
                <button onClick={() => setCrit([])} className="text-xs font-medium text-[#a0a0a6] hover:text-[#e63946]">সব মুছুন</button>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <select className={`${fld} max-w-[220px] bg-white`} value={addType} onChange={(e) => setAddType(e.target.value)}>
                <option value="category">+ Category</option>
                <option value="author">+ Author</option>
                <option value="publisher">+ Publisher</option>
                <option value="product">+ নির্দিষ্ট বই</option>
              </select>
              <TargetPicker type={addType} placeholder={`Search ${addType}...`} onPick={(id, label) => setCrit((a) => a.some((x) => x.type === addType && x.id === id) ? a : [...a, { type: addType, id, label }])} />
            </div>

            {/* exclusions — these books are left alone no matter what the filters above say */}
            <div className="mt-5 rounded-xl border border-[#f4c4c8] bg-[#fdf0f1]/50 p-4">
              <div className="text-sm font-bold text-[#8a4048]">🚫 এগুলো বাদ থাকবে (exclude)</div>
              <p className="mb-3 mt-1 text-[13px] leading-relaxed text-[#8a4048]/80">
                এখানে যা যোগ করবেন সেগুলোতে <b>কোনো কাজ হবে না</b> — উপরের ফিল্টারে পড়লেও না। যেমন "সব বই" নিয়ে কাজ করছেন, কিন্তু একটা প্রকাশনী বা কিছু বই বাদ রাখতে চান।
              </p>
              {excl.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {excl.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-[#f4c4c8]">
                      <b className="capitalize text-[#b06068]">{c.type}:</b> {c.label}
                      <button onClick={() => setExcl((a) => a.filter((_, idx) => idx !== i))} className="text-[#b06068] hover:text-[#e63946]">✕</button>
                    </span>
                  ))}
                  <button onClick={() => setExcl([])} className="text-xs font-medium text-[#b06068] hover:text-[#e63946]">সব মুছুন</button>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <select className={`${fld} max-w-[220px] bg-white`} value={exType} onChange={(e) => setExType(e.target.value)}>
                  <option value="category">🚫 Category</option>
                  <option value="author">🚫 Author</option>
                  <option value="publisher">🚫 Publisher</option>
                  <option value="product">🚫 নির্দিষ্ট বই</option>
                </select>
                <TargetPicker type={exType} placeholder={`Search ${exType} to exclude...`} onPick={(id, label) => setExcl((a) => a.some((x) => x.type === exType && x.id === id) ? a : [...a, { type: exType, id, label }])} />
              </div>
            </div>
          </div>

          {/* step 2 */}
          <div className="mb-4 rounded-2xl border border-[#f0e6c0] bg-[#fffdf5] p-6">
            <h2 className="mb-1 flex items-center gap-2.5 text-base font-semibold"><Step n={2} amber /> প্রথমবার MRP বসান <span className="text-[13px] font-normal text-[#a0854a]">(পুরনো বইয়ের জন্য)</span></h2>
            <p className="mb-4 text-[13px] leading-relaxed text-[#8a7030]">এখনকার দাম ÷ রেট করে MRP বসাবে — <b className="text-[#6a5420]">দাম বদলাবে না</b>। এরপর রেট বদলালে দাম ঠিকঠাক আপডেট হবে।</p>
            <div className="flex flex-wrap items-end gap-3">
              <div><label className={lab}>এখনকার দাম যে রেটে আছে:</label><input type="number" step="0.05" className={`${fld} max-w-[140px] bg-white`} value={assumedRate} onChange={(e) => setAssumedRate(e.target.value)} /></div>
              <button disabled={apply.isLoading} onClick={() => apply.mutate({ ...scopeArg(), mode: 'set_mrp', assumed_rate: Number(assumedRate) })}
                className="rounded-lg bg-[#c98a1a] px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60">🏷 MRP সেট করুন</button>
            </div>
          </div>

          {/* step 3 */}
          <div className="mb-4 rounded-2xl border border-[#f4c4c8] bg-[#fdf0f1] p-6">
            <h2 className="mb-1 flex items-center gap-2.5 text-base font-semibold"><Step n={3} /> দাম আপডেট করুন <span className="text-[13px] font-normal text-[#b06068]">(MRP × রেট)</span></h2>
            <p className="mb-4 text-[13px] text-[#8a4048]">যেসব বইয়ে MRP আছে সেগুলোর দাম নতুন রেট অনুযায়ী বসবে।</p>
            <button disabled={apply.isLoading} onClick={() => { save(payload); apply.mutate({ ...scopeArg(), mode: 'reprice' }); }}
              className="rounded-lg px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60" style={{ background: RED }}>
              {apply.isLoading ? 'আপডেট হচ্ছে…' : '⚡ রেট সেভ + দাম আপডেট করুন'}
            </button>
          </div>

          {/* result */}
          {result && (
            <div className={card}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className="font-bold">{result.mode === 'set_mrp' ? `✓ ${result.updated}টি বইয়ে MRP বসানো হয়েছে` : `✓ ${result.changed}টি বইয়ের দাম বদলেছে`}</h3>
                {result.mode !== 'set_mrp' && result.without_mrp > 0 && (
                  <span className="rounded-full bg-[#fffdf5] px-2.5 py-1 text-xs font-semibold text-[#c98a1a]">{result.without_mrp}টি বাদ (MRP নেই)</span>
                )}
              </div>
              {result.mode !== 'set_mrp' && allChanges.length > 0 && (
                <>
                  <input
                    value={changeQ}
                    onChange={(e) => setChangeQ(e.target.value)}
                    placeholder="🔍 বই / লেখক / প্রকাশনী দিয়ে খুঁজুন…"
                    className={`${fld} mb-3 bg-white`}
                  />
                  {cq && (
                    <p className="mb-2 text-xs text-[#8a8a90]">
                      {changes.length}টি মিলেছে (মোট {allChanges.length})
                    </p>
                  )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#ececee] text-left text-[11px] uppercase tracking-wide text-[#a0a0a6]">
                      <th className="py-2 pr-3">বই</th><th className="py-2 pr-3">লেখক / প্রকাশনী</th><th className="py-2 pr-3">MRP</th><th className="py-2 pr-3">আগে</th><th className="py-2 pr-3">এখন</th><th className="py-2">এডিট</th>
                    </tr></thead>
                    <tbody>
                      {changes.map((c) => (
                        <tr key={c.product_id} className="border-b border-[#f5f5f6]">
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              {c.image && <img src={c.image} alt="" className="h-9 w-7 rounded object-cover" />}
                              <span className="block max-w-[220px] truncate">{c.name}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-[11px] leading-tight text-[#8a8a90]">
                            {c.author || '—'}
                            {c.publisher ? <div className="text-[#a0a0a6]">{c.publisher}</div> : null}
                          </td>
                          <td className="py-2 pr-3 text-[#8a8a90]">{bdt(c.mrp)}</td>
                          <td className="py-2 pr-3 text-[#a0a0a6] line-through">{bdt(c.old_price)}</td>
                          <td className="py-2 pr-3 font-bold" style={{ color: RED }}>{bdt(c.new_price)}</td>
                          <td className="py-2"><RowPrice item={c} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.changed > allChanges.length && <p className="mt-2 text-xs text-[#a0a0a6]">প্রথম {allChanges.length}টি দেখানো হলো (মোট {result.changed})।</p>}
                </div>
                </>
              )}
              {result.mode !== 'set_mrp' && changes.length === 0 && (
                <p className="text-sm text-[#8a8a90]">কোনো দাম বদলায়নি{result.without_mrp > 0 ? ` — ${result.without_mrp}টি বইয়ে MRP নেই (Step 2 করুন)` : ''}।</p>
              )}
            </div>
          )}

          {/* membership tiers */}
          <div className={card}>
            <h2 className="mb-1 flex items-center gap-2.5 text-base font-semibold"><span style={{ color: RED }}>💳</span> মেম্বারশিপ কার্ড</h2>
            <p className="mb-4 text-[13px] leading-relaxed text-[#8a8a90]">
              প্রতিটি কাস্টমারের একটি <b className="text-[#5f5f66]">৮-ডিজিটের কার্ড নম্বর</b> আছে। মেম্বারকে tier দিলে সেই নম্বরটাই কুপন কোড হয়ে যায় — চেকআউটে নম্বরটা দিলেই tier অনুযায়ী ছাড় পাবে।
            </p>

            {/* tier rates */}
            <div className="mb-4 rounded-xl border border-[#ececee] bg-[#fafafb] p-4">
              <div className="mb-3 text-sm font-semibold">Tier রেট <span className="font-normal text-[#a0a0a6]">(সাধারণ রেট ×{rate})</span></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['silver', 'gold', 'premium'] as const).map((t) => {
                  const r = Number(tiers[t] ?? 0);
                  const pct = r > 0 && r < rate ? Math.round((1 - r / rate) * 100) : 0;
                  return (
                    <div key={t}>
                      <label className={`${lab} capitalize`}>{t} ×</label>
                      <input type="number" step="0.05" min="0" className={`${fld} bg-white`} value={tiers[t] ?? ''} placeholder="0"
                        onChange={(e) => setTiers((o: any) => ({ ...o, [t]: e.target.value }))} />
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: pct ? '#2a9d68' : '#a0a0a6' }}>
                        {pct ? `= ${pct}% ছাড়` : 'বন্ধ'}{memberInfo?.members?.[t] ? ` · ${memberInfo.members[t]} জন` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button disabled={savingTiers} onClick={() => saveTiers({ tiers })}
                className="mt-3 rounded-lg bg-[#1a1a1c] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-60">
                {savingTiers ? 'সেভ হচ্ছে…' : '💾 Tier রেট সেভ + সব কার্ড আপডেট'}
              </button>
            </div>

            {/* assign a member */}
            <div className="rounded-xl border border-[#ececee] bg-[#fafafb] p-4">
              <div className="mb-3 text-sm font-semibold">কাস্টমারকে মেম্বার করুন</div>
              <div className="relative mb-3">
                <input className={`${fld} bg-white`} value={mq} onChange={(e) => setMq(e.target.value)} placeholder="নাম / ইমেইল / ফোন / কার্ড নম্বর দিয়ে খুঁজুন…" />
                {mq.trim().length > 1 && members.length > 0 && !picked && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#e6e6e8] bg-white shadow-lg">
                    {members.map((u: any) => (
                      <button key={u.id} onClick={() => { setPicked(u); setMq(u.name); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#fdf0f1]">
                        <span className="font-medium">{u.name}</span>
                        <span className="ml-2 font-mono text-xs text-[#8a8a90]">💳 {u.membership_no}</span>
                        {u.membership_tier && <span className="ml-2 rounded bg-[#fdf0f1] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#e63946]">{u.membership_tier}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {picked && (
                <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-3">
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-semibold">{picked.name}</div>
                    <div className="font-mono text-lg tracking-[0.2em]" style={{ color: RED }}>{picked.membership_no}</div>
                    <div className="text-[11px] text-[#a0a0a6]">{picked.email}</div>
                  </div>
                  <div>
                    <label className={lab}>Tier</label>
                    <select className={`${fld} max-w-[150px] bg-white`} value={picked.membership_tier ?? ''} onChange={(e) => setPicked({ ...picked, membership_tier: e.target.value })}>
                      <option value="">— কোনো tier নেই —</option>
                      <option value="silver">Silver</option><option value="gold">Gold</option><option value="premium">Premium</option>
                    </select>
                  </div>
                  <button disabled={assign.isLoading} onClick={() => assign.mutate({ user_id: picked.id, tier: picked.membership_tier || null })}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: RED }}>সেভ করুন</button>
                  <button onClick={() => { setPicked(null); setMq(''); }} className="px-2 py-2.5 text-sm text-[#a0a0a6] hover:text-[#e63946]">✕</button>
                </div>
              )}
            </div>
          </div>

          {/* coupon rate */}
          <div className={card}>
            <h2 className="mb-1 flex items-center gap-2.5 text-base font-semibold"><span style={{ color: RED }}>🎟</span> কুপন রেট <span className="text-xs font-normal text-[#a0a0a6]">(ঐচ্ছিক)</span></h2>
            <p className="mb-4 text-[13px] leading-relaxed text-[#8a8a90]">
              কুপনের জন্য আলাদা conversion rate দিন — এটা স্বয়ংক্রিয়ভাবে <b className="text-[#5f5f66]">শতকরা ছাড়ে</b> রূপান্তর হয়ে আসল কুপন তৈরি করে।
              যেমন সাধারণ রেট ×{rate}, কুপন রেট ×{cRate || 0} = <b style={{ color: RED }}>{rate > 0 && Number(cRate) > 0 && Number(cRate) < rate ? Math.round((1 - Number(cRate) / rate) * 100) : 0}% ছাড়</b>। কাস্টমার চেকআউটে কোডটা দিলেই ছাড় পাবে।
            </p>
            <div className="rounded-xl border border-[#ececee] bg-[#fafafb] p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
                <div><label className={lab}>কুপন কোড</label><input className={`${fld} bg-white uppercase`} value={cCode} onChange={(e) => setCCode(e.target.value.toUpperCase())} placeholder="EIDBOI25" /></div>
                <div><label className={lab}>রেট ×</label><input type="number" step="0.05" className={`${fld} bg-white`} value={cRate} onChange={(e) => setCRate(e.target.value)} /></div>
                <div><label className={lab}>মেয়াদ শেষ</label><input type="date" className={`${fld} bg-white`} value={cExp} onChange={(e) => setCExp(e.target.value)} /></div>
              </div>
              <button disabled={!cCode || !cRate || coupon.isLoading} onClick={() => coupon.mutate({ code: cCode, rate: Number(cRate), expire_at: cExp || null })}
                className="rounded-lg bg-[#1a1a1c] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-125 disabled:opacity-50">
                {coupon.isLoading ? 'তৈরি হচ্ছে…' : '+ কুপন তৈরি / আপডেট করুন'}
              </button>
              {(coupon.data as any)?.percent !== undefined && (
                <div className="mt-3 rounded-lg bg-[#fdf0f1] px-3 py-2 text-[13px] text-[#4a1417]">
                  ✓ <b>{(coupon.data as any).code}</b> — {(coupon.data as any).percent}% ছাড়, মেয়াদ {new Date((coupon.data as any).expire_at).toLocaleDateString('en-GB')} পর্যন্ত।
                </div>
              )}
            </div>
          </div>

          {/* overrides */}
          <div className={card}>
            <h2 className="mb-1 flex items-center gap-2.5 text-base font-semibold"><span style={{ color: RED }}>⚙</span> রেট override <span className="text-xs font-normal text-[#a0a0a6]">(ঐচ্ছিক)</span></h2>
            <p className="mb-4 text-[13px] text-[#8a8a90]">বই সবচেয়ে নির্দিষ্ট রেট পায় (বাঁ থেকে ডানে অগ্রাধিকার):</p>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {['Product', 'Author-in-publisher', 'Author', 'Publisher', 'Category', 'Global'].map((p, i, a) => (
                <span key={p} className="flex items-center gap-1.5">
                  <span className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${i === 0 ? 'bg-[#2e1518] text-[#f2969d]' : i === a.length - 1 ? 'bg-[#f7f7f8] text-[#a0a0a6]' : 'bg-[#f7f7f8] text-[#5f5f66]'}`}>{p}</span>
                  {i < a.length - 1 && <span className="text-[#c0c0c4]">→</span>}
                </span>
              ))}
            </div>
            {overrides.length > 0 && (
              <div className="mb-4 space-y-2">
                {overrides.map((o, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#ececee] p-2.5 text-sm">
                    <span className="rounded bg-[#f7f7f8] px-2 py-0.5 text-xs font-semibold text-[#5f5f66]">{o.type}</span>
                    <span className="min-w-0 flex-1 truncate">{o.label || `#${o.id}`}</span>
                    <span className="text-xs text-[#8a8a90]">× {o.rate}{o.sale_rate ? ` · sale ×${o.sale_rate}` : ''}</span>
                    <button onClick={() => setOverrides((arr) => arr.filter((_, idx) => idx !== i))} className="text-xs text-[#a0a0a6] hover:text-[#e63946]">✕</button>
                  </div>
                ))}
                <button onClick={() => save(payload)} disabled={saving} className="rounded-lg border border-[#d8d8dc] px-4 py-1.5 text-xs font-medium text-[#5f5f66] hover:border-[#8a8a90]">override সেভ করুন</button>
              </div>
            )}
            <div className="rounded-xl border border-[#ececee] bg-[#fafafb] p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <div><label className={lab}>Scope</label>
                  <select className={`${fld} bg-white`} value={nType} onChange={(e) => { setNType(e.target.value); setNTarget({ id: 0, id2: 0, label: '' }); }}>
                    <option value="category">Category</option><option value="publisher">Publisher</option>
                    <option value="author">Author</option><option value="author_in_publisher">Author in Publisher</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div><label className={lab}>Normal ×</label><input type="number" step="0.05" className={`${fld} bg-white`} value={nRate} onChange={(e) => setNRate(Number(e.target.value))} /></div>
                <div><label className={lab}>Sale ×</label><input type="number" step="0.05" className={`${fld} bg-white`} value={nSale} onChange={(e) => setNSale(Number(e.target.value))} /></div>
              </div>
              <div className="mb-3 flex gap-2">
                {nType === 'author_in_publisher' ? (
                  <>
                    <TargetPicker type="publisher" placeholder="Search publisher..." onPick={(id2, l) => setNTarget((t) => ({ ...t, id2, label: `${l} › ${(t.label.split('› ')[1] ?? '')}` }))} />
                    <TargetPicker type="author" placeholder="Search author..." onPick={(id, l) => setNTarget((t) => ({ ...t, id, label: `${(t.label.split(' ›')[0] ?? '')} › ${l}` }))} />
                  </>
                ) : (
                  <TargetPicker type={nType} placeholder={`Search ${nType}...`} onPick={(id, l) => setNTarget({ id, id2: 0, label: l })} />
                )}
              </div>
              {(nTarget.label || nTarget.id) ? <div className="mb-3 text-xs text-[#8a8a90]">Selected: <b>{nTarget.label || `#${nTarget.id}`}</b></div> : null}
              <button onClick={addOverride} className="rounded-lg bg-[#1a1a1c] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-125">+ Add override</button>
            </div>
          </div>

          <div className="flex gap-2.5 px-1 pb-8 text-[13px] text-[#8a8a90]">
            <span className="text-[#a0a0a6]">ⓘ</span>
            <p>Re-pricing শুধু <b className="text-[#5f5f66]">MRP সেট করা</b> বইগুলোতে কাজ করে। নতুন বই স্বয়ংক্রিয়ভাবে MRP × rate থেকে দাম পায়।</p>
          </div>
        </div>
      )}
    </>
  );
}

ConversionPage.authenticate = { permissions: adminOnly };
ConversionPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
