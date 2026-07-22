import Link from '@/components/ui/link';
import PayNowButton from '@/components/payment/pay-now-button';
import { isPaymentPending } from '@/lib/is-payment-pending';
import {
  bn,
  bnDate,
  Cover,
  deadEndLabel,
  isPaid,
  JourneyMap,
  orderMoney,
  Row,
  stageOf,
  Stepper,
  taka,
} from '@/components/orders/indo-order-parts';
import {
  BadgePercent,
  ChevronRight,
  Copy,
  HelpCircle,
  MapPin,
  Package,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

type Tab = 'running' | 'done' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'running', label: 'চলমান' },
  { key: 'done', label: 'সম্পন্ন' },
  { key: 'cancelled', label: 'বাতিল' },
];

const Ghost = ({
  icon: Icon,
  label,
  href,
  danger,
}: {
  icon: any;
  label: string;
  href?: string;
  danger?: boolean;
}) => {
  const cls = `flex items-center gap-1.5 rounded-lg border bg-white px-4 py-3 text-sm font-semibold transition hover:bg-gray-50 ${
    danger ? 'border-red-200 text-accent' : 'border-border-200 text-body-dark'
  }`;
  return href ? (
    <Link href={href} className={cls}>
      <Icon size={15} /> {label}
    </Link>
  ) : null;
};

export default function IndoMyOrders({
  orders,
  hasMore,
  loadMore,
  isLoadingMore,
}: {
  orders: any[];
  hasMore?: boolean;
  loadMore?: () => void;
  isLoadingMore?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('running');
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1500);
  };

  const list = (orders ?? []).filter((o) => {
    const dead = Boolean(deadEndLabel(o?.order_status));
    if (tab === 'cancelled') return dead;
    if (tab === 'done') return !dead && o?.order_status === 'order-completed';
    return !dead && o?.order_status !== 'order-completed';
  });

  return (
    <div className="w-full">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading sm:text-3xl">আমার অর্ডার</h1>
          <p className="mt-1 text-sm text-body">বইগুলো কোথায় আছে, এক নজরে দেখুন।</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === t.key ? 'bg-accent text-white' : 'text-body hover:text-heading'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <div className="rounded-2xl border border-border-200 bg-white p-12 text-center">
          <Package size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-heading">এখানে কিছু নেই</p>
          <p className="mb-4 mt-1 text-sm text-body">
            নতুন বই খুঁজে দেখুন, পছন্দ হলে অর্ডার করুন।
          </p>
          <Link
            href="/books/search"
            className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            বই দেখুন
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {list.map((o) => {
          const stage = stageOf(o?.order_status);
          const dead = deadEndLabel(o?.order_status);
          const paid = isPaid(o);
          const m = orderMoney(o);
          const isOpen = open === o.tracking_number;
          const city = o?.shipping_address?.city;
          const showPayNow =
            Boolean(o?.payment_gateway) &&
            Boolean(o?.payment_status) &&
            isPaymentPending(o?.payment_gateway, o?.order_status, o?.payment_status);

          return (
            <div
              key={o.tracking_number ?? o.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                isOpen ? 'border-accent' : 'border-border-200'
              }`}
            >
              {/* summary row */}
              <button
                onClick={() => setOpen(isOpen ? null : o.tracking_number)}
                className="flex w-full flex-wrap items-center gap-4 p-4 text-left sm:p-5"
              >
                <div className="flex -space-x-3">
                  {m.items.slice(0, 3).map((it: any, i: number) => (
                    <Cover key={i} item={it} ring />
                  ))}
                </div>

                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-heading">
                      #{bn(o.tracking_number ?? '')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        paid ? 'bg-green-50 text-green-700' : 'bg-accent/10 text-accent'
                      }`}
                    >
                      {paid ? 'পেমেন্ট হয়েছে' : 'পেমেন্ট বাকি'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-body">
                    {m.hasItems ? `${bn(m.items.length)}টি বই · ` : ''}
                    {bnDate(o?.created_at)}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      dead ? 'text-gray-500' : stage === 4 ? 'text-green-700' : 'text-accent'
                    }`}
                  >
                    {dead ??
                      (stage === 4
                        ? 'ডেলিভারি সম্পন্ন'
                        : o?.delivery_time
                        ? `পৌঁছাবে · ${o.delivery_time}`
                        : 'ডেলিভারির পথে')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-heading">{taka(m.total)}</p>
                  <span className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400">
                    {isOpen ? 'গুটিয়ে ফেলুন' : 'বিস্তারিত দেখুন'}
                    <ChevronRight size={13} className={isOpen ? 'rotate-90' : ''} />
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-5 border-t border-border-100 bg-gray-50/60 p-4 sm:p-5">
                  {dead ? (
                    <p className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-600">
                      এই অর্ডারটি {dead}।
                    </p>
                  ) : (
                    <>
                      <Stepper stage={stage} />
                      {stage < 4 && (
                        <JourneyMap
                          stage={stage}
                          destination={city}
                          uid={String(o.tracking_number ?? o.id)}
                        />
                      )}
                    </>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* address */}
                    <div className="rounded-xl border border-border-200 bg-white p-4">
                      <p className="mb-2 text-[11px] font-bold tracking-wide text-gray-400">
                        ডেলিভারি ঠিকানা
                      </p>
                      <div className="flex gap-2">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
                        <p className="text-sm leading-relaxed text-heading">
                          {o?.customer_name && (
                            <span className="font-semibold">{o.customer_name}<br /></span>
                          )}
                          {o?.shipping_address?.street_address}
                          {o?.shipping_address?.city ? `, ${o.shipping_address.city}` : ''}
                        </p>
                      </div>
                      <div className="mt-3 border-t border-border-100 pt-3">
                        <p className="mb-1 text-[11px] font-bold tracking-wide text-gray-400">
                          অর্ডার নম্বর
                        </p>
                        <button
                          onClick={() => copy(String(o.tracking_number))}
                          className="flex items-center gap-1 text-xs text-body hover:text-heading"
                        >
                          {o.tracking_number} <Copy size={11} />
                          {copied === String(o.tracking_number) && (
                            <span className="text-green-700">কপি হয়েছে</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* bill */}
                    <div className="rounded-xl border border-border-200 bg-white p-4">
                      <p className="mb-3 text-[11px] font-bold tracking-wide text-gray-400">
                        বিল বিবরণ
                      </p>
                      <div className="space-y-3">
                        {m.items.map((it: any, i: number) => {
                          const qty = Number(it?.pivot?.order_quantity) || 1;
                          const paidUnit = Number(it?.pivot?.unit_price) || 0;
                          const regular = Number(it?.price) || 0;
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <Cover item={it} className="h-[52px] w-10" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm leading-snug text-heading">
                                  {it?.name}{' '}
                                  <span className="text-gray-400">×{bn(qty)}</span>
                                </p>
                                {it?.author?.name && (
                                  <p className="text-xs text-gray-400">{it.author.name}</p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-heading">
                                  {taka(paidUnit * qty)}
                                </p>
                                {regular > paidUnit && (
                                  <p className="text-xs text-gray-400 line-through">
                                    {taka(regular * qty)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <div className="space-y-1.5 border-t border-dashed border-border-200 pt-2.5 text-sm">
                          {m.itemSave > 0 && (
                            <>
                              <Row l="প্রিন্ট মূল্য" v={taka(m.mrpTotal)} />
                              <Row l="বইয়ের ছাড়" v={'−' + taka(m.itemSave)} green />
                            </>
                          )}
                          <Row l="সাবটোটাল" v={taka(m.sub)} />
                          {m.ship > 0 && <Row l="ডেলিভারি চার্জ" v={taka(m.ship)} />}
                          {m.disc > 0 && <Row l="ভাউচার ছাড়" v={'−' + taka(m.disc)} green />}
                          {m.tax > 0 && <Row l="ট্যাক্স" v={taka(m.tax)} />}
                          {m.wallet > 0 && (
                            <Row l="ওয়ালেট পয়েন্ট" v={'−' + taka(m.wallet)} green />
                          )}
                          <div className="flex justify-between border-t border-border-200 pt-2">
                            <span className="font-bold text-heading">সর্বমোট</span>
                            <span className="text-lg font-bold text-accent">{taka(m.total)}</span>
                          </div>
                          {o?.payment_gateway && (
                            <p className="flex items-center gap-1.5 pt-1 text-xs text-body">
                              <Wallet size={12} /> {String(o.payment_gateway).toUpperCase()}
                            </p>
                          )}
                        </div>

                        {m.saved > 0 && m.mrpTotal > 0 && (
                          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
                            <BadgePercent size={16} className="shrink-0 text-green-700" />
                            <p className="text-sm font-semibold text-green-700">
                              এই অর্ডারে আপনি সাশ্রয় করেছেন {taka(m.saved)}
                              <span className="font-medium">
                                {' '}
                                ({bn(Math.round((m.saved / m.mrpTotal) * 100))}%)
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex flex-wrap gap-2">
                    {showPayNow && (
                      <div className="min-w-[180px] flex-1">
                        <PayNowButton order={o} buttonSize="medium" />
                      </div>
                    )}
                    <Ghost icon={ChevronRight} label="বিস্তারিত পেজ" href={`/orders/${o.tracking_number}`} />
                    <Ghost icon={HelpCircle} label="সাহায্য চাই" href="/help" />
                    {stage === 4 && (
                      <Ghost icon={RotateCcw} label="আবার অর্ডার করুন" href="/books/search" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="mx-auto mt-6 block rounded-lg border border-border-200 bg-white px-6 py-3 text-sm font-semibold text-heading transition hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {isLoadingMore ? 'লোড হচ্ছে…' : 'আরও অর্ডার দেখুন'}
        </button>
      )}
    </div>
  );
}
