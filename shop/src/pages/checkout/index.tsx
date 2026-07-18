import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useAtom } from 'jotai';
import { useCart } from '@/store/quick-cart/cart.context';
import { HttpClient } from '@/framework/client/http-client';
import {
  billingAddressAtom,
  shippingAddressAtom,
  guestNameAtom,
} from '@/store/checkout';
import dynamic from 'next/dynamic';
import { getLayout } from '@/components/layouts/layout';
import { AddressType } from '@/framework/utils/constants';
import Seo from '@/components/seo/seo';
import { useUser } from '@/framework/user';
import OrderNote from '@/components/checkout/order-note';
export { getStaticProps } from '@/framework/general.ssr';

const ScheduleGrid = dynamic(
  () => import('@/components/checkout/schedule/schedule-grid')
);
const AddressGrid = dynamic(() => import('@/components/checkout/address-grid'), {
  ssr: false,
});
const ContactGrid = dynamic(
  () => import('@/components/checkout/contact/contact-grid')
);
const RightSideView = dynamic(
  () => import('@/components/checkout/right-side-view'),
  { ssr: false }
);
const PaymentGrid = dynamic(
  () => import('@/components/checkout/payment/payment-grid'),
  { ssr: false }
);
// Cross-sell offers — dormant until the store enables `checkoutOffers` in settings.
const OffersCard = dynamic(
  () => import('@/components/checkout/offers/offers-card'),
  { ssr: false }
);

// Warm "bookshop" card look, shared across every checkout step.
// Real CSS lives in `.ib-card` (see the global style block below) for reliable
// borders/shadows the Tailwind arbitrary-value parser can't handle.
const CARD = 'ib-card';

export default function CheckoutPage() {
  // #20 — someone reached checkout. Record it, so if they never place the order the
  // team has a list to call back. Marked converted the moment an order is created.
  const { items, total } = useCart();
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current || !items?.length) return;
    logged.current = true;
    HttpClient.post('checkout-intent', {
      total,
      items: items.map((i: any) => ({
        id: i.id,
        name: i.name,
        qty: i.quantity,
        price: i.price,
      })),
    }).catch(() => {});
  }, [items, total]);

  const { t } = useTranslation();
  const { me } = useUser();
  const { id, address, profile } = me ?? {};
  const [showBilling, setShowBilling] = useState(false);
  const [showNote, setShowNote] = useState(false);

  // Customer name → customer_name on the order. Prefill from the account, editable.
  const [custName, setCustName] = useAtom(guestNameAtom);
  const prefilledName = useRef(false);
  useEffect(() => {
    const accountName = (me as any)?.name ?? (profile as any)?.name;
    if (!prefilledName.current && !custName && accountName) {
      prefilledName.current = true;
      setCustName(accountName);
    }
  }, [me, profile, custName, setCustName]);
  return (
    <>
      <Seo title="Checkout" noindex={true} nofollow={true} />
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      {/* --color-accent override retints step badges, links & buttons to the bookshop red */}
      <div
        className="ib-checkout min-h-screen px-4 py-6 lg:px-8 xl:px-16 2xl:px-20"
        style={
          {
            ['--color-accent' as any]: '230, 57, 70',
            ['--color-accent-hover' as any]: '196, 43, 56',
          } as React.CSSProperties
        }
      >
        <div className="m-auto w-full max-w-5xl">
          {/* brand bar */}
          <div className="ib-topbar">
            <div className="ib-brand">
              <span className="ib-mark">ইব</span>
              <span className="ib-brand-name">Indo Bangla Book Shop</span>
            </div>
            <span className="ib-secure">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              নিরাপদ
            </span>
          </div>

          {/* page head */}
          <div className="mb-5">
            <h1 className="ib-h1">চেকআউট</h1>
            <p className="mt-1 text-sm text-[#6E6C6D]">
              সব তথ্য এক পাতায় — এক ক্লিকে অর্ডার কনফার্ম করুন।
            </p>
          </div>
        </div>

        <div className="m-auto flex w-full max-w-5xl flex-col items-center rtl:space-x-reverse lg:flex-row lg:items-start lg:space-x-8">
          <div className="w-full space-y-4 lg:max-w-2xl">
            {/* Step 1 — contact + address merged into one card */}
            <section className={CARD}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="h-[18px] w-[18px] text-[#6E6C6D]"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span className="text-base font-semibold text-heading">
                    যোগাযোগ ও ঠিকানা
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D7A55]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    className="h-[13px] w-[13px]"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  সংরক্ষিত
                </span>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ContactGrid
                  hideHeader
                  contact={profile?.contact}
                  label="মোবাইল নম্বর"
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6E6C6D]">
                    নাম
                  </label>
                  <input
                    type="text"
                    value={custName ?? ''}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="h-11 w-full rounded-[10px] border border-border-base bg-light px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <AddressGrid
                hideHeader
                userId={me?.id!}
                label="শিপিং ঠিকানা"
                count={2}
                //@ts-ignore
                addresses={address?.filter(
                  (item) => item?.type === AddressType.Shipping,
                )}
                //@ts-ignore
                atom={shippingAddressAtom}
                type={AddressType.Shipping}
              />

              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[12.5px] font-medium text-[#6E6C6D]">
                <input
                  type="checkbox"
                  checked={showBilling}
                  onChange={(e) => setShowBilling(e.target.checked)}
                  className="ib-check h-4 w-4"
                />
                ভিন্ন বিলিং ঠিকানা ব্যবহার করব
              </label>
            </section>
            {showBilling && (
              <AddressGrid
                hideHeader
                userId={id!}
                className={CARD}
                label={t('text-billing-address')}
                count={3}
                //@ts-ignore
                addresses={address?.filter(
                  (item) => item?.type === AddressType.Billing,
                )}
                //@ts-ignore
                atom={billingAddressAtom}
                type={AddressType.Billing}
              />
            )}
            {/* Cross-sell offers — hidden until enabled from settings (backend) */}
            <OffersCard className={CARD} />

            {/* Step 2 — delivery + payment merged into one card */}
            <section className={CARD}>
              <div className="mb-4 flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-[18px] w-[18px] text-[#6E6C6D]"
                >
                  <path d="M3 7h11v9H3z" />
                  <path d="M14 10h4l3 3v3h-7z" />
                  <circle cx="7" cy="18" r="2" />
                  <circle cx="17" cy="18" r="2" />
                </svg>
                <span className="text-base font-semibold text-heading">
                  ডেলিভারি ও পেমেন্ট
                </span>
              </div>

              <ScheduleGrid hideHeader label="ডেলিভারি" className="mb-4" />

              <div className="mt-4 border-t border-[#E4E1DC] pt-4">
                <PaymentGrid />
              </div>

              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[12.5px] font-medium text-[#6E6C6D]">
                <input
                  type="checkbox"
                  checked={showNote}
                  onChange={(e) => setShowNote(e.target.checked)}
                  className="ib-check h-4 w-4"
                />
                অর্ডার নোট যোগ করব (ঐচ্ছিক)
              </label>
              {showNote && <OrderNote hideHeader className="mt-3" />}
            </section>
          </div>
          <div className="mt-8 mb-10 w-full sm:mb-12 lg:mb-0 lg:w-96">
            <div className="lg:sticky lg:top-6">
              <RightSideView />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ib-checkout {
          background: #faf8f4;
          font-family: 'Hind Siliguri', system-ui, sans-serif;
        }
        /* Unified card — mockup: white surface, hairline border, soft shadow. */
        .ib-checkout .ib-card {
          background: #ffffff;
          border: 1px solid #e4e1dc;
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(51, 49, 50, 0.04),
            0 8px 24px rgba(51, 49, 50, 0.05);
          padding: 18px;
        }
        @media (min-width: 768px) {
          .ib-checkout .ib-card {
            padding: 20px;
          }
        }
        .ib-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 6px 0 16px;
          margin-bottom: 18px;
          border-bottom: 1px solid #e4e1dc;
        }
        .ib-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ib-mark {
          width: 34px;
          height: 34px;
          border-radius: 7px;
          background: #e63946;
          color: #fff;
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ib-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 600;
          color: #333132;
          letter-spacing: 0.2px;
        }
        .ib-secure {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 999px;
          background: #e7f4ee;
          color: #1d7a55;
        }
        .ib-secure svg {
          width: 13px;
          height: 13px;
        }
        .ib-h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 30px;
          font-weight: 700;
          color: #333132;
          line-height: 1.25;
        }
        @media (max-width: 520px) {
          .ib-h1 {
            font-size: 24px;
          }
        }
        .ib-check {
          accent-color: #e63946;
        }
        /* Softer, rounder inputs inside the checkout to match the theme */
        .ib-checkout input:not([type='checkbox']):not([type='radio']),
        .ib-checkout textarea {
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
CheckoutPage.authenticationRequired = true;
CheckoutPage.getLayout = getLayout;
