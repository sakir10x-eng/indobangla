import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';
import Link from '@/components/ui/link';
import ProductCard from '@/components/products/cards/card';
import ProductLoader from '@/components/ui/loaders/product-loader';
import rangeMap from '@/lib/range-map';
import { sessionSeed } from '@/lib/session-seed';

const GRID =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4';

function CategoryRow({ name, slug }: { name: string; slug: string }) {
  const seed = sessionSeed();
  const { data, isLoading } = useQuery(['home-cat-books', slug, seed], () =>
    HttpClient.get<any>('books-listing', { category: slug, limit: 6, seed }),
  );
  const products: any[] = ((data as any)?.data ?? []).slice(0, 6);
  if (!isLoading && !products.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-border-100 pb-2">
        <h2 className="text-lg font-bold text-heading sm:text-xl">{name}</h2>
        <Link
          href={`/books/search?category=${slug}`}
          className="shrink-0 whitespace-nowrap border-b-2 border-accent pb-0.5 text-xs font-semibold text-heading transition-colors hover:text-accent sm:text-sm"
        >
          See all →
        </Link>
      </div>
      <div className={GRID}>
        {isLoading
          ? rangeMap(6, (i) => (
              <ProductLoader key={i} uniqueKey={`cat-${slug}-${i}`} />
            ))
          : products
              .slice(0, 6)
              .map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cardType="radon"
                />
              ))}
      </div>
    </section>
  );
}

export default function HomeCategorySections() {
  const { data } = useQuery(['home-categories'], () =>
    HttpClient.get<any>('home-categories', { categories: 5, per: 6 }),
  );
  const cats: { id: number; name: string; slug: string }[] =
    (data as any)?.sections?.map((s: any) => s.category) ?? [];
  if (!cats.length) return null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-10 px-5 py-8 sm:px-8 lg:px-12">
      {cats.map((c) => (
        <CategoryRow key={c.id} name={c.name} slug={c.slug} />
      ))}
    </div>
  );
}
