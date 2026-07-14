import Counter from '@/components/ui/counter';
import { cartAnimation } from '@/lib/cart-animation';
import { useCart } from '@/store/quick-cart/cart.context';
import { generateCartItem } from '@/store/quick-cart/generate-cart-item';
import Button from '@/components/ui/button';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useChallengeGate } from '@/lib/use-challenge-gate';

interface Props {
  data: any;
  variant?:
    | 'helium'
    | 'neon'
    | 'argon'
    | 'oganesson'
    | 'single'
    | 'big'
    | 'bordered';
  counterVariant?:
    | 'helium'
    | 'neon'
    | 'argon'
    | 'oganesson'
    | 'single'
    | 'details'
    | 'bordered';
  counterClass?: string;
  variation?: any;
  disabled?: boolean;
}

export const AddToCartAlt = ({
  data,
  variant = 'helium',
  counterVariant,
  counterClass,
  variation,
  disabled,
}: Props) => {
  const { t } = useTranslation('common');
  const { addItemToCart, isInStock, isInCart, updateCartLanguage, language } =
    useCart();
  const { challengeLive, guardAdd } = useChallengeGate();
  const item = generateCartItem(data, variation);
  const [quantity, setQuantity] = useState<number>(1);
  const increment = (e: React.MouseEvent<HTMLButtonElement | MouseEvent>) => {
    e.stopPropagation();
    // Challenge rule: one copy per book. Many different books is the whole point.
    if (challengeLive) return;
    setQuantity((prev) => prev + 1);
  };
  const handleAddClick = async (
    e: React.MouseEvent<HTMLButtonElement | MouseEvent>
  ) => {
    e.stopPropagation();

    // This is a book's own page, so it counts — but only if the server says so.
    const ok = await guardAdd('product', data?.id, String(data?.slug ?? data?.id));
    if (!ok) return;

    // Check language and update
    if (item?.language !== language) {
      updateCartLanguage(item?.language);
    }
    addItemToCart(item, challengeLive ? 1 : quantity);
    setQuantity(1);
    if (!isInCart(item.id)) {
      cartAnimation(e);
    }
  };
  const decrement = (e: React.MouseEvent<HTMLButtonElement | MouseEvent>) => {
    e.stopPropagation();
    setQuantity((prev) => {
      if (prev > 1) {
        return prev - 1;
      }
      return prev;
    });
  };
  const outOfStock = isInCart(item?.id) && !isInStock(item.id);

  const isDraft = data.status === 'draft';
  const isPreorder = Boolean(data?.is_preorder);
  const advancePct = Number(data?.preorder_advance_pct) || 50;
  return (
    // Buying is the point of this page: the quantity stepper stays compact and the
    // Add-to-cart button takes the rest of the row.
    <div className="flex items-stretch gap-2.5">
      <div className="flex w-[116px] shrink-0 sm:w-[124px]">
        <Counter
          value={quantity}
          onDecrement={decrement}
          onIncrement={increment}
          variant={counterVariant || variant}
          className={`${counterClass ?? ''} !h-14 !w-full !min-w-0 !text-sm`}
          disabled={outOfStock}
        />
      </div>
      {/* A pre-order is a different promise from a normal buy — say so on the button, so
          nobody discovers the advance-only rule for the first time at checkout. */}
      <Button
        className="!h-14 flex-1 !rounded-full !text-base !font-bold tracking-wide shadow-lg shadow-accent/25"
        onClick={handleAddClick}
        disabled={disabled || outOfStock || isDraft}
      >
        {isPreorder
          ? `📖 প্রি-অর্ডারে যোগ করুন (${advancePct}% অগ্রিম)`
          : `🛒 ${t('text-add-to-cart')}`}
      </Button>
    </div>
  );
};
