import Banner from '@/components/banners/banner';
import CustomRender from '@/components/builder/CustomRender';
import Categories from '@/components/categories/categories';
import FilterBar from '@/components/layouts/filter-bar';
import ProductGridHome from '@/components/products/grids/home';
import PromotionSliders from '@/components/promotions/promotions';
import type { HomePageProps } from '@/types';
import { Fragment } from 'react';
import { Element } from 'react-scroll';

const dynamicSections = ['banners', 'promotional_sliders'];

export default function ClassicLayout({ variables }: HomePageProps) {
  const builderData = variables.layoutSettings?.builder;
  const sortedData = builderData?.items || [];

  const dynamicSectionsMapping = {
    banners: <Banner layout="classic" variables={variables.types} />,
    promotional_sliders: <PromotionSliders variables={variables.types} />,
  };

  return (
    <>
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
        <>
          <Banner layout="classic" variables={variables.types} />
          <PromotionSliders variables={variables.types} />
        </>
      )}

      <FilterBar variables={variables.categories} />
      <Element
        name="grid"
        className="flex border-t border-solid border-border-200 border-opacity-70"
      >
        <Categories layout="classic" variables={variables.categories} />
        <ProductGridHome
          className="px-4 pt-3.5 pb-16 lg:p-6 xl:p-8"
          variables={variables.products}
        />
      </Element>
    </>
  );
}
