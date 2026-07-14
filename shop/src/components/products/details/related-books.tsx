import { useQuery } from 'react-query';
import { useEffect, useState } from 'react';
import { HttpClient } from '@/framework/client/http-client';
import ProductCard from '@/components/products/cards/card';

const N = 6;
const GRID = 'grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 sm:gap-3';

function RelatedRow({ title, books }: { title: string; books: any[] }) {
  const [offset, setOffset] = useState(0);
  const rotating = books.length > N;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setOffset((o) => (o + 1) % books.length), 10000);
    return () => clearInterval(id);
  }, [rotating, books.length]);

  if (!books.length) return null;
  const view = rotating
    ? Array.from({ length: N }, (_, i) => books[(offset + i) % books.length])
    : books;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border-100 pb-2">
        <h3 className="text-base font-bold text-heading sm:text-lg">{title}</h3>
        {rotating && (
          <button
            onClick={() => setOffset((o) => (o + 1) % books.length)}
            className="shrink-0 rounded-full border border-border-200 px-3 py-1 text-xs font-semibold text-body transition hover:border-accent hover:text-accent"
            aria-label="Show more"
          >
            Next →
          </button>
        )}
      </div>
      <div className={GRID}>
        {view.map((p: any, i: number) => (
          <ProductCard key={`${p.id}-${i}`} product={p} cardType="radon" />
        ))}
      </div>
    </section>
  );
}

export default function RelatedBooks({
  productId,
  authorName,
}: {
  productId: any;
  authorName?: string;
}) {
  const { data } = useQuery(
    ['related-books', productId],
    () => HttpClient.get<any>('related-books', { product_id: productId }),
    { enabled: !!productId },
  );
  const byAuthor: any[] = (data as any)?.by_author ?? [];
  const byCategory: any[] = (data as any)?.by_category ?? [];
  const recommended: any[] = (data as any)?.recommended ?? [];

  if (!byAuthor.length && !byCategory.length && !recommended.length) return null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 pb-16 sm:px-6 lg:px-8">
      {byAuthor.length > 0 && (
        <RelatedRow
          title={authorName ? `More by ${authorName}` : 'More by this author'}
          books={byAuthor}
        />
      )}
      {byCategory.length > 0 && (
        <RelatedRow title="Readers also browsed" books={byCategory} />
      )}
      {recommended.length > 0 && (
        <RelatedRow title="You may also like" books={recommended} />
      )}
    </div>
  );
}
