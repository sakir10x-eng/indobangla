import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import Link from '@/components/ui/link';
import { useTicketsQuery, useTicketReplyMutation, useTicketStatusMutation } from '@/data/integrations';

const RED = '#e63946';
const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'অপেক্ষমাণ', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  answered: { label: 'উত্তর দেওয়া হয়েছে', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  closed: { label: 'বন্ধ', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

function Thread({ t }: any) {
  const { mutate: reply, isLoading } = useTicketReplyMutation();
  const { mutate: setStatus } = useTicketStatusMutation();
  const [msg, setMsg] = useState('');

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {t.messages.map((m: any, i: number) => (
          <div key={i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] ${
                m.sender === 'admin' ? 'bg-[#e63946] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
              }`}
            >
              {m.message}
              <div className={`mt-0.5 text-[10px] ${m.sender === 'admin' ? 'text-white/70' : 'text-slate-400'}`}>
                {m.sender === 'admin' ? 'আপনি' : t.customer} · {new Date(m.at).toLocaleString('en-GB')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {t.status !== 'closed' && (
        <div className="mt-3 flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="উত্তর লিখুন…"
            className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#e63946]"
          />
          <button
            disabled={isLoading || !msg.trim()}
            onClick={() => reply({ ticket_id: t.id, message: msg }, { onSuccess: () => setMsg('') })}
            className="rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: RED }}
          >পাঠান</button>
          <button
            onClick={() => setStatus({ ticket_id: t.id, status: 'closed' })}
            className="rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:border-slate-400"
          >বন্ধ করুন</button>
        </div>
      )}
      {t.status === 'closed' && (
        <button
          onClick={() => setStatus({ ticket_id: t.id, status: 'open' })}
          className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-[#e63946] hover:text-[#e63946]"
        >আবার খুলুন</button>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const [tab, setTab] = useState('');
  const { tickets, counts, loading } = useTicketsQuery(tab || undefined);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
        <h1 className="text-xl font-bold text-slate-800">🎫 সাপোর্ট টিকেট</h1>
        <p className="mt-1 text-sm text-[#8a4048]">কাস্টমারের যেকোনো সমস্যা — এখান থেকেই উত্তর দিন।</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[['', 'সব'], ['open', 'অপেক্ষমাণ'], ['answered', 'উত্তর দেওয়া'], ['closed', 'বন্ধ']].map(([k, l]) => (
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
        ) : tickets.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">কোনো টিকেট নেই।</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t: any) => (
              <div key={t.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS[t.status]?.cls}`}>
                    {STATUS[t.status]?.label ?? t.status}
                  </span>
                  <span className="font-semibold text-slate-800">{t.subject}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t.category}</span>
                  {t.order && (
                    <Link href={`/orders`} className="font-mono text-[11px] font-bold text-[#e63946] hover:underline">#{t.order}</Link>
                  )}
                  <span className="ml-auto text-[12px] text-slate-500">{t.customer} · {t.contact}</span>
                  <button
                    onClick={() => setOpen(open === t.id ? null : t.id)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-[#e63946] hover:text-[#e63946]"
                  >
                    {open === t.id ? 'বন্ধ ▲' : `কথোপকথন (${t.messages.length}) ▼`}
                  </button>
                </div>
                {open === t.id && <Thread t={t} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

TicketsPage.authenticate = { permissions: adminOnly };
TicketsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: { ...(await serverSideTranslations(locale, ['form', 'common', 'table'])) },
});
