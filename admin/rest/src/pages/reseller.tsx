import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeading from '@/components/common/page-heading';
import Card from '@/components/common/card';
import { useEffect, useState } from 'react';
import {
  useResellerConfigQuery,
  useUpdateResellerConfigMutation,
  useResellerListQuery,
  useResellerPayoutsQuery,
  useResellerActionMutation,
} from '@/data/integrations';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent';

export default function ResellerAdmin() {
  const { config } = useResellerConfigQuery();
  const { mutate: saveCfg, isLoading: savingCfg } = useUpdateResellerConfigMutation();
  const { resellers } = useResellerListQuery();
  const { payouts } = useResellerPayoutsQuery();
  const recordSale = useResellerActionMutation('record-sale');
  const release = useResellerActionMutation('release');
  const payoutAction = useResellerActionMutation('payout-action');

  const [form, setForm] = useState({ open_fee: 1000, discount_pct: 5, markup_cap_pct: 5, hold_days: 7 });
  useEffect(() => {
    if (config) setForm({
      open_fee: Number(config.open_fee) || 1000,
      discount_pct: Number(config.discount_pct) || 5,
      markup_cap_pct: Number(config.markup_cap_pct) || 5,
      hold_days: Number(config.hold_days) || 7,
    });
  }, [config]);

  const pending = payouts.filter((p: any) => p.status === 'requested');

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <PageHeading title="Reseller business" />
        <p className="mt-1 text-sm text-slate-500">Configure the reseller programme, record sales, release held earnings, and process bKash payouts.</p>
      </Card>

      {/* config */}
      <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">Programme settings</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          {([
            ['open_fee', 'Open fee (৳)'],
            ['discount_pct', 'Reseller discount %'],
            ['markup_cap_pct', 'Markup cap %'],
            ['hold_days', 'Hold days'],
          ] as [keyof typeof form, string][]).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
              <input type="number" className={input} value={form[k]}
                onChange={(e) => setForm((s) => ({ ...s, [k]: Number(e.target.value) }))} />
            </div>
          ))}
        </div>
        <button onClick={() => saveCfg(form)} disabled={savingCfg}
          className="mt-4 rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60">
          {savingCfg ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* payout requests */}
      <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">Payout requests {pending.length ? `(${pending.length} pending)` : ''}</h3>
        {payouts.length === 0 ? <p className="text-sm text-slate-400">No payout requests.</p> : (
          <div className="space-y-2">
            {payouts.map((p: any, i: number) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">{p.reseller_name} — {bdt(p.amount)}</div>
                  <div className="text-xs text-slate-400">bKash: {p.bkash} · {p.at}</div>
                </div>
                {p.status === 'requested' ? (
                  <div className="flex gap-2">
                    <button onClick={() => payoutAction.mutate({ reseller_id: p.reseller_id, index: p.index, action: 'approve' })}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">Mark paid</button>
                    <button onClick={() => payoutAction.mutate({ reseller_id: p.reseller_id, index: p.index, action: 'reject' })}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Reject</button>
                  </div>
                ) : (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* resellers */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">Resellers ({resellers.length})</h3>
        {resellers.length === 0 ? <p className="text-sm text-slate-400">No resellers yet.</p> : (
          <div className="space-y-4">
            {resellers.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800">{r.name} <span className="text-xs font-normal text-slate-400">· {r.email}</span></div>
                    <div className="text-xs text-slate-400">Available {bdt(r.available)} · Pending {bdt(r.pending)}</div>
                  </div>
                  {r.pending > 0 && (
                    <button onClick={() => release.mutate({ reseller_id: r.id })}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Release held ({bdt(r.pending)})</button>
                  )}
                </div>
                {r.products?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {r.products.map((p: any) => (
                      <div key={p.product_id} className="flex items-center gap-3 text-xs">
                        <span className="min-w-0 flex-1 truncate text-slate-600">{p.name}</span>
                        <span className="text-slate-400">margin {bdt(p.margin)} · sold {p.sold_count}</span>
                        <button onClick={() => recordSale.mutate({ reseller_id: r.id, product_id: p.product_id, qty: 1 })}
                          className="rounded border border-slate-200 px-2 py-1 font-medium text-slate-600 hover:border-accent hover:text-accent">+ Record sale</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

ResellerAdmin.authenticate = { permissions: adminOnly };
ResellerAdmin.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
