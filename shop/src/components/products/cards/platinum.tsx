import { ExternalIcon } from '@/components/icons/external-icon';
import { StarIconNew } from '@/components/icons/star-icon';
import FavoriteButton from '@/components/products/details/favorite-button';
import { Image } from '@/components/ui/image';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { cn } from '@/lib/cn';
import { productPlaceholder } from '@/lib/placeholders';
import usePrice from '@/lib/use-price';
import { Product } from '@/types';
import { useTranslation } from 'next-i18next';

type PlatinumProps = {
  product: Product;
  className?: string;
  variant?: 'default' | 'mini';
};

const Platinum: React.FC<PlatinumProps> = ({
  product,
  className,
  variant = 'default',
}) => {
  const { t } = useTranslation('common');
  const {
    id,
    name,
    slug,
    image,
    author,
    min_price,
    max_price,
    product_type,
    is_external,
    rating_count,
    ratings,
    external_product_url,
    // external_product_button_text,
  } = product ?? {};

  const { price, basePrice, discount } = usePrice({
    amount: product.sale_price ? product.sale_price : product.price!,
    baseAmount: product.price,
  });
  const { price: minPrice } = usePrice({
    amount: min_price!,
  });
  const { price: maxPrice } = usePrice({
    amount: max_price!,
  });

  return (
    <article
      className={cn(
        'product-card relative cart-type-platinum flex h-full overflow-hidden duration-200 gap-y-4 gap-x-5',
        variant === 'mini' ? 'flex-row items-center' : 'flex-col',
        className,
      )}
    >
      <div
        className={cn(
          'relative',
          variant === 'mini'
            ? 'aspect-[200/150] min-w-[120px] 2xl:min-w-[180px]'
            : 'aspect-square',
        )}
      >
        <Link
          href={Routes.product(slug)}
          className={`cursor-pointer size-full relative rounded-lg flex bg-gray-100 w-full justify-center items-center overflow-hidden`}
        >
          <Image
            src={image?.original ?? productPlaceholder}
            alt={name}
            fill
            quality={100}
            sizes="(max-width: 768px) 100vw"
            className="object-contain my-auto rounded-lg product-image"
          />
        </Link>
        {/* End of product image */}

        {discount && (
          <div
            className={cn(
              'absolute top-3 rounded bg-amber-300 px-1.5 text-xs font-semibold leading-6 text-dark ltr:left-3 rtl:right-3 sm:px-2 md:top-[22px] md:px-2.5 ltr:md:left-4 rtl:md:right-4',
              variant === 'mini' && 'top-3 md:top-3 lg:top-3',
            )}
          >
            {discount}
          </div>
        )}

        <FavoriteButton
          variant="ghost"
          productId={id}
          className="absolute left-auto mt-0 right-5 top-3"
        />
      </div>

      <div
        className={cn(
          'flex justify-between gap-3',
          variant === 'mini' &&
            'max-w-[calc(100%-140px)] 2xl:max-w-[calc(100%-200px)]',
        )}
      >
        <div className="flex flex-col w-full space-y-1 overflow-hidden shrink-0">
          <div className="flex items-center gap-x-1">
            <div className="flex gap-x-px text-body">
              {[...new Array(5)].map((_, i) =>
                i < ratings ? (
                  <StarIconNew key={i} className="size-3.5 text-heading" />
                ) : (
                  <StarIconNew key={i} className="size-3.5 text-muted-light" />
                ),
              )}
            </div>

            {rating_count?.length ? (
              <span className="text-sm text-body">({rating_count.length})</span>
            ) : (
              <span className="text-sm text-body">({0})</span>
            )}
          </div>
          {name && (
            <Link
              href={Routes.product(slug)}
              className="w-full text-sm font-medium truncate transition-colors text-heading hover:text-orange-500 md:text-base"
              title={name}
            >
              {name}
            </Link>
          )}
          {author && (
            <span className="text-xs text-gray-400 md:text-sm">
              {t('text-by')}
              <Link
                href={Routes.author(author?.slug!)}
                className="transition-colors text-body hover:text-orange-500 ltr:ml-1 rtl:mr-1"
              >
                {author?.name}
              </Link>
            </span>
          )}

          <div className="flex items-center shrink-0">
            {product_type.toLowerCase() === 'variable' ? (
              <p className="text-sm font-semibold text-red-600 md:text-base">
                {minPrice}

                <span className="text-heading"> - </span>

                {maxPrice}
              </p>
            ) : (
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <span className="text-base font-semibold text-red-600">
                  {price}
                </span>
                {basePrice && (
                  <del className="text-xs font-semibold text-gray-400 ltr:mr-2 rtl:ml-2">
                    {basePrice}
                  </del>
                )}
                {discount && (
                  <div className="text-xs text-accent">
                    ({t('text-save')} {discount})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {is_external ? (
          <Link
            href={external_product_url}
            className="transition-all hover:text-orange-500"
          >
            <ExternalIcon className="w-5 h-5 stroke-2" />
          </Link>
        ) : null}
      </div>
      {/* End of product info */}
    </article>
  );
};

export default Platinum;
