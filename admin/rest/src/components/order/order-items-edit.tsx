import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { useState } from 'react';
import {
  useEditOrderItemsMutation,
  useCreateShipmentMutation,
  useProductSearchApi,
} from '@/data/order-edit';

const COURIERS = ['redx', 'steadfast', 'paperfly', 'sundarban', 'pathao'];

export default function OrderItemsEdit({ order }: { order: any }) {
  const { mutate: edit, isLoading } = useEditOrderItemsMutation();
  const { mutate: ship, isLoading: shipping } = useCreateShipmentMutation();
  const { mutate: search, data: searchRes, isLoading: searching } = useProductSearchApi();
  const [q, setQ] = useState('');
  const [provider, setProvider] = useState('steadfast');
  const [shipMsg, setShipMsg] = useState<string>('');

  const products = order?.products ?? [];
  const results = (searchRes as any)?.products ?? [];

  return (
    <Card className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-heading">Order items</h3>
      <p className="mb-4 text-sm text-body">
        Add or remove products. The order total is recalculated automatically.
      </p>

      {/* current items */}
      <div className="mb-5 divide-y divide-border-100 rounded border border-border-200">
        {products.length === 0 ? (
          <p className="p-3 text-sm text-body">No products.</p>
        ) : (
          products.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-heading">
                {p.name}{' '}
                <span className="text-body">
                  × {p.pivot?.order_quantity ?? p.qty ?? 1}
                </span>
              </span>
              <button
                type="button"
                onClick={() => edit({ order_id: order.id, remove: [p.id] })}
                disabled={isLoading}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* add product */}
      <div className="mb-2 flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a product to add…"
          className="flex-1"
        />
        <Button size="small" onClick={() => search(q)} loading={searching} disabled={!q}>
          Search
        </Button>
      </div>
      {results.length > 0 && (
        <div className="mb-5 divide-y divide-border-100 rounded border border-border-200">
          {results.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-heading">
                {r.name} <span className="text-body">৳{r.sale_price || r.price}</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  edit({ order_id: order.id, add: [{ product_id: r.id, quantity: 1 }] })
                }
                disabled={isLoading}
                className="text-xs font-semibold text-status-complete hover:underline"
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* send to courier */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-200 pt-4">
        <span className="text-sm font-semibold text-heading">Send to courier:</span>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded border border-border-base px-3 py-2 text-sm capitalize"
        >
          {COURIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button
          size="small"
          loading={shipping}
          onClick={() =>
            ship(
              { provider, order_id: order.id },
              {
                onSuccess: () => setShipMsg('Shipment created ✓'),
                onError: (e: any) =>
                  setShipMsg(e?.response?.data?.message || 'Shipment failed'),
              }
            )
          }
        >
          Send
        </Button>
        {shipMsg && (
          <span
            className={`text-xs font-semibold ${
              shipMsg.includes('✓') ? 'text-status-complete' : 'text-red-500'
            }`}
          >
            {shipMsg}
          </span>
        )}
      </div>
    </Card>
  );
}
