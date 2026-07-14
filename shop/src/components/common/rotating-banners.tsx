import { HttpClient } from '@/framework/client/http-client';
import { useQuery } from 'react-query';
import Link from '@/components/ui/link';
import { sessionSeed } from '@/lib/session-seed';

/**
 * #1 — Rotating hero banners in the uploaded gallery styles (parchment / cloth /
 * kraft / library-card). Banners are admin-configurable via `rotating-banners`;
 * each shows a live fan of real book covers and the whole strip auto-rotates
 * every 15s (pure-CSS fade — no JS timer, no scroll jump).
 */

type Banner = {
  style: 'parchment' | 'cloth' | 'kraft' | 'library';
  badge: string;
  headline: string;
  subtext: string;
  cta_text: string;
  cta_link: string;
  category: string;
};

const THEME: Record<Banner['style'], any> = {
  parchment: {
    section: { background: 'radial-gradient(130% 120% at 50% -20%, transparent 58%, rgba(70,48,22,.16)), repeating-linear-gradient(0deg, rgba(120,90,50,.045) 0 1px, transparent 1px 26px), linear-gradient(135deg,#f7efda,#eaddbd)', border: '1px solid #d8c79c', boxShadow: 'inset 0 0 0 6px rgba(255,255,255,.4), inset 0 0 0 7px #cdb582' },
    badge: 'text-[#9a6f2e]', head: 'text-[#2a1c11]', sub: 'text-[#5a4a35]', accent: '#b8862f',
    btn: 'bg-[#2a1c11] text-[#f7efda]',
  },
  cloth: {
    section: { background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 2px, transparent 2px 4px), radial-gradient(120% 130% at 15% 0%, #2c5a4d, #163a31 70%)', boxShadow: '0 10px 30px rgba(15,40,32,.34)', border: '1px solid rgba(201,154,63,.4)' },
    badge: 'text-[#d8b055]', head: 'text-[#f6ecd2]', sub: 'text-[#cfe0d6]', accent: '#c99a3f',
    btn: 'bg-gradient-to-b from-[#e6c375] to-[#c99a3f] text-[#1a3a31]',
  },
  kraft: {
    section: { background: 'radial-gradient(130% 120% at 50% 120%, rgba(58,38,16,.16), transparent 60%), linear-gradient(135deg,#dcc59b,#c7ac7c)', border: '1px solid #b79a6a', boxShadow: '0 10px 30px rgba(70,50,25,.24)' },
    badge: 'text-[#a8542e] border border-[#a8542e] rounded-sm px-2 py-1 inline-block', head: 'text-[#3a2810]', sub: 'text-[#5c4526]', accent: '#a8542e',
    btn: 'bg-[#a8542e] text-[#f4ecd8]',
  },
  library: {
    section: { background: 'repeating-linear-gradient(0deg, transparent 0 33px, rgba(120,90,50,.13) 33px 34px), linear-gradient(180deg,#f6efdc,#efe4c9)', border: '1px solid #d8c79c', boxShadow: '0 10px 30px rgba(70,50,25,.2)' },
    badge: 'text-[#20463d]', head: 'text-[#241a11]', sub: 'text-[#5a4a35]', accent: '#b83c2d',
    btn: 'bg-[#20463d] text-[#f6efdc]',
  },
};

const COVER_ROT = ['-8deg', '-4deg', '0deg', '4deg', '8deg'];
const COVER_TY = [12, 4, 0, 4, 12];

function Slide({ banner }: { banner: Banner }) {
  const seed = sessionSeed();
  const t = THEME[banner.style] ?? THEME.parchment;
  const { data } = useQuery(['rot-banner', banner.category, banner.style, seed], () =>
    HttpClient.get<any>('books-listing', banner.category ? { category: banner.category, limit: 5, seed } : { limit: 5, seed }),
  );
  const books: any[] = ((data as any)?.data ?? []).slice(0, 5);

  return (
    <div className="relative flex h-full items-center justify-between gap-6 overflow-hidden rounded-2xl px-6 py-7 sm:px-10" style={t.section}>
      {banner.style === 'kraft' && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-3 opacity-50" style={{ background: 'repeating-linear-gradient(90deg, #a8542e 0 14px, transparent 14px 28px)' }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 opacity-50" style={{ background: 'repeating-linear-gradient(90deg, #a8542e 0 14px, transparent 14px 28px)' }} />
        </>
      )}
      {banner.style === 'library' && (
        <div className="pointer-events-none absolute inset-y-0 left-[52px] hidden w-px sm:block" style={{ background: 'rgba(184,60,45,.4)' }} />
      )}

      <div className="relative z-10 max-w-md" style={{ paddingLeft: banner.style === 'library' ? 24 : 0 }}>
        <span className={`text-[11px] font-bold uppercase tracking-[2px] ${t.badge}`}>{banner.badge}</span>
        <h3 className="mt-2.5 text-2xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "'Noto Serif Bengali',serif" }}>
          <span className={t.head}>{banner.headline}</span>
        </h3>
        <div className="my-3 flex items-center gap-2" style={{ color: t.accent }}>
          <span className="h-px w-8" style={{ background: t.accent, opacity: 0.7 }} />❦
          <span className="h-px w-8" style={{ background: t.accent, opacity: 0.7 }} />
        </div>
        {banner.subtext && <p className={`max-w-sm text-sm font-medium leading-relaxed sm:text-[15px] ${t.sub}`}>{banner.subtext}</p>}
        <Link href={banner.cta_link || '/books/search'} className={`mt-5 inline-flex items-center gap-2 rounded-sm px-6 py-2.5 text-sm font-bold shadow-lg transition hover:brightness-110 ${t.btn}`}>
          {banner.cta_text || 'দেখুন'} <span>→</span>
        </Link>
      </div>

      <div className="relative z-10 hidden items-end justify-center pr-2 sm:flex">
        {books.map((b, i) => (
          <Link
            key={b.id}
            href={`/products/${b.slug}`}
            className="block shrink-0 overflow-hidden rounded-[3px_6px_6px_3px] shadow-2xl transition-transform hover:-translate-y-2"
            style={{ width: 96, height: 144, marginLeft: i ? -28 : 0, transform: `rotate(${COVER_ROT[i]}) translateY(${COVER_TY[i]}px)`, zIndex: i === 2 ? 5 : 5 - Math.abs(2 - i) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image?.original || '/product-placeholder.svg'} alt={b.name} className="h-full w-full object-cover" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function RotatingBanners() {
  const { data } = useQuery(['rotating-banners'], () => HttpClient.get<any>('rotating-banners'), {
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });
  const banners: Banner[] = (data as any)?.banners ?? [];
  const total = banners.length;
  if (!total) return null;

  const cycle = total * 15; // seconds
  return (
    <section className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-12" style={{ contain: 'layout paint' }}>
      <style>{`
        @keyframes ibBannerFade {
          0% { opacity: 0; }
          2% { opacity: 1; }
          ${Math.round(100 / total - 3)}% { opacity: 1; }
          ${Math.round(100 / total)}% { opacity: 0; }
          100% { opacity: 0; }
        }
        .ib-banner-slide { opacity: 0; animation: ibBannerFade ${cycle}s infinite; will-change: opacity; transform: translateZ(0); backface-visibility: hidden; }
      `}</style>
      <div className="relative h-60 overflow-hidden rounded-2xl shadow-md sm:h-64">
        {banners.map((b, i) => (
          <div key={i} className="ib-banner-slide absolute inset-0" style={{ animationDelay: `${i * 15}s` }}>
            <Slide banner={b} />
          </div>
        ))}
      </div>
    </section>
  );
}
