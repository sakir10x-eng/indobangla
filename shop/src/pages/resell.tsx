import Card from '@/components/ui/cards/card';
import Seo from '@/components/seo/seo';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/layouts/_dashboard';

export { getStaticProps } from '@/framework/general.ssr';

// Client-only: uses authenticated resell queries which must not run during static build.
const ResellDashboard = dynamic(
  () => import('@/components/resell/resell-dashboard'),
  { ssr: false },
);

const ResellPage = () => {
  return (
    <>
      <Seo noindex={true} nofollow={true} title="বই রিসেল" />
      <Card className="w-full shadow-none sm:shadow">
        <ResellDashboard />
      </Card>
    </>
  );
};

ResellPage.authenticationRequired = true;

ResellPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default ResellPage;
