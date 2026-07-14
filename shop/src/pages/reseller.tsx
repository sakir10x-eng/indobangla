import Card from '@/components/ui/cards/card';
import Seo from '@/components/seo/seo';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/layouts/_dashboard';

export { getStaticProps } from '@/framework/general.ssr';

const ResellerDashboard = dynamic(
  () => import('@/components/resell/reseller-dashboard'),
  { ssr: false },
);

const ResellerPage = () => {
  return (
    <>
      <Seo noindex={true} nofollow={true} title="রিসেলার বিজনেস" />
      <Card className="w-full shadow-none sm:shadow">
        <ResellerDashboard />
      </Card>
    </>
  );
};

ResellerPage.authenticationRequired = true;

ResellerPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default ResellerPage;
