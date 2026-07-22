import Card from '@/components/common/card';
import PageHeading from '@/components/common/page-heading';
import Search from '@/components/common/search';
import ShopCard from '@/components/shop/shop-card';
import ErrorMessage from '@/components/ui/error-message';
import LinkButton from '@/components/ui/link-button';
import Loader from '@/components/ui/loader/loader';
import NotFound from '@/components/ui/not-found';
import Pagination from '@/components/ui/pagination';
import { Routes } from '@/config/routes';
import { useShopsQuery } from '@/data/shop';
import { useMeQuery } from '@/data/user';
import { Shop, SortOrder } from '@/types';
import { adminOnly, getAuthCredentials, hasAccess } from '@/utils/auth-utils';
import { isEmpty } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

const GRID_CLASS =
  'grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4';

const ShopsGrid = ({ shops }: { shops: Shop[] }) => {
  return (
    <div className={GRID_CLASS}>
      {shops?.map((shop: Shop) => (
        <ShopCard shop={shop} key={shop?.id ?? shop?.slug} />
      ))}
    </div>
  );
};

const ShopCardSkeleton = () => {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-border-100 bg-light">
      <div className="h-24 w-full bg-gray-200" />
      <div className="relative z-10 -mt-[4.25rem] px-5">
        <div className="flex items-end gap-3">
          <div className="h-[5.75rem] w-[5.75rem] shrink-0 rounded-full border-2 border-light bg-gray-200" />
          <div className="h-3.5 w-1/2 rounded bg-gray-200 mb-3" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 pb-6">
          <div className="h-8 rounded bg-gray-200" />
          <div className="h-8 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
};

const ShopsGridSkeleton = () => {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <ShopCardSkeleton key={idx} />
      ))}
    </div>
  );
};

/**
 * Super admin view — every shop on the platform, not just the ones the admin
 * happens to own. `me.shops` is `hasMany(Shop, 'owner_id')`, so it is always
 * empty for an admin and used to render an eternal "no shop found".
 */
const AllShopList = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { shops, paginatorInfo, loading, error } = useShopsQuery({
    name: searchTerm,
    limit: 12,
    page,
    orderBy: 'created_at',
    sortedBy: SortOrder.Desc,
  });

  function handleSearch({ searchText }: { searchText: string }) {
    setSearchTerm(searchText);
    setPage(1);
  }

  function handlePagination(current: number) {
    setPage(current);
  }

  return (
    <>
      <Card className="mb-8 flex flex-col items-center justify-between md:flex-row">
        <div className="mb-4 shrink-0 md:mb-0">
          <PageHeading title={t('common:sidebar-nav-item-my-shops')} />
        </div>

        <div className="flex w-full flex-col items-center gap-4 ms-auto md:w-3/4 md:flex-row md:justify-end">
          <Search
            onSearch={handleSearch}
            placeholderText={t('form:input-placeholder-search-name')}
            className="md:max-w-sm"
          />
          <LinkButton
            href={Routes.shop.create}
            className="h-12 w-full shrink-0 md:w-auto"
          >
            {t('common:text-create-shop')}
          </LinkButton>
        </div>
      </Card>

      {error ? <ErrorMessage message={error.message} /> : null}

      {!error && loading ? <ShopsGridSkeleton /> : null}

      {!error && !loading && !isEmpty(shops) ? (
        <ShopsGrid shops={shops as Shop[]} />
      ) : null}

      {!error && !loading && isEmpty(shops) ? (
        <NotFound
          image="/no-shop-found.svg"
          text="text-no-shop-found"
          className="mx-auto w-7/12"
        />
      ) : null}

      {!error && !!paginatorInfo?.total && (paginatorInfo?.lastPage ?? 0) > 1 ? (
        <div className="mt-8 flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={handlePagination}
          />
        </div>
      ) : null}
    </>
  );
};

/**
 * Store owner / staff view — the shops that belong to (or are managed by) the
 * logged in user.
 */
const OwnerShopList = () => {
  const { t } = useTranslation();
  const { data, isLoading: loading, error } = useMeQuery();

  const myShops: Shop[] = [...(data?.shops ?? [])];
  if (data?.managed_shop) {
    myShops.push(data.managed_shop);
  }

  return (
    <>
      <div className="mb-5 border-b border-dashed border-border-base pb-5 md:mb-8 md:pb-7">
        <h1 className="text-lg font-semibold text-heading">
          {t('common:sidebar-nav-item-my-shops')}
        </h1>
      </div>

      {error ? <ErrorMessage message={error.message} /> : null}

      {!error && loading ? <Loader text={t('common:text-loading')} /> : null}

      {!error && !loading && !isEmpty(myShops) ? (
        <ShopsGrid shops={myShops} />
      ) : null}

      {!error && !loading && isEmpty(myShops) ? (
        <NotFound
          image="/no-shop-found.svg"
          text="text-no-shop-found"
          className="mx-auto w-7/12"
        />
      ) : null}
    </>
  );
};

const ShopList = () => {
  const { permissions } = getAuthCredentials();
  const permission = hasAccess(adminOnly, permissions);

  return permission ? <AllShopList /> : <OwnerShopList />;
};

export default ShopList;
