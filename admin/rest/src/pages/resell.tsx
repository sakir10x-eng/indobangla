import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeading from '@/components/common/page-heading';
import Card from '@/components/common/card';
import { useState } from 'react';
import {
  useResellListQuery,
  useResellModerateMutation,
  useResellMarkSoldMutation,
} from '@/data/integrations';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const CONDITION: Record<string, string> = {
  like_new: 'Like New', good: 'Good', used: 'Used', readable: 'Readable',
};
const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-teal-100 text-teal-700',
};

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Live' },
  { key: 'sold', label: 'Sold' },
  { key: '', label: 'All' },
];

export default function ResellModeration() {
  const [tab, setTab] = useState('pending');
  const { items, loading } = useResellListQuery(tab || undefined);
  const { mutate: moderate } = useResellModerateMutation();
  const { mutate: markSold } = useResellMarkSoldMutation();
  const [buyerFor, setBuyerFor] = useState<number | null>(null);
  const [buyerName, setBuyerName] = useState('');

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <PageHeading title="Book Resell — moderation" />
        <p className="mt-1 text-sm text-slate-500">
          Customer-listed used books. Approve to publish; mark sold to credit the seller&apos;s wallet.
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'border-accent bg-accent text-white' : 'border-slate-200 text-slate-600 hover:border-accent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500">
          No listings here.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it: any) => {
            const m = it.meta ?? {};
            const st = m.status ?? 'pending';
            return (
              <div key={it.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start gap-4">
                  {/* gallery */}
                  <div className="flex gap-2">
                    {(it.gallery?.length ? it.gallery : [it.image]).filter(Boolean).slice(0, 4).map((g: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={g} alt="" className="h-24 w-20 rounded-lg border border-slate-100 object-cover" />
                    ))}
                  </div>
                  {/* info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{it.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[st]}`}>{st}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {bdt(it.price)} · {CONDITION[m.condition] ?? m.condition} · Seller: <b>{m.seller_name}</b>
                      {' · '}Delivery: {m.delivery_by === 'indobangla' ? 'IndoBangla (৳120)' : 'Self'}
                      {m.buyer_name ? ` · Buyer: ${m.buyer_name}` : ''}
                    </div>

                    {/* actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {st === 'pending' && (
                        <>
                          <button onClick={() => moderate({ id: it.id, action: 'approve' })}
                            className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700">Approve</button>
                          <button onClick={() => moderate({ id: it.id, action: 'reject' })}
                            className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Reject</button>
                        </>
                      )}
                      {(st === 'approved') && (
                        buyerFor === it.id ? (
                          <div className="flex items-center gap-2">
                            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Buyer name"
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-accent" />
                            <button onClick={() => { markSold({ id: it.id, buyer_name: buyerName }); setBuyerFor(null); setBuyerName(''); }}
                              className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">Confirm sold + credit</button>
                            <button onClick={() => { setBuyerFor(null); setBuyerName(''); }} className="text-sm text-slate-400">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setBuyerFor(it.id)}
                            className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">Mark sold</button>
                        )
                      )}
                      {st === 'approved' && (
                        <button onClick={() => moderate({ id: it.id, action: 'reject' })}
                          className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-500 hover:border-red-300 hover:text-red-600">Unpublish</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

ResellModeration.authenticate = { permissions: adminOnly };
ResellModeration.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
