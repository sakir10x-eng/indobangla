import { FilterIcon } from '@/components/icons/filter-icon';
// import MobileNavigation from '@/components/layouts/mobile-navigation';
import GeneralLayout from '@/components/layouts/_general';
import { Grid } from '@/components/products/grid';
import SearchCount from '@/components/search-view/search-count';
import SidebarFilter from '@/components/search-view/sidebar-filter';
import Sorting from '@/components/search-view/sorting';
import ErrorMessage from '@/components/ui/error-message';
import { PRODUCTS_PER_PAGE } from '@/framework/client/variables';
import { useProducts } from '@/framework/product';
import { drawerAtom } from '@/store/drawer-atom';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { useRouter } from 'next/router';
import StickyBox from 'react-sticky-box';

import dynamic from 'next/dynamic';
import { Product } from '@/types';
import useLayout from '@/lib/hooks/use-layout';
import Seo from '@/components/seo/seo';
import SearchErrorBoundary from '@/components/search-view/search-error-boundary';

const MobileNavigation = dynamic(
  () => import('@/components/layouts/mobile-navigation'),
  {
    ssr: false,
  },
);

// Books-only results render client-side (they fetch from books-listing anyway). Keeping it out
// of SSR avoids the hydration crash that was white-screening /books/search.
const IndoBookSearch = dynamic(
  () => import('@/components/search-view/indo-book-search'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full py-20 text-center text-body">লোড হচ্ছে…</div>
    ),
  },
);

export { getServerSideProps } from '@/framework/search.ssr';

export default function SearchPage() {
  const { query } = useRouter();
  const { searchType, ...restQuery }: any = query;
  const isBooks = searchType === 'books';
  const {
    products,
    isLoading,
    paginatorInfo,
    error,
    loadMore,
    isLoadingMore,
    hasMore,
  } = useProducts({
    limit: PRODUCTS_PER_PAGE,
    orderBy: 'created_at',
    sortedBy: 'DESC',
    ...(query?.category && { categories: query?.category }),
    ...(searchType && { type: searchType }),
    ...restQuery,
  });

  const { layout } = useLayout();

  // Books get the dedicated, book-only results view (reliable type + count).
  if (isBooks) {
    return (
      <div className="w-full">
        <Seo title={'Book Search'} />
        <SearchErrorBoundary>
          <IndoBookSearch />
        </SearchErrorBoundary>
      </div>
    );
  }

  if (error) return <ErrorMessage message={error.message} />;
  return (
    <div className="w-full">
      <Seo title={'Search'} />
      <div className="flex flex-col items-center justify-between mb-7 md:flex-row">
        {/* //FIXME: */}
        <SearchCount
          from={paginatorInfo?.firstItem ?? 0}
          to={paginatorInfo?.lastItem ?? 0}
          total={
            //@ts-ignore
            paginatorInfo?.total ?? 0
          }
        />
        <div className="max-w-xs mt-4 md:mt-0">
          <Sorting variant="dropdown" />
        </div>
      </div>
      <Grid
        products={products as Product[] | undefined}
        loadMore={loadMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        error={error}
        column={layout === 'compact' ? 'five' : 'six'}
      />
    </div>
  );
}

// A real component — NOT an inline function that runs hooks at the _app level. When the layout
// was an inline `(page) => { useTranslation(); ... }`, its hooks (and react-i18next's internal
// ready-state hooks) became part of CustomApp's hook list; a momentary null i18n instance made
// useTranslation early-return with fewer hooks, shifting that list and throwing React #310
// ("Rendered fewer hooks than expected") — the /books/search client crash. As its own Fiber the
// layout's hooks are isolated and always inside the i18n provider. The sr-only filter label is a
// plain string so the layout no longer depends on the i18n instance being ready at all.
function SearchLayout({ children }: { children: React.ReactNode }) {
  const [, setDrawerView] = useAtom(drawerAtom);
  return (
    <GeneralLayout>
      <>
        <div className="w-full bg-light">
          <div className="flex w-full min-h-screen px-5 py-10 mx-auto max-w-1920 rtl:space-x-reverse lg:space-x-10 xl:py-14 xl:px-16">
            <div className="hidden w-80 shrink-0 lg:block">
              <StickyBox offsetTop={140} offsetBottom={30}>
                <SearchErrorBoundary fallback={null}>
                  <SidebarFilter />
                </SearchErrorBoundary>
              </StickyBox>
            </div>
            {children}
          </div>
        </div>
        <MobileNavigation>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() =>
              setDrawerView({
                display: true,
                view: 'SEARCH_FILTER',
              })
            }
            className="flex items-center justify-center h-full p-2 focus:text-accent focus:outline-0"
          >
            <span className="sr-only">ফিল্টার</span>
            <FilterIcon width="17.05" height="18" />
          </motion.button>
        </MobileNavigation>
      </>
    </GeneralLayout>
  );
}

SearchPage.getLayout = (page: React.ReactElement) => (
  <SearchLayout>{page}</SearchLayout>
);
