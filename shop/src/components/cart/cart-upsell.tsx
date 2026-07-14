import { HttpClient } from '@/framework/client/http-client';
import { useCart } from '@/store/quick-cart/cart.context';
import { useQuery } from 'react-query';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/** Cross-sell inside the cart: "Readers also bought" with one-tap add. */
export default function CartUpsell() {
  const { items, addItemToCart, isInCart } = useCart();
  const firstId = items[0]?.id ? String(items[0].id).split('.')[0] : null;

  const { data } = useQuery(
    ['cart-upsell', firstId],
    () =>
      firstId
        ? HttpClient.get<any>('related-books', { product_id: firstId })
        : HttpClient.get<any>('books-listing', { limit: 6 }),
    { staleTime: 5 * 60 * 1000 },
  );

  const pool: any[] = firstId
    ? [
        ...(((data as any)?.by_author ?? []) as any[]),
        ...(((data as any)?.by_category ?? []) as any[]),
        ...(((data as any)?.recommended ?? []) as any[]),
      ]
    : ((data as any)?.data ?? []);

  const cartIds = new Set(items.map((i: any) => String(i.id).split('.')[0]));
  const recs = pool.filter((p) => !cartIds.has(String(p.id))).slice(0, 3);
  if (!recs.length) return null;

  const add = (p: any) => {
    const price = p.sale_price > 0 ? p.sale_price : p.price;
    addItemToCart(
      {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.image?.original || p.image,
        price,
        stock: p.quantity ?? 1,
      } as any,
      1,
    );
  };

  return (
    <div className="mx-4 mt-4 border-t border-border-100 pt-4">
      <p className="mb-2 text-sm font-bold text-heading">📚 এই বইগুলোও পাঠকরা কিনেছেন</p>
      <div className="space-y-2">
        {recs.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image?.original || '/product-placeholder.svg'}
              alt={p.name}
              className="h-12 w-9 shrink-0 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs font-medium text-heading">{p.name}</p>
              <p className="text-xs font-bold text-accent">{bdt(p.sale_price > 0 ? p.sale_price : p.price)}</p>
            </div>
            <button
              onClick={() => add(p)}
              disabled={isInCart(p.id)}
              className="shrink-0 rounded-full border border-accent px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-40"
            >
              {isInCart(p.id) ? '✓' : '+ যোগ'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
