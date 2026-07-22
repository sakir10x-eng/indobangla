import { getLayout } from '@/components/layouts/layout';
import IndoOrderDetails from '@/components/orders/indo-order-details';
import Seo from '@/components/seo/seo';
import { useRouter } from 'next/router';
import { useOrder } from '@/framework/order';
import Spinner from '@/components/ui/loaders/spinner/spinner';
export { getServerSideProps } from '@/framework/order.ssr';

export default function OrderPage() {
  const { query } = useRouter();

  const { order, isLoading, isFetching } = useOrder({
    tracking_number: query.tracking_number!.toString(),
  });

  if (isLoading) {
    return <Spinner showText={false} />;
  }

  return (
    <>
      <Seo noindex={true} nofollow={true} />
      <IndoOrderDetails order={order} isFetching={isFetching} />
    </>
  );
}

OrderPage.getLayout = getLayout;
