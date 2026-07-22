import { HttpClient } from '@/framework/client/http-client';
import ProductCard from '@/components/products/cards/card';
import ProductLoader from '@/components/ui/loaders/product-loader';
import rangeMap from '@/lib/range-map';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { useEffect, useState } from 'react';

/**
 * Books-only results with numbered pagination (20 per page by default, 40 optional).
 * Uses books-listing (guaranteed book type, includes out-of-stock on text search).
 */
export default function IndoBookSearch() {
  const { query } = useRouter();
  const text = (query?.text as string) ?? '';
  const category = (query?.category as string) ?? '';
  // Extra narrowing sent by the header's advanced-search panel. Every one is optional and is
  // forwarded verbatim to books-listing, which applies only the ones that arrive.
  const author = (query?.author as string) ?? '';
  const publisher = (query?.publisher as string) ?? '';
  const minPrice = (query?.min_price as string) ?? '';
  const maxPrice = (query?.max_price as string) ?? '';
  const inStock = (query?.in_stock as string) ?? '';

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // reset to page 1 whenever the search terms change
  useEffect(() => {
    setPage(1);
  }, [text, category, author, publisher, minPrice, maxPrice, inStock]);

  const { data, isLoading, isFetching } = useQuery(
    [
      'indo-book-search',
      text,
      category,
      author,
      publisher,
      minPrice,
      maxPrice,
      inStock,
      page,
      perPage,
    ],
    () =>
      HttpClient.get<any>('books-listing', {
        limit: perPage,
        page,
        ...(text && { text }),
        ...(category && { category }),
        ...(author && { author }),
        ...(publisher && { publisher }),
        ...(minPrice && { min_price: minPrice }),
        ...(maxPrice && { max_price: maxPrice }),
        ...(inStock && { in_stock: 1 }),
      }),
    { keepPreviousData: true, staleTime: 5 * 60 * 1000 },
  );

  // scroll to top of the grid on page change
  useEffect(() => {
    if (typeof window !== 'undefined' && page > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const products: any[] = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const lastPage = (data as any)?.last_page ?? 1;
  const suggestion = (data as any)?.suggestion;

  const heading = text
    ? `“${text}” — ${total.toLocaleString('en-IN')} টি বই পাওয়া গেছে`
    : `${total.toLocaleString('en-IN')} টি বই`;

  const pageNumbers = (() => {
    const out: (number | '…')[] = [];
    const add = (n: number | '…') => out.push(n);
    const around = 1;
    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || (i >= page - around && i <= page + around)) {
        add(i);
      } else if (out[out.length - 1] !== '…') {
        add('…');
      }
    }
    return out;
  })();

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-heading sm:text-xl">{heading}</h1>
          {suggestion && (
            <p className="mt-1 text-sm text-body">
              এটি খুঁজছেন?{' '}
              <a href={`/products/${suggestion.slug}`} className="font-semibold text-accent hover:underline">
                {suggestion.name}
              </a>
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-body">
          প্রতি পেজে
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-border-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
          </select>
        </label>
      </div>

      {!isLoading && products.length === 0 ? (
        <div className="py-20 text-center text-body">
          কোনো বই পাওয়া যায়নি। অন্য নাম বা লেখক দিয়ে খুঁজে দেখুন।
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 ${isFetching ? 'opacity-60' : ''}`}>
          {isLoading
            ? rangeMap(perPage > 20 ? 15 : 12, (i) => (
                <ProductLoader key={i} uniqueKey={`book-search-${i}`} />
              ))
            : products.map((product: any) => (
                <ProductCard key={product.id} product={product} cardType="radon" />
              ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border-200 bg-white px-3 py-1.5 text-sm font-medium text-body hover:border-accent disabled:opacity-40"
          >
            ← আগের
          </button>
          {pageNumbers.map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="px-2 text-body">…</span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-[36px] rounded-lg border px-2 py-1.5 text-sm font-semibold ${
                  n === page
                    ? 'border-accent bg-accent text-white'
                    : 'border-border-200 bg-white text-body hover:border-accent'
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="rounded-lg border border-border-200 bg-white px-3 py-1.5 text-sm font-medium text-body hover:border-accent disabled:opacity-40"
          >
            পরের →
          </button>
        </div>
      )}
    </div>
  );
}
