import Link from '@/components/ui/link';
import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';
import { sessionSeed } from '@/lib/session-seed';
import { useFeaturedBooks } from '@/lib/use-featured-books';

/**
 * #6 — Home hero in the uploaded "kraft & block-print" gallery-banner style:
 * warm parchment/kraft background, letterpress border bands, a fanned stack of
 * real book covers, and a clear CTA. Covers are pulled live from books-listing.
 */
export default function IndoHeroBanner() {
  const seed = sessionSeed();
  const { data } = useQuery(['hero-banner-books', seed], () =>
    HttpClient.get<any>('books-listing', { limit: 5, seed }),
  );
  // #2 — admin-curated banner books override the auto (random) selection.
  const { banner } = useFeaturedBooks();
  const books: any[] = (banner.length ? banner : ((data as any)?.data ?? [])).slice(0, 5);

  const rot = ['-8deg', '-4deg', '0deg', '4deg', '8deg'];
  const ty = [14, 5, 0, 5, 14];

  return (
    <section className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-8 lg:px-12">
      <div className="relative grid grid-cols-1 items-center gap-6 overflow-hidden rounded-xl border border-[#b79a6a] p-5 sm:gap-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:gap-10"
        style={{ background: 'radial-gradient(130% 120% at 50% 120%, rgba(58,38,16,.16), transparent 60%), linear-gradient(135deg,#dcc59b,#c7ac7c)', boxShadow: '0 22px 50px rgba(70,50,25,.24)' }}>
        {/* letterpress border bands */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-4 opacity-50" style={{ background: 'repeating-linear-gradient(90deg,#a8542e 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, transparent 0 21px, #3a2a18 21px 22px, transparent 22px 28px)' }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 opacity-50" style={{ background: 'repeating-linear-gradient(90deg,#a8542e 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, transparent 0 21px, #3a2a18 21px 22px, transparent 22px 28px)' }} />

        {/* copy */}
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex -rotate-1 items-center gap-2 rounded-sm border-2 border-double border-[#a8542e] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[3px] text-[#a8542e]">
            IndoBangla গ্যালারি
          </span>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#3a2810] sm:text-5xl" style={{ fontFamily: "'Noto Serif Bengali',serif" }}>
            হাজারো বাংলা ও ইংরেজি বই
          </h1>
          <div className="my-4 flex items-center gap-2 text-[#a8542e]">
            <span className="h-px w-8 bg-[#a8542e] opacity-60" />❦
            <span className="h-px w-8 bg-[#a8542e] opacity-60" />
          </div>
          <p className="max-w-md text-base font-medium leading-relaxed text-[#5c4526] sm:text-lg">
            জানার আনন্দ, শেখার গভীরতা — সেরা লেখকদের বই,{' '}
            <b className="font-bold text-[#a8542e]">100% অরিজিনাল প্রিন্টে</b>।
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-7 sm:gap-5">
            <Link href="/books/search" className="inline-flex items-center gap-2 rounded-sm bg-[#a8542e] px-6 py-3 sm:px-7 sm:py-3.5 text-sm font-bold text-[#f4ecd8] shadow-lg transition hover:bg-[#8a4222]">
              সব বই দেখুন <span>→</span>
            </Link>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#8a6b40]">❧ 12,000+ বই ডেলিভারি হয়েছে</span>
          </div>
        </div>

        {/* book cover fan */}
        <div className="relative z-10 flex origin-center scale-[.68] items-end justify-center pr-2 xs:scale-[.8] sm:scale-100 sm:pr-2">
          {books.map((b, i) => (
            <Link
              key={b.id}
              href={`/products/${b.slug}`}
              className="block shrink-0 overflow-hidden rounded-[3px_6px_6px_3px] shadow-2xl transition-transform hover:-translate-y-2"
              style={{ width: 108, height: 162, marginLeft: i ? -30 : 0, transform: `rotate(${rot[i]}) translateY(${ty[i]}px)`, zIndex: i === 2 ? 5 : 5 - Math.abs(2 - i) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image?.original || '/product-placeholder.svg'} alt={b.name} className="h-full w-full object-cover" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
