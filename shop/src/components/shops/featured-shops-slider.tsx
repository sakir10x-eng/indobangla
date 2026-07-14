import ErrorMessage from '@/components/ui/error-message';
import CouponLoader from '@/components/ui/loaders/coupon-loader';
import NotFound from '@/components/ui/not-found';
import { SHOPS_PER_PAGE } from '@/framework/client/variables';
import { useShops } from '@/framework/shop';
import rangeMap from '@/lib/range-map';
import { Shop } from '@/types';
import { useTranslation } from 'next-i18next';
import CarouselWithDots from '../ui/carousel-with-dots';
import ShopCard from './card';
import { useRouter } from 'next/router';

const breakpoints = {
  320: {
    slidesPerView: 2,
  },

  540: {
    slidesPerView: 3,
  },

  680: {
    slidesPerView: 4,
  },

  820: {
    slidesPerView: 5,
  },

  1200: {
    slidesPerView: 6,
  },

  1280: {
    slidesPerView: 7,
  },
  1500: {
    slidesPerView: 8,
  },
  1800: {
    slidesPerView: 9,
  },
};

export default function FeaturedShopsSlider() {
  const { t } = useTranslation('common');
  const limit = SHOPS_PER_PAGE;
  const { query } = useRouter();

  const { shops, isLoading, error } = useShops({
    is_active: 1,
    limit: 10,
    ...(query?.pages && { type: query?.pages[0] as string }),
  });

  if (error) return <ErrorMessage message={error.message} />;
  if (!isLoading && !shops.length) {
    return (
      <div className="max-w-[400px] mx-auto">
        <NotFound text="text-no-shops" />
      </div>
    );
  }

  return (
    <>
      {isLoading && !shops.length ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-9">
          {rangeMap(limit, (i) => (
            <CouponLoader key={i} uniqueKey={`shops-${i}`} />
          ))}
        </div>
      ) : (
        <CarouselWithDots breakpoints={breakpoints} items={shops}>
          {(item: { [key: string]: any }) => (
            <ShopCard shop={item as Shop} key={item.id} />
          )}
        </CarouselWithDots>
      )}
    </>
  );
}
