import ErrorMessage from '@/components/ui/error-message';
import ManufacturerLoader from '@/components/ui/loaders/manufacturer-loader';
import NotFound from '@/components/ui/not-found';
import { useTopManufacturers } from '@/framework/manufacturer';
import rangeMap from '@/lib/range-map';
import { useRouter } from 'next/router';
import CarouselWithDots from '@/components/ui/carousel-with-dots';
import BrandCard from '@/components/brands/card';

const breakpoints = {
  320: {
    slidesPerView: 2,
    spaceBetween: 24,
  },

  480: {
    slidesPerView: 3,
    spaceBetween: 24,
  },

  680: {
    slidesPerView: 4,
    spaceBetween: 24,
  },

  820: {
    slidesPerView: 5,
    spaceBetween: 24,
  },

  1100: {
    slidesPerView: 6,
    spaceBetween: 24,
  },

  1280: {
    slidesPerView: 7,
    spaceBetween: 24,
  },
  2100: {
    slidesPerView: 8,
    spaceBetween: 32,
  },
};

type FeaturedBrandsSliderProps = {
  title?: string;
};

const FeaturedBrandsSlider: React.FC<FeaturedBrandsSliderProps> = () => {
  const { query } = useRouter();
  const { manufacturers, isLoading, error } = useTopManufacturers({
    limit: 10,
    ...(query?.pages && { type: query?.pages[0] as string }),
  });

  if (error) return <ErrorMessage message={error.message} />;

  if (isLoading && !manufacturers.length) {
    return (
      <div className="">
        <div className="grid w-full grid-flow-col gap-6">
          {rangeMap(4, (i) => (
            <ManufacturerLoader key={i} uniqueKey={`manufacturer-${i}`} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      {!isLoading && !manufacturers.length ? (
        <div className="min-h-full pt-6 pb-8 px-9 lg:p-8">
          <NotFound text="text-no-manufacturers" className="mx-auto w-1/4" />
        </div>
      ) : (
        <CarouselWithDots breakpoints={breakpoints} items={manufacturers}>
          {(item) => <BrandCard item={item} />}
        </CarouselWithDots>
      )}
    </div>
  );
};

export default FeaturedBrandsSlider;
