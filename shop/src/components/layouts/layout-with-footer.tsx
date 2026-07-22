import IndoHeader from '@/components/layouts/indo-header';
import IndoFooter from '@/components/layouts/indo-footer';
import dynamic from 'next/dynamic';

const MobileNavigation = dynamic(() => import('./mobile-navigation'), {
  ssr: false,
});

/**
 * Same chrome as the main SiteLayout (layout.tsx). It used to render the stock Pickbazar
 * Header/Footer, so the 19 pages using this layout — /offers, /help, /flash-sales,
 * /manufacturers, /shops, /contact, /terms, /privacy, /community … — kept showing the OLD
 * menu while the rest of the site had the new one. The `layout`/HeaderMinimal switch went with
 * it: IndoHeader is the one header for every page now, so the menu cannot drift again.
 */
const SiteLayoutWithFooter = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 transition-colors duration-150">
      <IndoHeader />
      {children}
      <MobileNavigation />
      <IndoFooter />
    </div>
  );
};

export const getLayoutWithFooter = (page: React.ReactElement) => (
  <SiteLayoutWithFooter>{page}</SiteLayoutWithFooter>
);
export default SiteLayoutWithFooter;
