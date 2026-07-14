import IndoHero from '@/components/banners/indo-hero-banner';
import ValueProps from '@/components/common/value-props';
import HomeDeals from '@/components/common/home-deals';
import HomeCategorySections from '@/components/common/home-category-sections';
import AllBooksGrid from '@/components/common/all-books-grid';
import RotatingBanners from '@/components/common/rotating-banners';
import BookSpotlight from '@/components/common/book-spotlight';
import BuyMoreSaveMore from '@/components/common/buy-more-save-more';
import dynamic from 'next/dynamic';

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

      {/* Auto-rotating promotional book banners (15s) */}
      <RotatingBanners />

      {/* 1-minute book challenge — hides itself when the admin has it switched off */}
      <ChallengeBanner />

      <HomeDeals />

      {/* Personalized rails for logged-in shoppers */}
      <PersonalizedSections />

      {/* Category-wise book rails */}
      <HomeCategorySections />

      <FilterBar variables={variables?.categories} />
      <Categories layout="standard" variables={variables?.categories} />
      <AllBooksGrid />

      {/* Buy-more-save-more moved to the end */}
      <BuyMoreSaveMore />
    </>
  );
}
