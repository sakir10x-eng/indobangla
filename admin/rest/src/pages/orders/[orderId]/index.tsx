import Layout from '@/components/layouts/admin';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import {
  useDownloadInvoiceMutation,
  useOrderQuery,
  useUpdateOrderMutation,
} from '@/data/order';
import {
  useOrderAdjustMutation,
} from '@/data/order-adjust';
import {
  useEditOrderItemsMutation,
  useProductSearchApi,
} from '@/data/order-edit';
import {
  useCreateShipmentMutation,
  useCourierTrackMutation,
} from '@/data/courier-order';
import usePrice from '@/utils/use-price';
import { printInvoice, type InvoiceCoupon } from '@/components/order/print-invoice';
import { useSettingsQuery } from '@/data/settings';
import { HttpClient } from '@/data/client/http-client';
import { useOrderMoveItemMutation } from '@/data/integrations';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const STEPS = [
  { key: 'order-pending', label: 'Pending' },
  { key: 'order-processing', label: 'Processing' },
  { key: 'order-at-local-facility', label: 'Ready to ship' },
  { key: 'order-out-for-delivery', label: 'Out for delivery' },
  { key: 'order-completed', label: 'Delivered' },
];
const STATUS_OPTIONS = [
  'order-pending',
  'order-processing',
  'order-at-local-facility',
  'order-out-for-delivery',
  'order-completed',
  'order-cancelled',
  'order-refunded',
];
const PAYMENT_OPTIONS = [
  'payment-pending',
  'payment-processing',
  'payment-success',
  'payment-failed',
  'payment-reversal',
];
const label = (s: string) =>
  (s || '').replace(/^(order|payment)-/, '').replace(/-/g, ' ');

const COURIERS = [
  { key: 'redx', name: 'RedX', icon: '📦', detail: 'Nationwide · 2–4 days' },
  { key: 'steadfast', name: 'Steadfast', icon: '🚚', detail: 'Nationwide · 2–3 days' },
  { key: 'pathao', name: 'Pathao', icon: '🛵', detail: 'Express · Dhaka 1–2 days' },
  { key: 'paperfly', name: 'Paperfly', icon: '🐦', detail: 'Same-day · Dhaka' },
  { key: 'sundarban', name: 'Sundarban', icon: '🚌', detail: 'Economy · all areas' },
];



/** Move a book (or some of its copies) onto a different order. */
function MoveItem({ orderId, product, onMoved }: any) {
  const { mutate, isLoading } = useOrderMoveItemMutation();
  const [open, setOpen] = useState(false);
  const have = Number(product?.pivot?.order_quantity ?? 1);
  const [target, setTarget] = useState('');
  const [qty, setQty] = useState(String(have));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-body hover:border-accent hover:text-accent"
      >
        ⇄ Move
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Order # (e.g. 25013)"
        className="w-32 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        type="number"
        min="1"
        max={have}
        title={`Up to ${have}`}
        className="w-14 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <button
        disabled={isLoading || !target}
        onClick={() =>
          mutate(
            {
              from_order_id: orderId,
              to_order: target.trim(),
              product_id: product.id,
              quantity: Math.min(have, Math.max(1, Number(qty) || 1)),
            },
            { onSuccess: () => { setOpen(false); onMoved(); } },
          )
        }
        className="rounded bg-accent px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
      >
        Move
      </button>
      <button onClick={() => setOpen(false)} className="px-1 text-[10px] text-body hover:text-red-500">✕</button>
    </div>
  );
}

/** Line price + quantity, editable in place — the order total follows automatically. */
function LinePrice({ product, busy, onSave }: any) {
  const unit = Number(product?.pivot?.unit_price ?? product?.price) || 0;
  const qty = Number(product?.pivot?.order_quantity ?? 1);
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(Math.round(unit)));
  const [q, setQ] = useState(String(qty));

  if (!open) {
    return (
      <div className="text-right">
        <div className="font-mono text-sm font-medium text-heading">
          <Money amount={product?.pivot?.subtotal ?? unit * qty} />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="mt-0.5 text-[10px] font-medium text-body hover:text-accent"
        >
          ✎ Edit price
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
        title="Unit price"
        className="w-20 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <span className="text-xs text-body">×</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="number"
        min="1"
        title="Quantity"
        className="w-14 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <button
        disabled={busy}
        onClick={() => {
          onSave(Number(price), Math.max(1, Number(q) || 1));
          setOpen(false);
        }}
        className="rounded bg-accent px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
      >
        Save
      </button>
      <button onClick={() => setOpen(false)} className="px-1 text-xs text-body hover:text-red-500">✕</button>
    </div>
  );
}

function Money({ amount }: { amount: any }) {
  const { price } = usePrice({ amount: Number(amount) || 0 });
  return <>{price}</>;
}

export default function OrderDetailsPage() {
  const { query, locale } = useRouter();
  const { order, isLoading, error, refetch } = useOrderQuery({
    id: query.orderId as string,
    language: locale!,
  });
  // Same promo-line setting the order board's print control writes. Missing key = the
  // line has always printed, so keep printing it.
  const { settings } = useSettingsQuery({ language: locale as string });
  const invoiceCoupon: InvoiceCoupon =
    (settings as any)?.options?.invoiceCoupon ?? { enabled: true, code: 'WELCOME50', amount: 50 };
  const { mutate: updateOrder, isLoading: updating } = useUpdateOrderMutation();
  const { mutate: adjust, isLoading: adjusting } = useOrderAdjustMutation();
  const { mutate: editItems, isLoading: editingItems } =
    useEditOrderItemsMutation();
  const { mutate: search, data: searchRes, isLoading: searching } =
    useProductSearchApi();
  const { mutate: createShipment, isLoading: shipping } =
    useCreateShipmentMutation();
  const { mutate: trackShipment, isLoading: tracking } =
    useCourierTrackMutation();
  const { refetch: downloadInvoice } = useDownloadInvoiceMutation(
    { order_id: query.orderId as string, isRTL: false, language: locale! },
    { enabled: false },
  );

  const [status, setStatus] = useState('');
  const [pay, setPay] = useState('');
  const [adj, setAdj] = useState({ discount: 0, delivery_fee: 0, adjustment: 0, note: '' });
  const [q, setQ] = useState('');
  const [courier, setCourier] = useState('redx');
  const [trackNo, setTrackNo] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [notifyTab, setNotifyTab] = useState<'order' | 'payment' | 'delivery' | 'custom'>('order');
  const [customMsg, setCustomMsg] = useState('');

  useEffect(() => {
    if (order) {
      setStatus(order.order_status);
      setPay(order.payment_status);
      setAdj({
        discount: order.discount ?? 0,
        delivery_fee: order.delivery_fee ?? 0,
        adjustment: 0,
        note: order.note ?? '',
      });
    }
  }, [order]);

  const stepIdx = useMemo(
    () => STEPS.findIndex((s) => s.key === order?.order_status),
    [order],
  );
  const products = order?.products ?? [];
  const results = (searchRes as any)?.products ?? [];

  if (isLoading) return <Loader text="Loading…" />;
  if (error) return <ErrorMessage message={(error as any).message} />;

  const saveStatus = () =>
    updateOrder(
      { id: order.id, order_status: status, payment_status: pay } as any,
      { onSuccess: () => { toast.success('Status updated'); refetch(); } },
    );
  const applyAdjust = () =>
    adjust(
      {
        order_id: order.id,
        discount: Number(adj.discount) || 0,
        delivery_fee: Number(adj.delivery_fee) || 0,
        adjustment: Number(adj.adjustment) || 0,
        note: adj.note ?? '',
      },
      { onSuccess: () => refetch() },
    );

  // Generate + copy a customer payment link for online payment.
  const copyPayLink = async () => {
    try {
      const r: any = await HttpClient.post('order-pay-link', { order_id: order.id });
      if (r?.pay_link) {
        try { await navigator.clipboard.writeText(r.pay_link); } catch {}
        toast.success('Pay link copied: ' + r.pay_link);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not create pay link');
    }
  };

  // Generate the styled invoice in a print window (fixes blank download + full-page print).
  const openInvoice = () => {
    const addr: any = order.shipping_address || {};
    printInvoice({
      id: order.tracking_number,
      name: order.customer_name || order.customer?.name,
      phone: order.customer_contact,
      address: [addr.street_address, addr.city, addr.state].filter(Boolean).join(', '),
      items: (products || []).map((p: any) => ({
        title: p.name,
        qty: p?.pivot?.order_quantity || 1,
        price: Number(p?.pivot?.subtotal ?? p?.pivot?.unit_price ?? p.price) || 0,
      })),
      delivery: Number(order.delivery_fee) || 0,
      discount: Number(order.discount) || 0,
      total: Number(order.total) || 0,
      walletPoints: Number((order as any).wallet_point?.amount) || 0,
      paid: order.payment_status === 'payment-success' || Number(order.paid_total) >= Number(order.total),
      createdAt: order.created_at,
      courier: (order.ops_meta as any)?.courier || order.logistics_provider,
      note: order.note,
    }, invoiceCoupon);
  };

  const notifyMessages: Record<string, string> = {
    order: `Dear ${order.customer_name || 'Customer'}, your order #${order.tracking_number} has been received and is currently "${label(order.order_status)}". We'll update you as it progresses. Thank you for ordering with IndoBangla!`,
    payment: `Dear ${order.customer_name || 'Customer'}, an amount of ৳${Math.round(Number(order.total) - Number(order.paid_total || 0))} is due on delivery for order #${order.tracking_number}. Please keep it ready. Thank you!`,
    delivery: `Dear ${order.customer_name || 'Customer'}, your order #${order.tracking_number} is on its way via ${COURIERS.find((c) => c.key === courier)?.name || 'our courier'}. Please stay available. Thank you!`,
    custom: customMsg,
  };
  const sendWhatsApp = () => {
    const phone = String(order.customer_contact || '').replace(/[^0-9]/g, '');
    const num = phone.startsWith('88') ? phone : '88' + phone;
    const text = encodeURIComponent(notifyMessages[notifyTab] || '');
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  // Payment picture: an advance-paid pre-order owes only the remainder on delivery.
  const paid = Number(order.paid_total) || 0;
  const total = Number(order.total) || 0;
  const due = Math.max(0, total - paid);
  const fullyPaid = total > 0 && paid >= total;
  const partlyPaid = paid > 0 && paid < total;
  const advancePct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const ops = (order as any)?.ops_meta ?? {};
  const isPreorder = Boolean((order as any)?.is_preorder || ops?.advance);
  const createdBy = ops?.created_by || (order as any)?.order_created_by_name || null;

  return (
    <div className="pb-10">
      {/* ===== HERO ===== */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#2c2c2f] bg-[#1a1a1c] text-[#eaeaec]">
        {/* meta strip */}
        <div className="flex flex-wrap items-center border-b border-[#2c2c2f] bg-[#141416] text-xs">
          {[
            ['Order', <span className="font-mono text-[#eaeaec]">#{order.tracking_number}</span>],
            isPreorder ? ['Type', <span className="rounded-full bg-[#2e1518] px-2.5 py-0.5 text-[11px] font-medium text-[#f07a83]">Pre-order</span>] : null,
            ['Status', <span className="rounded-full bg-[#232326] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#c9c9cd]">{label(order.order_status)}</span>],
            ['Payment', <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize" style={fullyPaid ? { background: '#12291d', color: '#6cd39b' } : partlyPaid ? { background: '#2a2410', color: '#efc05d' } : { background: '#2e1518', color: '#f07a83' }}>{fullyPaid ? 'Paid' : partlyPaid ? 'Advance paid' : label(order.payment_status)}</span>],
            ['Method', <span className="rounded-full bg-[#232326] px-2.5 py-0.5 text-[11px] font-medium uppercase text-[#c9c9cd]">{label(order.payment_gateway || 'cash on delivery')}</span>],
            order.created_at ? ['Created', <span className="font-medium text-[#c9c9cd]">{new Date(order.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>] : null,
          ].filter(Boolean).map((item: any, i) => (
            <div key={i} className="flex flex-1 items-center gap-2 whitespace-nowrap border-[#232326] px-4 py-3.5 [&:not(:last-child)]:border-r">
              <span className="text-[10px] uppercase tracking-[0.08em] text-[#7a7a80]">{item[0]}</span>
              <span>{item[1]}</span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#5a2b2f] bg-[#2e1518] text-2xl">
                📦
              </div>
              <div>
                <h1 className="text-2xl font-medium text-white">
                  Order <span className="text-[#e63946]">#{order.tracking_number}</span>
                </h1>
                {createdBy && (
                  <p className="mt-1 text-sm text-[#9a9aa0]">
                    Created by <span className="text-[#e63946]">{createdBy}</span>
                  </p>
                )}
                <p className="mt-0.5 text-[13px] text-[#7a7a80]">
                  {order.customer_name} · {order.customer_contact}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#7a7a80]">Transaction ref</div>
              <div className="mt-1 font-mono text-sm font-medium text-[#c9c9cd]">
                {(order as any)?.transection_id || 'TXN-IB-' + order.tracking_number}
              </div>
            </div>
          </div>

          <div className="my-6 h-px bg-[#2c2c2f]" />

          <div className="grid gap-3.5 sm:grid-cols-4">
            {[
              { cap: 'Total items', val: products.length, sub: 'books' },
              { cap: 'Subtotal', val: <Money amount={order.amount} />, sub: 'before charges' },
              { cap: 'Paid', val: <Money amount={order.paid_total} />, sub: partlyPaid ? `advance ${advancePct}%` : fullyPaid ? 'settled' : 'nothing yet', tone: paid > 0 ? '#6cd39b' : '#efc05d' },
              { cap: partlyPaid ? 'Due' : 'Total payable', val: <Money amount={partlyPaid ? due : total} />, sub: fullyPaid ? 'paid' : 'on delivery', hot: true },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl p-4 ${s.hot ? 'border border-[#5a2b2f] bg-[#2e1518]' : 'bg-[#141416]'}`}>
                <div className="text-[10px] uppercase tracking-[0.06em]" style={{ color: s.hot ? '#f2969d' : '#7a7a80' }}>{s.cap}</div>
                <div className="mt-1.5 text-3xl font-medium leading-none" style={{ color: s.hot ? '#e63946' : s.tone ?? '#fff' }}>{s.val as any}</div>
                <div className="mt-1.5 text-xs" style={{ color: s.hot ? '#f2969d' : '#7a7a80' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-[#2c2c2f]" />
          <div className="flex items-center justify-center gap-2 text-[13px] text-[#7a7a80]">
            <span className="font-medium text-[#e63946]">IndoBangla</span>
            <span className="text-[#4a4a4e]">·</span>
            <span className="italic">widen your outlook on life</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ===== LEFT ===== */}
        <div className="space-y-5">
          {/* tracker */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-heading">Order tracking</h3>
            <div className="flex">
              {STEPS.map((s, i) => {
                const done = stepIdx >= 0 && i < stepIdx;
                const cur = i === stepIdx;
                return (
                  <div key={s.key} className="relative flex flex-1 flex-col items-center gap-2">
                    {i < STEPS.length - 1 && (
                      <span
                        className={`absolute left-1/2 top-4 h-0.5 w-full ${
                          i < stepIdx ? 'bg-accent' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-semibold ${
                        done
                          ? 'border-accent bg-accent text-white'
                          : cur
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span
                      className={`max-w-[74px] text-center text-[10px] leading-tight ${
                        done || cur ? 'font-semibold text-accent' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* products */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-heading">
                Products ({products.length} items)
              </h3>
            </div>
            <div className="space-y-3 p-5">
              {products.map((p: any) => {
                const img = Array.isArray(p.image)
                  ? p.image?.[0]?.thumbnail
                  : p.image?.thumbnail || p.image?.original;
                return (
                  <div key={p.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img ? (
                        <img src={img} alt="" className="h-[60px] w-[46px] shrink-0 rounded border border-gray-200 object-cover" />
                      ) : (
                        <div className="grid h-[60px] w-[46px] shrink-0 place-items-center rounded border border-gray-200 bg-white text-lg">📖</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-heading">{p.name}</div>
                        <div className="mt-1 text-[11px] text-body">
                          {p?.author?.name ? <span className="font-medium text-accent">{p.author.name}</span> : null}
                          {p?.manufacturer?.name ? ' · ' + p.manufacturer.name : ''}
                          {' · Qty: '}
                          {p?.pivot?.order_quantity ?? 1}
                        </div>
                        {p?.external_product_url && (
                          <a
                            href={p.external_product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                          >
                            🔗 View on Amazon ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-medium text-amber-800 capitalize">
                          {label(order.order_status)}
                        </span>
                        <button
                          onClick={() =>
                            editItems(
                              { order_id: order.id, remove: [p.id] },
                              { onSuccess: () => refetch() },
                            )
                          }
                          disabled={editingItems}
                          className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-body hover:border-red-400 hover:text-red-500"
                        >
                          ✕ Remove
                        </button>
                        <MoveItem
                          orderId={order.id}
                          product={p}
                          onMoved={() => refetch()}
                        />
                      </div>
                      <LinePrice
                        product={p}
                        orderId={order.id}
                        busy={editingItems}
                        onSave={(price: number, qty: number) =>
                          editItems(
                            { order_id: order.id, set: [{ product_id: p.id, quantity: qty, price }] },
                            { onSuccess: () => refetch() },
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
              {products.length === 0 && (
                <p className="text-sm text-body">No products.</p>
              )}
              {/* add product */}
              <div className="mt-2 flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search a book to add…"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-accent"
                />
                <button
                  onClick={() => search(q)}
                  disabled={!q || searching}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {searching ? '…' : 'Search'}
                </button>
              </div>
              {results.length > 0 && (
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {results.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 text-xs">
                      <span className="text-heading">{r.name} · <Money amount={r.sale_price || r.price} /></span>
                      <button
                        onClick={() =>
                          editItems(
                            { order_id: order.id, add: [{ product_id: r.id, quantity: 1 }] },
                            { onSuccess: () => refetch() },
                          )
                        }
                        className="font-semibold text-accent hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-heading">Order summary</h3>
            <div className="text-sm">
              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-body">Subtotal ({products.length} items)</span>
                <span className="font-mono font-medium"><Money amount={order.amount} /></span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-body">Delivery fee</span>
                <span className="font-mono font-medium"><Money amount={order.delivery_fee} /></span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-body">Discount</span>
                <span className="font-mono font-medium text-accent">− <Money amount={order.discount} /></span>
              </div>
              {(() => {
                const adjVal = Math.round(
                  Number(order.total) - Number(order.amount || 0) - Number(order.sales_tax || 0) -
                  Number(order.delivery_fee || 0) + Number(order.discount || 0),
                );
                return adjVal !== 0 ? (
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-body">Advanced / adjustment</span>
                    <span className={`font-mono font-medium ${adjVal < 0 ? 'text-accent' : 'text-heading'}`}>
                      {adjVal < 0 ? '− ' : '+ '}<Money amount={Math.abs(adjVal)} />
                    </span>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-body">Paid</span>
                <span className="font-mono font-medium text-accent">− <Money amount={order.paid_total} /></span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5">
              <span className="text-sm font-semibold text-accent">{partlyPaid ? 'Due on delivery' : 'Total payable'}</span>
              <span className="font-mono text-lg font-semibold text-accent"><Money amount={partlyPaid ? due : total} /></span>
            </div>
          </div>

          {/* courier & delivery */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-heading">🚚 Courier &amp; delivery</h3>
              {order.logistics_provider && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-medium capitalize text-emerald-700">
                  {order.logistics_provider} assigned
                </span>
              )}
            </div>
            <div className="p-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-body">Select courier partner</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {COURIERS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCourier(c.key)}
                    className={`rounded-lg border p-3 text-left transition ${
                      courier === c.key
                        ? 'border-accent bg-accent/5'
                        : 'border-gray-200 bg-gray-50 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.icon}</span>
                      <span className="text-xs font-semibold text-heading">{c.name}</span>
                    </div>
                    <div className="mt-1 text-[10px] leading-snug text-body">{c.detail}</div>
                    <div className={`mt-1 text-[10px] font-semibold ${courier === c.key ? 'text-accent' : 'text-gray-400'}`}>
                      {courier === c.key ? '✓ Selected' : 'Select'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    createShipment(
                      { provider: courier, order_id: order.id },
                      {
                        onSuccess: (r: any) => {
                          if (r?.tracking_id) setTrackNo(r.tracking_id);
                          toast.success(
                            `Shipment created with ${courier}${r?.tracking_id ? ' · ' + r.tracking_id : ''}`,
                          );
                          refetch();
                        },
                      },
                    )
                  }
                  disabled={shipping}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {shipping ? 'Creating…' : '📦 Create shipment'}
                </button>
              </div>

              <p className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-wide text-body">Tracking number</p>
              <div className="flex gap-2">
                <input
                  value={trackNo}
                  onChange={(e) => setTrackNo(e.target.value)}
                  placeholder="Enter / paste tracking id"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-accent"
                />
                <button
                  onClick={() =>
                    trackShipment(
                      { provider: courier, tracking_id: trackNo },
                      { onSuccess: (r: any) => setTrackResult(r) },
                    )
                  }
                  disabled={!trackNo || tracking}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  {tracking ? '…' : 'Track'}
                </button>
              </div>
              {trackResult && (
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-gray-900 p-3 text-[10px] leading-relaxed text-emerald-200">
                  {JSON.stringify(trackResult?.tracking ?? trackResult, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* notify customer */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3.5 text-sm font-semibold text-heading">
              📣 Notify customer
            </div>
            <div className="p-5">
              <div className="mb-3 flex gap-1.5 rounded-lg bg-gray-50 p-1">
                {(['order', 'payment', 'delivery', 'custom'] as const).map((tabKey) => (
                  <button
                    key={tabKey}
                    onClick={() => setNotifyTab(tabKey)}
                    className={`flex-1 rounded-md py-1.5 text-[11px] font-medium capitalize transition ${
                      notifyTab === tabKey ? 'bg-white text-accent shadow-sm' : 'text-body'
                    }`}
                  >
                    {tabKey === 'order' ? 'Order update' : tabKey === 'payment' ? 'Payment due' : tabKey === 'delivery' ? 'Delivery' : 'Custom'}
                  </button>
                ))}
              </div>
              {notifyTab === 'custom' ? (
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Write a custom message…"
                  className="min-h-[80px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-accent"
                />
              ) : (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-body">
                  {notifyMessages[notifyTab]}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={sendWhatsApp}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25d366] py-2.5 text-xs font-bold text-white hover:brightness-95"
                >
                  💬 Send on WhatsApp
                </button>
                <button
                  onClick={() => {
                    navigator?.clipboard?.writeText(notifyMessages[notifyTab] || '');
                    toast.success('Message copied');
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-semibold text-body hover:border-accent hover:text-accent"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ===== RIGHT SIDEBAR ===== */}
        <div className="space-y-4">
          {/* quick actions */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-heading">⚡ Quick actions</div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <button onClick={() => openInvoice()} className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] font-medium text-body hover:border-accent hover:text-accent">
                <span className="text-lg">🧾</span>Invoice
              </button>
              <button onClick={() => openInvoice()} className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] font-medium text-body hover:border-accent hover:text-accent">
                <span className="text-lg">🖨️</span>Print
              </button>
              <button onClick={copyPayLink} className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-700 hover:border-emerald-400">
                <span className="text-lg">🔗</span>Copy online-payment link
              </button>
            </div>
          </div>

          {/* change status */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-heading">🔄 Change status</div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-body">Order status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs capitalize outline-none focus:border-accent">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-body">Payment status</label>
                <select value={pay} onChange={(e) => setPay(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs capitalize outline-none focus:border-accent">
                  {PAYMENT_OPTIONS.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </div>
              <button onClick={saveStatus} disabled={updating} className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                {updating ? 'Saving…' : '✓ Save changes'}
              </button>
            </div>
          </div>

          {/* payment adjustment */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-heading">💵 Payment adjustment</div>
            <div className="space-y-3 p-4">
              {([
                ['Discount', 'discount'],
                ['Delivery charge', 'delivery_fee'],
                ['Advanced / adjustment (+/−)', 'adjustment'],
              ] as const).map(([l, k]) => (
                <div key={k}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-body">{l}</label>
                  <input type="number" step="any" value={(adj as any)[k]} onChange={(e) => setAdj({ ...adj, [k]: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-accent" />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-body">Note</label>
                <textarea value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} className="min-h-[52px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-accent" />
              </div>
              <button onClick={applyAdjust} disabled={adjusting} className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                {adjusting ? 'Applying…' : '+ Apply adjustment'}
              </button>
            </div>
          </div>

          {/* customer */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-heading">👤 Customer</div>
            <div className="space-y-1.5 p-4 text-xs text-body">
              <div className="text-sm font-medium text-heading">{order.customer_name}</div>
              <div>📞 {order.customer_contact}</div>
            </div>
          </div>

          {/* addresses */}
          {(order?.billing_address || order?.shipping_address) && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-heading">📍 Addresses</div>
              <div className="space-y-3 p-4 text-xs text-body">
                {order?.billing_address && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Billing</div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                      <div className="font-medium text-heading">{order.customer_name}</div>
                      <div className="mt-0.5 leading-relaxed">
                        {[order.billing_address.street_address, order.billing_address.city, order.billing_address.state, order.billing_address.country]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </div>
                    </div>
                  </div>
                )}
                {order?.shipping_address && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Shipping</div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                      <div className="font-medium text-heading">{order.customer_name}</div>
                      <div className="mt-0.5 leading-relaxed">
                        {[order.shipping_address.street_address, order.shipping_address.city, order.shipping_address.state, order.shipping_address.country]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </div>
                      <div className="mt-1">📞 {order.customer_contact}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* order info */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-heading">ℹ️ Order info</div>
            <div className="p-4 text-xs">
              {[
                ['Order', '#' + order.tracking_number],
                (order as any)?.is_preorder ? ['Type', 'Pre order'] : null,
                ['Payment method', label(order.payment_gateway || 'cash on delivery')],
                ['Order status', label(order.order_status)],
                ['Payment status', label(order.payment_status)],
                (order as any)?.order_created_by_name ? ['Created by', (order as any).order_created_by_name] : null,
                (order as any)?.order_processed_by ? ['Processed by', (order as any).order_processed_by] : null,
                ['Date', order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'],
              ].filter(Boolean).map(([k, v]: any) => (
                <div key={k as string} className="flex justify-between border-b border-gray-100 py-1.5 last:border-0">
                  <span className="text-body">{k}</span>
                  <span className="font-medium capitalize text-heading">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

OrderDetailsPage.authenticate = { permissions: adminOnly };
OrderDetailsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});

export const getStaticPaths = () => ({ paths: [], fallback: 'blocking' });
