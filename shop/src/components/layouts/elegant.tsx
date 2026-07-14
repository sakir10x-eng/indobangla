import FeaturedBrandsSlider from '@/components/brands/featured-brands-slider';
import CustomRender from '@/components/builder/CustomRender';
import Categories from '@/components/categories/categories';
import FlashSaleProducts from '@/components/products/flash-sale-products';
import LatestElegantProducts from '@/components/products/latest-elegant-products';
import TrendingProducts from '@/components/products/trending-products';
import type { HomePageProps } from '@/types';
import { Fragment } from 'react';
// import FeaturedShopsSlider from '@/components/shops/featured-shops-slider';
import FilterBar from '@/components/layouts/filter-bar';
import SectionBlockElegant from '@/components/ui/section-block-elegant';
import Footer from './footer';

const dynamicSections = [
  'flashSales',
  'category',
  'trendingProducts',
  'featuredBrands',
  'latestProducts',
  // 'featuredShops',
];

export default function ElegantLayout({ variables }: HomePageProps) {
  const builderData = variables.layoutSettings?.builder;
  const sortedData = builderData?.items || [];

  const dynamicSectionsMapping = {
    flashSales: variables?.layoutSettings?.flashSales?.enable ? (
      <FlashSaleProducts
        variables={{
          ...variables?.layoutSettings?.flashSales,
          productCard: variables?.layoutSettings?.productCard,
        }}
      />
    ) : null,
    category: variables?.layoutSettings?.category?.enable ? (
      <Categories
        title={variables?.layoutSettings?.category?.title}
        description={variables?.layoutSettings?.category?.description}
        layout="elegant"
        variables={variables.categories}
      />
    ) : null,
    trendingProducts: variables?.layoutSettings?.trendingProducts?.enable ? (
      <TrendingProducts
        title={variables?.layoutSettings?.trendingProducts?.title}
        description={variables?.layoutSettings?.trendingProducts?.description}
        variables={variables.bestSellingProducts}
        banner={variables?.layoutSettings?.trendingProducts?.banner}
      />
    ) : null,
    featuredBrands: variables?.layoutSettings?.featuredBrands?.enable ? (
      <SectionBlockElegant
        title={variables?.layoutSettings?.featuredBrands?.title}
        description={variables?.layoutSettings?.featuredBrands?.description}
        className="py-0 md:py-0 xl:py-0 3xl:py-0"
      >
        <FeaturedBrandsSlider />
      </SectionBlockElegant>
    ) : null,
    latestProducts: variables?.layoutSettings?.latestProducts?.enable ? (
      <LatestElegantProducts
        title={variables?.layoutSettings?.latestProducts?.title}
        description={variables?.layoutSettings?.latestProducts?.description}
        variables={variables?.latestProducts}
        banner={variables?.layoutSettings?.latestProducts?.banner}
      />
    ) : null,
    // featuredShops: variables?.layoutSettings?.featuredShops?.enable ? (
    //   <SectionBlockElegant
    //     title={variables?.layoutSettings?.featuredShops?.title}
    //     description={variables?.layoutSettings?.featuredShops?.description}
    //     className="pt-0 md:pt-0 xl:pt-0 3xl:pt-0"
    //   >
    //     <FeaturedShopsSlider />
    //   </SectionBlockElegant>
    // ) : null,
  };

  return (
    <div className="flex flex-col flex-1 bg-white">
      <FilterBar
        className="top-16 lg:hidden"
        variables={variables.categories}
      />
      <main className="block w-full lg:mt-[84px] xl:overflow-hidden">
        {builderData ? (
          sortedData?.map(
            (item: { id: keyof typeof dynamicSectionsMapping }) => {
              if (dynamicSections?.includes(item?.id)) {
                return (
                  <Fragment key={item?.id}>
                    {dynamicSectionsMapping[item?.id]}
                  </Fragment>
                );
              } else {
                const dynamicContent =
                  builderData?.builder?.data?.content?.find(
                    (data: any) => data?.props?.id === item?.id,
                  );
                if (dynamicContent && !dynamicContent?.props?.display) {
                  return (
                    <CustomRender
                      key={item?.id}
                      data={{
                        content: [dynamicContent],
                        zones: { ...builderData?.builder?.data?.zones },
                      }}
                    />
                  );
                }
              }
            },
          )
        ) : (
          <>
            {variables?.layoutSettings?.flashSales?.enable ? (
              <FlashSaleProducts
                variables={{
                  ...variables?.layoutSettings?.flashSales,
                  productCard: variables?.layoutSettings?.productCard,
                }}
              />
            ) : null}

            {variables?.layoutSettings?.category?.enable ? (
              <Categories
                title={variables?.layoutSettings?.category?.title}
                description={variables?.layoutSettings?.category?.description}
                layout="elegant"
                variables={variables.categories}
              />
            ) : null}

            {variables?.layoutSettings?.trendingProducts?.enable ? (
              <TrendingProducts
                title={variables?.layoutSettings?.trendingProducts?.title}
                description={
                  variables?.layoutSettings?.trendingProducts?.description
                }
                variables={variables.bestSellingProducts}
                banner={variables?.layoutSettings?.trendingProducts?.banner}
              />
            ) : null}

            {variables?.layoutSettings?.featuredBrands?.enable ? (
              <SectionBlockElegant
                title={variables?.layoutSettings?.featuredBrands?.title}
                description={
                  variables?.layoutSettings?.featuredBrands?.description
                }
                className="py-0 md:py-0 xl:py-0 3xl:py-0"
              >
                <FeaturedBrandsSlider />
              </SectionBlockElegant>
            ) : null}

            {variables?.layoutSettings?.latestProducts?.enable ? (
              <LatestElegantProducts
                title={variables?.layoutSettings?.latestProducts?.title}
                description={
                  variables?.layoutSettings?.latestProducts?.description
                }
                variables={variables?.layoutSettings?.latestProducts}
              />
            ) : null}

            {/* {variables?.layoutSettings?.featuredShops?.enable ? (
              <SectionBlockElegant
                title={variables?.layoutSettings?.featuredShops?.title}
                description={
                  variables?.layoutSettings?.featuredShops?.description
                }
                className="pt-0 md:pt-0 xl:pt-0 3xl:pt-0"
              >
                <FeaturedShopsSlider />
              </SectionBlockElegant>
            ) : null} */}
          </>
        )}

        {/* <CallToAction /> */}
      </main>
      <Footer variant="dark" />
    </div>
  );
}
