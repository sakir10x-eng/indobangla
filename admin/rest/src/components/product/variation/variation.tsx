import { useMemo } from 'react';
import { getVariations } from './get-variations';
import { isVariationSelected } from './is-variation-selected';
import VariationGroups from './variation-groups';
import VariationPrice from './variation-price';
import isEqual from 'lodash/isEqual';
import { AttributesProvider, useAttributes } from './attributes.context';
import { AddToCart } from '@/components/cart/add-to-cart/add-to-cart';
import { useProductQuery } from '@/data/product';
import { Config } from '@/config';
import { useRouter } from 'next/router';
import Loader from '@/components/ui/loader/loader';
import { ProductType } from '@/types';
import usePrice from '@/utils/use-price';

interface Props {
  product: any;
}

const Variation = ({ product }: Props) => {
  const { attributes } = useAttributes();
  const variations = useMemo(
    () => getVariations(product?.variations),
    [product?.variations],
  );
  const isSelected = isVariationSelected(variations, attributes);
  let selectedVariation: any = {};
  if (isSelected) {
    selectedVariation = product?.variation_options?.find((o: any) =>
      isEqual(
        o.options.map((v: any) => v.value).sort(),
        Object.values(attributes).sort(),
      ),
    );
  }
  const {
    price: currentPrice,
    basePrice,
    discount,
  } = usePrice({
    amount: product?.sale_price ? product?.sale_price : product?.price,
    baseAmount: product?.price,
  });

  return (
    <div className="w-[95vw] max-w-lg rounded-md bg-white p-8">
      <h3 className="mb-2 text-center text-2xl font-semibold text-heading">
        {product?.name}
      </h3>
      {product?.product_type === ProductType.Variable ? (
        <>
          <div className="mb-8 flex items-center justify-center">
            <VariationPrice
              selectedVariation={selectedVariation}
              minPrice={product?.min_price}
              maxPrice={product?.max_price}
            />
          </div>
          <div className="mb-8">
            <VariationGroups variations={variations} />
          </div>
        </>
      ) : (
        <div className="mb-2 flex items-center justify-center">
          <span className="text-2xl font-semibold text-accent no-underline">
            {currentPrice}
          </span>
          {basePrice && (
            <del className="text-xs text-muted ms-2 md:text-sm">
              {basePrice}
            </del>
          )}
        </div>
      )}
      <AddToCart
        data={product}
        variant="big"
        variation={selectedVariation}
        disabled={selectedVariation?.is_disable || !isSelected}
      />
    </div>
  );
};

const ProductVariation = ({ productSlug }: { productSlug: string }) => {
  const { locale } = useRouter();
  const { product, isLoading: loading } = useProductQuery({
    slug: productSlug,
    language: locale!,
  });

  if (loading || !product)
    return (
      <div className="flex h-48 w-48 items-center justify-center rounded-md bg-white">
        <Loader />
      </div>
    );
  return (
    <AttributesProvider>
      <Variation product={product} />
    </AttributesProvider>
  );
};

export default ProductVariation;
