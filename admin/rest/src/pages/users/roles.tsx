import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import PageHeading from '@/components/common/page-heading';
import AdminRolesManager from '@/components/user/admin-roles-manager';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function AdminRolesPage() {
  return (
    <>
      <Card className="mb-8 flex items-center">
        <div className="md:w-1/2">
          <PageHeading title="Admin Roles" />
        </div>
      </Card>
      <AdminRolesManager />
    </>
  );
}

AdminRolesPage.authenticate = {
  permissions: adminOnly,
};
AdminRolesPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'form', 'common'])),
  },
});
