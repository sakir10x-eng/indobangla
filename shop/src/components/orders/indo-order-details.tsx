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
  STEPS,
  taka,
} from '@/components/orders/indo-order-parts';
import {
  ArrowLeft,
  BadgePercent,
  Clock,
  Copy,
  HelpCircle,
  MapPin,
  Phone,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border-200 bg-white p-4 sm:p-5">
    <p className="mb-3 text-[11px] font-bold tracking-wide text-gray-400">{title}</p>
    {children}
  </div>
);

export default function IndoOrderDetails({
  order,
  isFetching,
}: {
  order: any;
  isFetching?: boolean;
}) {
  const [copied, setCopied] = useState('');

  const copy = (v: string, k: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(''), 1500);
  };

  if (!order) return null;

  const stage = stageOf(order?.order_status);
  const dead = deadEndLabel(order?.order_status);
  const paid = isPaid(order);
  const m = orderMoney(order);
  const ship = order?.shipping_address ?? {};
  const bill = order?.billing_address ?? {};
  const billSame =
    JSON.stringify(ship ?? {}) === JSON.stringify(bill ?? {}) && Boolean(ship?.city);

  const showPayNow =
    Boolean(order?.payment_gateway) &&
    Boolean(order?.payment_status) &&
    isPaymentPending(order?.payment_gateway, order?.order_status, order?.payment_status);

  const currentLabel = dead ?? STEPS[Math.max(stage, 0)]?.k;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-10">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-border-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/orders" className="-ml-2 rounded-lg p-2 hover:bg-gray-100" aria-label="পিছনে যান">
            <ArrowLeft size={18} className="text-heading" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight text-heading">
              অর্ডার #{bn(order?.tracking_number ?? '')}
            </h1>
            <p className="text-xs text-body">{bnDate(order?.created_at, true)}</p>
          </div>
          <button
            onClick={() => copy(String(order?.tracking_number), 'id')}
            className="hidden items-center gap-1.5 rounded-lg border border-border-200 px-3 py-2 text-xs font-semibold text-body hover:bg-gray-50 sm:flex"
          >
            <Copy size={13} /> {copied === 'id' ? 'কপি হয়েছে' : 'আইডি কপি'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
        {/* status hero */}
        <div className="mb-5 overflow-hidden rounded-2xl border-2 border-accent bg-white">
          <div className="flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-[220px] flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
                <Clock size={12} /> {currentLabel}
              </span>
              <p className="mt-2 text-xl font-bold leading-snug text-heading">
                {dead
                  ? `এই অর্ডারটি ${dead}`
                  : stage === 4
                  ? 'ডেলিভারি সম্পন্ন হয়েছে'
                  : order?.delivery_time
                  ? `পৌঁছাবে ${order.delivery_time}`
                  : 'অর্ডারটি ডেলিভারির পথে আছে'}
              </p>
              <p className="mt-0.5 text-sm text-body">
                অর্ডার নম্বর{' '}
                <button
                  onClick={() => copy(String(order?.tracking_number), 'tr')}
                  className="font-semibold text-body-dark hover:underline"
                >
                  {order?.tracking_number}
                </button>
                {copied === 'tr' && <span className="ml-1 text-green-700">কপি হয়েছে</span>}
              </p>
            </div>

            {showPayNow && (
              <div className="w-full sm:w-auto">
                <p className="mb-1.5 text-xs text-body sm:text-right">
                  পেমেন্ট বাকি · {String(order?.payment_gateway).toUpperCase()}
                </p>
                <PayNowButton order={order} buttonSize="big" isFetching={isFetching} />
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400 sm:justify-end">
                  <ShieldCheck size={11} /> আগে পরিশোধ করলে ডেলিভারি অগ্রাধিকার পায়
                </p>
              </div>
            )}
            {!showPayNow && paid && (
              <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                ✓ পেমেন্ট সম্পন্ন
              </span>
            )}
          </div>

          {!dead && (
            <div className="px-5 pb-5 pt-1">
              <Stepper stage={stage} />
            </div>
          )}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          {/* left */}
          <div className="space-y-5">
            {!dead && stage < 4 && (
              <Card title="কোথায় আছে">
                <JourneyMap
                  stage={stage}
                  destination={ship?.city}
                  uid={String(order?.tracking_number ?? 'o')}
                />
              </Card>
            )}

            <Card title={`বই (${bn(m.items.length)}টি)`}>
              <div className="divide-y divide-border-100">
                {m.items.map((it: any, i: number) => {
                  const qty = Number(it?.pivot?.order_quantity) || 1;
                  const paidUnit = Number(it?.pivot?.unit_price) || 0;
                  const regular = Number(it?.price) || 0;
                  return (
                    <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Cover item={it} className="h-[74px] w-14" />
                      <div className="min-w-0 flex-1">
                        {it?.slug ? (
                          <Link
                            href={`/products/${it.slug}`}
                            className="text-sm font-semibold leading-snug text-heading hover:text-accent"
                          >
                            {it?.name}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold leading-snug text-heading">{it?.name}</p>
                        )}
                        {it?.author?.name && (
                          <p className="text-xs text-body">{it.author.name}</p>
                        )}
                        <p className="mt-1 text-xs text-body">পরিমাণ {bn(qty)}টি</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-heading">{taka(paidUnit * qty)}</p>
                        {regular > paidUnit && (
                          <p className="text-xs text-gray-400 line-through">
                            {taka(regular * qty)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="ডেলিভারি ঠিকানা">
              <div className="flex gap-2.5">
                <MapPin size={17} className="mt-0.5 shrink-0 text-accent" />
                <div className="text-sm leading-relaxed text-heading">
                  {order?.customer_name && <p className="font-semibold">{order.customer_name}</p>}
                  <p className="text-body">
                    {ship?.street_address}
                    {ship?.city ? <><br />{ship.city}</> : null}
                    {ship?.country ? `, ${ship.country}` : ''}
                  </p>
                  {order?.customer_contact && (
                    <p className="mt-1 flex items-center gap-1.5 text-body">
                      <Phone size={13} /> {order.customer_contact}
                    </p>
                  )}
                </div>
              </div>
              {billSame && (
                <p className="mt-3 border-t border-border-100 pt-3 text-xs text-gray-400">
                  বিলিং ঠিকানা একই
                </p>
              )}
            </Card>
          </div>

          {/* right — bill */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card title="বিল বিবরণ">
              <div className="space-y-1.5 text-sm">
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
                {m.wallet > 0 && <Row l="ওয়ালেট পয়েন্ট" v={'−' + taka(m.wallet)} green />}
                <div className="mt-1 flex items-center justify-between border-t border-border-200 pt-2.5">
                  <span className="font-bold text-heading">সর্বমোট</span>
                  <span className="text-xl font-bold text-accent">{taka(m.total)}</span>
                </div>
                {order?.payment_gateway && (
                  <p className="flex items-center gap-1.5 pt-1 text-xs text-body">
                    <Wallet size={12} /> {String(order.payment_gateway).toUpperCase()}
                  </p>
                )}
              </div>

              {m.saved > 0 && m.mrpTotal > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
                  <BadgePercent size={16} className="shrink-0 text-green-700" />
                  <p className="text-sm font-semibold leading-snug text-green-700">
                    সাশ্রয় হয়েছে {taka(m.saved)}{' '}
                    <span className="font-medium">
                      ({bn(Math.round((m.saved / m.mrpTotal) * 100))}%)
                    </span>
                  </p>
                </div>
              )}
            </Card>

            <Link
              href="/help"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-200 bg-white py-3 text-sm font-semibold text-body transition hover:bg-gray-50"
            >
              <HelpCircle size={15} /> এই অর্ডার নিয়ে সাহায্য চাই
            </Link>
          </div>
        </div>
      </div>

      {/* mobile sticky pay */}
      {showPayNow && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border-200 bg-white p-3 lg:hidden">
          <div className="flex-1">
            <p className="text-[11px] leading-none text-body">সর্বমোট</p>
            <p className="text-lg font-bold leading-tight text-heading">{taka(m.total)}</p>
          </div>
          <div className="flex-1">
            <PayNowButton order={order} buttonSize="medium" isFetching={isFetching} />
          </div>
        </div>
      )}
    </div>
  );
}
