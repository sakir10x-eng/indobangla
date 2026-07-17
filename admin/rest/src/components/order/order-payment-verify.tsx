import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { usePaymentRecheckMutation } from '@/data/payment-ledger';

/**
 * Online-payment (bKash / bank) verification card for the order details page.
 * Shows the transaction id + amount the customer actually sent so the admin can
 * cross-check it, re-query bKash live, and mark the payment verified.
 */
const OrderPaymentVerify = ({
  order,
  onDone,
}: {
  order: any;
  onDone?: () => void;
}) => {
  const ops = order?.ops_meta ?? {};
  const bkash = ops?.bkash ?? null;
  const bank = ops?.bank_proof ?? null;
  const { mutate: recheck, isLoading } = usePaymentRecheckMutation();

  const hasBkash = bkash && bkash.trx_id;
  const hasBank = bank && bank.status;
  if (!hasBkash && !hasBank) return null; // COD / no online payment

  const verified = Boolean(ops?.payment_verified);
  const amount = hasBkash
    ? bkash.amount_bdt ?? order.paid_total
    : bank.amount_bdt ?? order.paid_total;
  const when = ops?.paid_at || bank?.submitted_at || bkash?.executed_at;

  const act = (action: 'requery' | 'verify' | 'unverify') =>
    recheck({ order_id: order.id, action }, { onSuccess: () => onDone?.() });

  const Row = ({ k, v }: { k: string; v: ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-body">{k}</span>
      <span className="text-right text-sm font-medium text-heading">{v}</span>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-xs font-semibold text-heading">
          {hasBkash ? '🔴 bKash payment' : '🏦 Bank transfer'}
        </span>
        {verified ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            ✓ Verified{ops?.payment_verified_by ? ` · ${ops.payment_verified_by}` : ''}
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Needs check
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {hasBkash && (
          <>
            <Row
              k="Transaction ID"
              v={<span className="font-mono text-accent">{bkash.trx_id}</span>}
            />
            {bkash.payment_id && (
              <Row
                k="bKash payment id"
                v={<span className="font-mono text-xs">{bkash.payment_id}</span>}
              />
            )}
            {bkash.last_status && <Row k="bKash status" v={bkash.last_status} />}
          </>
        )}
        {hasBank && (
          <>
            <Row
              k="Slip status"
              v={<span className="capitalize">{String(bank.status).replace('_', ' ')}</span>}
            />
            {bank.url && (
              <Row
                k="Slip"
                v={
                  <a
                    href={bank.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline"
                  >
                    view image
                  </a>
                }
              />
            )}
          </>
        )}
        <Row
          k="Amount sent"
          v={<span className="text-emerald-600">৳{Number(amount ?? 0).toLocaleString('en-US')}</span>}
        />
        <Row
          k="Order total"
          v={<>৳{Number(order.total ?? 0).toLocaleString('en-US')}</>}
        />
        {when && <Row k="When" v={dayjs(when).format('DD MMM YYYY, hh:mm A')} />}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => act(verified ? 'unverify' : 'verify')}
            disabled={isLoading}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${
              verified
                ? 'border border-border-base text-body hover:bg-gray-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {verified ? 'Unmark verified' : '✓ Mark verified'}
          </button>
          {hasBkash && bkash.payment_id && (
            <button
              onClick={() => act('requery')}
              disabled={isLoading}
              className="flex-1 rounded-md border border-pink-200 px-3 py-2 text-xs font-semibold text-pink-600 hover:bg-pink-50"
            >
              ↻ Re-check with bKash
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderPaymentVerify;
