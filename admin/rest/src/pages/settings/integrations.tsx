import AdminLayout from '@/components/layouts/admin';
import IntegrationsForm from '@/components/settings/integrations-form';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function IntegrationsPage() {
  return (
    <>
      <SettingsPageHeader pageTitle="Couriers & Payments" />
      <IntegrationsForm />
    </>
  );
}

IntegrationsPage.authenticate = { permissions: adminOnly };
IntegrationsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
