import cn from 'classnames';
import { Swiper, SwiperSlide, Navigation } from '@/components/ui/slider';
import { Image } from '@/components/ui/image';
import { productPlaceholder } from '@/lib/placeholders';
import Search from '@/components/ui/search/search';
import type { Banner } from '@/types';
import { useHeaderSearch } from '@/layouts/headers/header-search-atom';
import { useIntersection } from 'react-use';
import { useEffect, useMemo, useRef } from 'react';
import { useIsRTL } from '@/lib/locals';
import { ArrowNext, ArrowPrev } from '@/components/icons';
import { useTranslation } from 'next-i18next';
import { useReverse } from '@/lib/reverse';

interface BannerProps {
  banners: Banner[] | undefined;
  layout?: string;
}

const BannerWithSearch: React.FC<BannerProps> = ({ banners, layout }) => {
  const { showHeaderSearch, hideHeaderSearch } = useHeaderSearch();
  const intersectionRef = useRef(null);
  const { t } = useTranslation('common');
  const { isRTL } = useIsRTL();
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  useEffect(() => {
    if (intersection && intersection.isIntersecting) {
      hideHeaderSearch();
      return;
    }
    if (intersection && !intersection.isIntersecting) {
      showHeaderSearch();
    }
  }, [intersection]);

  const reverseBanners = useReverse({ items: banners as Banner[] });
  return (
    <div
      className={cn('textClass relative block', {
        '!block': layout === 'minimal',
      })}
    >
      <div className="-z-1 overflow-hidden">
        <div className="relative">
          <Swiper
            id="banner"
            // loop={true}
            modules={[Navigation]}
            resizeObserver={true}
            allowTouchMove={false}
            slidesPerView={1}
            navigation={{
              nextEl: '.banner-next',
              prevEl: '.banner-prev',
            }}
          >
            {reverseBanners?.map((banner, idx) => (
              <SwiperSlide key={idx}>
                <div
                  className={cn('relative w-full', {
                    'h-[200px] sm:h-[280px] md:h-[360px] lg:h-[430px]':
                      layout === 'standard',
                    'h-[220px] md:h-[680px] md:max-h-[680px]':
                      layout === 'minimal',
                  })}
                >
                  <Image
                    className="h-full w-full object-cover object-center"
                    src={banner?.image?.original ?? productPlaceholder}
                    alt={banner?.title ?? ''}
                    fill
                    sizes="100vw"
                  />
                  {/* readability scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/25" />
                  <div
                    className={cn(
                      'absolute inset-0 flex w-full flex-col items-center justify-center gap-3 p-5 text-center md:px-20 lg:gap-5',
                      {
                        'space-y-5 md:!space-y-8': layout === 'minimal',
                      }
                    )}
                  >
                    <h1
                      className={cn(
                        'text-xl font-bold tracking-tight text-white drop-shadow-lg sm:text-2xl lg:text-4xl xl:text-5xl',
                        {
                          '!text-accent': layout === 'minimal',
                        }
                      )}
                    >
                      {banner?.title}
                    </h1>
                    <p className="max-w-2xl text-xs text-white/90 drop-shadow sm:text-sm lg:text-base xl:text-lg">
                      {banner?.description}
                    </p>
                    <div className="w-full max-w-2xl" ref={intersectionRef}>
                      <Search label="search" />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          {banners && banners?.length > 1 ? (
            <>
              <div
                className="banner-prev absolute top-2/4 z-10 -mt-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-200 border-opacity-70 bg-light text-heading shadow-200 transition-all duration-200 ltr:left-4 rtl:right-4 md:-mt-5 ltr:md:left-5 rtl:md:right-5"
                role="button"
              >
                <span className="sr-only">{t('text-previous')}</span>

                {isRTL ? (
                  <ArrowNext width={18} height={18} />
                ) : (
                  <ArrowPrev width={18} height={18} />
                )}
              </div>
              <div
                className="banner-next absolute top-2/4 z-10 -mt-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-200 border-opacity-70 bg-light text-heading shadow-200 transition-all duration-200 ltr:right-4 rtl:left-4 md:-mt-5 ltr:md:right-5 rtl:md:left-5"
                role="button"
              >
                <span className="sr-only">{t('text-next')}</span>
                {isRTL ? (
                  <ArrowPrev width={18} height={18} />
                ) : (
                  <ArrowNext width={18} height={18} />
                )}
              </div>
            </>
          ) : (
            ''
          )}
        </div>
      </div>
    </div>
  );
};

export default BannerWithSearch;
