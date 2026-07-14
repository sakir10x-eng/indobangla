import {
  Navigation,
  Pagination,
  Swiper,
  SwiperOptions,
  SwiperSlide,
} from '@/components/ui/slider';
import { useIsRTL } from '@/lib/locals';
import classNames from 'classnames';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React, { useRef, useState } from 'react';

interface CarouselProps extends SwiperOptions {
  items: any[];
  children: (item: { [key: string]: any }) => React.ReactNode;
  className?: string;
  breakpoints?: any;
}

/**
 * Common carousel
 * @param items any[]
 * @param children (item: { [key: string]: any }) => React.ReactNode
 * @param className string
 * @param rest SwiperOptions
 * @returns
 */

const initialBreakpoints = {
  320: {
    slidesPerView: 2,
  },

  540: {
    slidesPerView: 3,
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
  1800: {
    slidesPerView: 8,
  },
  2600: {
    slidesPerView: 9,
  },
};

const CarouselWithDots = ({
  items,
  children,
  className,
  breakpoints,
  ...rest
}: CarouselProps) => {
  const { t } = useTranslation('common');
  const { isRTL } = useIsRTL();
  const toolBoxRef = useRef<HTMLDivElement | null>(null);

  const [paginationEl, setPaginationEl] = useState<HTMLElement | null>(null);

  const [prevEl, setPrevEl] = useState<HTMLElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLElement | null>(null);

  return (
    <div className={classNames('relative', className)}>
      <Swiper
        modules={[Navigation, Pagination]}
        navigation={{
          prevEl,
          nextEl,
          // prevEl: prevRef.current!, // Assert non-null
          // nextEl: nextRef.current!, // Assert non-null
          disabledClass: '!flex opacity-50',
          hiddenClass: 'swiper-button-hidden',
        }}
        autoplay={false}
        pagination={{
          enabled: true,
          el: paginationEl,
          clickable: true,
          bulletClass:
            'size-2.5 rounded bg-gray-300 transition-all duration-200 !m-0 cursor-pointer',
          bulletActiveClass: 'w-4 bg-gray-900',
        }}
        spaceBetween={32}
        breakpoints={breakpoints ? breakpoints : initialBreakpoints}
        onInit={(swiper) => {
          const totalSlides = swiper.slides.length;
          const slidesPerView = swiper.params.slidesPerView;
          if (typeof slidesPerView === 'number') {
            if (totalSlides <= slidesPerView && toolBoxRef?.current) {
              toolBoxRef.current.style.display = 'none';
            }
          }
        }}
        {...rest}
      >
        {items?.map((item: any, idx: number) => (
          <SwiperSlide key={idx} className="carousel-slide">
            {children(item)}
          </SwiperSlide>
        ))}
      </Swiper>
      <div
        ref={toolBoxRef}
        className="flex justify-center items-center mt-8 gap-x-5"
      >
        <div
          ref={(node) => setPrevEl(node)}
          // ref={prevRef}
          className="author-slider-prev size-9 rounded-full border border-gray-300 inline-flex justify-center items-center cursor-pointer text-body hover:border-accent hover:text-accent"
        >
          <span className="sr-only">{t('text-previous')}</span>
          {isRTL ? (
            <ArrowRight className="size-4" />
          ) : (
            <ArrowLeft className="size-4" />
          )}
        </div>
        <div
          ref={(node) => setPaginationEl(node)}
          className="!w-auto flex justify-center items-center gap-1.5"
        ></div>
        <div
          ref={(node) => setNextEl(node)}
          // ref={nextRef}
          className="author-slider-next size-9 rounded-full border border-gray-300 inline-flex justify-center items-center cursor-pointer text-body hover:border-accent hover:text-accent"
        >
          <span className="sr-only">{t('text-next')}</span>
          {isRTL ? (
            <ArrowLeft className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </div>
      </div>
    </div>
  );
};

export default CarouselWithDots;
