import Banner from '@/components/banners/banner';
import ValueProps from '@/components/common/value-props';
import HomeDeals from '@/components/common/home-deals';
import CustomRender from '@/components/builder/CustomRender';
import Categories from '@/components/categories/categories';
import FilterBar from '@/components/layouts/filter-bar';
import ProductGridHome from '@/components/products/grids/home';
import { checkIsMaintenanceModeComing } from '@/lib/constants';
import type { HomePageProps } from '@/types';
import classNames from 'classnames';
import { useAtom } from 'jotai';
import { Fragment } from 'react';
import { Element } from 'react-scroll';
import { twMerge } from 'tailwind-merge';

const dynamicSections = ['banners'];

export default function Modern({ variables }: HomePageProps) {
  const builderData = variables.layoutSettings?.builder;

  const sortedData = builderData?.items || [];

  const dynamicSectionsMapping = {
    banners: (
      <div className="border border-border-200">
        <Banner layout="modern" variables={variables.types} />
      </div>
    ),
  };

  const [underMaintenanceIsComing] = useAtom(checkIsMaintenanceModeComing);
  return (
    <div className="flex flex-1 bg-gray-100">
      <div
        className={twMerge(
          classNames(
            'sticky hidden h-full bg-gray-100 lg:w-[380px] xl:block',
            underMaintenanceIsComing
              ? 'xl:top-32 2xl:top-36'
              : 'top-32 xl:top-24 2xl:top-22',
          ),
        )}
      >
        <Categories layout="modern" variables={variables.categories} />
      </div>
      <main
        className={classNames(
          'block w-full xl:overflow-hidden ltr:xl:pl-0 ltr:xl:pr-5 rtl:xl:pr-0 rtl:xl:pl-5',
          underMaintenanceIsComing
            ? 'lg:pt-32 xl:mt-10'
            : 'lg:pt-20 xl:mt-8 2xl:mt-6',
        )}
      >
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
          <div className="border border-border-200">
            <Banner layout="modern" variables={variables.types} />
          </div>
        )}

        <ValueProps />

        <HomeDeals />

        <FilterBar variables={variables.categories} />
        <Element name="grid" className="px-4 xl:px-0">
          <ProductGridHome
            className="pt-4 pb-20 lg:py-6"
            variables={variables.products}
          />
        </Element>
      </main>
    </div>
  );
}
