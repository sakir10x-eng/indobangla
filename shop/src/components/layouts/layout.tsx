import IndoHeader from '@/components/layouts/indo-header';
import IndoFooter from '@/components/layouts/indo-footer';
import NoticeHighlightedBar from '@/components/store-notice/notice-highlightedBar';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const MobileNavigation = dynamic(
  () => import('@/components/layouts/mobile-navigation'),
  {
    ssr: false,
  },
);

export default function SiteLayout({ children }: React.PropsWithChildren<{}>) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 transition-colors duration-150">
      {router.query.slug && <NoticeHighlightedBar />}
      <IndoHeader />
      {children}
      <IndoFooter />
      <MobileNavigation />
    </div>
  );
}
export const getLayout = (page: React.ReactElement) => (
  <SiteLayout>{page}</SiteLayout>
);
