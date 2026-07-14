import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useCustomersOverviewQuery } from '@/data/integrations';
import {
  useBlockUserMutation,
  useUnblockUserMutation,
  useMakeOrRevokeAdminMutation,
  useAddWalletPointsMutation,
} from '@/data/user';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const short = (n: number) =>
  n >= 100000 ? `৳${(n / 100000).toFixed(1)}L` : n >= 1000 ? `৳${Math.round(n / 1000)}k` : bdt(n);

const SEGMENT: Record<string, { name: string; bg: string; fg: string; bar: string }> = {
  high: { name: 'High-value', bg: '#FCEBEB', fg: '#A32D2D', bar: '#E63946' },
  regular: { name: 'নিয়মিত', bg: '#EAF3DE', fg: '#3B6D11', bar: '#639922' },
  low: { name: 'Low-value', bg: '#F1EFE8', fg: '#5F5E5A', bar: '#888780' },
};

const STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  'order-completed': { bg: '#EAF3DE', fg: '#3B6D11', label: 'Delivered' },
  'order-refunded': { bg: '#FCEBEB', fg: '#A32D2D', label: 'Refunded' },
  'order-cancelled': { bg: '#FCEBEB', fg: '#A32D2D', label: 'Cancelled' },
};
const statusOf = (s: string) =>
  STATUS[s] ?? { bg: '#FAEEDA', fg: '#854F0B', label: (s || '').replace('order-', '') };

const initials = (name = '') =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const happyFace = (h: number) =>
  h >= 85
    ? { face: '😊', fg: '#3B6D11', bg: '#EAF3DE' }
    : h >= 65
      ? { face: '😐', fg: '#854F0B', bg: '#FAEEDA' }
      : { face: '😞', fg: '#A32D2D', bg: '#FCEBEB' };

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[11px] text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? 'text-[#EF9F27]' : 'text-slate-300'}>
          ★
        </span>
      ))}
      <span className="ml-1 text-[11px] text-slate-400">{rating}</span>
    </span>
  );
}

export default function CustomerGallery() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openOrders, setOpenOrders] = useState<number | null>(null);
  const [history, setHistory] = useState<any>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { customers, stats, trend, total, lastPage, loading } = useCustomersOverviewQuery({
    search,
    page,
    limit: 20,
  });

  const { mutate: blockUser } = useBlockUserMutation();
  const { mutate: unblockUser } = useUnblockUserMutation();
  const { mutate: toggleAdmin } = useMakeOrRevokeAdminMutation();
  const { mutate: addPoints } = useAddWalletPointsMutation();

  const segTotal = (stats.high_value ?? 0) + (stats.regular ?? 0) + (stats.low_value ?? 0) || 1;

  const handleWallet = (c: any) => {
    const v = prompt(`${c.name}-এর wallet-এ কত point যোগ করবেন?`, '10');
    if (v === null) return;
    const points = parseInt(v, 10);
    if (isNaN(points) || points <= 0) return;
    addPoints({ customer_id: c.id, points });
  };

  return (
    <div className="space-y-4">
      {/* ---------------- header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1.5 rounded bg-accent" />
          <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[13px] text-slate-500">
            {total.toLocaleString('en-IN')} total
          </span>
        </div>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="নাম বা ইমেইল দিয়ে খুঁজুন"
          className="h-10 w-64 rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* ---------------- stat cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="💰 Total revenue" value={short(stats.total_revenue ?? 0)} />
        <Stat
          label="👑 High-value"
          value={String(stats.high_value ?? 0)}
          sub="৳25,000+ খরচ করেছেন"
        />
        <Stat label="🧑‍💻 নতুন (৩০ দিন)" value={String(stats.new_30d ?? 0)} />
        <Stat
          label="⚠️ At-risk"
          value={String(stats.at_risk ?? 0)}
          sub="৬০+ দিন নিষ্ক্রিয়"
          warn
        />
      </div>

      {/* ---------------- trend + segmentation */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Revenue trend (৬ মাস)</p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="#f1efe8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8f' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8a8a8f' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => short(v)}
                  width={50}
                />
                <Tooltip formatter={(v: any) => bdt(v)} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#E63946"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-slate-700">
            Segmentation{' '}
            <span className="text-[11px] font-normal text-slate-400">(মোট spent অনুযায়ী)</span>
          </p>
          {[
            { key: 'high', count: stats.high_value ?? 0, hint: '৳25k+' },
            { key: 'regular', count: stats.regular ?? 0, hint: '৳5k–25k' },
            { key: 'low', count: stats.low_value ?? 0, hint: '৳5k-এর কম' },
          ].map((s) => (
            <div key={s.key} className="mb-3.5 last:mb-0">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="text-slate-500">
                  {SEGMENT[s.key].name}{' '}
                  <span className="text-[11px] text-slate-400">{s.hint}</span>
                </span>
                <span className="font-semibold text-slate-700">{s.count}</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded bg-slate-100">
                <span
                  className="block h-full rounded"
                  style={{
                    width: `${Math.round((s.count / segTotal) * 100)}%`,
                    background: SEGMENT[s.key].bar,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="hidden grid-cols-[2fr_1.3fr_0.9fr_0.7fr_0.9fr_0.9fr_190px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
          <span>Customer</span>
          <span>Segment · Rating</span>
          <span>Orders</span>
          <span>Wallet</span>
          <span>Spent</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <p className="p-8 text-slate-500">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-slate-500">কোনো কাস্টমার পাওয়া যায়নি।</p>
        ) : (
          customers.map((c: any) => {
            const seg = SEGMENT[c.segment] ?? SEGMENT.low;
            const open = openOrders === c.id;
            return (
              <div key={c.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0 hover:bg-slate-50">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1.3fr_0.9fr_0.7fr_0.9fr_0.9fr_190px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCEBEB] text-xs font-semibold text-[#A32D2D]">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                      <p className="truncate text-[11px] text-slate-400">
                        ID {c.id} · {c.contact || c.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-1.5">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: seg.bg, color: seg.fg }}
                    >
                      {seg.name}
                    </span>
                    <Stars rating={c.rating} />
                  </div>

                  <div>
                    <button
                      onClick={() => setOpenOrders(open ? null : c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-semibold transition ${
                        open
                          ? 'border-accent bg-[#FCEBEB] text-[#A32D2D]'
                          : 'border-slate-200 text-slate-700 hover:border-accent hover:text-accent'
                      }`}
                    >
                      📦 {c.orders_count}
                      <span className={open ? 'rotate-180' : ''}>⌄</span>
                    </button>
                  </div>

                  <div
                    className="text-sm font-semibold"
                    style={{ color: c.wallet_points < 10 ? '#BA7517' : '#2b2a2b' }}
                  >
                    {c.wallet_points}
                    <span className="text-[10px] text-slate-400"> pts</span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800">{bdt(c.spent)}</div>

                  <div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        c.is_active
                          ? { background: '#EAF3DE', color: '#3B6D11' }
                          : { background: '#FCEBEB', color: '#A32D2D' }
                      }
                    >
                      {c.is_active ? 'Active' : 'Banned'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 lg:justify-end">
                    <Act title="History" onClick={() => setHistory(c)}>🕘</Act>
                    <Act title="Permission" onClick={() => toggleAdmin({ user_id: c.id })}>🛡️</Act>
                    <Act title="Wallet point যোগ করুন" onClick={() => handleWallet(c)}>🪙</Act>
                    <Act
                      title={c.is_active ? 'Ban করুন' : 'Unban করুন'}
                      onClick={() =>
                        c.is_active ? blockUser({ id: c.id }) : unblockUser({ id: c.id })
                      }
                    >
                      {c.is_active ? '🚫' : '✅'}
                    </Act>
                  </div>
                </div>

                {open && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-slate-700">
                        📦 {c.name}-এর অর্ডার ({c.orders_count})
                      </p>
                      <button
                        onClick={() => router.push(`/orders?customer=${c.id}`)}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                      >
                        সব অর্ডার দেখুন →
                      </button>
                    </div>
                    {c.orders.length === 0 ? (
                      <p className="py-2 text-center text-xs text-slate-400">কোনো অর্ডার নেই।</p>
                    ) : (
                      c.orders.map((o: any) => {
                        const st = statusOf(o.status);
                        return (
                          <div
                            key={o.no}
                            className="flex items-center justify-between border-t border-slate-200 py-2 first:border-t-0"
                          >
                            <div>
                              <p className="text-[13px] font-semibold text-slate-800">#{o.no}</p>
                              <p className="text-[11px] text-slate-400">
                                {String(o.date).slice(0, 10)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[13px] font-semibold text-slate-800">
                                {bdt(o.amount)}
                              </span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[11px]"
                                style={{ background: st.bg, color: st.fg }}
                              >
                                {st.label}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
          >
            ← আগের
          </button>
          <span className="text-sm text-slate-500">
            {page} / {lastPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
          >
            পরের →
          </button>
        </div>
      )}

      {/* ---------------- history modal */}
      {history && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setHistory(null)}
        >
          <div
            className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FCEBEB] text-sm font-semibold text-[#A32D2D]">
                {initials(history.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-slate-800">{history.name}</p>
                <p className="truncate text-xs text-slate-400">
                  ID {history.id} · {history.email}
                </p>
              </div>
              <button onClick={() => setHistory(null)} className="text-xl text-slate-400">
                ✕
              </button>
            </div>

            <div className="p-5">
              <div className="mb-5 grid grid-cols-3 gap-2.5">
                <Mini value={bdt(history.spent)} label="মোট spent" />
                <Mini value={String(history.orders_count)} label="মোট অর্ডার" />
                <Mini value={String(history.wallet_points)} label="Wallet pts" />
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2.5">
                <Mini value={String(history.delivered)} label="Delivered" />
                <Mini value={String(history.returned)} label="Returned / Cancelled" />
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ background: happyFace(history.happiness).bg }}
                >
                  <p
                    className="text-lg font-semibold"
                    style={{ color: happyFace(history.happiness).fg }}
                  >
                    {happyFace(history.happiness).face} {history.happiness}%
                  </p>
                  <p className="text-[11px] text-slate-500">Happiness</p>
                </div>
              </div>

              <div className="mb-5 h-[7px] overflow-hidden rounded bg-slate-100">
                <span
                  className="block h-full rounded"
                  style={{
                    width: `${history.happiness}%`,
                    background: happyFace(history.happiness).fg,
                  }}
                />
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                সাম্প্রতিক অর্ডার
              </p>
              {history.orders.length === 0 ? (
                <p className="text-sm text-slate-400">কোনো অর্ডার নেই।</p>
              ) : (
                history.orders.map((o: any) => {
                  const st = statusOf(o.status);
                  return (
                    <div key={o.no} className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">#{o.no}</p>
                        <p className="text-[11px] text-slate-400">
                          {String(o.date).slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: st.fg }}>
                          {bdt(o.amount)}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px]"
                          style={{ background: st.bg, color: st.fg }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {history.last_order_at && (
                <p className="mt-4 text-[11px] text-slate-400">
                  সর্বশেষ অর্ডার: {String(history.last_order_at).slice(0, 10)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="mb-2 text-[13px] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
      {sub && (
        <p className={`mt-1 text-xs ${warn ? 'text-[#854F0B]' : 'text-slate-400'}`}>{sub}</p>
      )}
    </div>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-lg font-semibold text-slate-800">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function Act({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-base transition hover:border-slate-300 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
