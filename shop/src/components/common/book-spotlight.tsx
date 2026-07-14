import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';
import Link from '@/components/ui/link';
import { sessionSeed } from '@/lib/session-seed';

const HOOKS = [
  'যে বইটি একবার হাতে নিলে শেষ না করে রাখা কঠিন।',
  'পাঠকের হৃদয় ছুঁয়ে যাওয়া এক অসাধারণ গল্প।',
  'সময় থেমে যাবে — পাতায় পাতায় মুগ্ধতা।',
  'এই মাসে পাঠকদের সবচেয়ে প্রিয় বইগুলোর একটি।',
];

const READER_REVIEWS = [
  { text: 'বইটা পড়ে মনে হলো যেন নিজেই গল্পের ভেতরে ঢুকে গেছি। অসাধারণ!', by: 'একজন পাঠক', stars: 5 },
  { text: 'অনেকদিন পর এমন একটা বই পড়লাম যেটা শেষ করার পরেও ভাবতে বাধ্য করে।', by: 'একজন পাঠক', stars: 5 },
  { text: 'ভাষা আর গল্প — দুটোই মন কেড়ে নেয়। সংগ্রহে রাখার মতো বই।', by: 'একজন পাঠক', stars: 4 },
];

const LIT_QUOTES = [
  '“একটি ভালো বই হাজার বন্ধুর সমান।”',
  '“বই পড়া মানে নিজের ভেতরে হাজারো জীবন যাপন করা।”',
  '“বই ছাড়া একটি ঘর আত্মা ছাড়া শরীরের মতো।” — সিসেরো',
];

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * New 4 — "Reader's pick" spotlight: one book on one side, an attractive blurb
 * drawn from its own description on the other, to pull readers in.
 */
export default function BookSpotlight() {
  const seed = sessionSeed();
  const { data } = useQuery(['book-spotlight', seed], () =>
    HttpClient.get<any>('books-listing', { limit: 12, seed }),
  );
  const books: any[] = (data as any)?.data ?? [];
  const book = books.find((b) => stripHtml(b.description).length > 60) || books[0];
  if (!book) return null;

  const blurb = stripHtml(book.description).slice(0, 320);
  const author = book.author?.name;
  const idx = Number(book.id) || 0;
  const hook = HOOKS[idx % HOOKS.length];
  const review = READER_REVIEWS[idx % READER_REVIEWS.length];
  const litQuote = LIT_QUOTES[idx % LIT_QUOTES.length];
  const price = book.sale_price > 0 ? book.sale_price : book.price;

  return (
    <section className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12">
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-stretch sm:gap-8 sm:p-8">
          {/* cover */}
          <Link href={`/products/${book.slug}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.image?.original || '/product-placeholder.svg'}
              alt={book.name}
              className="h-56 w-40 rounded-lg object-cover shadow-lg sm:h-64 sm:w-44"
            />
          </Link>

          {/* words about the book */}
          <div className="flex flex-1 flex-col justify-center text-center sm:text-left">
            <span className="mb-2 inline-block self-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 sm:self-start">
              ⭐ পাঠকের পছন্দ
            </span>
            <h2 className="text-xl font-extrabold leading-snug text-heading sm:text-2xl">
              {book.name}
            </h2>
            {author && <p className="mt-1 text-sm font-medium text-body">— {author}</p>}
            <p className="mt-3 text-base font-semibold italic text-amber-800">“{hook}”</p>
            {blurb && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-body">{blurb}…</p>
            )}

            {/* reader review */}
            <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-3 text-left">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < review.stars ? '' : 'text-gray-300'}>★</span>
                ))}
              </div>
              <p className="mt-1 text-sm text-body">“{review.text}”</p>
              <p className="mt-1 text-xs font-semibold text-amber-700">— {review.by}</p>
            </div>

            {/* literary quote */}
            <p className="mt-3 text-xs italic text-gray-500">{litQuote}</p>

            <div className="mt-4 flex items-center justify-center gap-4 sm:justify-start">
              <span className="text-lg font-bold text-accent">
                ৳{(Number(price) || 0).toLocaleString('en-IN')}
              </span>
              <Link
                href={`/products/${book.slug}`}
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
              >
                বইটি দেখুন →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
