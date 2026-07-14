import classNames from 'classnames';
import SectionBlockElegant from '../ui/section-block-elegant';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '../ui/tab';
import BestSellingProductsGrid from './best-selling-products';
import PopularProductsGrid from './popular-products';
import CustomRender from '../builder/CustomRender';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  variables: any;
  title?: string;
  description?: string;
  banner: any;
}

export default function TrendingProducts({
  className,
  variables,
  title,
  description,
  banner,
}: Props) {
  const { t } = useTranslation('common');

  const modifiedBannerData = Boolean(banner?.content?.length)
    ? {
        content: [banner?.content[0]],
        zones: { ...banner?.zones },
      }
    : {};

  return (
    <SectionBlockElegant title={title} description={description}>
      <div
        className={cn(
          'w-full grid grid-cols-12 gap-6 xl:gap-8 gap-y-12',
          className,
        )}
      >
        <div
          className={cn(
            'col-span-full lg:col-span-9',
            !Boolean(modifiedBannerData?.content?.length) && 'lg:col-span-full',
          )}
        >
          <TabGroup>
            <TabList>
              <Tab>{t('text-best-selling')}</Tab>
              <Tab>{t('text-popular-products')}</Tab>
            </TabList>
            <TabPanels className="mt-8">
              <TabPanel>
                <BestSellingProductsGrid variables={variables} limit={8} />
              </TabPanel>
              <TabPanel>
                <PopularProductsGrid variables={variables} limit={8} />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
        {Boolean(modifiedBannerData?.content?.length) && (
          <div className="col-span-full lg:col-span-3">
            <div className="h-full">
              <CustomRender data={modifiedBannerData} />
            </div>
          </div>
        )}
      </div>
    </SectionBlockElegant>
  );
}
