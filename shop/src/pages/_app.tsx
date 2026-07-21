import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { SessionProvider } from 'next-auth/react';
import '@/assets/css/main.css';
import 'react-toastify/dist/ReactToastify.css';
import { ModalProvider } from '@/components/ui/modal/modal.context';
import ManagedModal from '@/components/ui/modal/managed-modal';
import ManagedDrawer from '@/components/ui/drawer/managed-drawer';
import DefaultSeo from '@/components/seo/default-seo';
import PageOg from '@/components/seo/page-og';
import { SearchProvider } from '@/components/ui/search/search.context';
import PrivateRoute from '@/lib/private-route';
import { CartProvider } from '@/store/quick-cart/cart.context';
import SocialLogin from '@/components/auth/social-login';
import { NextPageWithLayout } from '@/types';
import QueryProvider from '@/framework/client/query-provider';
import { getDirection } from '@/lib/constants';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
const ToastContainer = dynamic(
  () => import('react-toastify').then((module) => module.ToastContainer),
  { ssr: false },
);
// Auth query + localStorage inside — it must never render during the static build.
const ChallengeBar = dynamic(
  () => import('@/components/challenge/challenge-bar'),
  { ssr: false },
);
import Maintenance from '@/components/maintenance/layout';
import { NotificationProvider } from '@/context/notify-content';
import { usePresencePing } from '@/lib/use-presence-ping';

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function CustomApp({
  Component,
  pageProps: {
    //@ts-ignore
    session,
    ...pageProps
  },
}: AppPropsWithLayout) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);
  const authenticationRequired = Component.authenticationRequired ?? false;
  const { locale } = useRouter();
  const dir = getDirection(locale);
  // Heartbeat for the admin's live-visitor counter. Here in _app so it covers every page; it
  // swallows its own errors and never renders anything.
  usePresencePing();
  return (
    <>
      <div dir={dir}>
        <SessionProvider session={session}>
          <QueryProvider pageProps={pageProps}>
            <SearchProvider>
              <ModalProvider>
                <CartProvider>
                  <>
                    <DefaultSeo />
                    {/* Product OG tags — rendered here (outside Maintenance) so they reach the
                        server HTML crawlers read; the per-page <Seo> is hidden by Maintenance's
                        SSR spinner. See page-og.tsx. */}
                    <PageOg pageProps={pageProps} />
                    <Maintenance>
                      <NotificationProvider>
                        {authenticationRequired ? (
                          <PrivateRoute>
                            {getLayout(<Component {...pageProps} />)}
                          </PrivateRoute>
                        ) : (
                          getLayout(<Component {...pageProps} />)
                        )}
                      </NotificationProvider>
                    </Maintenance>
                    <ManagedModal />
                    <ManagedDrawer />
                    <ChallengeBar />
                    <ToastContainer autoClose={2000} theme="colored" />
                    <SocialLogin />
                  </>
                </CartProvider>
              </ModalProvider>
            </SearchProvider>
          </QueryProvider>
        </SessionProvider>
      </div>
    </>
  );
}

export default appWithTranslation(CustomApp);
