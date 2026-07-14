import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { HttpClient } from '@/data/client/http-client';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { useModalAction } from '@/components/ui/modal/modal.context';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';

dayjs.extend(relativeTime);

/**
 * #8 — Coupon analytics dashboard in the uploaded bilingual design. Pulls REAL
 * per-coupon redemption/sales figures from the `coupon-analytics` endpoint and
 * computes profit / ROI / performance tier client-side against an adjustable
 * average book-margin. Keeps admin edit & delete actions.
 */

type Raw = {
  id: number;
  code: string;
  type: string;
  amount: number;
  active: boolean;
  expire_at: string | null;
  uses: number;
  sales: number;
  discount_given: number;
};

type Lang = 'en' | 'bn';
type Tier = 'good' | 'mid' | 'bad';
type Filter = 'all' | Tier;

const useCouponAnalyticsQuery = () =>
  useQuery<{ coupons: Raw[] }, Error>([API_ENDPOINTS.COUPON_ANALYTICS], () =>
    HttpClient.get<{ coupons: Raw[] }>(API_ENDPOINTS.COUPON_ANALYTICS),
  );

const T = {
  title: { en: 'Coupon', bn: 'কুপন' },
  titleEm: { en: 'Analytics', bn: 'অ্যানালিটিক্স' },
  newCoupon: { en: 'New Coupon', bn: 'নতুন কুপন' },
  revenue: { en: 'Revenue from Coupons', bn: 'কুপন থেকে আয়' },
  redemptions: { en: 'Total Redemptions', bn: 'মোট ব্যবহার' },
  discountGiven: { en: 'Discount Given (Cost)', bn: 'প্রদত্ত ছাড় (খরচ)' },
  roi: { en: 'Net ROI', bn: 'নিট ROI' },
  salesTitle: { en: 'Sales Generated per Coupon', bn: 'কুপন-ভিত্তিক বিক্রি' },
  salesSub: { en: 'Revenue driven by each code', bn: 'প্রতিটি কোড থেকে আসা আয়' },
  performing: { en: 'Performing', bn: 'ভালো চলছে' },
  average: { en: 'Average', bn: 'মাঝারি' },
  loss: { en: 'Loss / Weak', bn: 'লস / দুর্বল' },
  allCoupons: { en: 'All Coupons', bn: 'সব কুপন' },
  all: { en: 'All', bn: 'সব' },
  status_active: { en: 'Active', bn: 'চালু' },
  status_expired: { en: 'Expired', bn: 'মেয়াদ শেষ' },
  m_sales: { en: 'Sales Generated', bn: 'বিক্রি হয়েছে' },
  m_uses: { en: 'Redemptions', bn: 'ব্যবহার' },
  m_profit: { en: 'Net Profit', bn: 'নিট লাভ' },
  m_result: { en: 'Net Result', bn: 'নিট ফলাফল' },
  m_expires: { en: 'Expires', bn: 'মেয়াদ শেষ' },
  m_expired: { en: 'Expired', bn: 'মেয়াদ শেষ হয়েছে' },
  share: { en: 'Revenue share', bn: 'আয়ের অংশ' },
  uses_word: { en: 'uses', bn: 'বার' },
  badge_top: { en: 'Top Performer', bn: 'সেরা পারফর্মার' },
  badge_good: { en: 'Performing', bn: 'ভালো চলছে' },
  badge_mid: { en: 'Average', bn: 'মাঝারি' },
  badge_loss: { en: 'Loss Maker', bn: 'লস মেকার' },
  badge_weak: { en: 'Weak Reach', bn: 'দুর্বল রিচ' },
  advice_top: { en: 'scale this up', bn: 'আরও বাড়ান' },
  advice_good: { en: 'solid, keep running', bn: 'ভালো, চালু রাখুন' },
  advice_mid: { en: 'watch the margin', bn: 'মার্জিনে নজর রাখুন' },
  advice_loss: { en: "discount ate the margin · don't relaunch", bn: 'ছাড় মার্জিন খেয়ে ফেলেছে · আর চালু করবেন না' },
  advice_weak: { en: 'barely used · retire this code', bn: 'খুব কম ব্যবহার · কোডটি বাদ দিন' },
  marginNote: { en: 'Auto profit/loss based on avg book margin of', bn: 'স্বয়ংক্রিয় লাভ/লস হিসাব — বইয়ের গড় মার্জিন' },
  marginTail: { en: '· A coupon is 🔴 Loss when discount given exceeds the margin it earned.', bn: '· যে কুপনে দেওয়া ছাড় অর্জিত মার্জিনের চেয়ে বেশি, সেটি 🔴 লস।' },
  noData: { en: 'No coupons yet.', bn: 'এখনও কোনো কুপন নেই।' },
};

const CouponAnalytics = () => {
  const router = useRouter();
  const { openModal } = useModalAction();
  const [lang, setLang] = useState<Lang>('en');
  const [margin, setMargin] = useState(40);
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, error } = useCouponAnalyticsQuery();

  const bn = (n: number | string) =>
    lang === 'bn'
      ? String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d])
      : String(n);
  const money = (n: number) => '৳' + bn(Math.round(n).toLocaleString('en-US'));

  const rows = useMemo(() => {
    const coupons = data?.coupons ?? [];
    const maxSales = Math.max(1, ...coupons.map((c) => c.sales));
    const totalSales = coupons.reduce((a, c) => a + c.sales, 0) || 1;
    const m = margin / 100;
    return coupons.map((c) => {
      const earnedMargin = c.sales * m;
      // Prefer the real discount captured on orders; fall back to amount×uses.
      const discountCost = c.discount_given > 0 ? c.discount_given : c.amount * c.uses;
      const netProfit = earnedMargin - discountCost;
      const roi = discountCost > 0 ? (netProfit / discountCost) * 100 : 0;
      const share = (c.sales / totalSales) * 100;
      const heightPct = Math.round((c.sales / maxSales) * 95);

      let tier: Tier;
      let badge: 'top' | 'good' | 'mid' | 'loss' | 'weak';
      let advice: 'top' | 'good' | 'mid' | 'loss' | 'weak';
      if (netProfit < 0) {
        tier = 'bad';
        badge = 'loss';
        advice = 'loss';
      } else if (c.uses < 12) {
        tier = 'bad';
        badge = 'weak';
        advice = 'weak';
      } else if (share >= 25) {
        tier = 'good';
        badge = c.sales === maxSales ? 'top' : 'good';
        advice = c.sales === maxSales ? 'top' : 'good';
      } else if (share >= 15) {
        tier = 'mid';
        badge = 'mid';
        advice = 'mid';
      } else {
        tier = 'bad';
        badge = 'weak';
        advice = 'weak';
      }
      return { ...c, earnedMargin, discountCost, netProfit, roi, share, heightPct, tier, badge, advice };
    });
  }, [data, margin]);

  const totals = useMemo(() => {
    const sales = rows.reduce((a, c) => a + c.sales, 0);
    const uses = rows.reduce((a, c) => a + c.uses, 0);
    const disc = rows.reduce((a, c) => a + c.discountCost, 0);
    const profit = rows.reduce((a, c) => a + c.netProfit, 0);
    return { sales, uses, disc, roi: disc > 0 ? Math.round((profit / disc) * 100) : 0 };
  }, [rows]);

  const shown = filter === 'all' ? rows : rows.filter((r) => r.tier === filter);

  if (isLoading) return <Loader text="Loading…" />;
  if (error) return <ErrorMessage message={error.message} />;

  const L = (k: keyof typeof T) => T[k][lang];

  const stats = [
    { cls: 'text-[var(--spine)]', label: L('revenue'), val: money(totals.sales) },
    { cls: 'text-[var(--gold)]', label: L('redemptions'), val: `${bn(totals.uses)} ${L('uses_word')}` },
    { cls: 'text-[var(--red)]', label: L('discountGiven'), val: money(totals.disc) },
    { cls: 'text-[var(--spine)]', label: L('roi'), val: `${totals.roi >= 0 ? '+' : ''}${bn(totals.roi)}%` },
  ];

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: L('all') },
    { key: 'good', label: `🟢 ${L('performing')}` },
    { key: 'mid', label: `🟡 ${L('average')}` },
    { key: 'bad', label: `🔴 ${L('loss')}` },
  ];

  const badgeLabel = (b: string) =>
    b === 'top' ? L('badge_top') : b === 'good' ? L('badge_good') : b === 'mid' ? L('badge_mid') : b === 'loss' ? L('badge_loss') : L('badge_weak');
  const adviceLabel = (a: string) =>
    a === 'top' ? L('advice_top') : a === 'good' ? L('advice_good') : a === 'mid' ? L('advice_mid') : a === 'loss' ? L('advice_loss') : L('advice_weak');

  const tierBg: Record<Tier, string> = {
    good: 'bg-[var(--spine)]',
    mid: 'bg-[var(--gold)]',
    bad: 'bg-[var(--red)]',
  };

  return (
    <div className="ib-coupon mx-auto max-w-[1180px]">
      <style jsx global>{`
        .ib-coupon {
          --ink: #1c1a17;
          --ink-soft: #5c564d;
          --paper: #f7f4ee;
          --card: #fffdf9;
          --line: #e6e0d4;
          --gold: #c8892e;
          --gold-soft: #f3e6cc;
          --spine: #2f6b52;
          --spine-soft: #e4efe8;
          --red: #b04a3a;
          --red-soft: #f7e3df;
          --radius: 16px;
          color: var(--ink);
        }
      `}</style>

      {/* header */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
            IndoBangla Book Shop
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            {L('title')} <em className="not-italic text-[var(--spine)]">{L('titleEm')}</em>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--card)] p-1">
            {(['en', 'bn'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                  lang === l ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]'
                }`}
              >
                {l === 'en' ? 'EN' : 'বাংলা'}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push('/coupons/create')}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--spine)] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(47,107,82,.25)] transition hover:bg-[#255843]"
          >
            + {L('newCoupon')}
          </button>
        </div>
      </header>

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-5">
            <div className="text-xs font-medium text-[var(--ink-soft)]">{s.label}</div>
            <div className={`mt-1.5 text-3xl font-semibold ${s.cls}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* chart */}
      <div className="mb-7 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{L('salesTitle')}</h2>
            <p className="text-[13px] text-[var(--ink-soft)]">{L('salesSub')}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--spine)]" />{L('performing')}</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--gold)]" />{L('average')}</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--red)] opacity-60" />{L('loss')}</span>
          </div>
        </div>
        <div className="flex h-[220px] items-end gap-4 border-b-2 border-[var(--line)] pt-2.5">
          {rows.length === 0 ? (
            <div className="w-full text-center text-sm text-[var(--ink-soft)]">{L('noData')}</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-full w-full max-w-[56px] flex-col justify-end">
                  <div
                    className={`group relative w-full rounded-t-md ${tierBg[r.tier]} ${r.tier === 'bad' ? 'opacity-60' : ''}`}
                    style={{ height: `${Math.max(2, r.heightPct)}%` }}
                    title={`${money(r.sales)} · ${bn(r.uses)} ${L('uses_word')}`}
                  />
                </div>
                <div className="font-mono text-[11px] font-bold text-[var(--ink)]">
                  {r.code.length > 9 ? r.code.slice(0, 8) + '…' : r.code}
                </div>
                <div className="-mt-1 text-[11px] text-[var(--ink-soft)]">{money(r.sales)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* toolbar */}
      <div className="mb-4.5 flex flex-wrap items-center justify-between gap-4">
        <div className="text-2xl font-semibold">{L('allCoupons')}</div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                filter === c.key
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                  : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* coupon list */}
      <div className="flex flex-col gap-3.5">
        {shown.map((r) => {
          const borderCls = r.tier === 'good' ? 'before:bg-[var(--spine)]' : r.tier === 'mid' ? 'before:bg-[var(--gold)]' : 'before:bg-[var(--red)]';
          const profitPos = r.netProfit >= 0;
          return (
            <div
              key={r.id}
              className={`relative grid grid-cols-1 items-center gap-5 overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-5 before:absolute before:left-0 before:top-0 before:h-full before:w-[5px] before:content-[''] lg:grid-cols-[auto_1fr_auto_auto] ${borderCls} ${r.active ? '' : 'opacity-90'}`}
            >
              {/* ticket */}
              <div className={`flex min-w-[128px] flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed px-4 py-3.5 ${r.active ? 'border-[var(--gold)] bg-[var(--gold-soft)]' : 'border-[#cdc6b8] bg-[#f0ede6]'}`}>
                <div className={`text-[26px] font-bold leading-none ${r.active ? 'text-[var(--gold)]' : 'text-[var(--ink-soft)]'}`}>
                  <span className="text-sm">{r.type === 'percentage' ? '' : '৳'}</span>
                  {bn(r.amount)}
                  {r.type === 'percentage' ? <span className="text-sm">%</span> : null}
                </div>
                <div className="mt-2 rounded-md border border-[var(--line)] bg-[var(--card)] px-2.5 py-0.5 font-mono text-[13px] font-bold text-[var(--ink)]">
                  {r.code}
                </div>
              </div>

              {/* info */}
              <div className="min-w-0">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-soft)]">#{bn(r.id)}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${r.active ? 'bg-[var(--spine-soft)] text-[var(--spine)]' : 'bg-[var(--red-soft)] text-[var(--red)]'}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {r.active ? L('status_active') : L('status_expired')}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white ${tierBg[r.tier]}`}>
                    {badgeLabel(r.badge)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-6">
                  <Meta label={L('m_sales')} value={money(r.sales)} valueCls={profitPos ? 'text-[var(--spine)]' : ''} />
                  <Meta label={L('m_uses')} value={`${bn(r.uses)} ${L('uses_word')}`} />
                  <Meta
                    label={profitPos ? L('m_profit') : L('m_result')}
                    value={`${profitPos ? '+' : '−'}${money(Math.abs(r.netProfit))}`}
                    valueCls={profitPos ? 'text-[var(--spine)]' : 'text-[var(--red)]'}
                  />
                  <Meta
                    label={r.active ? L('m_expires') : L('m_expired')}
                    value={r.expire_at ? dayjs(r.expire_at).fromNow() : '—'}
                  />
                </div>
              </div>

              {/* revenue track */}
              <div className="min-w-[170px]">
                <div className="mb-1.5 flex justify-between text-xs text-[var(--ink-soft)]">
                  <span>{L('share')}</span>
                  <b className="text-[var(--ink)]">{bn(Math.round(r.share))}%</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--gold-soft)]">
                  <div className={`h-full rounded-full ${tierBg[r.tier]} ${r.tier === 'bad' ? 'opacity-60' : ''}`} style={{ width: `${Math.max(6, Math.round(r.share * 2.8))}%` }} />
                </div>
                <div className={`mt-1.5 text-[11px] font-semibold ${profitPos ? 'text-[var(--spine)]' : 'text-[var(--red)]'}`}>
                  {profitPos ? '▲' : '▼'} ROI {profitPos ? '+' : ''}{bn(Math.round(r.roi))}% · {adviceLabel(r.advice)}
                </div>
              </div>

              {/* actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/coupons/${r.code}/edit`)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] transition hover:border-[var(--gold)] hover:text-[var(--ink)]"
                  aria-label="edit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button
                  onClick={() => openModal('DELETE_COUPON', String(r.id))}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] transition hover:border-[var(--red)] hover:bg-[var(--red-soft)] hover:text-[var(--red)]"
                  aria-label="delete"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* margin assumption */}
      <div className="mt-5 rounded-xl border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-3 text-center text-xs text-[var(--ink-soft)]">
        {L('marginNote')}{' '}
        <input
          type="number"
          min={1}
          max={99}
          value={margin}
          onChange={(e) => setMargin(Math.min(99, Math.max(1, +e.target.value || 1)))}
          className="w-14 rounded-md border border-[var(--line)] bg-[var(--paper)] px-1 py-0.5 text-center font-mono text-xs font-bold text-[var(--ink)]"
        />
        % <span className="text-[var(--gold)]">{L('marginTail')}</span>
      </div>
    </div>
  );
};

function Meta({ label, value, valueCls = '' }: { label: string; value: string; valueCls?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold text-[var(--ink)] ${valueCls}`}>{value}</div>
    </div>
  );
}

export default CouponAnalytics;
