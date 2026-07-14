import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';
import { useVendorReportQuery } from '@/data/integrations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));
const initials = (s: string) => (s.replace(/[^a-zA-Zঀ-৿]/g, '').slice(0, 2) || '?').toUpperCase();

export default function VendorsReport() {
  const { vendors, loading } = useVendorReportQuery();
  const [q, setQ] = useState('');

  const shown = useMemo(
    () => vendors.filter((v: any) => v.name?.toLowerCase().includes(q.toLowerCase())),
    [vendors, q],
  );
  const kpi = useMemo(() => {
    const rev = vendors.reduce((a: number, v: any) => a + v.revenue, 0);
    const sells = vendors.reduce((a: number, v: any) => a + v.totalSells, 0);
    const thisM = vendors.reduce((a: number, v: any) => a + v.thisMonth, 0);
    const lastM = vendors.reduce((a: number, v: any) => a + v.lastMonth, 0);
    const active = vendors.filter((v: any) => v.status === 'Active').length;
    return { rev, sells, thisM, lastM, delta: pct(thisM, lastM), active };
  }, [vendors]);

  const chartData = vendors.filter((v: any) => v.revenue > 0).slice(0, 8).map((v: any) => ({
    name: v.name?.length > 12 ? v.name.slice(0, 11) + '…' : v.name,
    'Last month': Math.round(v.lastMonth),
    'This month': Math.round(v.thisMonth),
  }));
  const top = vendors.filter((v: any) => !v.suspicious && v.revenue > 0).slice(0, 6);

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="border-l-4 border-emerald-600 pl-3 text-xl font-bold text-slate-800">Vendors Report</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor…"
          className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['💰 Total revenue', bdt(kpi.rev), 'Indo Bangla earning'],
          ['🛒 Total sells', `${kpi.sells}`, 'orders'],
          ['📅 This month', bdt(kpi.thisM), `${kpi.delta >= 0 ? '▲' : '▼'} ${Math.abs(kpi.delta)}% vs last`],
          ['🏪 Vendors', `${vendors.length}`, `${kpi.active} active`],
          ['📦 Last month', bdt(kpi.lastM), 'previous'],
        ].map(([lab, val, sub], i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{lab}</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{val}</div>
            <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* leaderboard */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-700">🏆 Leaderboard <span className="text-xs font-normal text-slate-400">by revenue</span></h2>
          {top.length === 0 ? <p className="text-sm text-slate-400">No sales yet.</p> : top.map((v: any, i: number) => (
            <div key={v.id} className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-0">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{v.name}</div>
                <div className="text-xs text-slate-400">{v.totalSells} sells · {v.thisMonth > 0 ? `${pct(v.thisMonth, v.lastMonth) >= 0 ? '▲' : '▼'}${Math.abs(pct(v.thisMonth, v.lastMonth))}% this month` : 'no sales this month'}</div>
              </div>
              <div className="text-right"><div className="font-bold text-slate-800">{bdt(v.revenue)}</div><div className="text-[11px] text-slate-400">revenue</div></div>
            </div>
          ))}
        </div>

        {/* chart */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-700">📊 This month vs last</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => '৳' + v / 1000 + 'k'} />
              <Tooltip formatter={(v: any) => bdt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Last month" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="This month" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* table */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-slate-700">📋 All vendors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Shop</th><th className="py-2 pr-3">Revenue &amp; sells</th><th className="py-2 pr-3">This month</th><th className="py-2 pr-3">Books</th><th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v: any) => {
                const d = pct(v.thisMonth, v.lastMonth);
                return (
                  <tr key={v.id} className={`border-b border-slate-50 ${v.suspicious ? 'bg-red-50/40' : ''}`}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{initials(v.name)}</span>
                        <span className="max-w-[200px] truncate font-semibold text-slate-800">{v.suspicious ? '⚠ ' : ''}{v.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3"><span className="font-bold text-slate-800">{bdt(v.revenue)}</span><div className="text-xs text-slate-400">{v.totalSells} sells</div></td>
                    <td className="py-3 pr-3">{v.thisMonth > 0 ? <>{bdt(v.thisMonth)} <span className={d >= 10 ? 'text-emerald-600' : d <= -10 ? 'text-red-500' : 'text-slate-400'}>{d >= 10 ? '📈' : d <= -10 ? '📉' : '➡️'}</span></> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 pr-3 text-slate-600">{v.products}</td>
                    <td className="py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{v.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

VendorsReport.authenticate = { permissions: adminOnly };
VendorsReport.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
