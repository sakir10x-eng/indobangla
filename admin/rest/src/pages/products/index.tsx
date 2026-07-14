import Layout from '@/components/layouts/admin';
import IndoProductList from '@/components/product/indo-product-list';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ProductsPage() {
  return <IndoProductList />;
}

ProductsPage.authenticate = {
  permissions: adminOnly,
};
ProductsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
