import Link from '@/components/ui/link';
import { Image } from '@/components/ui/image';
import cn from 'classnames';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { Routes } from '@/config/routes';
import { Product } from '@/types';
import { productPlaceholder } from '@/lib/placeholders';
import usePrice from '@/lib/use-price';
import { ExternalIcon } from '@/components/icons/external-icon';

const AddToCart = dynamic(
  () =>
    import('@/components/products/add-to-cart/add-to-cart').then(
      (module) => module.AddToCart,
    ),
  { ssr: false },
);

type RadonProps = {
  product: Product;
  className?: string;
};

const Radon: React.FC<RadonProps> = ({ product, className }) => {
  const { t } = useTranslation('common');
  const {
    name,
    slug,
    image,
    author,
    min_price,
    max_price,
    product_type,
    is_external,
    external_product_url,
    external_product_button_text,
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
        'product-card cart-type-radon flex h-full flex-col overflow-hidden rounded-xl border border-border-200 bg-white p-2 transition-shadow duration-200 hover:shadow-md sm:p-2.5',
        className,
      )}
    >
      <Link
        href={Routes.product(slug)}
        className="cursor-pointer relative rounded-lg flex bg-white w-full justify-center items-center overflow-hidden aspect-[2/3]"
      >
        <Image
          src={image?.original ?? productPlaceholder}
          alt={name}
          fill
          quality={90}
          sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 200px"
          className="object-contain my-auto rounded-lg product-image"
        />
        {discount && product_type.toLowerCase() !== 'variable' && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            -{discount}
          </span>
        )}
      </Link>
      {/* End of product image */}

      <div className="flex justify-between gap-3 pt-3">
        <div className="flex w-full flex-col overflow-hidden">
          {name && (
            <Link
              href={Routes.product(slug)}
              className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-tight text-heading transition-colors hover:text-accent md:text-sm"
              title={name}
            >
              {name}
            </Link>
          )}

          {author && (
            <Link
              href={Routes.author(author?.slug!)}
              className="mt-1 line-clamp-1 text-[11px] text-gray-400 transition-colors hover:text-accent md:text-xs"
            >
              {author?.name}
            </Link>
          )}

          <div className="mt-2 flex items-center shrink-0">
            {product_type.toLowerCase() === 'variable' ? (
              <p className="text-sm font-bold text-accent md:text-base">
                {minPrice}
                <span className="text-heading"> - </span>
                {maxPrice}
              </p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[15px] font-extrabold text-accent md:text-base">
                  {price}
                </span>
                {basePrice && (
                  <del className="text-[11px] font-medium text-gray-400">{basePrice}</del>
                )}
                {discount && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                    {t('text-save')} {discount}
                  </span>
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

      {/* Add to cart CTA */}
      {!is_external && (
        <div className="mt-2.5">
          <AddToCart data={product} variant="neon" />
        </div>
      )}
    </article>
  );
};

export default Radon;
