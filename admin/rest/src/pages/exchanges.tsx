import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import Link from '@/components/ui/link';
import { useExchangeListQuery, useExchangeActionMutation } from '@/data/integrations';

const RED = '#e63946';

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'নতুন রিকোয়েস্ট', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  approved: { label: 'অনুমোদিত', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  received: { label: 'বই ফেরত এসেছে', cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  completed: { label: 'সম্পন্ন', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'বাতিল', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

const REASONS: Record<string, string> = {
  damaged: 'ছেঁড়া/ক্ষতিগ্রস্ত',
  wrong_book: 'ভুল বই এসেছে',
  missing_pages: 'পাতা নেই',
  other: 'অন্যান্য',
};

/** The "book came back" step is where stock actually moves — so it asks the one question
 *  that matters: is the returned copy still sellable? */
function ReceiveBox({ r, onDone }: any) {
  const { mutate, isLoading } = useExchangeActionMutation();
  const [restock, setRestock] = useState(false);
  const [note, setNote] = useState('');
  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
      <div className="text-[12px] font-bold text-violet-800">📦 বই ফেরত এসেছে — স্টকের সিদ্ধান্ত</div>
      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12px] text-slate-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#e63946]" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
        <span>
          ফেরত আসা কপিটি <b>বিক্রয়যোগ্য</b> — স্টকে ফেরত যাবে।
          <span className="block text-[11px] text-slate-500">টিক না দিলে স্টকে যোগ হবে না (ক্ষতিগ্রস্ত বই আবার বিক্রি হবে না)।</span>
        </span>
      </label>
      {r.type === 'exchange' && (
        <p className="mt-1.5 text-[11px] font-semibold text-violet-700">
          ↔ এক্সচেঞ্জ: বদলি {r.quantity} কপি স্টক থেকে বাদ যাবে (এখন স্টক {r.stock})।
        </p>
      )}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="নোট (ঐচ্ছিক)"
        className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#e63946]"
      />
      <button
        disabled={isLoading}
        onClick={() => mutate({ id: r.id, action: 'received', restock, admin_note: note }, { onSuccess: onDone })}
        className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        style={{ background: RED }}
      >
        স্টক আপডেট করে "ফেরত এসেছে" করুন
      </button>
    </div>
  );
}

export default function ExchangesPage() {
  const [tab, setTab] = useState<string>('');
  const { items, counts, loading } = useExchangeListQuery(tab || undefined);
  const { mutate } = useExchangeActionMutation();
  const [receiving, setReceiving] = useState<number | null>(null);

  const tabs = [
    ['', 'সব'],
    ['requested', 'নতুন'],
    ['approved', 'অনুমোদিত'],
    ['received', 'ফেরত এসেছে'],
    ['completed', 'সম্পন্ন'],
    ['rejected', 'বাতিল'],
  ];

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
        <h1 className="text-xl font-bold text-slate-800">↔ এক্সচেঞ্জ ও রিটার্ন</h1>
        <p className="mt-1 text-sm text-[#8a4048]">
          ডেলিভারির <b>৩ দিনের</b> মধ্যে সমস্যা জানাতে হবে, আর পুরো এক্সচেঞ্জ <b>৭ দিনের</b> মধ্যে শেষ হবে। ৩ দিনে কিছু না জানালে উইন্ডো নিজে থেকে বন্ধ হয়ে যায়।
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ${
              tab === k ? 'bg-[#2e1518] text-[#f2969d] ring-[#5a2b2f]' : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {label}
            {k && (counts as any)[k] ? <span className="ml-1.5 text-[11px]">({(counts as any)[k]})</span> : null}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">কোনো এক্সচেঞ্জ রিকোয়েস্ট নেই।</p>
        ) : (
          <div className="space-y-3">
            {items.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  {r.image && <img src={r.image} alt="" className="h-14 w-11 shrink-0 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS[r.status]?.cls}`}>
                        {STATUS[r.status]?.label ?? r.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {r.type === 'return' ? '↩ রিটার্ন' : '↔ এক্সচেঞ্জ'} · {r.quantity} কপি
                      </span>
                      <Link href={`/orders/${r.order_id}`} className="font-mono text-[12px] font-bold text-[#e63946] hover:underline">
                        #{r.tracking}
                      </Link>
                    </div>
                    <div className="mt-1 font-medium text-slate-800">{r.product}</div>
                    <div className="text-[12px] text-slate-500">
                      {r.customer} · {r.contact} · কারণ: <b>{REASONS[r.reason] ?? r.reason}</b>
                    </div>
                    {r.note && <div className="mt-1 rounded bg-slate-50 p-2 text-[12px] text-slate-600">“{r.note}”</div>}
                    {r.admin_note && <div className="mt-1 text-[11px] text-slate-400">অ্যাডমিন নোট: {r.admin_note}</div>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'requested' && (
                      <>
                        <button onClick={() => mutate({ id: r.id, action: 'approve' })}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: RED }}>অনুমোদন</button>
                        <button onClick={() => mutate({ id: r.id, action: 'reject' })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">বাতিল</button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => setReceiving(receiving === r.id ? null : r.id)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                        📦 বই ফেরত এসেছে
                      </button>
                    )}
                    {r.status === 'received' && (
                      <button onClick={() => mutate({ id: r.id, action: 'complete' })}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        ✓ সম্পন্ন
                      </button>
                    )}
                  </div>
                </div>

                {receiving === r.id && r.status === 'approved' && (
                  <ReceiveBox r={r} onDone={() => setReceiving(null)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

ExchangesPage.authenticate = { permissions: adminOnly };
ExchangesPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
