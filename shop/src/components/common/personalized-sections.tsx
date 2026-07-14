import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';
import { useAtom } from 'jotai';
import { authorizationAtom } from '@/store/authorization-atom';
import { useWishlist } from '@/framework/wishlist';
import ProductCard from '@/components/products/cards/card';
import Link from '@/components/ui/link';
import { getHistory, topCategory } from '@/lib/browsing-history';
import { useEffect, useState } from 'react';

function BookRail({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: any[];
}) {
  if (!products || products.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4 border-b border-border-100 pb-2">
        <h2 className="text-lg font-bold text-heading sm:text-xl">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 whitespace-nowrap border-b-2 border-accent pb-0.5 text-xs font-semibold text-heading transition-colors hover:text-accent sm:text-sm"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {products.slice(0, 6).map((p: any) => (
          <ProductCard key={p.id} product={p} cardType="radon" />
        ))}
      </div>
    </section>
  );
}

/**
 * New 6 — Amazon-style personalized rails, only for logged-in shoppers:
 * wishlist-inspired, browsing-history-inspired, continue-exploring, new releases.
 */
export default function PersonalizedSections() {
  const [isAuthorized] = useAtom(authorizationAtom);
  const [history, setHistory] = useState<any[]>([]);
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getHistory());
    setCat(topCategory());
  }, []);

  // wishlist products
  const { wishlists } = useWishlist({ limit: 8 } as any) as any;
  const wishlistProducts: any[] = (wishlists ?? []).map((w: any) => w.product ?? w);
  const wishlistSeedId = wishlistProducts[0]?.id;

  // inspired by wishlist -> related to first wishlist book
  const { data: wlRel } = useQuery(
    ['pers-wishlist-rel', wishlistSeedId],
    () => HttpClient.get<any>('related-books', { product_id: wishlistSeedId }),
    { enabled: isAuthorized && !!wishlistSeedId },
  );
  const wishlistInspired = [
    ...(((wlRel as any)?.by_author ?? []) as any[]),
    ...(((wlRel as any)?.by_category ?? []) as any[]),
  ];

  // inspired by browsing history -> related to most recent viewed
  const recentId = history[0]?.id;
  const { data: histRel } = useQuery(
    ['pers-hist-rel', recentId],
    () => HttpClient.get<any>('related-books', { product_id: recentId }),
    { enabled: isAuthorized && !!recentId },
  );
  const historyInspired = [
    ...(((histRel as any)?.by_author ?? []) as any[]),
    ...(((histRel as any)?.by_category ?? []) as any[]),
  ];

  // continue exploring in [top category]
  const { data: catData } = useQuery(
    ['pers-cat', cat],
    () => HttpClient.get<any>('books-listing', { category: cat, limit: 6 }),
    { enabled: isAuthorized && !!cat },
  );
  const catBooks: any[] = (catData as any)?.data ?? [];

  // new releases (newest first — no seed = created_at desc)
  const { data: newData } = useQuery(
    ['pers-new'],
    () => HttpClient.get<any>('books-listing', { limit: 6 }),
    { enabled: isAuthorized },
  );
  const newReleases: any[] = (newData as any)?.data ?? [];

  const catName = cat ? cat.replace(/-/g, ' ') : '';

  if (!isAuthorized) return null;
  const hasAny =
    wishlistInspired.length || historyInspired.length || catBooks.length || newReleases.length;
  if (!hasAny) return null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-10 px-5 py-8 sm:px-8 lg:px-12">
      <BookRail title="আপনার উইশলিস্ট থেকে অনুপ্রাণিত" products={wishlistInspired} />
      <BookRail title="আপনার দেখা বইয়ের সূত্রে" products={historyInspired} />
      {cat && (
        <BookRail
          title={`“${catName}” বিভাগে এক্সপ্লোর করুন`}
          href={`/books/search?category=${cat}`}
          products={catBooks}
        />
      )}
      <BookRail title="নতুন এসেছে" href="/books/search" products={newReleases} />
    </div>
  );
}
