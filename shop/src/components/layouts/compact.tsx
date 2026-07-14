import TopAuthorsGrid from '@/components/author/top-authors-grid';
import Banner from '@/components/banners/banner';
import CustomRender from '@/components/builder/CustomRender';
import Categories from '@/components/categories/categories';
import CallToAction from '@/components/cta/call-to-action';
import FilterBar from '@/components/layouts/filter-bar';
import TopManufacturersGrid from '@/components/manufacturer/top-manufacturers-grid';
import BestSellingProductsGrid from '@/components/products/best-selling-products';
import ProductGridHome from '@/components/products/grids/home';
import GroupProducts from '@/components/products/group-products';
import PopularProductsGrid from '@/components/products/popular-products';
import SectionBlock from '@/components/ui/section-block';
import type { HomePageProps } from '@/types';
import { useTranslation } from 'next-i18next';
import { Fragment } from 'react';

const dynamicSections = [
  'banners',
  'authors',
  'bestSelling',
  'category',
  'handpickedProducts',
  'manufactures',
  'newArrival',
  'popularProducts',
];

export default function CompactLayout({ variables }: HomePageProps) {
  const { t } = useTranslation('common');

  const builderData = variables.layoutSettings?.builder;
  const sortedData = builderData?.items || [];

  const dynamicSectionsMapping = {
    banners: (
      <SectionBlock>
        <Banner layout="compact" variables={variables.types} />
      </SectionBlock>
    ),
    authors: variables?.layoutSettings?.authors?.enable ? (
      <TopAuthorsGrid title={variables?.layoutSettings?.authors?.title} />
    ) : null,
    bestSelling: variables?.layoutSettings?.bestSelling?.enable ? (
      <SectionBlock title={variables?.layoutSettings?.bestSelling?.title}>
        <BestSellingProductsGrid variables={variables?.bestSellingProducts} />
      </SectionBlock>
    ) : null,
    category: variables?.layoutSettings?.category?.enable ? (
      <Categories
        title={variables?.layoutSettings?.category?.title}
        layout="compact"
        variables={variables.categories}
      />
    ) : null,
    handpickedProducts: variables?.layoutSettings?.handpickedProducts
      ?.enable ? (
      <GroupProducts
        products={variables?.layoutSettings?.handpickedProducts?.products}
        title={variables?.layoutSettings?.handpickedProducts?.title}
        isSlider={variables?.layoutSettings?.handpickedProducts?.enableSlider}
      />
    ) : null,
    manufactures: variables?.layoutSettings?.manufactures?.enable ? (
      <TopManufacturersGrid
        title={variables?.layoutSettings?.manufactures?.title}
      />
    ) : null,
    newArrival: variables?.layoutSettings?.newArrival?.enable ? (
      <SectionBlock title={variables?.layoutSettings?.newArrival?.title}>
        <ProductGridHome
          column="five"
          variables={{
            ...variables.products,
            sortedBy: 'DESC',
            orderBy: 'created_at',
          }}
        />
      </SectionBlock>
    ) : null,
    popularProducts: variables?.layoutSettings?.popularProducts?.enable ? (
      <SectionBlock title={variables?.layoutSettings?.popularProducts?.title}>
        <PopularProductsGrid variables={variables.popularProducts} />
      </SectionBlock>
    ) : null,
  };

  return (
    <div className="flex flex-col flex-1 bg-white">
      <FilterBar
        className="top-16 lg:hidden"
        variables={variables.categories}
      />
      <main className="block w-full mt-20 sm:mt-24 lg:mt-6 xl:overflow-hidden">
        {builderData ? (
          sortedData.map(
            (item: { id: keyof typeof dynamicSectionsMapping }) => {
              if (dynamicSections.includes(item.id)) {
                return (
                  <Fragment key={item.id}>
                    {dynamicSectionsMapping[item.id]}
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
                        root: builderData?.builder?.data?.root,
                      }}
                    />
                  );
                }
              }
            },
          )
        ) : (
          <>
            <SectionBlock>
              <Banner layout="compact" variables={variables.types} />
            </SectionBlock>
            {variables?.layoutSettings?.bestSelling?.enable ? (
              <SectionBlock
                title={variables?.layoutSettings?.bestSelling?.title}
              >
                <BestSellingProductsGrid
                  variables={variables?.bestSellingProducts}
                />
              </SectionBlock>
            ) : (
              ''
            )}
            {variables?.layoutSettings?.popularProducts?.enable ? (
              <SectionBlock
                title={variables?.layoutSettings?.popularProducts?.title}
              >
                <PopularProductsGrid variables={variables.popularProducts} />
              </SectionBlock>
            ) : (
              ''
            )}
            {variables?.layoutSettings?.category?.enable ? (
              <Categories
                title={variables?.layoutSettings?.category?.title}
                layout="compact"
                variables={variables.categories}
              />
            ) : (
              ''
            )}
            {variables?.layoutSettings?.handpickedProducts?.enable ? (
              <GroupProducts
                products={
                  variables?.layoutSettings?.handpickedProducts?.products
                }
                title={variables?.layoutSettings?.handpickedProducts?.title}
                isSlider={
                  variables?.layoutSettings?.handpickedProducts?.enableSlider
                }
              />
            ) : (
              ''
            )}
            {variables?.layoutSettings?.newArrival?.enable ? (
              <SectionBlock
                title={variables?.layoutSettings?.newArrival?.title}
              >
                <ProductGridHome
                  column="five"
                  variables={{
                    ...variables.products,
                    sortedBy: 'DESC',
                    orderBy: 'created_at',
                  }}
                />
              </SectionBlock>
            ) : (
              ''
            )}
            {variables?.layoutSettings?.authors?.enable ? (
              <TopAuthorsGrid
                title={variables?.layoutSettings?.authors?.title}
              />
            ) : (
              ''
            )}
            {variables?.layoutSettings?.manufactures?.enable ? (
              <TopManufacturersGrid
                title={variables?.layoutSettings?.manufactures?.title}
              />
            ) : (
              ''
            )}
          </>
        )}

        <CallToAction />
      </main>
    </div>
  );
}
