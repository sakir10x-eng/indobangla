import usePrice from '@/lib/use-price';
import cn from 'classnames';
import { useTranslation } from 'next-i18next';
interface Props {
  item: any;
  notAvailable?: boolean;
}

const ItemCard = ({ item, notAvailable }: Props) => {
  const { t } = useTranslation('common');
  const { price } = usePrice({
    amount: item.itemTotal,
  });
  const thumb = item?.image?.thumbnail;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-[#F3F0EA]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={item?.name}
            className="h-11 w-9 object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B6B2AE"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" />
            <path d="M4 17h14" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[13.5px] font-semibold',
            notAvailable ? 'text-red-500 line-through' : 'text-heading'
          )}
        >
          {item.name}
        </p>
        <p className="text-[12px] text-[#6E6C6D]">
          {item.quantity} কপি
          {item?.unit ? ` · ${item.unit}` : ''}
          {item?.in_flash_sale ? ' · (On Sale)' : ''}
        </p>
        {item?.is_preorder && (
          <span className="mt-1 inline-block rounded bg-[#FDF3E3] px-1.5 py-0.5 text-[11px] font-semibold text-[#8A5A12]">
            📖 প্রি-অর্ডার · {item.preorder_advance_pct || 50}% অগ্রিম
          </span>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap text-[13.5px] font-semibold',
          notAvailable ? 'text-red-500' : 'text-heading'
        )}
      >
        {!notAvailable ? price : t('text-unavailable')}
      </span>
    </div>
  );
};

export default ItemCard;
