import Coupon from '@/components/checkout/coupon';
import usePrice from '@/lib/use-price';
import EmptyCartIcon from '@/components/icons/empty-cart';
import { CloseIcon } from '@/components/icons/close-icon';
import { useTranslation } from 'next-i18next';
import { useCart } from '@/store/quick-cart/cart.context';
import {
  calculatePaidTotal,
  calculateTotal,
} from '@/store/quick-cart/cart.utils';
import { useAtom } from 'jotai';
import {
  couponAtom,
  discountAtom,
  verifiedResponseAtom,
} from '@/store/checkout';
import ItemCard from '@/components/checkout/item/item-card';
import { ItemInfoRow } from '@/components/checkout/item/item-info-row';
import { PlaceOrderAction } from '@/components/checkout/place-order-action';
import Wallet from '@/components/checkout/wallet/wallet';
import { useSettings } from '@/framework/settings';
import cn from 'classnames';
import { CouponType } from '@/types';

interface Props {
  className?: string;
}
const VerifiedItemList: React.FC<Props> = ({ className }) => {
  const { t } = useTranslation('common');
  const { items, isEmpty: isEmptyCart } = useCart();
  const [verifiedResponse] = useAtom(verifiedResponseAtom);
  const [coupon, setCoupon] = useAtom(couponAtom);
  const [discount] = useAtom(discountAtom);
  const { settings } = useSettings();
  const freeShippingAmount = settings?.freeShippingAmount;
  const freeShipping = settings?.freeShipping;

  const available_items = items?.filter(
    (item) => !verifiedResponse?.unavailable_products?.includes(item.id)
  );

  const { price: tax } = usePrice(
    verifiedResponse && {
      amount: verifiedResponse.total_tax ?? 0,
    }
  );

  const { price: shipping } = usePrice(
    verifiedResponse && {
      amount: verifiedResponse.shipping_charge ?? 0,
    }
  );
  const base_amount = calculateTotal(available_items);
  const { price: sub_total } = usePrice(
    verifiedResponse && {
      amount: base_amount,
    }
  );
  // Calculate Discount base on coupon type
  let calculateDiscount = 0;

  switch (coupon?.type) {
    case CouponType.PERCENTAGE:
      calculateDiscount = (base_amount * Number(discount)) / 100
      break;
    case CouponType.FREE_SHIPPING:
      calculateDiscount =  verifiedResponse ? verifiedResponse.shipping_charge : 0
      break;
    default:
      calculateDiscount = Number(discount)
  }

  const { price: discountPrice } = usePrice(
    //@ts-ignore
    discount && {
      amount: Number(calculateDiscount),
    }
  );
  let freeShippings = freeShipping && Number(freeShippingAmount) <= base_amount
  const totalPrice = verifiedResponse
    ? calculatePaidTotal(
      {
        totalAmount: base_amount,
        tax: verifiedResponse?.total_tax,
        shipping_charge: freeShippings ? 0 : verifiedResponse?.shipping_charge,
      },
      Number(calculateDiscount)
    )
    : 0;
  const { price: total } = usePrice(
    verifiedResponse && {
      amount: totalPrice,
    }
  );
  // #1 — everything the shopper saved on this order: the coupon/discount plus the shipping
  // charge that was waived by free shipping.
  const totalSave =
    Number(calculateDiscount || 0) +
    (freeShippings ? Number(verifiedResponse?.shipping_charge ?? 0) : 0);
  const { price: totalSavePrice } = usePrice(
    verifiedResponse && { amount: totalSave },
  );
  return (
    <div className={className ?? 'ib-card'}>
      <div className="flex flex-col pb-2 border-b border-border-200">
        {!isEmptyCart ? (
          items?.map((item) => {
            const notAvailable = verifiedResponse?.unavailable_products?.find(
              (d: any) => d === item.id
            );
            return (
              <ItemCard
                item={item}
                key={item.id}
                notAvailable={!!notAvailable}
              />
            );
          })
        ) : (
          <EmptyCartIcon />
        )}
      </div>

      <div className="mt-4 space-y-2">
        <ItemInfoRow title={t('text-sub-total')} value={sub_total} />
        <ItemInfoRow title={t('text-tax')} value={tax} />
        <div className="flex justify-between">
          <p className="text-sm text-body">{t('text-shipping')} <span className='text-xs font-semibold text-emerald-600'>{freeShippings && `(${t('text-free-shipping')})`}</span></p>
          <span className="text-sm text-body">
            {freeShippings ? (
              <>
                <del className="opacity-60">{shipping}</del>{' '}
                <span className="font-semibold text-emerald-600">ফ্রি</span>
              </>
            ) : (
              shipping
            )}
          </span>
        </div>
        {discount && coupon ? (
          <div className="flex justify-between">
            <p className="flex items-center gap-1 text-sm text-body ltr:mr-2 rtl:ml-2">
              {t('text-discount')} <span className='-mt-px text-xs font-semibold text-emerald-600'>{coupon?.type === CouponType.FREE_SHIPPING && `(${t('text-free-shipping')})` }</span>
            </p>
            <span className="flex items-center text-xs font-semibold text-emerald-600 ltr:mr-auto rtl:ml-auto">
              ({coupon?.code})
              <button onClick={() => setCoupon(null)}>
                <CloseIcon className="w-3 h-3 ltr:ml-2 rtl:mr-2 mt-0.5" />
              </button>
            </span>
            <span className="flex items-center gap-1 text-sm text-body">{calculateDiscount > 0 ? <span className='-mt-0.5'>-</span>: null} {discountPrice}</span>
          </div>
        ) : (
          <div className="mt-5 !mb-4 flex justify-between">
            <Coupon subtotal={base_amount} />
          </div>
        )}
        {totalSave > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5">
            <p className="text-sm font-semibold text-emerald-700">🎉 সর্বমোট সাশ্রয়</p>
            <span className="text-sm font-bold text-emerald-700">− {totalSavePrice}</span>
          </div>
        )}
        <div className="mt-1 flex items-baseline justify-between border-t border-[#E4E1DC] pt-3">
          <p className="text-sm font-semibold text-heading">
            {t('text-total')}
          </p>
          <span
            className="text-[26px] font-bold text-heading"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {total}
          </span>
        </div>
      </div>
      {verifiedResponse && (
        <Wallet
          totalPrice={totalPrice}
          walletAmount={verifiedResponse.wallet_amount}
          walletCurrency={verifiedResponse.wallet_currency}
        />
      )}
      <PlaceOrderAction>
        <span className="inline-flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            className="h-[17px] w-[17px]"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          অর্ডার কনফার্ম করুন
        </span>
      </PlaceOrderAction>
      <p className="mt-2.5 text-center text-[11.5px] text-[#9A9899]">
        ৭ দিনে রিটার্ন · নিরাপদ পেমেন্ট · সারাদেশে ডেলিভারি
      </p>
    </div>
  );
};

export default VerifiedItemList;
