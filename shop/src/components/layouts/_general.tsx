import IndoHeader from './indo-header';
import IndoFooter from '@/components/layouts/indo-footer';
import dynamic from 'next/dynamic';

const MobileNavigation = dynamic(
  () => import('@/components/layouts/mobile-navigation'),
  {
    ssr: false,
  }
);
export default function GeneralLayout({
  children,
  layout,
}: React.PropsWithChildren<{ layout?: string }>) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 transition-colors duration-150">
      <IndoHeader />
      {children}
      <IndoFooter />
      <MobileNavigation />
    </div>
  );
}

export const getGeneralLayout = (page: React.ReactElement) => (
  <GeneralLayout layout={page.props.layout}>
    {page}
    <MobileNavigation />
  </GeneralLayout>
);
