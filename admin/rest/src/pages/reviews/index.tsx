import ReviewGallery from '@/components/reviews/review-gallery';
import Layout from '@/components/layouts/admin';
import { useState } from 'react';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { SortOrder } from '@/types';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useReviewsQuery } from '@/data/review';
import { adminOnly } from '@/utils/auth-utils';

export default function Reviews() {
  const [page, setPage] = useState(1);
  const { t } = useTranslation();
  const { reviews, paginatorInfo, loading, error } = useReviewsQuery({
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
    <ReviewGallery
      reviews={reviews}
      paginatorInfo={paginatorInfo}
      onPagination={handlePagination}
    />
  );
}
Reviews.authenticate = {
  permissions: adminOnly,
};
Reviews.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
