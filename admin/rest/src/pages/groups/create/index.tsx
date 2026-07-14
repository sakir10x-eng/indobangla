import Layout from '@/components/layouts/admin';
import CreateOrUpdateTypeForm from '@/components/group/group-form';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { adminOnly } from '@/utils/auth-utils';
import { useFlashSalesQuery } from '@/data/flash-sale';
import { useRouter } from 'next/router';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';

export default function CreateTypePage() {
  const { t } = useTranslation();
  const { locale } = useRouter();
  const {
    flashSale,
    loading: loadingFlashSales,
    error: flashSaleError,
  } = useFlashSalesQuery({
    language: locale,
    limit: 999,
  });
  if (loadingFlashSales) return <Loader text={t('common:text-loading')} />;
  if (flashSaleError) return <ErrorMessage message={flashSaleError?.message} />;

  return (
    <>
      <div className="flex border-b border-dashed border-border-base pb-5 md:pb-7">
        <h1 className="text-lg font-semibold text-heading">
          {t('form:form-title-create-type')}
        </h1>
      </div>
      <CreateOrUpdateTypeForm
        flashSale={flashSale}
        loadingFlashSales={loadingFlashSales}
      />
    </>
  );
}
CreateTypePage.Layout = Layout;

CreateTypePage.authenticate = {
  permissions: adminOnly,
};

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
