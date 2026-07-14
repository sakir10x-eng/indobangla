import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';

/**
 * #2 — Admin-curated book selection for the home banner and the
 * frequently-bought-together row. Auto by default; when the admin picks books,
 * these lists are non-empty and the storefront uses them instead.
 */
export type FeaturedBooks = { banner: any[]; fbt: any[] };

/**
 * Pass a `productId` to get that product's own curated FBT list (alada /
 * per-product). Without it, returns the global banner + global FBT.
 */
export function useFeaturedBooks(productId?: string | number): FeaturedBooks {
  const { data } = useQuery(
    ['featured-books', productId ?? 'global'],
    () =>
      HttpClient.get<FeaturedBooks>(
        'featured-books',
        productId ? { product_id: productId } : undefined,
      ),
    { staleTime: 5 * 60 * 1000, keepPreviousData: true },
  );
  return { banner: data?.banner ?? [], fbt: data?.fbt ?? [] };
}
