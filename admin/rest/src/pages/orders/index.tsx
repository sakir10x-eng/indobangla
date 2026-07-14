import Layout from '@/components/layouts/admin';
import ErrorMessage from '@/components/ui/error-message';
import { useOrdersQuery } from '@/data/order';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { SortOrder } from '@/types';
import { adminOnly } from '@/utils/auth-utils';
import { useRouter } from 'next/router';
import { useState } from 'react';
import PageHeading from '@/components/common/page-heading';
import { usePreorderSummaryQuery } from '@/data/integrations';
import IndoOrderBoard from '@/components/order/indo-order-board';
import Link from '@/components/ui/link';

export default function Orders() {
  const preorder = usePreorderSummaryQuery();
  const { locale } = useRouter();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { orders, loading, paginatorInfo, error } = useOrdersQuery({
    language: locale,
    limit: pageSize,
    page,
    orderBy: 'created_at',
    sortedBy: SortOrder.Desc,
  });

  if (error) return <ErrorMessage message={error.message} />;

  const current = paginatorInfo?.currentPage ?? page;
  const last = paginatorInfo?.lastPage ?? 1;

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageHeading title={t('form:input-label-orders')} />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <Link
            href="/orders/create"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            + Create order
          </Link>
        </div>
      </div>

      {/* Pre-order summary — how the pre-order pipeline is actually doing. */}
      {preorder.counts.total > 0 && (
        <div className="mb-5 rounded-xl border border-[#f4c4c8] bg-[#fdf0f1]/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-800">📖 প্রি-অর্ডার</span>
            <span className="text-xs text-slate-500">মোট {preorder.counts.total}টি</span>
            <Link href="/preorder" className="ml-auto text-xs font-semibold text-[#e63946] hover:underline">
              বিস্তারিত ও বইয়ের তালিকা →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['⏳ অগ্রিমের অপেক্ষায়', preorder.counts.pending_advance, 'text-amber-700'],
              ['📦 প্রসেস হচ্ছে', preorder.counts.processing, 'text-sky-700'],
              ['✅ ডেলিভারি হয়েছে', preorder.counts.delivered, 'text-emerald-700'],
              [`🚨 সময় পার (${preorder.windowDays}+ দিন)`, preorder.counts.overdue, 'text-rose-600'],
            ].map(([label, val, tone]: any, i: number) => (
              <div key={i} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                <div className={`mt-0.5 text-2xl font-bold ${tone}`}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <IndoOrderBoard orders={orders ?? []} loading={loading} />

      {last > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={current <= 1}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 hover:border-emerald-400 disabled:opacity-40"
          >
            ← Newer
          </button>
          <span className="text-slate-500">
            Page {current} / {last}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={current >= last}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 hover:border-emerald-400 disabled:opacity-40"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  );
}

Orders.authenticate = {
  permissions: adminOnly,
};
Orders.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
