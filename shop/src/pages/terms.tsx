import PageBanner from '@/components/banners/page-banner';
import { getLayoutWithFooter } from '@/components/layouts/layout-with-footer';
import Seo from '@/components/seo/seo';
import Terms from '@/components/terms/terms';
import PolicyPage from '@/components/policy/policy-page';
import ErrorMessage from '@/components/ui/error-message';
import { useTermsAndConditions } from '@/framework/terms-and-conditions';
import { getStaticProps } from '@/framework/terms-and-conditions-ssr';
import { termsOfService } from '@/framework/static/terms-of-service';
import { LIMIT_HUNDRED } from '@/lib/constants';
import { TermsAndConditions } from '@/types';
import { useTranslation } from 'next-i18next';
export { getStaticProps };

export default function TermsPage() {
  const { t } = useTranslation();

  const { termsAndConditions, isLoading, error } = useTermsAndConditions({
    type: 'global',
    issued_by: 'Super Admin',
    limit: LIMIT_HUNDRED,
    is_approved: true,
  });

  if (error) return <ErrorMessage message={error?.message} />;

  // Admin-authored terms take precedence. With none published the page used to render a
  // "not found" box, which is not something a shop can show on its Terms link — so fall
  // back to our own Terms of Service.
  const hasPublishedTerms = !isLoading && termsAndConditions.length > 0;

  if (!isLoading && !hasPublishedTerms) {
    return (
      <PolicyPage
        document={termsOfService}
        seoTitle="Terms of Service"
        seoUrl="terms"
      />
    );
  }

  return (
    <>
      <Seo title="Terms of Service" url="terms" />
      <section className="mx-auto w-full max-w-1920 bg-light pb-8 lg:pb-10 xl:pb-14">
        <PageBanner
          title={t('text-terms-condition')}
          breadcrumbTitle={t('text-home')}
        />
        <div className="mx-auto w-full max-w-screen-lg px-4 py-10">
          <Terms isLoading terms={termsAndConditions as TermsAndConditions[]} />
        </div>
      </section>
    </>
  );
}

TermsPage.getLayout = getLayoutWithFooter;
