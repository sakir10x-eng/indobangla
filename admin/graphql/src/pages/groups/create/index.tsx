import { useTranslation } from 'next-i18next';
import Layout from '@/components/layouts/admin';
import CreateOrUpdateTypeForm from '@/components/group/group-form';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';
import { useFlashSalesQuery } from '@/graphql/flash_sale.graphql';
import { useRouter } from 'next/router';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import { FlashSale } from '__generated__/__types__';

export default function CreateGroupPage() {
  const { t } = useTranslation();
  const { locale } = useRouter();
  const {
    data: flashSale,
    loading: loadingFlashSales,
    error: flashSaleError,
  } = useFlashSalesQuery({
    variables: {
      language: locale,
      first: 999,
    },
    fetchPolicy: 'network-only',
  });
  if (loadingFlashSales) return <Loader text={t('common:text-loading')} />;
  if (flashSaleError) return <ErrorMessage message={flashSaleError?.message} />;

  return (
    <>
      <div className="py-5 sm:py-8 flex border-b border-dashed border-border-base">
        <h1 className="text-lg font-semibold text-heading">
          {t('form:form-title-create-type')}
        </h1>
      </div>
      <CreateOrUpdateTypeForm
        flashSale={flashSale?.flashSales?.data as FlashSale[]}
        loadingFlashSales={loadingFlashSales}
      />
    </>
  );
}
CreateGroupPage.authenticate = {
  permissions: adminOnly,
};
CreateGroupPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
