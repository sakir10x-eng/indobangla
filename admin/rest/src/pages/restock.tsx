import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { useRestockListQuery, useRestockActionMutation } from '@/data/integrations';

const RED = '#e63946';
const bdt = (n: any) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'নতুন', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmed: { label: 'আনা হবে', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ordered: { label: 'অর্ডার হয়েছে', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  declined: { label: 'আনা যাবে না', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

/** Confirming a restock brings the book back: new price, stock, and pre-order mode
 *  (so ordering it demands the 50% advance). */
function ConfirmBox({ r, onDone }: any) {
  const { mutate, isLoading } = useRestockActionMutation();
  // Prefill from what was already confirmed, so re-opening the form is an edit, not a reset.
  const [price, setPrice] = useState(String(Math.round(r.confirmed_price ?? r.price)));
  const [qty, setQty] = useState(String(r.stock > 0 ? r.stock : 5));
  const [note, setNote] = useState(r.admin_note ?? '');
  const [eta, setEta] = useState(r.eta_days ? String(r.eta_days) : '');
  const editing = r.status !== 'requested';

  return (
    <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
      <div className="text-[12px] font-bold text-sky-800">
        {editing ? '✏️ তথ্য সম্পাদনা করুন' : '🔄 বইটি আনা যাবে — দাম ও স্টক দিন'}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">নতুন দাম</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
            className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#e63946]" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">কত কপি</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
            className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#e63946]" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">কত দিনে আসবে</label>
          <input type="number" min="1" value={eta} onChange={(e) => setEta(e.target.value)} placeholder="দিন"
            className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#e63946]" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="কাস্টমারের জন্য নোট (ঐচ্ছিক)"
          className="h-9 min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#e63946]" />
        <button
          disabled={isLoading}
          onClick={() =>
            mutate(
              {
                id: r.id,
                action: 'confirm',
                price: Number(price),
                quantity: Number(qty),
                note,
                eta_days: eta ? Number(eta) : undefined,
              },
              { onSuccess: onDone },
            )
          }
          className="h-9 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: RED }}
        >
          {editing ? 'আপডেট করুন' : 'কনফার্ম করুন'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-sky-800">
        কনফার্ম করলে বইটি স্টকে ফিরবে এবং <b>প্রি-অর্ডার মোডে</b> যাবে — কাস্টমারকে <b>৫০% অগ্রিম</b> দিয়ে অর্ডার করতে হবে।
        দাম বদলালে <b>আগের অর্ডারের দাম বদলাবে না</b>।
      </p>
    </div>
  );
}

export default function RestockPage() {
  const [tab, setTab] = useState('');
  const { items, demand, counts, loading } = useRestockListQuery(tab || undefined);
  const { mutate } = useRestockActionMutation();
  const [confirming, setConfirming] = useState<number | null>(null);

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
        <h1 className="text-xl font-bold text-slate-800">🔄 রিস্টক রিকোয়েস্ট</h1>
        <p className="mt-1 text-sm text-[#8a4048]">
          স্টক-আউট বইয়ের জন্য কাস্টমারের অনুরোধ। প্রত্যেকে <b>৩টি ফ্রি</b> রিকোয়েস্ট পায়; কনফার্ম করা ৩টি বই অর্ডার না করলে
          পরের প্রতিটি রিকোয়েস্টে <b>১০ পয়েন্ট</b> কাটা যায় (কাস্টমারকে আগেই সতর্ক করা হয়)।
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[['', 'সব'], ['requested', 'নতুন'], ['confirmed', 'আনা হবে'], ['ordered', 'অর্ডার হয়েছে'], ['declined', 'বাতিল']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ${
              tab === k ? 'bg-[#2e1518] text-[#f2969d] ring-[#5a2b2f]' : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {l}{k && (counts as any)[k] ? ` (${(counts as any)[k]})` : ''}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">কোনো রিকোয়েস্ট নেই।</p>
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
                      {(demand as any)[r.product_id] > 1 && (
                        <span className="rounded-full bg-[#fdf0f1] px-2 py-0.5 text-[11px] font-bold text-[#e63946]">
                          🔥 {(demand as any)[r.product_id]} জন চাইছে
                        </span>
                      )}
                      {r.points > 0 && (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                          {r.points} পয়েন্ট কাটা হয়েছে
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-medium text-slate-800">{r.product}</div>
                    <div className="text-[12px] text-slate-500">
                      {r.customer} · {r.contact} · এখনকার দাম {bdt(r.price)} · স্টক {r.stock}
                    </div>
                    {r.expected_date && (
                      <div className="mt-0.5 text-[12px] font-semibold text-[#1f7a52]">
                        📅 আনুমানিক আসবে {r.expected_date} ({r.eta_days} দিন)
                      </div>
                    )}
                    {r.customer_note && (
                      <div className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[12px] text-slate-600">
                        💬 কাস্টমার: {r.customer_note}
                      </div>
                    )}
                  </div>

                  {/* Always editable — the admin can revisit price, stock, ETA or the note
                      at any point, not just while the request is still brand new. */}
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setConfirming(confirming === r.id ? null : r.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: RED }}>
                      {r.status === 'requested' ? 'আনা যাবে' : '✏️ এডিট'}
                    </button>
                    {r.status !== 'declined' && (
                      <button onClick={() => mutate({ id: r.id, action: 'decline' })}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">
                        আনা যাবে না
                      </button>
                    )}
                  </div>
                </div>
                {confirming === r.id && <ConfirmBox r={r} onDone={() => setConfirming(null)} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

RestockPage.authenticate = { permissions: adminOnly };
RestockPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: { ...(await serverSideTranslations(locale, ['form', 'common', 'table'])) },
});
