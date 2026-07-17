import Link from '@/components/ui/link';
import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';
import { sessionSeed } from '@/lib/session-seed';

/**
 * IndoBangla home hero — a clean promotional band that replaces the old
 * default slider. Search now lives in the header, so the banner focuses on
 * the brand message plus a peek at trending books.
 */
export default function IndoHero() {
  const seed = sessionSeed();
  const { data } = useQuery(['indo-hero-books', seed], () =>
    HttpClient.get<any>('books-listing', { limit: 5, seed }),
  );
  const books: any[] = ((data as any)?.data ?? []).slice(0, 5);

  return (
    <section className="bg-gray-100">
      <div className="mx-auto max-w-[1500px] px-4 pb-2 pt-5 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-accent to-emerald-700 px-6 py-8 text-white shadow-md sm:px-10 sm:py-12">
          <div className="relative z-10 flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                ইন্দো-বাংলা বইঘর
              </p>
              <h1 className="text-2xl font-extrabold leading-snug sm:text-4xl">
                হাজারো বাংলা ও ইংরেজি বই
                <br className="hidden sm:block" /> এক ঠিকানায়
              </h1>
              <p className="mt-3 text-sm text-white/85 sm:text-base">
                সেরা লেখকদের বই, দ্রুত ডেলিভারি আর নিশ্চিত মানে — আপনার পছন্দের
                বইটি আজই অর্ডার করুন।
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/books/search"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-accent transition-colors hover:bg-gray-100"
                >
                  সব বই দেখুন
                </Link>
                <Link
                  href="/books/search?category=bengali-books"
                  className="rounded-full border border-white/60 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  বাংলা বই
                </Link>
              </div>
            </div>

            {/* trending book covers */}
            {books.length > 0 && (
              <div className="flex shrink-0 -space-x-4 self-center lg:self-auto">
                {books.map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/products/${b.slug}`}
                    className="block transition-transform hover:-translate-y-1"
                    style={{ zIndex: books.length - i }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.image?.original || '/product-placeholder.svg'}
                      alt={b.name}
                      className="h-28 w-20 rounded-lg border-2 border-white/80 object-cover shadow-lg sm:h-36 sm:w-24"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-white/10" />
        </div>
      </div>
    </section>
  );
}
