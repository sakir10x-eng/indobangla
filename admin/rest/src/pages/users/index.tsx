import Layout from '@/components/layouts/admin';
import CustomerGallery from '@/components/user/customer-gallery';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';

export default function AllUsersPage() {
  return <CustomerGallery />;
}

AllUsersPage.authenticate = {
  permissions: adminOnly,
};
AllUsersPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
