import { useMemo, useState, useEffect } from 'react';
import { useUpdateOrderMutation } from '@/data/order';
import {
  useOrderOpsMutation,
  useCustomerStatsMutation,
  useOrderSearchMutation,
  useOrderLifecycleMutation,
} from '@/data/order-ops';
import Link from '@/components/ui/link';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';
import { printInvoice, type InvoiceCoupon } from './print-invoice';
import { useCreateShipmentMutation } from '@/data/courier-order';
import { useSettingsQuery, useUpdateSettingsMutation } from '@/data/settings';
import { useRouter } from 'next/router';

/**
 * The promo line has always printed, so a settings row without the key must keep
 * printing it — the switch is there to turn it *off*, not to silently drop it.
 */
const COUPON_FALLBACK: InvoiceCoupon = { enabled: true, code: 'WELCOME50', amount: 50 };

const COURIERS = ['RedX', 'Steadfast', 'Pathao', 'Paperfly', 'Sundarban', 'Pickup by user', 'Self delivery'];

/** Mirror of the backend orderOps merge so the UI can update instantly (optimistic). */
function applyPatch(prev: any, patch: any, actor = 'You') {
  const ops: any = {
    call_status: 'none', call_attempts: 0, message_status: 'none',
    print_status: 'none', print_count: 0, notes: [], events: [], ...(prev || {}),
  };
  const now = new Date().toISOString();
  const log = (type: string, desc: string) => (ops.events = [...ops.events, { type, description: desc, actor, at: now }]);
  if ('call_status' in patch) { ops.call_status = patch.call_status; if (patch.call_status !== 'none') log('call_status_changed', `Call marked: ${patch.call_status}`); }
  if (patch.call_attempt) { ops.call_attempts = (ops.call_attempts || 0) + 1; log('call_attempt', `Call attempt #${ops.call_attempts} logged`); }
  if ('message_status' in patch) { ops.message_status = patch.message_status; log(patch.message_status === 'sent' ? 'message_sent' : 'message_unsent', patch.message_status === 'sent' ? 'Confirmation message sent' : 'Message marked not sent'); }
  if (patch.print === 'send') { const rp = ops.print_status !== 'none'; ops.print_status = 'sent'; log(rp ? 'print_reprint' : 'print_command_sent', `${rp ? 'Reprint' : 'Print'} command sent — slip confirm pending`); }
  if (patch.print === 'confirm') { ops.print_status = 'confirmed'; ops.print_count = (ops.print_count || 0) + 1; log('print_confirmed', `Slip printed — confirmed (${ops.print_count}×)`); }
  if (patch.add_note?.text) { ops.notes = [...ops.notes, { role: 'moderator', who: actor, text: patch.add_note.text, at: now }]; log('note_added', 'Note added'); }
  if ('courier' in patch) { ops.courier = patch.courier; if (patch.courier) log('courier_assigned', `Courier set: ${patch.courier}`); }
  if ('tier' in patch) ops.tier = patch.tier;
  if ((patch.bank_proof === 'confirm' || patch.bank_proof === 'reject') && ops.bank_proof?.status === 'pending_review') {
    const ok = patch.bank_proof === 'confirm';
    ops.bank_proof = {
      ...ops.bank_proof,
      status: ok ? 'confirmed' : 'rejected',
      reviewed_by: actor,
      reviewed_at: now,
      ...(patch.bank_proof_note ? { review_note: patch.bank_proof_note } : {}),
    };
    // The Paid chip reads order.payment_status, not ops — it catches up on the next refetch.
    log(ok ? 'bank_proof_confirmed' : 'bank_proof_rejected',
      ok ? `Bank transfer verified — ৳${Math.round(Number(ops.bank_proof.amount_bdt) || 0)} credited` : 'Bank slip rejected — customer may re-upload');
  }
  return ops;
}

/* ---------- config ---------- */
const TIERS: Record<string, any> = {
  new: { label: 'New', emoji: '🆕', badge: 'bg-slate-100 text-slate-600 ring-slate-300', skipCall: false, guide: 'New customer — call to verify address & order. Avoid confirming big orders without advance.' },
  regular: { label: 'Regular', emoji: '🛡️', badge: 'bg-sky-50 text-sky-700 ring-sky-300', skipCall: true, guide: 'Regular customer — call verify optional. Send a message and move straight to Ready to ship.' },
  prime: { label: 'Prime', emoji: '✨', badge: 'bg-violet-50 text-violet-700 ring-violet-300', skipCall: true, guide: 'Prime customer — no call needed, direct delivery. Priority packing, free-delivery eligible.' },
  star: { label: 'Star', emoji: '👑', badge: 'bg-amber-50 text-amber-700 ring-amber-300', skipCall: true, guide: 'Star customer ⭐ — highest priority. Skip call, send a thank-you message, best packaging & fastest courier.' },
  risky: { label: 'Watch', emoji: '⛔', badge: 'bg-rose-50 text-rose-700 ring-rose-300', skipCall: false, guide: 'Return/refuse history — do NOT ship without a clear phone confirmation. Advance payment preferred.' },
};
const ROLES: Record<string, any> = {
  admin: { label: 'Admin', chip: 'bg-rose-600 text-white', bubble: 'bg-rose-50 ring-rose-200 text-rose-900' },
  moderator: { label: 'Moderator', chip: 'bg-sky-600 text-white', bubble: 'bg-sky-50 ring-sky-200 text-sky-900' },
  user: { label: 'Customer', chip: 'bg-slate-500 text-white', bubble: 'bg-slate-50 ring-slate-200 text-slate-700' },
};
const PRINT: Record<string, any> = {
  none: { label: 'Not printed', chip: 'ring-slate-200 bg-white text-slate-400' },
  sent: { label: 'Command sent — confirm slip', chip: 'ring-amber-300 bg-amber-50 text-amber-700' },
  confirmed: { label: 'Slip printed ✓', chip: 'ring-emerald-300 bg-emerald-50 text-emerald-700' },
};
const STATUS: Record<string, any> = {
  // `bar` drives the card's left border so a card's status is readable at a glance:
  // pending = red, ready = amber, shipped = blue, transit = teal, delivered = green.
  pending: { label: 'Pending', chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', bar: 'border-l-rose-500' },
  ready: { label: 'Ready to ship', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', bar: 'border-l-amber-500' },
  shipped: { label: 'Shipped', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', bar: 'border-l-sky-500' },
  transit: { label: 'In transit', chip: 'bg-teal-50 text-teal-700 ring-teal-200', dot: 'bg-teal-500', bar: 'border-l-teal-500' },
  hold: { label: 'On-Hold', chip: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500', bar: 'border-l-orange-500' },
  delivered: { label: 'Delivered', chip: 'bg-emerald-600 text-white ring-emerald-600', dot: 'bg-white', bar: 'border-l-emerald-500' },
  partial: { label: 'Partial Delivered', chip: 'bg-lime-50 text-lime-700 ring-lime-200', dot: 'bg-lime-500', bar: 'border-l-lime-500' },
  returned: { label: 'Returned', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', bar: 'border-l-slate-400' },
  void: { label: 'Canceled', chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', bar: 'border-l-rose-500' },
};
const CALL: Record<string, any> = {
  none: { label: 'Not called', emoji: '📞', chip: 'ring-slate-200 bg-white text-slate-400' },
  verified: { label: 'Verified', emoji: '✅', chip: 'ring-emerald-300 bg-emerald-50 text-emerald-700' },
  noanswer: { label: 'No answer', emoji: '📵', chip: 'ring-rose-300 bg-rose-50 text-rose-700' },
  callback: { label: 'Call back', emoji: '🔁', chip: 'ring-amber-300 bg-amber-50 text-amber-700' },
};
// order_status <-> board bucket
const TO_BUCKET: Record<string, string> = {
  'order-pending': 'pending',
  'order-processing': 'ready',
  'order-at-local-facility': 'ready',
  'order-shipped': 'shipped',
  'order-out-for-delivery': 'shipped',
  'order-in-transit': 'transit',
  'order-on-hold': 'hold',
  'order-completed': 'delivered',
  'order-partial-delivered': 'partial',
  'order-cancelled': 'returned',
  'order-refunded': 'returned',
};
const STATUS_OPTIONS = [
  ['order-pending', 'Pending'],
  ['order-processing', 'Ready to ship'],
  ['order-at-local-facility', 'At facility'],
  ['order-shipped', 'Shipped'],
  ['order-out-for-delivery', 'Out for delivery'],
  ['order-in-transit', 'In transit'],
  ['order-on-hold', 'On-Hold'],
  ['order-completed', 'Delivered'],
  ['order-partial-delivered', 'Partial Delivered'],
  ['order-cancelled', 'Cancelled'],
  ['order-refunded', 'Refunded'],
];
const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const isOpen = (b: string) => !['delivered', 'returned'].includes(b);

function computeTier(cs: any, override?: string) {
  if (override) return override;
  const total = cs?.total || 0;
  const ret = cs?.returned || 0;
  const rate = total ? ret / total : 0;
  if (ret >= 2 && rate > 0.2) return 'risky';
  if (total >= 30 && ret === 0) return 'star';
  if (total >= 15 && rate <= 0.1) return 'prime';
  if (total >= 5 && rate <= 0.2) return 'regular';
  return 'new';
}

function mapOrder(o: any, stats: any) {
  const ops = o.ops_meta || {};
  const items = (o.products || []).map((p: any) => ({
    title: p.name,
    qty: Number(p?.pivot?.order_quantity) || 1,
    price: Number(p?.pivot?.subtotal ?? p?.pivot?.unit_price ?? p.price) || 0,
  }));
  const created = o.created_at ? new Date(o.created_at) : new Date();
  const ageDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
  const cs = stats?.[o.customer_id] || {};
  const addr = o.shipping_address || {};
  return {
    _id: o.id,
    id: o.tracking_number,
    by: o.order_created_by_name ? 'by admin' : 'by customer',
    source: ops.created_by || null,          // 'ReplyGenie' etc. — set by the agent/API
    sourceKey: (ops.source || '').toLowerCase(),
    bucket: ops.void ? 'void' : (TO_BUCKET[o.order_status] || 'pending'),
    order_status: o.order_status,
    paid: o.payment_status === 'payment-success' || (Number(o.paid_total) >= Number(o.total) && Number(o.total) > 0),
    paidTotal: Number(o.paid_total) || 0,
    isPreorder: Boolean(o.is_preorder || ops.advance),
    delivery: Number(o.delivery_fee) || 0,
    discount: Number(o.discount) || 0,
    total: Number(o.total) || 0,
    paymentGateway: o.payment_gateway || 'CASH_ON_DELIVERY',
    createdAt: o.created_at,
    note: o.note || '',
    ageDays,
    name: o.customer_name || o.customer?.name || 'Customer',
    phone: o.customer_contact,
    address: [addr.street_address, addr.city, addr.state].filter(Boolean).join(', '),
    items,
    // Settled at checkout and NOT subtracted from `total` — the slip and the payable chip
    // both have to take it off themselves.
    walletPoints: Number(o.wallet_point?.amount) || 0,
    bankProof: ops.bank_proof || null,   // customer-uploaded transfer slip awaiting review
    payMethod: ops.pay_method || (ops.bkash?.trx_id ? 'bkash' : ops.bank_proof ? 'bank' : null),
    bkashTrx: ops.bkash?.trx_id || null,
    paidAmount: ops.bkash?.amount_bdt ?? ops.bank_proof?.amount_bdt ?? null,
    paymentVerified: Boolean(ops.payment_verified),
    courier: ops.courier || o.logistics_provider || '',
    courierTrackingId: ops.courier_tracking_id || '',
    courierArea: ops.courier_area || '',
    tier: computeTier(cs, ops.tier),
    totalOrders: cs.total || 0,
    deliveredOrders: cs.delivered || 0,
    returnedOrders: cs.returned || 0,
    call: ops.call_status || 'none',
    callAttempts: ops.call_attempts || 0,
    msg: ops.message_status || 'none',
    print: ops.print_status || 'none',
    printCount: ops.print_count || 0,
    notes: ops.notes || [],
    events: ops.events || [],
  };
}

function aging(o: any) {
  if (!isOpen(o.bucket)) return { days: o.ageDays, accent: 'border-l-emerald-500', pill: 'bg-emerald-50 text-emerald-700' };
  const d = o.ageDays;
  if (d <= 1) return { days: d, accent: 'border-l-emerald-400', pill: 'bg-emerald-50 text-emerald-700' };
  if (d <= 3) return { days: d, accent: 'border-l-amber-400', pill: 'bg-amber-50 text-amber-700' };
  if (d <= 6) return { days: d, accent: 'border-l-orange-500', pill: 'bg-orange-50 text-orange-700' };
  return { days: d, accent: 'border-l-rose-600', pill: 'bg-rose-50 text-rose-700' };
}
/**
 * Every check that can raise the Attention flag, with the exact action that clears it.
 * `blocking: false` means that check is already satisfied — the admin sees a green tick,
 * so they know what's done as well as what's left.
 */
function attentionChecks(o: any) {
  const tier = TIERS[o.tier];
  const callProblem = !tier.skipCall && (o.call === 'none' || o.call === 'noanswer');
  return [
    {
      key: 'call',
      blocking: callProblem,
      todo: 'Call the customer and verify the order & address',
      how: 'Tap 📞 Called ✓ once they confirm.',
      done: tier.skipCall ? `${tier.label} customer — no call needed ✓` : 'Customer verified by phone ✓',
    },
    {
      key: 'age',
      blocking: o.ageDays >= 3,
      todo: `Order is ${o.ageDays} days old — move it forward today`,
      how: 'Confirm it, or ship it, so it leaves the pending pile.',
      done: 'Fresh order — well within the 3-day window ✓',
    },
    {
      key: 'risk',
      blocking: o.tier === 'risky',
      todo: 'Watch-list customer (return/refuse history)',
      how: 'Do NOT ship without a clear phone confirmation — advance payment preferred.',
      done: 'Customer has a clean order history ✓',
    },
    {
      key: 'print',
      blocking: o.print === 'sent',
      todo: 'Print command sent but the slip was never confirmed',
      how: 'If the slip printed, tap "Slip received ✓" — otherwise Reprint.',
      done: o.print === 'confirmed' ? 'Packing slip confirmed ✓' : 'No slip pending ✓',
    },
  ];
}
function needsAttention(o: any) {
  if (!isOpen(o.bucket)) return false;
  return attentionChecks(o).some((c) => c.blocking);
}
function nextStep(o: any) {
  const tier = TIERS[o.tier];
  if (o.print === 'sent') return { emoji: '🖨️', tone: 'amber', text: 'Print command sent but slip not confirmed — check the printer. If the slip came out tap "Slip received ✓", otherwise Reprint.' };
  if (o.bucket === 'pending') {
    if (o.tier === 'risky') return { emoji: '⛔', tone: 'rose', text: 'Watch-list customer: do NOT ship without a clear phone confirmation. Advance preferred.' };
    if (tier.skipCall && o.msg !== 'sent') return { emoji: '⚡', tone: 'emerald', text: `${tier.label} customer — skip the call, send a confirmation message and move to Ready to ship.` };
    if (tier.skipCall) return { emoji: '⚡', tone: 'emerald', text: `${tier.label} customer — message sent ✓. Confirm and move to packing.` };
    if (o.call === 'none') return { emoji: '📞', tone: 'sky', text: 'First job: call the customer and verify the order & address.' };
    if (o.call === 'noanswer') return { emoji: '🔁', tone: 'amber', text: `${o.callAttempts} attempts, no answer. Try again in 2–3 hours. Escalate to admin after 3+.` };
    if (o.call === 'callback') return { emoji: '🔁', tone: 'amber', text: 'Customer asked to be called at a specific time — check the note and call then.' };
    return { emoji: '▶️', tone: 'emerald', text: 'Call verified ✓ — tap "Confirm order" to move to Ready to ship.' };
  }
  if (o.bucket === 'ready') return o.print === 'none'
    ? { emoji: '🖨️', tone: 'sky', text: 'Print the invoice slip, then add the parcel to the courier pickup list.' }
    : { emoji: '🚚', tone: 'sky', text: 'Slip ready ✓ — prepare the parcel for courier pickup.' };
  if (o.bucket === 'shipped' || o.bucket === 'transit') return { emoji: '🚚', tone: 'teal', text: 'Check tracking. If in transit for more than 3 days, call the courier.' };
  if (o.bucket === 'delivered') return { emoji: '✅', tone: 'emerald', text: 'Delivered ✓ — you can send a review-request message.' };
  return { emoji: '🕘', tone: 'slate', text: 'Return processed — add a stock-return entry.' };
}
const TONE: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  slate: 'bg-slate-50 text-slate-700 ring-slate-200',
};

/* ---------- card ---------- */
function OrderCard({ o, act, busy, coupon }: any) {
  const [open, setOpen] = useState(false);
  const [showAttn, setShowAttn] = useState(false);
  const [draft, setDraft] = useState('');
  const [bkashCharge, setBkashCharge] = useState(false);
  const [linking, setLinking] = useState(false);
  // Create + copy the online (bKash) pay link straight from the board, so it can be sent
  // without opening the order. bKash charge box adds the 1.85% gateway fee to the bill.
  async function copyPayLink() {
    setLinking(true);
    try {
      const r: any = await HttpClient.post('order-pay-link', {
        order_id: o._id,
        bkash_charge: bkashCharge,
      });
      if (r?.pay_link) {
        try {
          await navigator.clipboard.writeText(r.pay_link);
        } catch {}
        toast.success(
          bkashCharge
            ? `Pay link copied — ৳${r.amount_bdt} (incl. ৳${r.bkash_charge} bKash charge)`
            : `Pay link copied — ৳${r.amount_bdt}`,
        );
      } else {
        toast.error('Could not create the pay link.');
      }
    } catch {
      toast.error('Could not create the pay link.');
    } finally {
      setLinking(false);
    }
  }
  // Mint + copy the shareable invoice link — the buyer opens it to view their invoice without
  // the order being touched. The token is stable, so a sent link keeps working.
  const [invLinking, setInvLinking] = useState(false);
  async function copyInvoiceLink() {
    setInvLinking(true);
    try {
      const r: any = await HttpClient.post('order-invoice-link', { order_id: o._id });
      if (r?.invoice_link) {
        try {
          await navigator.clipboard.writeText(r.invoice_link);
        } catch {}
        toast.success('Invoice link copied.');
      } else {
        toast.error('Could not create the invoice link.');
      }
    } catch {
      toast.error('Could not create the invoice link.');
    } finally {
      setInvLinking(false);
    }
  }
  const ag = aging(o);
  const st = STATUS[o.bucket];
  const attn = needsAttention(o);
  const checks = attentionChecks(o);
  const isPartial = o.paidTotal > 0 && !o.paid;
  const tier = TIERS[o.tier];
  const hint = nextStep(o);
  const itemsTotal = o.items.reduce((s: number, it: any) => s + it.price, 0);
  const qtyTotal = o.items.reduce((s: number, it: any) => s + it.qty, 0);
  // Wallet points are already paid, so they must come off what the courier collects — the
  // printed slip does the same. (Discount is already reflected in the line prices.)
  const payable = Math.max(0, itemsTotal + o.delivery - o.walletPoints);
  const rate = o.totalOrders ? Math.round((o.deliveredOrders / o.totalOrders) * 100) : 0;
  const c = CALL[o.call];
  const p = PRINT[o.print];

  return (
    <div className={`overflow-hidden rounded-2xl border-l-4 bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md ${st?.bar || ag.accent}`}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-2.5">
        <div className={`flex items-baseline gap-1 rounded-lg px-2 py-0.5 font-bold ${ag.pill}`}>
          <span className="text-base leading-none">{ag.days}</span>
          <span className="text-[10px] tracking-wide">DAY{ag.days === 1 ? '' : 'S'}</span>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${st.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
        </span>
        <span className="font-mono text-sm font-bold text-slate-800">#{o.id}</span>
        <span className="hidden text-[11px] text-slate-400 sm:inline">{o.by}</span>
        {attn ? (
          <button
            onClick={() => setShowAttn((v: boolean) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-700"
            title="What clears this?"
          >
            ⚠️ Attention ({checks.filter((c: any) => c.blocking).length}) {showAttn ? '▲' : '▼'}
          </button>
        ) : isOpen(o.bucket) ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            ✅ All clear
          </span>
        ) : null}
        {/* #2 — orders placed by the agent/API, not by a human on the website */}
        {o.source && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200" title={`Placed via ${o.source}`}>
            🤖 {o.source}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <span className={`mr-1 rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${o.paid ? 'bg-emerald-50 text-emerald-700 ring-emerald-300' : isPartial ? 'bg-amber-50 text-amber-700 ring-amber-300' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
            {o.paid ? 'PAID ✓' : isPartial ? `PARTIAL · ${bdt(o.paidTotal)}` : 'UNPAID'}
          </span>
          <Link href={`/orders/${o._id}`} className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700" title="Open full order">👁 View</Link>
          <button onClick={() => setOpen(!open)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-slate-100 hover:text-slate-700 ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-500'}`}>
            🕘 Log{o.notes.length > 0 && <span className="rounded-full bg-sky-600 px-1.5 text-[10px] font-bold text-white">{o.notes.length}</span>} {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* what exactly is holding this order's Attention flag — and what clears it */}
      {showAttn && (
        <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-rose-700">
            ⚠️ Clear these {checks.filter((c: any) => c.blocking).length} item(s) and the flag goes away
          </div>
          <div className="space-y-1.5">
            {checks.map((c: any) => (
              <div key={c.key} className="flex items-start gap-2 text-[12px]">
                <span className="mt-px shrink-0">{c.blocking ? '⬜' : '✅'}</span>
                {c.blocking ? (
                  <span className="text-slate-700">
                    <b className="text-rose-700">{c.todo}</b>
                    <span className="block text-[11px] text-slate-500">{c.how}</span>
                  </span>
                ) : (
                  <span className="text-emerald-700">{c.done}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-rose-200 pt-2 text-[11px] text-slate-500">
            সব টিক পড়লেই ⚠️ Attention চলে যাবে আর <b className="text-emerald-700">✅ All clear</b> দেখাবে।
          </div>
        </div>
      )}

      {/* body */}
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-12">
        {/* customer */}
        <div className="space-y-2 md:col-span-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">👤 {o.name}</div>
            <a href={`tel:${o.phone}`} className="mt-0.5 block font-mono text-[13px] text-slate-600 hover:text-emerald-700">📞 {o.phone}</a>
            {o.address && <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-500">📍 {o.address}</div>}
          </div>
          {/* intel */}
          <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tier.badge}`}>{tier.emoji} {tier.label}</span>
              <span className="text-[11px] font-semibold text-slate-600">{o.totalOrders} orders</span>
              {o.totalOrders > 0 && (
                <span className={`text-[11px] font-semibold ${rate >= 90 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{rate}% delivered</span>
              )}
              {o.returnedOrders > 0 && <span className="text-[11px] font-semibold text-rose-600">{o.returnedOrders} return</span>}
            </div>
            <p className="text-[11px] leading-snug text-slate-600">💡 {tier.guide}</p>
          </div>
        </div>

        {/* comm tracker */}
        <div className="md:col-span-4">
          <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-200">
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${c.chip}`}>{c.emoji} {c.label}</span>
              <button onClick={() => act.ops(o._id, { call_attempt: true })} disabled={busy} className="text-[11px] font-medium text-slate-500 hover:text-slate-800">
                📞 {o.callAttempts > 0 ? `${o.callAttempts} attempts · +1` : '+attempt'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[['verified', 'Verified', 'text-emerald-700 hover:bg-emerald-100'], ['noanswer', 'No ans.', 'text-rose-700 hover:bg-rose-100'], ['callback', 'Callback', 'text-amber-700 hover:bg-amber-100'], ['none', 'Reset', 'text-slate-500 hover:bg-slate-200']].map(([key, lbl, cls]) => (
                <button key={key} onClick={() => act.ops(o._id, { call_status: key })} disabled={busy} className={`rounded-md px-1 py-1 text-[11px] font-medium ${cls} ${o.call === key ? 'bg-white ring-2 ring-slate-300' : 'bg-white/70'}`}>{lbl}</button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${o.msg === 'sent' ? 'ring-emerald-300 bg-emerald-50 text-emerald-700' : 'ring-slate-200 bg-white text-slate-400'}`}>
                {o.msg === 'sent' ? '💬 Message sent ✓' : '💬 Not sent'}
              </span>
              <button onClick={() => act.ops(o._id, { message_status: o.msg === 'sent' ? 'none' : 'sent' })} disabled={busy} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${o.msg === 'sent' ? 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {o.msg === 'sent' ? 'Undo' : 'Mark sent'}
              </button>
            </div>
          </div>
        </div>

        {/* items + money + print + action */}
        <div className="flex flex-col gap-2 text-sm md:col-span-4">
          <div className="rounded-xl p-2.5 ring-1 ring-slate-200">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">📚 {qtyTotal} books · {o.items.length} title</div>
            {o.items.slice(0, 4).map((it: any, i: number) => (
              <div key={i} className="flex items-baseline justify-between gap-2 py-0.5 text-[12px]">
                <span className="truncate text-slate-600">{it.qty}× {it.title}</span>
                <span className="shrink-0 font-medium text-slate-700">{bdt(it.price)}</span>
              </div>
            ))}
            <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1">
              <div className="flex justify-between text-[12px] text-slate-500"><span>Delivery</span><span>{bdt(o.delivery)}</span></div>
              {/* A pre-order advance is money already in hand — the board must show it,
                  not just the order detail page. */}
              {o.paidTotal > 0 && o.paidTotal < payable ? (
                <>
                  <div className="flex justify-between text-[12px] font-semibold text-amber-700">
                    <span>✅ Advance paid</span><span>{bdt(o.paidTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>💵 Due on delivery</span><span>{bdt(payable - o.paidTotal)}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Partial · {Math.round((o.paidTotal / payable) * 100)}% received · total {bdt(payable)}
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>💵 {o.paid ? 'Paid' : 'Payable'}</span><span>{bdt(payable)}</span>
                </div>
              )}
            </div>
          </div>

          {/* bKash transaction — amount + trx id so the admin can cross-check */}
          {o.bkashTrx && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-pink-50/70 p-2.5 ring-1 ring-pink-200">
              <span className="text-[11px] font-bold uppercase tracking-wide text-pink-500">🔴 bKash</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-slate-700">{o.bkashTrx}</span>
                {o.paidAmount != null && (
                  <span className="text-[12px] font-bold text-emerald-700">{bdt(o.paidAmount)}</span>
                )}
                {o.paymentVerified && <span className="text-[10.5px] font-bold text-emerald-600">✓</span>}
              </span>
            </div>
          )}

          {/* bank transfer slip — money only moves when an admin says so */}
          {o.bankProof && (
            <div className={`rounded-xl p-2.5 ring-1 ${o.bankProof.status === 'pending_review' ? 'bg-amber-50/70 ring-amber-300' : o.bankProof.status === 'confirmed' ? 'bg-emerald-50/60 ring-emerald-200' : 'bg-rose-50/60 ring-rose-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">🏦 Bank transfer slip</span>
                <span className={`text-[10.5px] font-bold ${o.bankProof.status === 'pending_review' ? 'text-amber-700' : o.bankProof.status === 'confirmed' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {o.bankProof.status === 'pending_review' ? 'Needs check' : o.bankProof.status === 'confirmed' ? 'Verified ✓' : 'Rejected'}
                </span>
              </div>

              <div className="mt-2 flex items-start gap-2.5">
                {o.bankProof.url && (
                  <a href={o.bankProof.url} target="_blank" rel="noreferrer" title="Open full size" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.bankProof.thumbnail || o.bankProof.url} alt="Bank slip" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-300 hover:ring-emerald-400" />
                  </a>
                )}
                <div className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600">
                  <div>Customer says they sent <b className="text-slate-900">{bdt(o.bankProof.amount_bdt)}</b></div>
                  {o.bankProof.submitted_at && (
                    <div className="text-slate-400">Uploaded {new Date(o.bankProof.submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                  {o.bankProof.reviewed_by && (
                    <div className="text-slate-400">By {o.bankProof.reviewed_by}</div>
                  )}
                </div>
              </div>

              {o.bankProof.status === 'pending_review' && (
                <>
                  <p className="mt-2 text-[10.5px] leading-snug text-amber-800">
                    Check the amount against the bank statement before confirming — this credits the payment.
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <button onClick={() => act.ops(o._id, { bank_proof: 'confirm' })} disabled={busy} className="rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">✓ Money received</button>
                    <button
                      onClick={() => {
                        const note = window.prompt('Why is this slip rejected? (shown to the customer)') ?? '';
                        act.ops(o._id, { bank_proof: 'reject', bank_proof_note: note.trim() });
                      }}
                      disabled={busy}
                      className="rounded-lg bg-white px-2 py-1.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-300 hover:bg-rose-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* print tracker — two step */}
          <div className={`rounded-xl p-2.5 ring-1 ${o.print === 'confirmed' ? 'bg-emerald-50/60 ring-emerald-200' : o.print === 'sent' ? 'bg-amber-50/70 ring-amber-300' : 'bg-white ring-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${p.chip}`}>🖨️ {p.label}</span>
              {o.printCount > 0 && <span className="text-[10px] font-medium text-slate-400">{o.printCount}× printed</span>}
            </div>
            {o.print === 'none' && (
              <button onClick={() => { printInvoice(o, coupon); act.ops(o._id, { print: 'send' }); }} disabled={busy} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-slate-900">🖨️ Print slip</button>
            )}
            {o.print === 'sent' && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10.5px] leading-snug text-amber-800">Check whether the slip actually came out of the printer:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => act.ops(o._id, { print: 'confirm' })} disabled={busy} className="rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">✓ Slip received</button>
                  <button onClick={() => { printInvoice(o, coupon); act.ops(o._id, { print: 'send' }); }} disabled={busy} className="rounded-lg bg-white px-2 py-1.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-300 hover:bg-amber-100">↻ Reprint</button>
                </div>
              </div>
            )}
            {o.print === 'confirmed' && (
              <button onClick={() => { printInvoice(o, coupon); act.ops(o._id, { print: 'send' }); }} disabled={busy} className="mt-2 w-full rounded-lg bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">↻ Reprint if needed</button>
            )}
          </div>

          {/* courier + status control */}
          <div className="rounded-xl p-2.5 ring-1 ring-slate-200">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span>🚚 Courier</span>
              {o.courier && <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{o.courier}</span>}
            </div>
            <select value={o.courier || ''} onChange={(e) => act.ops(o._id, { courier: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-400">
              <option value="">Select courier…</option>
              {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="mt-1.5 flex items-center gap-1.5">
              <select value={o.order_status} onChange={(e) => act.status(o._id, e.target.value)} disabled={busy} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-400" title="Change order status">
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {o.bucket === 'pending' && (
                <button onClick={() => act.status(o._id, 'order-processing')} disabled={busy} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700">▶ Confirm</button>
              )}
            </div>
            {!o.courier && ['shipped', 'transit'].includes(o.bucket) && (
              <p className="mt-1 text-[10.5px] font-medium text-amber-600">⚠️ Select a courier for this shipment.</p>
            )}

            {/* Send to courier + show the returned tracking id & area */}
            {o.courier && !['pickupbyuser', 'selfdelivery'].includes(String(o.courier).toLowerCase().replace(/\s+/g, '')) && (
              <div className="mt-1.5">
                {o.courierTrackingId ? (
                  <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 ring-1 ring-emerald-200">
                    <div className="text-[11px] font-semibold text-emerald-800">✓ Courier entry confirmed</div>
                    <div className="mt-0.5 text-[11px] text-emerald-700">
                      Tracking: <span className="font-mono font-bold">{o.courierTrackingId}</span>
                    </div>
                    {o.courierArea && (
                      <div className="text-[11px] text-emerald-700">Area: <span className="font-semibold">{o.courierArea}</span></div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => act.ship(o._id, o.courier)}
                    disabled={busy}
                    className="w-full rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    🚚 Send to {o.courier} & get tracking ID
                  </button>
                )}
              </div>
            )}

            {/* lifecycle: void / archive — and undo from the Void/Archived tabs */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
              {o.bucket === 'void' ? (
                <button
                  onClick={() => act.lifecycle(o._id, 'unvoid')}
                  disabled={busy}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                  title="Restore this order to its previous status and re-commit stock (super-admin)"
                >
                  ↩ Unvoid
                </button>
              ) : o.archived_at ? (
                <button
                  onClick={() => act.lifecycle(o._id, 'unarchive')}
                  disabled={busy}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                  title="Put this order back on the working list"
                >
                  🗄️ Unarchive
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm('Void this order? Its stock is released and it leaves the working list.'))
                        act.lifecycle(o._id, 'void');
                    }}
                    disabled={busy}
                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
                    title="Mark as never-a-real-order: releases stock and archives it"
                  >
                    🚫 Void
                  </button>
                  <button
                    onClick={() => act.lifecycle(o._id, 'archive')}
                    disabled={busy}
                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    title="Hide from the working list without changing status"
                  >
                    🗄️ Archive
                  </button>
                </>
              )}
              {/* online pay link — copy/send it without opening the order, with an optional bKash charge */}
              <div className="ml-auto flex items-center gap-2">
                <label
                  className="flex cursor-pointer items-center gap-1 text-[10.5px] font-medium text-slate-500"
                  title="Add bKash's 1.85% service charge to the amount the link collects"
                >
                  <input
                    type="checkbox"
                    checked={bkashCharge}
                    onChange={(e) => setBkashCharge(e.target.checked)}
                    className="h-3 w-3"
                  />
                  bKash charge
                </label>
                <button
                  onClick={copyPayLink}
                  disabled={linking}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
                  title="Create & copy the online payment (bKash) link for this order"
                >
                  🔗 {linking ? '…' : 'Pay link'}
                </button>
                <button
                  onClick={copyInvoiceLink}
                  disabled={invLinking}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                  title="Create & copy a shareable invoice link the buyer can open to view their invoice"
                >
                  🧾 {invLinking ? '…' : 'Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* smart hint */}
      <div className={`mx-4 mb-3 flex items-start gap-2 rounded-xl px-3 py-2 ring-1 ${TONE[hint.tone]}`}>
        <span className="shrink-0">{hint.emoji}</span>
        <p className="text-[12px] font-medium leading-snug"><span className="font-bold">Next step:</span> {hint.text}</p>
      </div>

      {/* expandable: notes + log */}
      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">📝 Notes ({o.notes.length})</div>
            <div className="space-y-2">
              {o.notes.map((n: any, i: number) => {
                const r = ROLES[n.role] || ROLES.moderator;
                return (
                  <div key={i} className={`rounded-xl px-3 py-2 ring-1 ${r.bubble}`}>
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${r.chip}`}>{r.label}</span>
                      <span className="text-[11px] font-semibold">{n.who}</span>
                      <span className="ml-auto text-[10px] opacity-60">{n.at ? new Date(n.at).toLocaleString() : ''}</span>
                    </div>
                    <p className="text-[12px] leading-snug">{n.text}</p>
                  </div>
                );
              })}
              {o.notes.length === 0 && <p className="text-[11px] text-slate-400">No notes yet — add the first one.</p>}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { act.ops(o._id, { add_note: { text: draft.trim() } }); setDraft(''); } }} placeholder="Add a moderator note…" className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-sky-400" />
              <button onClick={() => { if (draft.trim()) { act.ops(o._id, { add_note: { text: draft.trim() } }); setDraft(''); } }} disabled={busy} className="rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-sky-700">Add</button>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">📋 Activity log</div>
            <div>
              {[...o.events].reverse().map((l: any, i: number) => (
                <div key={i} className="relative flex gap-2.5 pb-2.5 last:pb-0">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${/confirm|sent|delivered|verified/.test(l.type) ? 'bg-emerald-500' : /attempt|reprint|command/.test(l.type) ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium leading-snug text-slate-700">{l.description}</div>
                    <div className="text-[10px] text-slate-400">{l.actor}{l.at ? ' · ' + new Date(l.at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}
              {o.events.length === 0 && <p className="text-[11px] text-slate-400">No activity yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- board ---------- */
export default function IndoOrderBoard({ orders = [], loading }: { orders: any[]; loading?: boolean }) {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [stats, setStats] = useState<any>({});
  const [localOps, setLocalOps] = useState<Record<string, any>>({});
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const { locale } = useRouter();
  const { settings } = useSettingsQuery({ language: locale as string });
  const options: any = (settings as any)?.options;
  const coupon: InvoiceCoupon = options?.invoiceCoupon ?? COUPON_FALLBACK;
  const { mutate: updateSettings, isLoading: savingCoupon } = useUpdateSettingsMutation();

  // Typing shouldn't fire a save per keystroke — the inputs hold a draft and commit on blur.
  const [couponDraft, setCouponDraft] = useState({ code: '', amount: '' });
  useEffect(() => {
    setCouponDraft({ code: String(coupon.code ?? ''), amount: String(coupon.amount ?? '') });
  }, [coupon.code, coupon.amount]);

  const saveCoupon = (patch: Partial<InvoiceCoupon>) => {
    // `options` is written back whole, so never save before it has loaded — that would
    // blank out every other setting on the row.
    if (!options) return;
    updateSettings({
      language: locale,
      options: { ...options, invoiceCoupon: { ...coupon, ...patch } },
    } as any);
  };

  const { mutate: updateOrder, isLoading: updating } = useUpdateOrderMutation();
  const { mutate: ops } = useOrderOpsMutation();
  const { mutate: fetchStats } = useCustomerStatsMutation();
  const { mutate: runSearch, isLoading: searching } = useOrderSearchMutation();
  const { mutate: createShipment, isLoading: shipping } = useCreateShipmentMutation();
  const { mutate: lifecycle, isLoading: lifecycling } = useOrderLifecycleMutation();
  const busy = updating || lifecycling; // ops are optimistic — never block the buttons

  // whole-table search (name / phone / order # / book) with a small debounce
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }
    const id = setTimeout(() => runSearch(term, { onSuccess: (r: any) => setSearchResults(r?.data || []) }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const source: any[] = searchResults ?? orders ?? [];

  const ids = useMemo(() => Array.from(new Set(source.map((o: any) => o.customer_id).filter(Boolean))), [source]);
  useEffect(() => {
    if (ids.length) fetchStats(ids, { onSuccess: (r: any) => setStats((s: any) => ({ ...s, ...(r?.stats || {}) })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  const mapped = useMemo(
    () => source.map((o: any) => mapOrder({ ...o, ops_meta: localOps[o.id] ?? o.ops_meta }, stats)),
    [source, stats, localOps],
  );

  const act = {
    ops: (id: any, patch: any) => {
      setLocalOps((prev) => {
        const base = prev[id] ?? source.find((o: any) => o.id === id)?.ops_meta ?? {};
        return { ...prev, [id]: applyPatch(base, patch) };
      });
      ops({ order_id: id, patch });
    },
    status: (id: any, order_status: string) => updateOrder({ id, order_status } as any),
    lifecycle: (id: any, action: 'void' | 'unvoid' | 'archive' | 'unarchive' | 'unlock', reason?: string) =>
      lifecycle({ order_id: id, action, reason }),
    ship: (id: any, courier: string) => {
      const provider = String(courier || '').toLowerCase().replace(/\s+/g, '');
      createShipment(
        { provider, order_id: id },
        {
          onSuccess: (r: any) => {
            // reflect tracking id + area immediately in the board
            setLocalOps((prev) => {
              const base = prev[id] ?? source.find((o: any) => o.id === id)?.ops_meta ?? {};
              return {
                ...prev,
                [id]: {
                  ...base,
                  courier,
                  courier_tracking_id: r?.tracking_id ?? base.courier_tracking_id,
                  courier_area: r?.area ?? base.courier_area,
                },
              };
            });
          },
        },
      );
    },
  };

  const counts = useMemo(() => {
    // Archived orders (void auto-archives) are out of the working list — mirror the
    // backend, whose 'void'/'archived' tabs are the only ones that look past it.
    const working = mapped.filter((o) => !o.archived_at);
    const c: any = { all: working.length, attention: working.filter(needsAttention).length, printstuck: working.filter((o) => o.print === 'sent').length };
    ['pending', 'ready', 'shipped', 'transit', 'hold', 'delivered', 'partial', 'returned'].forEach((k) => (c[k] = working.filter((o) => o.bucket === k).length));
    c.void = mapped.filter((o) => o.bucket === 'void').length;
    c.archived = mapped.filter((o) => o.archived_at).length;
    return c;
  }, [mapped]);

  const shown = useMemo(() => {
    // `mapped` already arrives newest-first (created_at desc); keep that order and
    // only pin attention orders to the top (stable sort preserves recency within groups).
    return mapped
      .filter((o) => (tab === 'attention' ? needsAttention(o) : tab === 'printstuck' ? o.print === 'sent' : tab === 'all' ? true : o.bucket === tab))
      .sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)));
  }, [mapped, tab]);

  const summary = useMemo(() => ({
    orders: shown.length,
    books: shown.reduce((s, o) => s + o.items.reduce((x: number, it: any) => x + it.qty, 0), 0),
    value: shown.reduce((s, o) => s + o.items.reduce((x: number, it: any) => x + it.price, 0) + o.delivery, 0),
    unpaid: shown.filter((o) => !o.paid && isOpen(o.bucket)).length,
  }), [shown]);

  const tabs: [string, string, number][] = [
    ['all', 'All', counts.all], ['attention', '⚠️ Attention', counts.attention], ['printstuck', '🖨️ Slip pending', counts.printstuck],
    ['pending', 'Pending', counts.pending], ['ready', 'Ready', counts.ready], ['shipped', 'Shipped', counts.shipped],
    ['transit', 'Transit', counts.transit], ['hold', '⏸️ On-Hold', counts.hold], ['delivered', 'Delivered', counts.delivered],
    ['partial', 'Partial', counts.partial], ['returned', 'Returned', counts.returned],
    ['void', '🚫 Void', counts.void], ['archived', '🗄️ Archived', counts.archived],
  ];

  return (
    <div className="text-slate-800">
      {/* summary */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['📦', 'Orders (filtered)', summary.orders, 'text-slate-700'], ['📚', 'Total books', summary.books, 'text-emerald-700'], ['💵', 'Total value', bdt(summary.value), 'text-emerald-700'], ['⚠️', 'Unpaid open', summary.unpaid, summary.unpaid > 0 ? 'text-rose-600' : 'text-emerald-700']].map(([ic, lbl, val, tone], i) => (
          <div key={i} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{ic as any} {lbl as any}</div>
            <div className={`mt-0.5 text-lg font-extrabold ${tone as any}`}>{val as any}</div>
          </div>
        ))}
      </div>

      {/* invoice promo line — shared by every admin, applies to all printed slips */}
      <div className="mb-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={!!coupon.enabled}
              disabled={!options || savingCoupon}
              onChange={(e) => saveCoupon({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
            />
            🎁 Coupon line on invoice
          </label>

          <div className={`flex flex-wrap items-center gap-2 ${coupon.enabled ? '' : 'pointer-events-none opacity-40'}`}>
            <input
              value={couponDraft.code}
              onChange={(e) => setCouponDraft((d) => ({ ...d, code: e.target.value }))}
              onBlur={() => {
                const code = couponDraft.code.trim();
                if (code !== String(coupon.code ?? '')) saveCoupon({ code });
              }}
              placeholder="WELCOME50"
              className="w-32 rounded-lg border border-slate-200 px-2 py-1 font-mono text-[12px] uppercase outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="inline-flex items-center gap-1">
              <span className="text-[12px] font-semibold text-slate-400">৳</span>
              <input
                value={couponDraft.amount}
                onChange={(e) => setCouponDraft((d) => ({ ...d, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                onBlur={() => {
                  const amount = Number(couponDraft.amount) || 0;
                  if (amount !== Number(coupon.amount ?? 0)) saveCoupon({ amount });
                }}
                inputMode="numeric"
                placeholder="50"
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <span className="text-[12px] font-medium text-slate-400">OFF</span>
            </div>
          </div>

          <span className="text-[11px] font-medium text-slate-400">
            {savingCoupon
              ? 'Saving…'
              : !coupon.enabled
                ? 'Slips print without the promo line.'
                : couponDraft.code.trim() && Number(couponDraft.amount) > 0
                  ? `Prints: 🎁 Next order: ${couponDraft.code.trim()} — ৳${Number(couponDraft.amount)} OFF`
                  : 'Fill in a code and amount, or it will not print.'}
          </span>
        </div>
      </div>

      {/* search */}
      <div className="mb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, order #, phone, book title… (whole database)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
        {q.trim() !== '' && (
          <p className="mt-1.5 px-1 text-[12px] font-medium text-slate-500">
            {searching ? 'Searching…' : (
              <><span className="font-bold text-slate-700">{shown.length}</span> result{shown.length === 1 ? '' : 's'} for “{q.trim()}”{tab !== 'all' ? ` in ${tab}` : ''}</>
            )}
          </p>
        )}
      </div>

      {/* tabs */}
      <div className="-mx-1 mb-4 overflow-x-auto px-1">
        <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {tabs.map(([key, label, n]) => (
            <button key={key} onClick={() => setTab(key)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${tab === key ? (key === 'attention' ? 'bg-rose-600 text-white' : key === 'printstuck' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white') : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {label}<span className={`rounded-full px-1.5 text-[11px] font-bold ${tab === key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="space-y-3">
        {loading && !mapped.length ? (
          <div className="rounded-2xl bg-white py-16 text-center text-sm text-slate-400 ring-1 ring-slate-200">Loading…</div>
        ) : (
          shown.map((o) => <OrderCard key={o._id} o={o} act={act} busy={busy} coupon={coupon} />)
        )}
        {!loading && shown.length === 0 && (
          <div className="rounded-2xl bg-white py-16 text-center text-sm text-slate-400 ring-1 ring-slate-200">📦 No orders in this filter.</div>
        )}
      </div>
    </div>
  );
}
