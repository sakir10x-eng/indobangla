import Counter from '@/components/ui/counter';
import { cartAnimation } from '@/lib/cart-animation';
import { useCart } from '@/store/quick-cart/cart.context';
import { generateCartItem } from '@/store/quick-cart/generate-cart-item';
import Button from '@/components/ui/button';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Routes } from '@/config/routes';
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
  /**
   * Once the book is in the cart, offer Checkout right here instead of making the buyer hunt
   * for the cart icon. Used by the sticky mobile buy bar, where that hunt is worst.
   */
  withCheckout?: boolean;
}

export const AddToCartAlt = ({
  data,
  variant = 'helium',
  counterVariant,
  counterClass,
  variation,
  disabled,
  withCheckout,
}: Props) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const {
    addItemToCart,
    removeItemFromCart,
    getItemFromCart,
    isInStock,
    isInCart,
    updateCartLanguage,
    language,
  } = useCart();
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

  // Once it's in the cart, the button has nothing left to say — pressing it again on a
  // 1-copy book looked like nothing happened. So the row turns into the cart's own quantity
  // control, which IS the confirmation: the number on screen is what's in the cart.
  const inCart = isInCart(item?.id);
  const cartQty = Number(getItemFromCart(item?.id)?.quantity) || 0;

  if (inCart) {
    const counter = (
      <Counter
        value={cartQty}
        onDecrement={(e: any) => {
          e.stopPropagation();
          removeItemFromCart(item.id);
        }}
        onIncrement={(e: any) => {
          e.stopPropagation();
          // Challenge rule: one copy per book. Many different books is the whole point.
          if (challengeLive) return;
          addItemToCart(item, 1);
        }}
        variant={counterVariant || variant}
        className={`${counterClass ?? ''} !h-14 !w-full !min-w-0 !text-sm`}
        disabled={outOfStock}
      />
    );
    return (
      <div>
        <div className="flex items-stretch gap-2.5">
          <div className={withCheckout ? 'flex w-[104px] shrink-0' : 'flex w-full'}>
            {counter}
          </div>
          {withCheckout && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Mirror the cart sidebar: a digital-only cart checks out somewhere else.
                const isRegular = Boolean(!item?.is_digital);
                router.push(isRegular ? Routes.checkout : Routes.checkoutDigital, undefined, {
                  locale: language,
                });
              }}
              className="!h-14 flex-1 rounded-xl bg-[#1f7a52] px-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#1f7a52]/25 transition-colors hover:bg-[#186241]"
            >
              চেকআউট →
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[13px] font-semibold text-[#1f7a52]">
          ✓ {cartQty} কপি কার্টে যোগ হয়েছে
        </p>
      </div>
    );
  }

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
        className="!h-14 flex-1 !rounded-xl !px-3 !text-center !text-sm !font-bold !leading-tight tracking-wide shadow-lg shadow-accent/25 sm:!text-base"
        onClick={handleAddClick}
        disabled={disabled || outOfStock || isDraft}
      >
        {isPreorder ? (
          <span className="flex flex-col items-center justify-center leading-tight">
            <span>📖 প্রি-অর্ডারে যোগ করুন</span>
            <span className="text-[11px] font-semibold opacity-90">
              {advancePct}% অগ্রিম
            </span>
          </span>
        ) : (
          `🛒 ${t('text-add-to-cart')}`
        )}
      </Button>
    </div>
  );
};
