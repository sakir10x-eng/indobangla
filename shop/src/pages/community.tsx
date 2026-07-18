import dynamic from 'next/dynamic';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';
import Seo from '@/components/seo/seo';
import { getLayoutWithFooter } from '@/components/layouts/layout-with-footer';

// Feed reads the auth token client-side (for like state + composer), so it
// must not render during the static build.
const CommunityFeed = dynamic(
  () => import('@/components/community/community-feed'),
  { ssr: false },
);

export default function CommunityPage() {
  return (
    <>
      <Seo title="পাঠক কমিউনিটি" url="community" />
      <section className="mx-auto w-full max-w-1920 bg-light">
        <CommunityFeed />
      </section>
    </>
  );
}

CommunityPage.getLayout = getLayoutWithFooter;

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale!, ['common'])),
  },
});
