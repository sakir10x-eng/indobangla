import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useClubSettingsQuery, useUpdateClubMutation } from '@/data/integrations';
import { useEffect, useState } from 'react';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400';
const label = 'mb-1 block text-sm font-medium text-slate-600';

export default function ReadersClubPage() {
  const { club, loading } = useClubSettingsQuery();
  const { mutate: save, isLoading: saving } = useUpdateClubMutation();
  const [f, setF] = useState({ enabled: true, fee: 300, discount_pct: 15, coupon_code: 'READCLUB' });

  useEffect(() => {
    if (club) {
      setF({
        enabled: !!club.enabled,
        fee: Number(club.fee ?? 300),
        discount_pct: Number(club.discount_pct ?? 15),
        coupon_code: club.coupon_code ?? 'READCLUB',
      });
    }
  }, [club]);

  return (
    <>
      <SettingsPageHeader pageTitle="Readers’ Club membership" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          {/* membership card preview */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 p-5 text-[#4a1109]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
              <span>Readers’ Club</span><span>📖</span>
            </div>
            <div className="mt-6 font-mono text-lg font-bold tracking-widest">IB · MEMBER · CARD</div>
            <div className="mt-4 flex items-end justify-between">
              <div><div className="text-[10px] font-semibold uppercase opacity-70">Member saves</div><div className="text-2xl font-extrabold">{f.discount_pct}%</div></div>
              <div className="text-right"><div className="text-[10px] font-semibold uppercase opacity-70">Membership</div><div className="text-lg font-bold">৳{Math.round(f.fee).toLocaleString('en-IN')}</div></div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
            Club open for new members
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>Membership fee (৳)</label>
              <input type="number" className={input} value={f.fee} onChange={(e) => setF({ ...f, fee: Number(e.target.value) })} />
            </div>
            <div>
              <label className={label}>Member discount (%)</label>
              <input type="number" className={input} value={f.discount_pct} onChange={(e) => setF({ ...f, discount_pct: Number(e.target.value) })} />
            </div>
            <div>
              <label className={label}>Coupon code</label>
              <input className={input} value={f.coupon_code} onChange={(e) => setF({ ...f, coupon_code: e.target.value })} />
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Members pay the fee via the online-payment link; once paid, membership activates
            automatically and the coupon (updated to this %) works at checkout.
          </p>

          <button
            onClick={() => save(f)}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </>
  );
}

ReadersClubPage.authenticate = { permissions: adminOnly };
ReadersClubPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
