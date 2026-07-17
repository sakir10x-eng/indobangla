import Layout from '@/components/layouts/admin';
import AdminCreateForm from '@/components/user/admin-create-form';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function CreateAdminPage() {
  return (
    <>
      <div className="flex border-b border-dashed border-border-base pb-5 md:pb-7">
        <h1 className="text-lg font-semibold text-heading">Create Admin</h1>
      </div>
      <AdminCreateForm />
    </>
  );
}

CreateAdminPage.authenticate = {
  permissions: adminOnly,
};
CreateAdminPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'form', 'common'])),
  },
});
