import { Image } from '@/components/ui/image';
import { motion } from 'framer-motion';
import { siteSettings } from '@/config/site';
import Counter from '@/components/ui/counter';
import { CloseIcon } from '@/components/icons/close-icon';
import { fadeInOut } from '@/lib/motion/fade-in-out';
import usePrice from '@/lib/use-price';
import { useTranslation } from 'next-i18next';
import { useCart } from '@/store/quick-cart/cart.context';
import { useSaveForLater } from '@/framework/wishlist';
import { useUser } from '@/framework/user';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { HeartOutlineIcon } from '@/components/icons/heart-outline';

interface CartItemProps {
  item: any;
}

const CartItem = ({ item }: CartItemProps) => {
  const { t } = useTranslation('common');
  const {
    isInStock,
    clearItemFromCart,
    addItemToCart,
    removeItemFromCart,
    updateCartLanguage,
    language,
  } = useCart();
  const { isAuthorized } = useUser();
  const { openModal } = useModalAction();
  const { saveForLater, isLoading: saving } = useSaveForLater();

  // Variation rows carry a composite cart id (`productId.variationId`), so the wishlist
  // needs the underlying product id.
  const productId = item?.productId ?? item?.id;

  const handleSaveForLater = (e: any) => {
    e.stopPropagation();
    if (!isAuthorized) {
      openModal('LOGIN_VIEW');
      return;
    }
    saveForLater(
      { product_id: String(productId) },
      {
        // Marvel answers a failed write with HTTP 200 + an `errors` payload, so only drop
        // the row from the cart once the book is genuinely in the wishlist.
        onSuccess: (data: any) => {
          if (!data?.errors?.length) clearItemFromCart(item.id);
        },
      }
    );
  };

  const { price } = usePrice({
    amount: item.price,
  });
  const { price: itemPrice } = usePrice({
    amount: item.itemTotal,
  });
  function handleIncrement(e: any) {
    e.stopPropagation();
    // Check language and update
    if (item?.language !== language) {
      updateCartLanguage(item?.language);
    }
    addItemToCart(item, 1);
  }
  const handleRemoveClick = (e: any) => {
    e.stopPropagation();
    removeItemFromCart(item.id);
  };
  const outOfStock = !isInStock(item.id);
  return (
    <motion.div
      layout
      initial="from"
      animate="to"
      exit="from"
      variants={fadeInOut(0.25)}
      className="flex items-center border-b border-solid border-border-200 border-opacity-75 px-4 py-4 text-sm sm:px-6"
    >
      <div className="flex-shrink-0">
        <Counter
          value={item.quantity}
          onDecrement={handleRemoveClick}
          onIncrement={handleIncrement}
          variant="pillVertical"
          disabled={outOfStock}
        />
      </div>

      <div className="relative mx-4 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-gray-100 sm:h-16 sm:w-16">
        <Image
          src={item?.image ?? siteSettings?.product?.placeholderImage}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw"
          className="object-contain"
        />
      </div>
      <div className="min-w-0">
        {/* <h3 className="font-bold text-heading">{item.name}</h3> */}
        <h3 className="font-bold text-heading">{item.name} </h3>
        <p className="my-2.5 font-semibold text-accent">{price}</p>
        <span className="text-xs text-body">
          {item.quantity} X {item.unit}
        </span>
        {item?.is_preorder && (
          <span className="mt-1 block w-fit rounded-full bg-[#fdf0f1] px-2 py-0.5 text-[11px] font-bold text-[#8a4048]">
            📖 প্রি-অর্ডার · {item.preorder_advance_pct || 50}% অগ্রিম
          </span>
        )}
        <button
          type="button"
          onClick={handleSaveForLater}
          disabled={saving}
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-body transition-colors hover:text-accent focus:outline-0 disabled:opacity-50"
        >
          <HeartOutlineIcon className="h-3.5 w-3.5" />
          {saving ? t('text-loading') : t('text-save-for-later')}
        </button>
      </div>
      <span className="font-bold text-heading ltr:ml-auto rtl:mr-auto">
        {itemPrice}
      </span>
      <button
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-all duration-200 hover:bg-gray-100 hover:text-red-600 focus:bg-gray-100 focus:text-red-600 focus:outline-0 ltr:ml-3 ltr:-mr-2 rtl:mr-3 rtl:-ml-2"
        onClick={() => clearItemFromCart(item.id)}
      >
        <span className="sr-only">{t('text-close')}</span>
        <CloseIcon className="h-3 w-3" />
      </button>
    </motion.div>
  );
};

export default CartItem;
