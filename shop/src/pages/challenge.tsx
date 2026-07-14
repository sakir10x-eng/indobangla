import dynamic from 'next/dynamic';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';
import Seo from '@/components/seo/seo';
import { getLayoutWithFooter } from '@/components/layouts/layout-with-footer';

// Auth-only queries run inside this — it must never render during the static build.
const ChallengeRun = dynamic(() => import('@/components/challenge/challenge-run'), {
  ssr: false,
});

export default function ChallengePage() {
  return (
    <>
      <Seo title="১ মিনিট বই চ্যালেঞ্জ" url="challenge" />
      <section className="mx-auto w-full max-w-1920 bg-light">
        <ChallengeRun />
      </section>
    </>
  );
}

ChallengePage.getLayout = getLayoutWithFooter;

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale!, ['common'])),
  },
});
