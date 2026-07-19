import { getLayout } from '@/components/layouts/layout';
import Seo from '@/components/seo/seo';
import { useSettings } from '@/framework/settings';
import Spinner from '@/components/ui/loaders/spinner/spinner';
import { useRouter } from 'next/router';
import { Routes } from '@/config/routes';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { clearCheckoutAtom } from '@/store/checkout';
import dynamic from 'next/dynamic';

export { getStaticProps } from '@/framework/general.ssr';

// Cart lives in localStorage, so the checkout only makes sense on the client.
const IndoGuestCheckout = dynamic(
  () => import('@/components/checkout/indo-guest-checkout'),
  { ssr: false, loading: () => <Spinner showText={false} /> },
);

export default function GuestCheckoutPage() {
  const [, resetCheckout] = useAtom(clearCheckoutAtom);
  const router = useRouter();
  const { settings, isLoading } = useSettings();
  const guestCheckout = settings?.guestCheckout;

  useEffect(() => {
    //@ts-ignore
    resetCheckout();
    if (!isLoading && !guestCheckout) {
      router.replace(Routes.home);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, guestCheckout]);

  if (isLoading) {
    return <Spinner showText={false} />;
  }

  return (
    <>
      <Seo title="চেকআউট" url="checkout/guest" noindex nofollow />
      <IndoGuestCheckout />
    </>
  );
}

GuestCheckoutPage.getLayout = getLayout;
