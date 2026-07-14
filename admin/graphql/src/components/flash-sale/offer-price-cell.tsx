import Badge from '@/components/ui/badge/badge';
import { useIsInvalidPrice } from '@/utils/is-invalid-price';
import usePrice from '@/utils/use-price';
import {
  Product,
  ProductType
} from '__generated__/__types__';

export type IProps = {
  record: Product;
  type: string;
  rate: number;
};

const OfferPriceSale = ({ record, type, rate }: IProps) => {
  let renderPrice: string, warningText: string;

  const { price: minPrice } = usePrice({
    amount: Number(record?.min_price),
  });

  const { price: maxPrice } = usePrice({
    amount: Number(record?.max_price),
  });

  const { price } = usePrice({
    amount: record?.sale_price
      ? Number(record?.sale_price)
      : Number(record?.price),
    baseAmount: Number(record?.price),
  });

  const isInvalidPrice = useIsInvalidPrice({
    type,
    product_type: record?.product_type,
    min_price: Number(record?.min_price),
    max_price: Number(record?.max_price),
    rate: Number(rate),
  });

  // preparing for display
  switch (type) {
    case 'percentage':
      renderPrice =
        record?.product_type === ProductType?.Variable
          ? `${minPrice} - ${maxPrice}`
          : price;
      break;

    case 'fixed_rate':
      if (record?.product_type === ProductType?.Variable) {
        if (isInvalidPrice?.isInvalidPrice) {
          warningText = 'Invalid price';
        }
      }

      if (record?.product_type === ProductType?.Simple) {
        if (isInvalidPrice?.isInvalidPrice) {
          warningText = 'Invalid price';
        }
      }

      renderPrice =
        record?.product_type === ProductType?.Variable
          ? `${minPrice} - ${maxPrice}`
          : `${price}`;
      break;
  }

  return (
    <>
      <span className="whitespace-nowrap" title={renderPrice!}>
        {renderPrice!}
      </span>{' '}
      {type === 'fixed_rate' && warningText! == 'Invalid price' ? (
        <Badge text={warningText!} color="bg-red-600" animate={true} />
      ) : (
        ''
      )}
    </>
  );
};

export { OfferPriceSale };
