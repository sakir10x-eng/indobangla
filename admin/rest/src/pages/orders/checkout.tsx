import { useTranslation } from 'next-i18next';
import {
  billingAddressAtom,
  customerAtom,
  shippingAddressAtom,
} from '@/contexts/checkout';
import dynamic from 'next/dynamic';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';
import Layout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import CustomerGrid from '@/components/checkout/customer/customer-grid';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import Loader from '@/components/ui/loader/loader';
import { useUserQuery } from '@/data/user';
import { AddressType } from '@/types';

const ScheduleGrid = dynamic(
  () => import('@/components/checkout/schedule/schedule-grid')
);
const AddressGrid = dynamic(() => import('@/components/checkout/address-grid'));
const ContactGrid = dynamic(
  () => import('@/components/checkout/contact/contact-grid')
);
const RightSideView = dynamic(
  () => import('@/components/checkout/right-side-view')
);
const ManualAdjustments = dynamic(
  () => import('@/components/checkout/manual-adjustments')
);

export default function CheckoutPage() {
  const [customer] = useAtom(customerAtom);
  const { t } = useTranslation();

  const {
    data: user,
    isLoading: loading,
    refetch,
  } = useUserQuery({ id: customer?.value });
  useEffect(() => {
    if (customer?.value) {
      refetch(customer?.value);
    }
  }, [customer?.value]);

  if (loading) return <Loader text={t('common:text-loading')} />;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 md:px-6 md:py-10">
      <div className="m-auto mb-6 w-full max-w-5xl">
        <h1 className="text-xl font-semibold text-heading md:text-2xl">
          {t('text-create-order') !== 'text-create-order'
            ? t('text-create-order')
            : 'Create Order'}
        </h1>
        <p className="mt-1 text-sm text-body">
          Add customer, contact, address, schedule and payment to place an
          order. Billing address is optional.
        </p>
      </div>
      <div className="lg:space-s-8 m-auto flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-start">
        <div className="w-full space-y-6 lg:max-w-2xl">
          <CustomerGrid
            className="shadow-700 bg-light rounded-xl p-5 md:p-8"
            //@ts-ignore
            // contact={user?.profile?.contact}
            label={t('text-customer')}
            count={1}
          />
          <ContactGrid
            className="shadow-700 bg-light rounded-xl p-5 md:p-8"
            //@ts-ignore
            contact={user?.profile?.contact}
            label={t('text-contact-number')}
            count={1}
          />

          <AddressGrid
            userId={user?.id!}
            className="shadow-700 bg-light rounded-xl p-5 md:p-8"
            label={`${t('text-billing-address')} (${t('text-optional')})`}
            count={2}
            //@ts-ignore
            addresses={user?.address?.filter(
              (address) => address?.type === AddressType.Billing
            )}
            //@ts-ignore
            atom={billingAddressAtom}
            type={AddressType.Billing}
          />
          <AddressGrid
            userId={user?.id!}
            className="shadow-700 bg-light rounded-xl p-5 md:p-8"
            label={t('text-shipping-address')}
            count={3}
            //@ts-ignore
            addresses={user?.address?.filter(
              (address) => address?.type === AddressType.Shipping
            )}
            //@ts-ignore
            atom={shippingAddressAtom}
            type={AddressType.Shipping}
          />
          <ScheduleGrid
            className="shadow-700 bg-light rounded-xl p-5 md:p-8"
            label={t('text-delivery-schedule')}
            count={4}
          />
          <ManualAdjustments
            className="shadow-700 bg-light rounded-xl p-5 md:p-8"
            label="Manual adjustments & note"
            count={5}
          />
        </div>
        <div className="mt-10 w-full sm:mb-12 lg:sticky lg:top-8 lg:mb-0 lg:mt-0 lg:w-96">
          <RightSideView />
        </div>
      </div>
    </div>
  );
}
CheckoutPage.authenticate = {
  permissions: adminOnly,
};
CheckoutPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale!, ['table', 'common', 'form'])),
  },
});
