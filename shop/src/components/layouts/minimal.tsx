import Banner from '@/components/banners/banner';
import Categories from '@/components/categories/categories';
import type { HomePageProps } from '@/types';
import CustomRender from '@/components/builder/CustomRender';
import { Fragment } from 'react';

const dynamicSections = ['banners'];

export default function MinimalLayout({ variables }: HomePageProps) {
  const builderData = variables.layoutSettings?.builder;

  const sortedData = builderData?.items || [];

  const dynamicSectionsMapping = {
    banners: <Banner layout="minimal" variables={variables.types} />,
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
        <Banner layout="minimal" variables={variables.types} />
      )}
      <Categories layout="minimal" variables={variables.categories} />
    </>
  );
}
