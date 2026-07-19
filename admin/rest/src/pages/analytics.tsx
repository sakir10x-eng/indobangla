import Layout from '@/components/layouts/admin';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import PageHeading from '@/components/common/page-heading';
import Loader from '@/components/ui/loader/loader';

const num = (n: any) => (Number(n) || 0).toLocaleString('en-IN');

const EVENT_ICON: Record<string, string> = {
  page_view: '📄',
  product_view: '📖',
  add_to_cart: '🛒',
  checkout_start: '💳',
  order_placed: '✅',
};

const shortPath = (p?: string | null) => {
  if (!p) return '/';
  const s = p.split('?')[0];
  return s.length > 34 ? s.slice(0, 33) + '…' : s;
};

const ago = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v.replace(' ', 'T'));
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery(
    ['analytics-summary', days],
    () => HttpClient.get<any>('analytics-summary', { days }),
    { keepPreviousData: true, refetchInterval: 60000 },
  );

  const k = data?.kpis ?? {};
  const f = data?.funnel ?? {};
  const sessions: any[] = data?.sessions ?? [];
  const topPages: any[] = data?.top_pages ?? [];
  const blocks: any[] = data?.login_blocked ?? [];

  const pv = Number(f.page_views) || 0;
  const pct = (n: number) => (pv > 0 ? Math.round((n / pv) * 100) : 0);

  const KPIS: [string, any, string][] = [
    ['👥 ভিজিটর', k.visitors, 'text-emerald-700'],
    ['📄 পেজ ভিউ', k.page_views, 'text-sky-700'],
    ['📖 প্রোডাক্ট ভিউ', k.product_views, 'text-indigo-700'],
    ['🛒 কার্টে যোগ', k.cart_adds, 'text-amber-700'],
    ['🚫 লগইন ব্লক', k.login_blocked, 'text-rose-700'],
  ];

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageHeading title="📊 স্টোর অ্যানালিটিক্স" />
        <div className="flex gap-1.5">
          {[
            [1, 'আজ'],
            [7, '৭ দিন'],
            [30, '৩০ দিন'],
          ].map(([d, label]: any) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ring-1 transition ${
                days === d ? 'bg-slate-800 text-white ring-slate-800' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <Loader text="লোড হচ্ছে..." />
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {KPIS.map(([label, val, tone], i) => (
              <div key={i} className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                <div className={`mt-1 text-2xl font-extrabold ${tone}`}>{num(val)}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Funnel */}
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="mb-3 text-sm font-bold text-slate-700">🔻 ফানেল (ব্রাউজ → প্রোডাক্ট → কার্ট)</div>
              {[
                ['পেজ ভিউ', pv, 'bg-sky-500'],
                ['প্রোডাক্ট ভিউ', Number(f.product_views) || 0, 'bg-indigo-500'],
                ['কার্টে যোগ', Number(f.cart_adds) || 0, 'bg-amber-500'],
              ].map(([label, val, bar]: any, i: number) => (
                <div key={i} className="mb-2.5">
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-600">{label}</span>
                    <span className="font-bold text-slate-800">
                      {num(val)} <span className="font-normal text-slate-400">({pct(val)}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, pct(val))}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Top pages */}
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="mb-3 text-sm font-bold text-slate-700">🔥 সবচেয়ে বেশি দেখা পেজ</div>
              <div className="space-y-1.5">
                {topPages.length === 0 && <div className="text-[13px] text-slate-400">এখনো ডেটা নেই</div>}
                {topPages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <a href={p.path} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-mono text-slate-600 hover:text-accent">
                      {shortPath(p.path)}
                    </a>
                    <span className="shrink-0 font-bold text-slate-800">{num(p.views)}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{num(p.visitors)} জন</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sessions with journey */}
          <div className="mt-5 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="mb-3 text-sm font-bold text-slate-700">🧭 ভিজিটর জার্নি (সাম্প্রতিক সেশন)</div>
            <div className="space-y-2">
              {sessions.length === 0 && <div className="text-[13px] text-slate-400">এখনো কোনো সেশন নেই</div>}
              {sessions.map((s) => (
                <div key={s.session} className="rounded-lg ring-1 ring-slate-100">
                  <button
                    onClick={() => setOpen(open === s.session ? null : s.session)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.user ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">
                      {s.user || `অতিথি · ${s.session}`}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{s.events} ইভেন্ট · {dur(s.duration_s)}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{ago(s.started_at)}</span>
                  </button>
                  {open === s.session && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2.5">
                      {(s.journey ?? []).map((j: any, i: number) => (
                        <span key={i} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-slate-300">→</span>}
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600" title={j.path || j.event}>
                            {EVENT_ICON[j.event] || '•'} {j.event === 'page_view' ? shortPath(j.path) : j.event}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Login blocks */}
          {blocks.length > 0 && (
            <div className="mt-5 rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="mb-3 text-sm font-bold text-rose-700">🚫 লগইন ব্লক / ব্যর্থ চেষ্টা</div>
              <div className="space-y-1.5">
                {blocks.map((b, i) => {
                  let reason = '';
                  try {
                    reason = JSON.parse(b.meta || '{}').reason || '';
                  } catch {}
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="min-w-0 flex-1 truncate font-mono text-slate-700">{b.path || '—'}</span>
                      <span className="shrink-0 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{reason}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{b.ip}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{ago(b.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

AnalyticsPage.authenticate = { permissions: adminOwnerAndStaffOnly };
AnalyticsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
