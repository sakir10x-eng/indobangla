import { useOrdersSummaryQuery } from '@/data/order-summary';

const CARD_MAP: { key: string; label: string; status?: string }[] = [
  { key: 'total', label: 'Total Orders' },
  { key: 'order-pending', label: 'Pending', status: 'order-pending' },
  { key: 'order-processing', label: 'Processing', status: 'order-processing' },
  { key: 'order-at-local-facility', label: 'Ready to Ship', status: 'order-at-local-facility' },
  { key: 'order-out-for-delivery', label: 'In Transit', status: 'order-out-for-delivery' },
  { key: 'order-completed', label: 'Delivered', status: 'order-completed' },
  { key: 'order-cancelled', label: 'Cancelled', status: 'order-cancelled' },
  { key: 'order-refunded', label: 'Returned', status: 'order-refunded' },
];

export default function OrderSummaryCards() {
  const { summary, loading } = useOrdersSummaryQuery();

  const value = (c: { key: string; status?: string }) => {
    if (!summary) return '—';
    if (c.key === 'total') return summary.total ?? 0;
    return summary.by_status?.[c.status as string] ?? 0;
  };

  // Show total + only the statuses that actually have orders (keeps it clean)
  const cards = CARD_MAP.filter(
    (c) => c.key === 'total' || (summary?.by_status?.[c.status as string] ?? 0) > 0
  );

  return (
    <div className="mb-6">
      <div className="mb-3">
        <span className="text-sm text-body">Total Orders: </span>
        <span className="text-lg font-bold text-accent">
          {loading ? '…' : summary?.total ?? 0}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {(cards.length ? cards : CARD_MAP.slice(0, 6)).map((c) => (
          <div
            key={c.key}
            className={`rounded-lg border bg-white px-4 py-3 shadow-sm ${
              c.key === 'total' ? 'border-accent' : 'border-border-200'
            }`}
          >
            <div className="text-xl font-bold text-heading">
              {loading ? '…' : value(c)}
            </div>
            <div className="mt-1 text-xs font-medium text-body">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
