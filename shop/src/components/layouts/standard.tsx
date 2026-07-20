import IndoHero from '@/components/banners/indo-hero-banner';
import ValueProps from '@/components/common/value-props';
import AllBooksGrid from '@/components/common/all-books-grid';
import LazyOnView from '@/components/common/lazy-on-view';
import dynamic from 'next/dynamic';

// Below-the-fold sections are code-split so the initial home render/hydration isn't blocked by
// their JS + data fetches — they stream in as the shopper scrolls. Keeps first paint fast.
const HomeDeals = dynamic(() => import('@/components/common/home-deals'), { ssr: false });
const HomeCategorySections = dynamic(() => import('@/components/common/home-category-sections'), { ssr: false });
const RotatingBanners = dynamic(() => import('@/components/common/rotating-banners'), { ssr: false });
const BookSpotlight = dynamic(() => import('@/components/common/book-spotlight'), { ssr: false });
const BuyMoreSaveMore = dynamic(() => import('@/components/common/buy-more-save-more'), { ssr: false });
const HomeTrust = dynamic(() => import('@/components/common/home-trust'), { ssr: false });

// Client-only: uses the authenticated wishlist query, which must not run during
// static generation (it 401s server-side and fails the page build).
const PersonalizedSections = dynamic(
  () => import('@/components/common/personalized-sections'),
  { ssr: false },
);
// #8 — client-only pre-home intro gate (redirects first-time visitors when enabled).
const ChallengeBanner = dynamic(
  () => import('@/components/challenge/challenge-banner'),
  { ssr: false },
);
const PreHomeGate = dynamic(() => import('@/components/common/prehome-gate'), {
  ssr: false,
});
// #7 — client-only price-drop alerts for saved (wishlisted) books.
const WishlistPriceAlerts = dynamic(
  () => import('@/components/common/wishlist-price-alerts'),
  { ssr: false },
);
import Categories from '@/components/categories/categories';
import type { HomePageProps } from '@/types';
import FilterBar from '@/components/layouts/filter-bar';
import CustomRender from '@/components/builder/CustomRender';
import { Fragment } from 'react';

const dynamicSections = ['banners'];

export default function Standard({ variables }: HomePageProps) {
  const builderData = variables.layoutSettings?.builder;

  const sortedData = builderData?.items || [];

  const dynamicSectionsMapping = {
    banners: <IndoHero />,
  };

  return (
    <>
      <PreHomeGate />
      <WishlistPriceAlerts />
      {builderData ? (
        sortedData.map((item: { id: keyof typeof dynamicSectionsMapping }) => {
          if (dynamicSections.includes(item.id)) {
            return (
              <Fragment key={item.id}>
                {dynamicSectionsMapping[item.id]}
              </Fragment>
            );
          } else {
            const dynamicContent = builderData?.builder?.data?.content?.find(
              (data: any) => data?.props?.id === item?.id,
            );
            if (dynamicContent && !dynamicContent?.props?.display) {
              return (
                <CustomRender
                  key={item?.id}
                  data={{
                    content: [dynamicContent],
                    zones: { ...builderData?.builder?.data?.zones },
                    root: builderData?.builder?.data?.root,
                  }}
                />
              );
            }
          }
        })
      ) : (
        <IndoHero />
      )}

      <ValueProps />

      {/* Reader's pick spotlight — above the second (rotating) banner */}
      <BookSpotlight />

      {/* Everything below the first few sections mounts (and fetches) only as the shopper
          scrolls near it, so the top of the home page paints fast even with a big catalogue. */}
      <LazyOnView minHeight={260}>
        {/* Auto-rotating promotional book banners (15s) */}
        <RotatingBanners />
      </LazyOnView>

      <LazyOnView minHeight={80}>
        {/* 1-minute book challenge — hides itself when the admin has it switched off */}
        <ChallengeBanner />
      </LazyOnView>

      <LazyOnView minHeight={420}>
        <HomeDeals />
      </LazyOnView>

      <LazyOnView minHeight={80}>
        {/* Personalized rails for logged-in shoppers */}
        <PersonalizedSections />
      </LazyOnView>

      <LazyOnView minHeight={420}>
        {/* Category-wise book rails */}
        <HomeCategorySections />
      </LazyOnView>

      <LazyOnView minHeight={260}>
        {/* Social proof: real store rating + reviews + trust policies */}
        <HomeTrust />
      </LazyOnView>

      <LazyOnView minHeight={520}>
        <FilterBar variables={variables?.categories} />
        <Categories layout="standard" variables={variables?.categories} />
        <AllBooksGrid />
      </LazyOnView>

      {/* Buy more, save more — hidden from the home page per request. */}
    </>
  );
}
