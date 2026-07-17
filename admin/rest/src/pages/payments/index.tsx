import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import PageHeading from '@/components/common/page-heading';
import PaymentsLedger from '@/components/payment/payments-ledger';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function PaymentsPage() {
  return (
    <>
      <Card className="mb-8 flex items-center">
        <div className="md:w-1/2">
          <PageHeading title="Payments (bKash / Bank)" />
        </div>
      </Card>
      <PaymentsLedger />
    </>
  );
}

PaymentsPage.authenticate = {
  permissions: adminOnly,
};
PaymentsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
