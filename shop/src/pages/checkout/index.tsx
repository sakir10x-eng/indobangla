import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/store/quick-cart/cart.context';
import { HttpClient } from '@/framework/client/http-client';
import { billingAddressAtom, shippingAddressAtom } from '@/store/checkout';
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
const AddressGrid = dynamic(
  () => import('@/components/checkout/address-grid'),
  { ssr: false }
);
const ContactGrid = dynamic(
  () => import('@/components/checkout/contact/contact-grid')
  // { ssr: false }
);
const RightSideView = dynamic(
  () => import('@/components/checkout/right-side-view'),
  { ssr: false }
);

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
  return (
    <>
      <Seo title="Checkout" noindex={true} nofollow={true} />
      <div className="bg-gray-100 px-4 py-8 lg:py-10 lg:px-8 xl:py-14 xl:px-16 2xl:px-20">
        <div className="m-auto flex w-full max-w-5xl flex-col items-center rtl:space-x-reverse lg:flex-row lg:items-start lg:space-x-8">
          <div className="w-full space-y-6 lg:max-w-2xl">
            <ContactGrid
              className="bg-light p-5 shadow-700 md:p-8"
              contact={profile?.contact}
              label={t('text-contact-number')}
              count={1}
            />

            <AddressGrid
              userId={me?.id!}
              className="bg-light p-5 shadow-700 md:p-8"
              label={t('text-shipping-address')}
              count={2}
              //@ts-ignore
              addresses={address?.filter(
                (item) => item?.type === AddressType.Shipping,
              )}
              //@ts-ignore
              atom={shippingAddressAtom}
              type={AddressType.Shipping}
            />

            {/* Billing address is optional and hidden by default */}
            <div className="bg-light p-5 shadow-700 md:p-8">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={showBilling}
                  onChange={(e) => setShowBilling(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-semibold text-heading">
                  {t('text-billing-address')} — use a different billing address
                  (optional)
                </span>
              </label>
            </div>
            {showBilling && (
              <AddressGrid
                userId={id!}
                className="bg-light p-5 shadow-700 md:p-8"
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
            <ScheduleGrid
              className="bg-light p-5 shadow-700 md:p-8"
              label={t('text-delivery-schedule')}
              count={4}
            />
            <OrderNote count={5} label={t('Order Note')} />
          </div>
          <div className="mt-10 mb-10 w-full sm:mb-12 lg:mb-0 lg:w-96">
            <RightSideView />
          </div>
        </div>
      </div>
    </>
  );
}
CheckoutPage.authenticationRequired = true;
CheckoutPage.getLayout = getLayout;
