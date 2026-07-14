import AdminLayout from '@/components/layouts/admin';
import AiSettingsForm from '@/components/settings/ai-settings-form';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function AiSettingsPage() {
  return (
    <>
      <SettingsPageHeader pageTitle="AI Settings" />
      <AiSettingsForm />
    </>
  );
}

AiSettingsPage.authenticate = {
  permissions: adminOnly,
};
AiSettingsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
