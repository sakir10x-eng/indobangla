import Seo from '@/components/seo/seo';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/layouts/_dashboard';

export { getStaticProps } from '@/framework/general.ssr';

// Everything here runs authenticated, client-side only — keep it out of the
// static build.
const LibraryView = dynamic(() => import('@/components/library/library-view'), {
  ssr: false,
});

const MyLibraryPage = () => {
  return (
    <>
      <Seo title="আমার লাইব্রেরি" noindex={true} nofollow={true} />
      <LibraryView />
    </>
  );
};

MyLibraryPage.authenticationRequired = true;

MyLibraryPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default MyLibraryPage;
