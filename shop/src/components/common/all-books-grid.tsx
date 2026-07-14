import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import ProductCard from '@/components/products/cards/card';
import IndoMindful from '@/components/products/cards/indo-mindful';
import ProductLoader from '@/components/ui/loaders/product-loader';
import rangeMap from '@/lib/range-map';
import { sessionSeed } from '@/lib/session-seed';
import { useImageSizes } from '@/lib/use-image-sizes';
import Link from '@/components/ui/link';

/**
 * Home "All books": shows the first 12 books. "Load more books" forwards to the
 * dedicated /books page which has its own pagination + scroll restoration, so the
 * home page stays light and Back from a product returns to the right spot.
 */
export default function AllBooksGrid() {
  const seed = sessionSeed();
  const { data, isLoading } = useQuery(['home-all-books', seed], () =>
    HttpClient.get<any>('books-listing', { page: 1, limit: 16, seed }),
  );
  const products: any[] = ((data as any)?.data ?? []).slice(0, 16);
  const { home_cols, home_card_style } = useImageSizes();
  const mindful = home_card_style !== 'classic';

  return (
    <main className="mx-auto max-w-[1720px] px-5 pb-20 pt-6 sm:px-8 lg:px-12">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-bold text-heading sm:text-xl">All books</h2>
        <Link
          href="/books/search"
          className="whitespace-nowrap border-b-2 border-accent pb-0.5 text-xs font-semibold text-heading transition-colors hover:text-accent sm:text-sm"
        >
          See all →
        </Link>
      </div>
      {/* Admin-configurable column count on desktop (#1): fewer columns => larger
          book covers. Mobile/tablet keep the responsive defaults. */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .ib-home-grid {
            grid-template-columns: repeat(${home_cols}, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      <div className="ib-home-grid grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-4">
        {isLoading
          ? rangeMap(15, (i: number) => (
              <ProductLoader key={i} uniqueKey={`all-books-${i}`} />
            ))
          : products.map((product: any) =>
              mindful ? (
                <IndoMindful key={product.id} product={product} />
              ) : (
                <ProductCard key={product.id} product={product} cardType="radon" />
              ),
            )}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/books/search"
          className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Load more books
        </Link>
      </div>
    </main>
  );
}
