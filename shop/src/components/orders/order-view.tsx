import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from 'react-query';
import Link from '@/components/ui/link';
import usePrice from '@/lib/use-price';
import { formatAddress } from '@/lib/format-address';
import { Routes } from '@/config/routes';
import { useTranslation } from 'next-i18next';
import { useCart } from '@/store/quick-cart/cart.context';
import { HttpClient } from '@/framework/client/http-client';
import { useAtom } from 'jotai';
import { clearCheckoutAtom } from '@/store/checkout';
import { OrderStatus, PaymentStatus } from '@/types';
import { ORDER_STATUS } from '@/lib/constants/order-status';
import { isPaymentPending } from '@/lib/is-payment-pending';
import PayNowButton from '@/components/payment/pay-now-button';
import { productPlaceholder } from '@/lib/placeholders';

const STEP_LABELS = [
  'Pending',
  'Processing',
  'Local facility',
  'Out for delivery',
];

const HEADING: Record<string, string> = {
  'order-pending': 'অর্ডার পেয়েছি — কনফার্ম হচ্ছে',
  'order-processing': 'অর্ডার কনফার্মড — প্যাকিং চলছে',
  'order-at-local-facility': 'লোকাল ফ্যাসিলিটিতে পৌঁছেছে',
  'order-out-for-delivery': 'ডেলিভারির পথে',
  'order-completed': 'ডেলিভার হয়ে গেছে ✓',
  'order-cancelled': 'অর্ডার বাতিল হয়েছে',
  'order-refunded': 'অর্ডার রিফান্ড হয়েছে',
  'order-failed': 'অর্ডার ব্যর্থ হয়েছে',
};

function OrderLine({ product }: { product: any }) {
  const qty = product?.pivot?.order_quantity ?? 1;
  const unitAmount = product?.pivot?.unit_price ?? 0;
  const { price: unit } = usePrice({ amount: unitAmount });
  const { price: lineTotal } = usePrice({ amount: unitAmount * qty });
  const thumb = product?.image?.thumbnail;
  return (
    <div className="oline">
      <div className="ocover">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={product?.name} className="ocover-img" />
        ) : (
          <span className="ocover-ph">📖</span>
        )}
        {qty > 1 && <span className="ocover-qty">×{qty}</span>}
      </div>
      <div className="oline-info">
        <p className="oline-name">{product?.name}</p>
        <p className="oline-sub">
          {unit}
          {qty > 1 ? ` × ${qty}` : ''}
          {product?.unit ? ` · ${product.unit}` : ''}
        </p>
        <Link href={Routes.product(product?.slug)} className="oline-view">
          বইটি দেখুন →
        </Link>
      </div>
      <span className="oline-price">{lineTotal}</span>
    </div>
  );
}

const bdt = (n: number) =>
  '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/**
 * Cross-sell + keep-browsing block shown below a placed order.
 *
 * Honest by design: an order is sealed once placed, so these are NOT "add to
 * this parcel" — the button starts a fresh cart for the reader's next order.
 * Recommendations come from the real `related-books` endpoint (same one the
 * product page and cart upsell use), seeded by the first book in this order.
 */
function NextReads({ order }: { order: any }) {
  const { addItemToCart, isInCart } = useCart();
  const [toastMsg, setToastMsg] = useState('');
  const firstProduct = order?.products?.[0];
  const firstId = firstProduct?.id
    ? String(firstProduct.id).split('.')[0]
    : null;
  const authorSlug =
    firstProduct?.author?.slug ?? firstProduct?.authors?.[0]?.slug ?? null;

  const { data } = useQuery(
    ['order-next-reads', firstId],
    () =>
      firstId
        ? HttpClient.get<any>('related-books', { product_id: firstId })
        : HttpClient.get<any>('books-listing', { limit: 6 }),
    { staleTime: 5 * 60 * 1000, enabled: true },
  );

  // Lead with books from the same category the reader just bought, then
  // recommendations, then same-author — so suggestions match the genre.
  const byCategory = ((data as any)?.by_category ?? []) as any[];
  const catName =
    firstProduct?.categories?.[0]?.name ??
    byCategory?.[0]?.categories?.[0]?.name ??
    null;
  const pool: any[] = firstId
    ? [
        ...byCategory,
        ...(((data as any)?.recommended ?? []) as any[]),
        ...(((data as any)?.by_author ?? []) as any[]),
      ]
    : ((data as any)?.data ?? []);

  // Drop anything already in this order, de-dupe, keep four.
  const ownedIds = new Set(
    (order?.products ?? []).map((p: any) => String(p.id).split('.')[0]),
  );
  const seen = new Set<string>();
  const recs = pool
    .filter((p) => {
      const id = String(p?.id).split('.')[0];
      if (!p || ownedIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 4);

  function toast(msg: string) {
    setToastMsg(msg);
    window.clearTimeout((toast as any)._h);
    (toast as any)._h = window.setTimeout(() => setToastMsg(''), 2800);
  }

  function add(p: any) {
    const price = p.sale_price > 0 ? p.sale_price : p.price;
    addItemToCart(
      {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.image?.original || p.image,
        price,
        stock: p.quantity ?? 1,
      } as any,
      1,
    );
    toast('✓ কার্টে যোগ হয়েছে — চেকআউটে গিয়ে অর্ডার করুন');
  }

  return (
    <>
      {recs.length ? (
        <section className="reads" aria-labelledby="reads-h">
          <div className="reads-head">
            <h2 className="serif reads-title" id="reads-h">
              পরের বইটা বেছে রাখুন
            </h2>
            <p className="sm muted">
              {catName
                ? `‘${catName}’ ঘরানার আরও বই — আপনার পছন্দের সাথে মিলিয়ে বাছাই`
                : 'আপনি যে ধরনের বই নিয়েছেন, সেই ঘরানা থেকে বাছাই করা'}
            </p>
          </div>
          <div className="offers">
            {recs.map((p, i) => {
              const onSale = p.sale_price > 0 && p.sale_price < p.price;
              const off = onSale
                ? Math.round(((p.price - p.sale_price) / p.price) * 100)
                : 0;
              const inCart = isInCart(p.id);
              return (
                <div
                  className={`offer card ${i === 0 ? 'featured' : ''}`}
                  key={p.id}
                >
                  <Link href={Routes.product(p.slug)} className="offer-cover">
                    {p.image?.original ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image.original} alt={p.name} />
                    ) : (
                      <span className="ocover-ph">📚</span>
                    )}
                    {i === 0 ? (
                      <span className="pill pill-red">জনপ্রিয়</span>
                    ) : onSale ? (
                      <span className="pill pill-ok">{off}% ছাড়</span>
                    ) : null}
                  </Link>
                  <div className="offer-body">
                    <Link
                      href={Routes.product(p.slug)}
                      className="offer-name"
                    >
                      {p.name}
                    </Link>
                    <div className="offer-price">
                      {bdt(onSale ? p.sale_price : p.price)}
                      {onSale && <span className="was">{bdt(p.price)}</span>}
                    </div>
                    <button
                      className={`btn ${i === 0 ? 'btn-red' : ''}`}
                      onClick={() => add(p)}
                      disabled={inCart}
                    >
                      {inCart ? '✓ কার্টে আছে' : '🛒 কার্টে যোগ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* keep browsing — all real routes */}
      <nav className="browse" aria-label="আরও দেখুন">
        {authorSlug && (
          <Link href={Routes.author(authorSlug)} className="btn">
            🔍 লেখকের সব বই
          </Link>
        )}
        <Link href={Routes.flashSale} className="btn">
          🔥 ফ্ল্যাশ সেল
        </Link>
        <Link href={Routes.coupons} className="btn">
          ✨ অফার ও কুপন
        </Link>
        <Link href={Routes.products} className="btn">
          📚 সব বই দেখুন
        </Link>
      </nav>

      <div className={`ib-toast ${toastMsg ? 'show' : ''}`} role="status">
        {toastMsg}
      </div>

      <style jsx>{`
        /* styled-jsx scopes styles per component, so these shared primitives
           (defined in OrderView) must be re-declared here for NextReads' own
           markup. The CSS custom properties still cascade from .otrack. */
        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 22px 24px;
          margin-bottom: 14px;
        }
        .serif {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .sm {
          font-size: 13px;
        }
        .muted {
          color: var(--muted);
        }
        .ocover-ph {
          font-size: 24px;
          opacity: 0.55;
        }
        .pill {
          font-size: 12.5px;
          padding: 4px 11px;
          border-radius: 99px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          align-self: flex-start;
        }
        .pill-warn {
          background: var(--amber-tint);
          color: var(--amber);
        }
        .pill-ok {
          background: var(--green-tint);
          color: var(--green);
        }
        .pill-red {
          background: var(--red-tint);
          color: var(--red-dark);
        }
        .reads {
          margin-top: 26px;
        }
        .reads-head {
          margin-bottom: 14px;
        }
        .reads-title {
          font-size: 20px;
        }
        .offers {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 12px;
        }
        .offer {
          margin: 0;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 14px;
          padding: 12px;
          transition: box-shadow 0.2s ease, transform 0.2s ease,
            border-color 0.2s ease;
        }
        .offer:hover {
          box-shadow: 0 8px 22px rgba(40, 30, 20, 0.1);
          transform: translateY(-2px);
        }
        .offer.featured {
          border-color: var(--red);
          box-shadow: inset 3px 0 0 var(--red);
        }
        .offer-cover {
          position: relative;
          flex: 0 0 64px;
          width: 64px;
          height: 88px;
          border-radius: 8px;
          background: linear-gradient(150deg, #f3efe8, #e6ded2);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .offer-cover .pill {
          position: absolute;
          top: 6px;
          left: 6px;
          font-size: 10.5px;
          padding: 2px 7px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
        }
        .offer-body {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .offer-name {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
          color: var(--ink);
          text-decoration: none;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .offer-name:hover {
          color: var(--red);
        }
        .offer-price {
          margin-top: auto;
          padding-top: 8px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 700;
        }
        .offer-price .was {
          color: var(--muted);
          text-decoration: line-through;
          font-size: 12px;
          font-weight: 400;
          margin-left: 6px;
          font-family: 'Hind Siliguri', sans-serif;
        }
        .offer .btn {
          margin-top: 8px;
          padding: 7px 10px;
          font-size: 12.5px;
        }
        .browse {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-top: 22px;
        }
        .ib-toast {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%) translateY(80px);
          background: var(--ink);
          color: #fff;
          font-size: 13.5px;
          padding: 11px 20px;
          border-radius: 24px;
          opacity: 0;
          transition: transform 0.3s, opacity 0.3s;
          pointer-events: none;
          z-index: 60;
          max-width: 90vw;
          text-align: center;
        }
        .ib-toast.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      `}</style>
      <style jsx global>{`
        .otrack .offer-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .otrack .btn-red {
          background: #e63946;
          border-color: #e63946;
          color: #fff;
        }
        .otrack .btn-red:hover {
          background: #a32d2d;
          border-color: #a32d2d;
          color: #fff;
        }
        .otrack .btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
      `}</style>
    </>
  );
}

function OrderView({ order, settings, loadingStatus }: any) {
  const { t } = useTranslation('common');
  const { resetCart } = useCart();
  const [, resetCheckout] = useAtom(clearCheckoutAtom);

  // Clear cart + checkout once the order page is shown (same as before).
  useEffect(() => {
    resetCart();
    //@ts-ignore
    resetCheckout();
  }, [resetCart, resetCheckout]);

  const { price: total } = usePrice({ amount: order?.paid_total ?? 0 });
  const { price: sub_total } = usePrice({ amount: order?.amount ?? 0 });
  const { price: shipping_charge } = usePrice({ amount: order?.delivery_fee ?? 0 });
  const { price: tax } = usePrice({ amount: order?.sales_tax ?? 0 });
  const { price: discount } = usePrice({ amount: order?.discount ?? 0 });
  const { price: wallet_total } = usePrice({
    amount: order?.wallet_point?.amount ?? 0,
  });

  const status = order?.order_status as string;
  const paymentStatus = order?.payment_status as string;
  const isPaid = paymentStatus === PaymentStatus.SUCCESS;
  const isCOD = paymentStatus === PaymentStatus.COD;
  const cancelledLike = [
    OrderStatus.CANCELLED,
    'order-refunded',
    'order-failed',
  ].includes(status as any);

  // stepper: first four statuses; how many are done
  const currentIndex = ORDER_STATUS.findIndex((o) => o.status === status);
  const doneCount =
    status === 'order-completed' ? 4 : Math.max(0, Math.min(4, currentIndex + 1));

  const payPending = isPaymentPending(
    //@ts-ignore
    order?.payment_gateway,
    order?.order_status,
    order?.payment_status,
  );
  const paymentGateways = settings?.paymentGateway;

  const gatewayLabel = (order?.payment_gateway ?? '').toString().replace(/_/g, ' ');

  return (
    <div className="otrack">
      <div className="wrap">
        {/* top */}
        <div className="top">
          <Link href={Routes.home} className="back">
            ← {t('text-back-to-home')}
          </Link>
          <span className="sm muted">
            Order #{order?.tracking_number} ·{' '}
            {dayjs(order?.created_at).format('MMMM D, YYYY')}
          </span>
        </div>

        {/* STATUS */}
        <div className="card">
          <div className="status-head">
            <div>
              <h2 className="serif status-title">
                {HEADING[status] ?? t(status)}
              </h2>
              {order?.delivery_time && (
                <p className="sm muted mt3">
                  ডেলিভারি:{' '}
                  <strong className="ink">{order.delivery_time}</strong>
                </p>
              )}
            </div>
            <div className="pills">
              <span
                className={`pill ${
                  cancelledLike ? 'pill-red' : 'pill-warn'
                }`}
              >
                ● {t(status)}
              </span>
              <span className={`pill ${isPaid ? 'pill-ok' : 'pill-red'}`}>
                {isPaid
                  ? `✓ Paid · ${gatewayLabel}`
                  : isCOD
                  ? 'Cash on delivery'
                  : `Unpaid · ${gatewayLabel}`}
              </span>
            </div>
          </div>

          {!cancelledLike ? (
            <div className="step-wrap">
              <div className="steps">
                {STEP_LABELS.map((_, i) => {
                  const done = i < doneCount;
                  return (
                    <React.Fragment key={i}>
                      <div className={`dot ${done ? 'done' : 'todo'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      {i < STEP_LABELS.length - 1 && (
                        <div className={`bar ${i < doneCount - 1 ? 'fill' : ''}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="labels">
                {STEP_LABELS.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="note note-red">
              এই অর্ডারটি {t(status)}। কোনো প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন।
            </div>
          )}

          {payPending && paymentGateways?.length ? (
            <div className="paynow">
              <PayNowButton
                trackingNumber={order?.tracking_number}
                order={order}
              />
            </div>
          ) : null}
        </div>

        {/* ITEM + DELIVERY */}
        <div className="g2">
          <div className="card m0">
            <h3 className="serif h3">আপনার বই</h3>
            <div className="items">
              {order?.products?.map((p: any) => (
                <OrderLine key={p.id} product={p} />
              ))}
            </div>
            <div className="summary">
              <div className="line">
                <span className="muted">Sub total</span>
                <span>{sub_total}</span>
              </div>
              <div className="line">
                <span className="muted">Shipping charge</span>
                <span>{shipping_charge}</span>
              </div>
              <div className="line">
                <span className="muted">Tax</span>
                <span>{tax}</span>
              </div>
              {order?.discount ? (
                <div className="line">
                  <span className="muted">Discount</span>
                  <span>- {discount}</span>
                </div>
              ) : null}
              {order?.wallet_point?.amount ? (
                <div className="line">
                  <span className="muted">Wallet</span>
                  <span>- {wallet_total}</span>
                </div>
              ) : null}
              <div className="line total">
                <span>Total</span>
                <span>{total}</span>
              </div>
            </div>
          </div>

          <div className="card m0">
            <h3 className="serif h3">ডেলিভারি তথ্য</h3>
            <div className="dl">
              <p className="muted xs">Recipient</p>
              <p className="dl-v">
                {order?.customer_name ?? '—'}
                {order?.delivery_time ? ` · ${order.delivery_time}` : ''}
              </p>
              <p className="muted xs">Shipping address</p>
              <p className="dl-v">
                {order?.shipping_address
                  ? formatAddress(order.shipping_address)
                  : '—'}
              </p>
              <p className="muted xs">Billing address</p>
              <p className="dl-v">
                {order?.billing_address &&
                Object.keys(order.billing_address || {}).length
                  ? formatAddress(order.billing_address)
                  : 'Same as shipping'}
              </p>
              <p className="muted xs">Payment</p>
              <p className="dl-v">
                {gatewayLabel || '—'} · {t(paymentStatus)}
              </p>
            </div>
            <div className="dl-actions">
              <button className="btn" onClick={() => window.print()}>
                ⬇ Invoice
              </button>
              <Link href="/help" className="btn btn-link">
                💬 Support
              </Link>
            </div>
          </div>
        </div>

        {/* cross-sell + keep browsing (real recommendations) */}
        {!cancelledLike && <NextReads order={order} />}
      </div>

      <style jsx>{`
        .otrack {
          --red: #e63946;
          --red-dark: #a32d2d;
          --red-tint: #fdecec;
          --red-line: #f3b4b4;
          --ink: #1f1e1f;
          --muted: #6e6c6d;
          --line: #e6e3e1;
          --bg: #f7f5f2;
          --card: #fff;
          --green: #0f6e56;
          --green-tint: #e4f3ee;
          --amber: #8a5b0b;
          --amber-tint: #fbf0dc;
          --radius: 10px;
          background: var(--bg);
          color: var(--ink);
          font-family: 'Hind Siliguri', system-ui, sans-serif;
          line-height: 1.6;
          padding: 24px 16px 60px;
          min-height: 70vh;
        }
        .wrap {
          max-width: 1080px;
          margin: 0 auto;
        }
        .serif {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 22px 24px;
          margin-bottom: 14px;
        }
        .m0 {
          margin: 0;
        }
        .sm {
          font-size: 13px;
        }
        .xs {
          font-size: 12.5px;
        }
        .muted {
          color: var(--muted);
        }
        .ink {
          color: var(--ink);
        }
        .mt3 {
          margin-top: 3px;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .back {
          color: var(--red);
          font-weight: 500;
          text-decoration: none;
          font-size: 14.5px;
        }
        .status-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          flex-wrap: wrap;
        }
        .status-title {
          font-size: 22px;
        }
        .pills {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .pill {
          font-size: 12.5px;
          padding: 4px 11px;
          border-radius: 99px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          text-transform: capitalize;
        }
        .pill-warn {
          background: var(--amber-tint);
          color: var(--amber);
        }
        .pill-ok {
          background: var(--green-tint);
          color: var(--green);
        }
        .pill-red {
          background: var(--red-tint);
          color: var(--red-dark);
        }
        .step-wrap {
          margin-top: 22px;
        }
        .steps {
          display: flex;
          align-items: center;
        }
        .dot {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12.5px;
          font-weight: 600;
          flex: none;
        }
        .dot.done {
          background: var(--red);
          color: #fff;
        }
        .dot.todo {
          border: 1.5px dashed var(--red-line);
          color: var(--red-line);
          background: #fff;
        }
        .bar {
          flex: 1;
          height: 3px;
          background: var(--line);
          border-radius: 2px;
        }
        .bar.fill {
          background: var(--red);
        }
        .labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12.5px;
          color: var(--muted);
        }
        .labels span {
          width: 96px;
          text-align: center;
        }
        .labels span:first-child {
          text-align: left;
        }
        .labels span:last-child {
          text-align: right;
        }
        .paynow {
          margin-top: 18px;
        }
        .g2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 14px;
        }
        .h3 {
          font-size: 17px;
          margin-bottom: 14px;
        }
        .items {
          display: flex;
          flex-direction: column;
        }
        .oline {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid var(--line);
        }
        .oline:first-child {
          padding-top: 2px;
        }
        .oline:last-child {
          border-bottom: none;
          padding-bottom: 2px;
        }
        .ocover {
          position: relative;
          width: 48px;
          height: 64px;
          border-radius: 5px;
          overflow: hidden;
          flex: none;
          background: linear-gradient(150deg, #f3efe8, #e6ded2);
          box-shadow: 0 2px 6px rgba(51, 49, 50, 0.16),
            inset 2px 0 0 rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ocover-ph {
          font-size: 24px;
          opacity: 0.55;
        }
        .ocover-qty {
          position: absolute;
          right: 0;
          bottom: 0;
          background: var(--red);
          color: #fff;
          font-size: 10.5px;
          font-weight: 600;
          padding: 1px 5px;
          border-top-left-radius: 5px;
        }
        .oline-info {
          flex: 1;
          min-width: 0;
        }
        .oline-name {
          font-size: 14.5px;
          font-weight: 500;
          line-height: 1.35;
        }
        .oline-sub {
          font-size: 12.5px;
          color: var(--muted);
          margin-top: 2px;
        }
        .oline-view {
          display: inline-block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--red);
          text-decoration: none;
        }
        .oline-view:hover {
          text-decoration: underline;
        }
        .oline-price {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          white-space: nowrap;
          align-self: flex-start;
          padding-top: 2px;
        }
        .summary {
          border-top: 1px solid var(--line);
          margin-top: 14px;
          padding-top: 10px;
        }
        .line {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 14px;
        }
        .total {
          border-top: 1px solid var(--line);
          margin-top: 8px;
          padding-top: 10px;
          font-weight: 600;
        }
        .note {
          border-radius: var(--radius);
          padding: 9px 12px;
          font-size: 12.5px;
          margin-top: 16px;
        }
        .note-red {
          background: var(--red-tint);
          color: var(--red-dark);
          border: 1px solid var(--red-line);
        }
        .dl {
          font-size: 14px;
          line-height: 1.85;
        }
        .dl-v {
          margin-bottom: 9px;
        }
        .dl-actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }
      `}</style>
      <style jsx global>{`
        .otrack .btn {
          flex: 1;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          padding: 9px 16px;
          border-radius: 10px;
          border: 1px solid #e6e3e1;
          background: #fff;
          color: #1f1e1f;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: 0.15s;
        }
        .otrack .btn:hover {
          border-color: #c9c5c2;
          background: #faf9f8;
        }
        .otrack .ocover-img {
          width: 48px;
          height: 64px;
          object-fit: cover;
          display: block;
        }

        /* "⬇ Invoice" prints the page, so without these rules the browser rendered the whole
           storefront — nav, footer and all — as the invoice. Print the order card alone and
           drop the controls that only make sense on screen. */
        @media print {
          :global(body) {
            background: #fff;
          }
          :global(body *) {
            visibility: hidden;
          }
          .otrack,
          .otrack * {
            visibility: visible;
          }
          .otrack {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 0;
          }
          .otrack .top,
          .otrack .dl-actions {
            display: none !important;
          }
          .otrack .card {
            break-inside: avoid;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}

export default OrderView;
