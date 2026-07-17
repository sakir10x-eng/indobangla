import { useCart } from '@/store/quick-cart/cart.context';

interface Gift {
  id: number;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  in_stock: boolean;
  image?: any;
}

/**
 * Feature 2 — "choose your free gift".
 * Shows the admin-defined gift pool. In-stock options are selectable up to `max`;
 * out-of-stock ones are disabled with a "স্টক আউট" badge. A selected gift is added
 * to the cart at ৳0 with is_gift; the backend re-validates it at order time.
 */
export default function GiftPicker({
  gifts,
  perUnit,
  perCopy,
  productId,
}: {
  gifts: Gift[];
  perUnit: number;
  perCopy: boolean;
  productId: number;
}) {
  const { addItemToCart, removeItemFromCart, isInCart, getItemFromCart } = useCart();
  // Per-copy gifts scale with how many copies are in the cart (min 1 so the buyer
  // can pick before adding); whole-order gifts stay fixed. Backend re-validates.
  const paidQty = Number(getItemFromCart(productId as any)?.quantity ?? 1);
  const max = perCopy ? perUnit * Math.max(1, paidQty) : perUnit;
  if (!perUnit || !gifts?.length) return null;

  const selectedCount = gifts.filter((g) => isInCart(g.id as any)).length;

  const toggle = (g: Gift) => {
    if (isInCart(g.id as any)) {
      removeItemFromCart(g.id as any);
      return;
    }
    if (selectedCount >= max || !g.in_stock) return;
    addItemToCart(
      {
        id: g.id,
        name: g.name,
        slug: g.slug,
        image: (g.image as any)?.thumbnail ?? g.image,
        stock: g.quantity,
        price: 0,
        is_gift: true,
      } as any,
      1,
    );
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-sm text-amber-800">🎁 ফ্রি উপহার বেছে নিন</b>
        <span className="text-xs font-semibold text-amber-700">
          {selectedCount}/{max} বাছাই
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {gifts.map((g) => {
          const selected = isInCart(g.id as any);
          const disabled = !g.in_stock || (!selected && selectedCount >= max);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g)}
              disabled={disabled && !selected}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${
                selected
                  ? 'border-amber-500 bg-white'
                  : disabled
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                  : 'border-amber-200 bg-white hover:border-amber-400'
              }`}
            >
              <img
                src={(g.image as any)?.thumbnail ?? (g.image as any) ?? ''}
                alt={g.name}
                className="h-10 w-10 flex-shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-heading">
                  {g.name}
                </span>
                {g.in_stock ? (
                  <span className="text-[11px] font-semibold text-green-600">
                    ফ্রি {g.price ? <s className="text-gray-400">৳{g.price}</s> : null}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-red-500">স্টক আউট</span>
                )}
              </span>
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  selected
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-gray-300 text-transparent'
                }`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
