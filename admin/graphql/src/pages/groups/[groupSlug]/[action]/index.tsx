import Layout from '@/components/layouts/admin';
import { useTypeQuery } from '@/graphql/type.graphql';
import { useRouter } from 'next/router';
import CreateOrUpdateTypeForm from '@/components/group/group-form';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';
import { Config } from '@/config';
import { FlashSale, Type } from '__generated__/__types__';
import { useFlashSalesQuery } from '@/graphql/flash_sale.graphql';

export default function UpdateGroupPage() {
  const { locale, query } = useRouter();
  const { t } = useTranslation();
  const { data, loading, error } = useTypeQuery({
    variables: {
      slug: query.groupSlug as string,
      language:
        query.action!.toString() === 'edit' ? locale! : Config.defaultLanguage,
    },
  });
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
  if (loading || loadingFlashSales)
    return <Loader text={t('common:text-loading')} />;
  if (error || flashSaleError)
    return <ErrorMessage message={error?.message ?? flashSaleError?.message} />;

  return (
    <>
      <div className="flex border-b border-dashed border-border-base pb-5 md:pb-7">
        <h1 className="text-lg font-semibold text-heading">
          {t('form:form-title-edit-type')}
        </h1>
      </div>
      <CreateOrUpdateTypeForm
        initialValues={data?.type as Type}
        flashSale={flashSale?.flashSales?.data as FlashSale[]}
        loadingFlashSales={loadingFlashSales}
      />
    </>
  );
}
UpdateGroupPage.authenticate = {
  permissions: adminOnly,
};
UpdateGroupPage.Layout = Layout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
