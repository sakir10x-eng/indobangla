import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useDiscountTiersQuery, useUpdateDiscountTiersMutation } from '@/data/integrations';
import { useEffect, useState } from 'react';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400';

export default function DiscountTiersPage() {
  const { tiers, loading } = useDiscountTiersQuery();
  const { mutate: save, isLoading: saving } = useUpdateDiscountTiersMutation();
  const [rows, setRows] = useState<{ min: number; pct: number }[]>([{ min: 1990, pct: 5 }, { min: 6000, pct: 7 }]);

  useEffect(() => {
    if (Array.isArray(tiers) && tiers.length) {
      setRows(tiers.map((t: any) => ({ min: Number(t.min), pct: Number(t.pct) })));
    }
  }, [tiers]);

  const update = (i: number, k: 'min' | 'pct', v: number) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addRow = () => setRows((r) => [...r, { min: 0, pct: 0 }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  return (
    <>
      <SettingsPageHeader pageTitle="Order-amount discount tiers" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Buy-more-save-more: shoppers who reach a spend threshold get that % off
            (a coupon <b>BULK&lt;pct&gt;</b> is created automatically). The cart shows
            live progress toward the next tier.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-semibold uppercase text-slate-400">
              <span>Spend at least (৳)</span><span>Discount (%)</span><span></span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                <input type="number" className={input} value={row.min} onChange={(e) => update(i, 'min', Number(e.target.value))} />
                <input type="number" className={input} value={row.pct} onChange={(e) => update(i, 'pct', Number(e.target.value))} />
                <button onClick={() => removeRow(i)} className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">✕</button>
              </div>
            ))}
            <button onClick={addRow} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-400">+ Add tier</button>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Preview: {rows.filter((r) => r.min > 0 && r.pct > 0).sort((a, b) => a.min - b.min).map((r) => `৳${r.min}+ → ${r.pct}%`).join('  ·  ') || '—'}
          </div>

          <button
            onClick={() => save({ tiers: rows.filter((r) => r.min > 0 && r.pct > 0) })}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save tiers'}
          </button>
        </div>
      )}
    </>
  );
}

DiscountTiersPage.authenticate = { permissions: adminOnly };
DiscountTiersPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
