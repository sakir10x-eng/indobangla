import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import Link from '@/components/ui/link';
import {
  usePreorderSummaryQuery,
  usePreorderProductsQuery,
  usePreorderUpdateMutation,
  usePayLinkSettingsQuery,
  useUpdatePayLinkSettingsMutation,
} from '@/data/integrations';

const bdt = (n: any) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const RED = '#e63946';
const fld = 'h-10 w-full rounded-lg border border-[#d8d8dc] px-3 text-sm outline-none focus:border-[#e63946]';

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'চালু', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  full: { label: 'কোটা পূর্ণ', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  closed: { label: 'সময় শেষ', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

/** Inline editor for one book's pre-order window / cap / advance. */
function EditRow({ p, onDone }: { p: any; onDone: () => void }) {
  const { mutate, isLoading } = usePreorderUpdateMutation();
  const [until, setUntil] = useState(p.until ? String(p.until).slice(0, 10) : '');
  const [limit, setLimit] = useState(p.limit ?? '');
  const [pct, setPct] = useState(p.advance_pct ?? 50);
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-500">কত তারিখ পর্যন্ত</label>
        <input type="date" className={`${fld} bg-white`} value={until} onChange={(e) => setUntil(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-500">কপি সীমা <span className="font-normal text-slate-400">(খালি = সীমাহীন)</span></label>
        <input type="number" min="0" placeholder="সীমাহীন" className={`${fld} w-32 bg-white`} value={limit} onChange={(e) => setLimit(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-500">অগ্রিম %</label>
        <input type="number" min="1" max="100" className={`${fld} w-24 bg-white`} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
      </div>
      <button
        disabled={isLoading}
        onClick={() => { mutate({ product_id: p.product_id, is_preorder: true, until: until || null, limit: limit === '' ? null : Number(limit), advance_pct: pct }); onDone(); }}
        className="h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: RED }}
      >সেভ</button>
      <button
        disabled={isLoading}
        onClick={() => { mutate({ product_id: p.product_id, is_preorder: false }); onDone(); }}
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600"
      >প্রি-অর্ডার বন্ধ</button>
      <button onClick={onDone} className="h-10 px-2 text-sm text-slate-400 hover:text-slate-600">✕</button>
    </div>
  );
}

export default function PreorderPage() {
  const { counts, overdue, windowDays, loading } = usePreorderSummaryQuery();
  const { products, loading: pLoading } = usePreorderProductsQuery();
  const [editing, setEditing] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const { hours } = usePayLinkSettingsQuery();
  const { mutate: saveHours, isLoading: savingHours } = useUpdatePayLinkSettingsMutation();
  const [h, setH] = useState<string>('');
  const hoursVal = h === '' ? String(hours) : h;

  const shown = q.trim()
    ? products.filter((p: any) =>
        [p.name, p.author, p.publisher].some((f: any) => String(f ?? '').toLowerCase().includes(q.trim().toLowerCase())),
      )
    : products;

  const tiles = [
    { k: 'pending_advance', label: 'অগ্রিমের অপেক্ষায়', emoji: '⏳', tone: 'text-amber-700' },
    { k: 'processing', label: 'প্রসেস হচ্ছে', emoji: '📦', tone: 'text-sky-700' },
    { k: 'delivered', label: 'ডেলিভারি হয়েছে', emoji: '✅', tone: 'text-emerald-700' },
    { k: 'overdue', label: `সময় পার (${windowDays}+ দিন)`, emoji: '🚨', tone: 'text-rose-600' },
  ];

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
        <h1 className="text-xl font-bold text-slate-800">📖 প্রি-অর্ডার</h1>
        <p className="mt-1 text-sm text-[#8a4048]">
          অগ্রিম পেমেন্ট কনফার্ম হওয়ার দিন থেকে গণনা শুরু, ডেলিভারি হলে বন্ধ। <b>{windowDays} দিন</b> পেরোলে সেটা "সময় পার" হিসেবে দেখাবে।
        </p>
      </div>

      {/* #1 — how long a payment link stays alive */}
      <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-sm font-bold text-slate-700">⏱️ পেমেন্ট লিংকের মেয়াদ</div>
            <p className="mt-1 text-[13px] text-slate-500">
              অনলাইন পেমেন্ট লিংক কত ঘণ্টা কাজ করবে। মেয়াদ শেষ হলে ওই লিংকে আর টাকা দেওয়া যাবে না — নতুন লিংক তৈরি করতে হবে।
            </p>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">ঘণ্টা</label>
              <input
                type="number"
                min="1"
                max="720"
                className={`${fld} w-24`}
                value={hoursVal}
                onChange={(e) => setH(e.target.value)}
              />
            </div>
            <button
              disabled={savingHours}
              onClick={() => saveHours({ hours: Number(hoursVal) || 6 })}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: RED }}
            >সেভ</button>
          </div>
        </div>
      </div>

      {/* #5 — order summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.emoji} {t.label}</div>
            <div className={`mt-1 text-3xl font-bold ${t.tone}`}>{loading ? '…' : (counts as any)[t.k]}</div>
          </div>
        ))}
      </div>

      {/* #6 — the ones that blew the window */}
      {overdue.length > 0 && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="mb-2 text-sm font-bold text-rose-700">🚨 {overdue.length}টি প্রি-অর্ডার {windowDays} দিন পার করেছে</div>
          <div className="space-y-1.5">
            {overdue.map((o: any) => (
              <div key={o.order_id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <Link href={`/orders/${o.order_id}`} className="font-mono font-bold text-rose-700 hover:underline">#{o.tracking_number}</Link>
                <span className="text-slate-600">{o.customer_name}</span>
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">{o.days} দিন</span>
                <span className="ml-auto text-slate-500">পেইড {bdt(o.paid)} / {bdt(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* #19 — which books are on pre-order */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-slate-700">প্রি-অর্ডারে থাকা বই ({products.length})</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 বই / লেখক / প্রকাশনী"
            className={`${fld} ml-auto max-w-[280px]`}
          />
        </div>

        {pLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            কোনো বই প্রি-অর্ডারে নেই। প্রোডাক্ট এডিট পেজ থেকে "প্রি-অর্ডার" চালু করুন।
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">বই</th>
                  <th className="py-2 pr-3">দাম</th>
                  <th className="py-2 pr-3">অগ্রিম</th>
                  <th className="py-2 pr-3">অর্ডার / সীমা</th>
                  <th className="py-2 pr-3">শেষ তারিখ</th>
                  <th className="py-2 pr-3">অবস্থা</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p: any) => (
                  <>
                    <tr key={p.product_id} className="border-b border-slate-50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          {p.image && <img src={p.image} alt="" className="h-10 w-8 rounded object-cover" />}
                          <div className="min-w-0">
                            <div className="max-w-[220px] truncate font-medium text-slate-700">{p.name}</div>
                            <div className="truncate text-[11px] text-slate-400">{p.author || '—'}{p.publisher ? ` · ${p.publisher}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-semibold">{bdt(p.price)}</td>
                      <td className="py-2 pr-3">{p.advance_pct}%</td>
                      <td className="py-2 pr-3">
                        <b>{p.count}</b>
                        <span className="text-slate-400"> / {p.limit ?? '∞'}</span>
                        {p.remaining !== null && p.remaining <= 5 && p.remaining > 0 && (
                          <div className="text-[11px] font-semibold text-amber-600">আর {p.remaining}টি বাকি</div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{p.until ? String(p.until).slice(0, 10) : '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS[p.status].cls}`}>
                          {STATUS[p.status].label}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => setEditing(editing === p.product_id ? null : p.product_id)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-[#e63946] hover:text-[#e63946]"
                        >এডিট</button>
                      </td>
                    </tr>
                    {editing === p.product_id && (
                      <tr key={`${p.product_id}-edit`}>
                        <td colSpan={7} className="pb-3">
                          <EditRow p={p} onDone={() => setEditing(null)} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

PreorderPage.authenticate = { permissions: adminOnly };
PreorderPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
