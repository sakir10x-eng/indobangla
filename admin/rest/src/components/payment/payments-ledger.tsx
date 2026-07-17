import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import Link from '@/components/ui/link';
import Pagination from '@/components/ui/pagination';
import Loader from '@/components/ui/loader/loader';
import { usePaymentsQuery, usePaymentRecheckMutation } from '@/data/payment-ledger';
import { PaymentRow } from '@/types';

const METHODS: { key: 'all' | 'bkash' | 'bank'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bkash', label: 'bKash' },
  { key: 'bank', label: 'Bank' },
];

function money(n: number | null | undefined) {
  return '৳' + Number(n ?? 0).toLocaleString('en-US');
}

const MethodBadge = ({ method }: { method: string | null }) => {
  const m = (method || '').toLowerCase();
  const cls =
    m === 'bkash'
      ? 'bg-pink-100 text-pink-700'
      : m === 'bank'
      ? 'bg-indigo-100 text-indigo-700'
      : 'bg-gray-100 text-gray-600';
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${cls}`}>
      {method || '—'}
    </span>
  );
};

const StatusBadge = ({ row }: { row: PaymentRow }) => {
  const paid =
    row.payment_status === 'payment-success' ||
    (row.paid_total >= row.total && row.total > 0);
  if (row.method === 'bank' && row.bank_status && row.bank_status !== 'approved') {
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        {row.bank_status === 'pending_review' ? 'Slip — review' : row.bank_status}
      </span>
    );
  }
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {paid ? 'Paid' : 'Partial'}
    </span>
  );
};

const PaymentsLedger = () => {
  const [method, setMethod] = useState<'all' | 'bkash' | 'bank'>('all');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { mutate: recheck, isLoading: rechecking } = usePaymentRecheckMutation();

  // debounce the search box (350ms) so every keystroke doesn't hit the server
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [text]);

  const { payments, summary, paginatorInfo, loading, fetching } = usePaymentsQuery({
    method,
    search,
    page,
    limit: 30,
  });

  const rows = useMemo(() => payments as PaymentRow[], [payments]);

  return (
    <div className="flex flex-col">
      {/* controls */}
      <div className="mb-5 rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-heading">
            Online payments{' '}
            {summary?.count != null && (
              <span className="ms-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-body">
                {summary.count} total
              </span>
            )}
          </div>
          <div className="ms-auto flex gap-1 rounded-lg bg-gray-100 p-1">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setMethod(m.key);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  method === m.key
                    ? 'bg-white text-accent shadow-sm'
                    : 'text-body hover:text-heading'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by transaction id, name, mobile, order id, tracking no, amount…"
          className="h-11 w-full rounded-lg border border-border-base px-4 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {loading ? (
        <Loader text="Loading payments…" />
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-body/70">
                  <th className="px-4 py-3 font-semibold">Date &amp; time</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Transaction ID</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Mobile</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Verify</th>
                </tr>
              </thead>
              <tbody className={fetching ? 'opacity-60' : ''}>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-body">
                      No payments found{search ? ` for “${search}”` : ''}.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.order_id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-body">
                      {r.paid_at ? dayjs(r.paid_at).format('DD MMM YYYY') : '—'}
                      <span className="block text-xs text-body/60">
                        {r.paid_at ? dayjs(r.paid_at).format('hh:mm A') : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MethodBadge method={r.method} />
                    </td>
                    <td className="px-4 py-3">
                      {r.trx_id ? (
                        <span className="font-mono text-xs font-semibold text-heading">
                          {r.trx_id}
                        </span>
                      ) : r.bank_slip ? (
                        <a
                          href={r.bank_slip}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent underline"
                        >
                          view slip
                        </a>
                      ) : (
                        <span className="text-xs text-body/50">—</span>
                      )}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-heading">
                      {r.customer_name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-body">
                      {r.customer_contact || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/orders/${r.order_id}`}
                        className="text-accent hover:underline"
                      >
                        #{r.tracking_number || r.order_id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-heading">
                      {money(r.amount)}
                      {r.total !== r.amount && (
                        <span className="block text-xs font-normal text-body/60">
                          of {money(r.total)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge row={r} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            recheck({
                              order_id: r.order_id,
                              action: r.verified ? 'unverify' : 'verify',
                            })
                          }
                          disabled={rechecking}
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            r.verified
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'border border-border-base text-body hover:bg-gray-50'
                          }`}
                          title="Mark as verified after cross-checking"
                        >
                          {r.verified ? '✓ Verified' : 'Mark verified'}
                        </button>
                        {r.method === 'bkash' && r.bkash_payment_id && (
                          <button
                            onClick={() =>
                              recheck({ order_id: r.order_id, action: 'requery' })
                            }
                            disabled={rechecking}
                            className="rounded border border-pink-200 px-2 py-1 text-xs font-medium text-pink-600 hover:bg-pink-50"
                            title="Re-query bKash for this transaction"
                          >
                            ↻ bKash
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!paginatorInfo?.total && paginatorInfo.total > (paginatorInfo.perPage || 30) && (
        <div className="mt-5 flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={(p: number) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentsLedger;
