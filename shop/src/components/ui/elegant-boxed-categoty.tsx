import { Image } from '@/components/ui/image';
import { productPlaceholder } from '@/lib/placeholders';
import Link from 'next/link';
import CarouselWithDots from './carousel-with-dots';

interface CategoryItemProps {
  item: any;
}
const CategoryItem: React.FC<CategoryItemProps> = ({ item }) => {
  return (
    <Link
      href={`/${item?.type?.slug}/search/?category=${item.slug}`}
      className="block relative cursor-pointer overflow-hidden rounded border-2 bg-light text-center py-5 md:py-7 lg:py-10 px-5 border-light"
    >
      <div className="relative aspect-square max-w-[150px] rounded-full mx-auto flex items-center justify-center mb-3 overflow-hidden">
        <Image
          src={item?.image?.original! ?? productPlaceholder}
          alt={item?.name!}
          fill
          sizes="(max-width: 768px) 100vw"
          className="object-contain"
        />
      </div>
      <span className="block text-base font-medium text-center md:pt-1 text-heading">
        {item.name}
      </span>
      <span className="block text-sm text-center md:pt-2 text-body">
        {item.products_count ?? 0} Items
      </span>
    </Link>
  );
};

const breakpoints = {
  420: {
    slidesPerView: 2,
  },

  640: {
    slidesPerView: 3,
  },

  800: {
    slidesPerView: 4,
  },

  980: {
    slidesPerView: 5,
  },

  1200: {
    slidesPerView: 6,
  },

  1520: {
    slidesPerView: 7,
  },
  2100: {
    slidesPerView: 8,
  },
};

function ElegantBoxedCategoryMenu({ items }: any) {
  return (
    <CarouselWithDots
      spaceBetween={12}
      breakpoints={breakpoints}
      autoHeight={true}
      items={items}
    >
      {(item) => <CategoryItem key={item.id} item={item} />}
    </CarouselWithDots>
  );
}

export default ElegantBoxedCategoryMenu;
