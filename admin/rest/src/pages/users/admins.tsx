import Card from '@/components/common/card';
import Layout from '@/components/layouts/admin';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import AdminsList from '@/components/user/user-admin-list';
import { useAdminsQuery } from '@/data/user';
import { SortOrder } from '@/types';
import { adminOnly, isFullAdmin } from '@/utils/auth-utils';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import PageHeading from '@/components/common/page-heading';
import LinkButton from '@/components/ui/link-button';
import { Routes } from '@/config/routes';
export default function Admins() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [orderBy, setOrder] = useState('created_at');
  const [sortedBy, setColumn] = useState<SortOrder>(SortOrder.Desc);

  const { admins, paginatorInfo, loading, error } = useAdminsQuery({
    limit: 20,
    page,
    name: searchTerm,
    orderBy,
    sortedBy,
  });

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  // function handleSearch({ searchText }: { searchText: string }) {
  //   setSearchTerm(searchText);
  //   setPage(1);
  // }

  function handlePagination(current: any) {
    setPage(current);
  }

  return (
    <>
      <Card className="mb-8 flex flex-col items-center gap-4 md:flex-row">
        <div className="md:w-1/3">
          <PageHeading title={t('text-admins')} />
        </div>

        {isFullAdmin() && (
          <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-2/3">
            <LinkButton href={Routes.adminRoles} variant="outline" size="small">
              Manage Roles
            </LinkButton>
            <LinkButton href={Routes.createAdmin} size="small">
              + Create Admin
            </LinkButton>
          </div>
        )}
      </Card>

      {loading ? null : (
        <AdminsList
          admins={admins}
          paginatorInfo={paginatorInfo}
          onPagination={handlePagination}
          onOrder={setOrder}
          onSort={setColumn}
        />
      )}
    </>
  );
}

Admins.authenticate = {
  permissions: adminOnly,
};
Admins.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
