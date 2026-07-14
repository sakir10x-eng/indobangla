import { privacyPolicy } from '@/framework/static/privacy';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';
import PolicyPage from '@/components/policy/policy-page';
import { getLayoutWithFooter } from '@/components/layouts/layout-with-footer';

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      document={privacyPolicy}
      seoTitle="Privacy Policy"
      seoUrl="privacy"
    />
  );
}

PrivacyPolicyPage.getLayout = getLayoutWithFooter;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ['common'])),
    },
  };
};
