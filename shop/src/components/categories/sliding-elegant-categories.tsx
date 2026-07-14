import ElegantBoxedCategoryMenu from '@/components/ui/elegant-boxed-categoty';
import BakeryCategoryLoader from '@/components/ui/loaders/bakery-categories-loader';
import NotFound from '@/components/ui/not-found';
import type { Category } from '@/types';
import SectionBlockElegant from '../ui/section-block-elegant';

interface SlidingCardCategoriesProps {
  notFound: boolean;
  loading: boolean;
  categories: Category[];
  title?: string;
  description?: string;
}

const SlidingElegantCategories: React.FC<SlidingCardCategoriesProps> = ({
  notFound,
  categories,
  loading,
  title,
  description,
}) => {
  if (loading) {
    return (
      <div className="hidden xl:block">
        <div className="mt-8 flex h-52 w-full justify-center px-2">
          <BakeryCategoryLoader />
        </div>
      </div>
    );
  }
  return (
    <SectionBlockElegant
      title={title}
      description={description}
      className="bg-gray-100"
    >
      {!notFound ? (
        <ElegantBoxedCategoryMenu items={categories} />
      ) : (
        <div className="min-h-full">
          <NotFound text="text-no-category" className="mx-auto w-1/4" />
        </div>
      )}
    </SectionBlockElegant>
  );
};

export default SlidingElegantCategories;
