import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import dayjs from 'dayjs';
import {
  useProductReportsQuery,
  useUpdateProductReportMutation,
} from '@/data/integrations';

const card = 'mb-4 rounded-2xl border border-[#e6e6e8] bg-white p-6';

const REASON_LABEL: Record<string, string> = {
  price: 'Wrong price',
  cover: 'Wrong cover/image',
  author: 'Wrong author/publisher',
  description: 'Wrong description',
  other: 'Other',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  dismissed: 'bg-slate-50 text-slate-600 ring-slate-200',
};

export default function ProductReportsPage() {
  const [filter, setFilter] = useState('open');
  const { reports, loading } = useProductReportsQuery(filter || undefined);
  const { mutate: update, isLoading: saving } = useUpdateProductReportMutation();

  return (
    <>
      <SettingsPageHeader pageTitle="Product Reports" />

      <div className={card}>
        <p className="mb-4 text-sm text-body">
          Customers reporting wrong information on a book. Each customer can have only one open
          report per book.
        </p>

        <div className="mb-4 flex gap-2">
          {[
            ['open', 'Open'],
            ['resolved', 'Resolved'],
            ['dismissed', 'Dismissed'],
            ['', 'All'],
          ].map(([val, label]) => (
            <button
              key={label}
              onClick={() => setFilter(val)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === val
                  ? 'bg-accent text-white'
                  : 'bg-white text-body ring-1 ring-[#e6e6e8] hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-body">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-body">No reports here.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <div
                key={r.id}
                className="rounded-xl border border-[#e6e6e8] p-4"
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`/admin/products/${r.product_slug}/edit`}
                    className="text-sm font-semibold text-heading hover:text-accent"
                  >
                    {r.product_name || `Product #${r.id}`}
                  </a>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ring-1 ${
                      STATUS_STYLE[r.status] || STATUS_STYLE.dismissed
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-body">
                  <b>{REASON_LABEL[r.reason] || r.reason}</b>
                  {r.customer_name ? ` · ${r.customer_name}` : ''} ·{' '}
                  {dayjs(r.created_at).format('MMM D, YYYY h:mm A')}
                </p>

                {r.details && (
                  <p className="mt-2 rounded-lg bg-[#fafafb] p-2.5 text-sm text-heading">
                    {r.details}
                  </p>
                )}

                {r.status === 'open' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() => update({ id: r.id, status: 'resolved' })}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      ✓ Mark fixed
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => update({ id: r.id, status: 'dismissed' })}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-body ring-1 ring-[#e6e6e8] hover:bg-gray-50 disabled:opacity-60"
                    >
                      Dismiss
                    </button>
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

ProductReportsPage.authenticate = { permissions: adminOnly };
ProductReportsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
