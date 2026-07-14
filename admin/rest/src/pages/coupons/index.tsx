import CouponAnalytics from '@/components/coupon/coupon-analytics';
import Layout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Coupons() {
  return <CouponAnalytics />;
}

Coupons.authenticate = {
  permissions: adminOnly,
};

Coupons.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
