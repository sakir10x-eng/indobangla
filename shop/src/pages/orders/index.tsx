import IndoMyOrders from '@/components/orders/indo-my-orders';
import Seo from '@/components/seo/seo';
import ErrorMessage from '@/components/ui/error-message';
import { useOrders } from '@/framework/order';
import Spinner from '@/components/ui/loaders/spinner/spinner';
import isEmpty from 'lodash/isEmpty';
import NotFound from '@/components/ui/not-found';
import { getLayout as getSiteLayout } from '@/components/layouts/layout';
import DashboardSidebar from '@/components/dashboard/sidebar';

export { getStaticProps } from '@/framework/general.ssr';

function NoOrderFound() {
  return (
    <div className="my-auto flex h-[80vh] w-full items-center justify-center rounded bg-light p-5 md:p-8">
      <NotFound text="text-no-order-found" />
    </div>
  );
}

export default function OrdersPage() {
  const {
    orders,
    isLoading,
    error,
    hasMore,
    loadMore,
    isLoadingMore,
    isFetching,
  } = useOrders();

  const ordersItem: any = orders;

  if (error) return <ErrorMessage message={error.message} />;

  if (isLoading && isEmpty(ordersItem)) {
    return (
      <div className="my-auto flex h-[80vh] w-full items-center justify-center rounded bg-light p-5 md:p-8">
        <Spinner simple className="w-10 h-10" />
      </div>
    );
  }

  if (!isLoading && isEmpty(ordersItem)) {
    return <NoOrderFound />;
  }
  return (
    <>
      <Seo noindex={true} nofollow={true} />
      {/* One responsive list for every screen — the old split of OrderList (desktop) +
          OrderListMobile + a side OrderDetails panel is replaced by the expandable cards. */}
      <IndoMyOrders
        orders={ordersItem}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        hasMore={hasMore}
      />
    </>
  );
}

const getLayout = (page: React.ReactElement) =>
  getSiteLayout(
    <div className="flex flex-col items-start w-full px-5 py-10 mx-auto max-w-1920 bg-light lg:bg-gray-100 xl:flex-row xl:py-14 xl:px-8 2xl:px-14">
      <DashboardSidebar className="hidden shrink-0 ltr:mr-8 rtl:ml-8 xl:block xl:w-80" />
      {page}
    </div>
  );

// OrdersPage.authenticationRequired = true;

OrdersPage.getLayout = getLayout;
