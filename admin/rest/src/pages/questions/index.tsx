import QuestionGallery from '@/components/question/question-gallery';
import Layout from '@/components/layouts/admin';
import { useState } from 'react';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { SortOrder } from '@/types';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuestionsQuery } from '@/data/question';
import { adminOnly } from '@/utils/auth-utils';

export default function Questions() {
  const [page, setPage] = useState(1);
  const { t } = useTranslation();
  const { questions, paginatorInfo, loading, error } = useQuestionsQuery({
    limit: 15,
    page,
    orderBy: 'created_at',
    sortedBy: SortOrder.Desc,
  });

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  function handlePagination(current: any) {
    setPage(current);
  }

  return (
    <QuestionGallery
      questions={questions}
      paginatorInfo={paginatorInfo}
      onPagination={handlePagination}
    />
  );
}

Questions.authenticate = {
  permissions: adminOnly,
};
Questions.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
