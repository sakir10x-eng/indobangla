import { useEffect, useState } from 'react';
import {
  Clock,
  Package,
  Warehouse,
  Truck,
  ShieldCheck,
} from 'lucide-react';

/**
 * Shared pieces for the customer-facing order screens (list + detail).
 * Everything here reads real order data — nothing is seeded with sample values.
 */

export const bn = (v: string | number) =>
  String(v).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

export const taka = (n: number) =>
  '৳' + bn(Math.round(Number(n) || 0).toLocaleString('en-US'));

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export function bnDate(v?: string | null, withTime = false) {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const base = `${bn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${bn(d.getFullYear())}`;
  if (!withTime) return base;
  const h = d.getHours();
  const ampm = h < 12 ? 'সকাল' : h < 17 ? 'দুপুর' : 'সন্ধ্যা';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${base} · ${ampm} ${bn(h12)}:${bn(String(d.getMinutes()).padStart(2, '0'))}`;
}

/**
 * The five delivery steps. `status` matches the real `order_status` values in
 * lib/constants/order-status.ts, so the stepper is driven by the order, not by a guess.
 */
export const STEPS = [
  { k: 'অর্ডার পেয়েছি', status: 'order-pending', i: Clock },
  { k: 'প্রস্তুত হচ্ছে', status: 'order-processing', i: Package },
  { k: 'লোকাল হাবে', status: 'order-at-local-facility', i: Warehouse },
  { k: 'রাস্তায় আছে', status: 'order-out-for-delivery', i: Truck },
  { k: 'ডেলিভারি হয়েছে', status: 'order-completed', i: ShieldCheck },
];

/** Terminal states that are not part of the happy path — they get a plain badge, no stepper. */
const DEAD_END: Record<string, string> = {
  'order-cancelled': 'বাতিল হয়েছে',
  'order-refunded': 'ফেরত দেওয়া হয়েছে',
  'order-failed': 'ব্যর্থ হয়েছে',
  'order-void': 'বাতিল হয়েছে',
};

export const deadEndLabel = (status?: string) =>
  status ? DEAD_END[status] ?? null : null;

/** 0-based index into STEPS; -1 when the order left the happy path. */
export function stageOf(status?: string): number {
  if (!status || DEAD_END[status]) return -1;
  const i = STEPS.findIndex((s) => s.status === status);
  return i < 0 ? 0 : i;
}

/**
 * "Paid" means the money is in. A COD order only counts once it has been delivered — until
 * then the customer still owes the rider, and showing "পেমেন্ট হয়েছে" would be a lie.
 */
export const isPaid = (order: any) => {
  if (order?.payment_status === 'payment-success') return true;
  return (
    order?.payment_status === 'payment-cash-on-delivery' &&
    order?.order_status === 'order-completed'
  );
};

/* ------------------------------------------------------------------ */

export function Cover({
  item,
  className = 'h-14 w-11',
  ring = false,
}: {
  item: any;
  className?: string;
  ring?: boolean;
}) {
  const src = item?.image?.thumbnail || item?.image?.original || '';
  const [bad, setBad] = useState(!src);
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded bg-gray-200 shadow-sm ${
        ring ? 'border-2 border-white' : 'border border-border-200'
      }`}
    >
      {bad ? (
        // No cover on file — show the title rather than an empty grey box.
        <div className="flex h-full w-full items-end bg-accent/80 p-1">
          <span className="line-clamp-3 text-[7px] leading-tight text-white/90">
            {item?.name}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={item?.name ?? ''}
          onError={() => setBad(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export const Row = ({
  l,
  v,
  green,
}: {
  l: string;
  v: string;
  green?: boolean;
}) => (
  <div className="flex justify-between">
    <span className="text-body">{l}</span>
    <span className={`font-medium ${green ? 'text-green-700' : 'text-heading'}`}>{v}</span>
  </div>
);

export function Stepper({ stage }: { stage: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((s, i) => {
        const done = i <= stage;
        const now = i === stage;
        const Icon = s.i;
        return (
          <div key={s.status} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <div
                className={`absolute top-4 right-1/2 h-[3px] w-full rounded ${
                  i <= stage ? 'bg-accent' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                done ? 'border-accent bg-accent' : 'border-gray-200 bg-white'
              } ${now ? 'ring-4 ring-accent/15' : ''}`}
            >
              <Icon size={16} color={done ? '#fff' : '#A8A29E'} />
            </div>
            <span
              className={`mt-2 px-0.5 text-center text-[11px] leading-tight ${
                done ? 'text-heading' : 'text-gray-400'
              } ${now ? 'font-bold' : 'font-medium'}`}
            >
              {s.k}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const PATH =
  'M 40 190 C 110 190, 120 120, 190 118 S 280 150, 330 96 S 420 60, 460 44';

/**
 * A decorative progress illustration, NOT a real map: the shop has no GPS feed, so the parcel
 * travels a fixed drawn route and its position is the order's status progress. The caption says
 * "অর্ডার অগ্রগতি" rather than distance for exactly that reason — claiming "% of the way there"
 * would be inventing precision the data does not have. The destination label is the customer's
 * real city when we have one.
 */
export function JourneyMap({
  stage,
  destination,
  uid,
}: {
  stage: number;
  destination?: string;
  uid: string;
}) {
  const [t, setT] = useState(0);
  const [pos, setPos] = useState({ x: 40, y: 190 });
  const target = Math.min(Math.max(stage, 0) / 4, 1);

  useEffect(() => {
    // getPointAtLength needs a real SVG element, so this only ever runs in the browser.
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', PATH);
    const L = el.getTotalLength();
    let raf = 0;
    let cur = 0;
    const tick = () => {
      cur += (target - cur) * 0.06;
      if (Math.abs(target - cur) < 0.001) cur = target;
      setT(cur);
      const p = el.getPointAtLength(L * cur);
      setPos({ x: p.x, y: p.y });
      if (cur !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const gridId = `ib-grid-${uid}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border-200 bg-[#FBF7F0]">
      <svg viewBox="0 0 500 230" className="block w-full">
        <defs>
          <pattern id={gridId} width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0 L0 0 0 22" fill="none" stroke="#E4DCCE" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="500" height="230" fill={`url(#${gridId})`} />
        <path
          d="M -10 215 C 90 200, 150 232, 260 210 S 420 226, 510 200"
          fill="none"
          stroke="#CFE0E6"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {[
          [70, 60, 50, 34], [150, 40, 44, 28], [250, 44, 60, 26],
          [360, 150, 52, 30], [430, 120, 44, 26], [210, 168, 56, 24],
        ].map((b, i) => (
          <rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx="3" fill="#EEE6D8" stroke="#E0D5C2" />
        ))}
        <path d={PATH} fill="none" stroke="#DCD2C2" strokeWidth="4" strokeDasharray="7 7" strokeLinecap="round" />
        <path
          d={PATH}
          fill="none"
          stroke="#EF3543"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ strokeDasharray: 600, strokeDashoffset: 600 - 600 * t }}
        />
        <circle cx="40" cy="190" r="8" fill="#fff" stroke="#333132" strokeWidth="3" />
        <text x="40" y="214" textAnchor="middle" fontSize="12" fill="#5C574F">
          ইন্দোবাংলা
        </text>
        <circle cx="460" cy="44" r="9" fill="#EF3543" opacity={t >= 1 ? 1 : 0.25} />
        <circle cx="460" cy="44" r="9" fill="none" stroke="#EF3543" strokeWidth="2" />
        <text x="460" y="24" textAnchor="middle" fontSize="12" fill="#5C574F">
          {destination || 'আপনার ঠিকানা'}
        </text>
        <g transform={`translate(${pos.x},${pos.y})`}>
          <circle r="17" fill="#EF3543" opacity="0.14">
            <animate attributeName="r" values="15;23;15" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle r="13" fill="#fff" stroke="#EF3543" strokeWidth="2.5" />
          <g transform="translate(-7.5,-8)">
            <rect x="0" y="4.5" width="15" height="10.5" rx="1.5" fill="#EF3543" />
            <rect x="-1" y="1.5" width="17" height="4" rx="1.2" fill="#C9202D" />
            <rect x="6" y="1.5" width="3" height="13.5" fill="#FFD9A0" />
            <path d="M7.5 1.5 C 4 1.5, 3 -2, 6 -1.2 C 7.2 -0.8, 7.5 0.4, 7.5 1.5 Z" fill="#FFD9A0" />
            <path d="M7.5 1.5 C 11 1.5, 12 -2, 9 -1.2 C 7.8 -0.8, 7.5 0.4, 7.5 1.5 Z" fill="#FFD9A0" />
          </g>
        </g>
      </svg>
      <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[12px] font-semibold text-heading backdrop-blur">
        অর্ডার অগ্রগতি · {bn(Math.round(t * 100))}%
      </div>
    </div>
  );
}

/**
 * Money for one order, computed from the real columns. `amount` is the item subtotal,
 * `total` is what the customer owes; savings are only claimed when the DB actually has a
 * higher regular price to compare against.
 */
export function orderMoney(order: any) {
  const items: any[] = order?.products ?? [];
  const sub = Number(order?.amount) || 0;
  const ship = Number(order?.delivery_fee) || 0;
  const disc = Number(order?.discount) || 0;
  const tax = Number(order?.sales_tax) || 0;
  const wallet = Number(order?.wallet_point?.amount) || 0;
  const total = Number(order?.total) || sub + ship - disc + tax;

  // Regular-price total: only counts lines where the catalogue price is genuinely higher than
  // what was charged, so "you saved" can never be inflated by a missing price.
  let mrpTotal = 0;
  let itemSave = 0;
  items.forEach((p) => {
    const qty = Number(p?.pivot?.order_quantity) || 1;
    const paid = Number(p?.pivot?.unit_price) || 0;
    const regular = Number(p?.price) || 0;
    const line = regular > paid ? regular : paid;
    mrpTotal += line * qty;
    if (regular > paid) itemSave += (regular - paid) * qty;
  });

  return { items, sub, ship, disc, tax, wallet, total, mrpTotal, itemSave, saved: itemSave + disc };
}
