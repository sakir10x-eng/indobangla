import Logo from '@/components/ui/logo';
import Link from '@/components/ui/link';
import { HttpClient } from '@/framework/client/http-client';
import { drawerAtom } from '@/store/drawer-atom';
import { authorizationAtom } from '@/store/authorization-atom';
import { useCart } from '@/store/quick-cart/cart.context';
import { useSettings } from '@/framework/settings';
import { useAtom } from 'jotai';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import dynamic from 'next/dynamic';
import cn from 'classnames';

const AuthorizedMenu = dynamic(() => import('./menu/authorized-menu'), {
  ssr: false,
});
const JoinButton = dynamic(() => import('./menu/join-button'), { ssr: false });

type Cat = { id: number; name: string; slug: string; count: number };

/* ------------------------------------------------------------------ *
 * Icons — inlined so the header carries no icon-library dependency.
 * ------------------------------------------------------------------ */
const ic = 'shrink-0';
const IconTruck = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <path d="M1 3h13v13H1z" /><path d="M14 8h4l3 3v5h-7" /><circle cx="6.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" />
  </svg>
);
const IconSearch = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={ic} {...p}>
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);
const IconHeart = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4l8.8 8.8 8.8-8.8a5.2 5.2 0 0 0 0-7.4z" />
  </svg>
);
const IconUser = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);
const IconBag = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const IconBars = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={ic} {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
const IconCaret = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={ic} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const IconBolt = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);
const IconTag = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <path d="M20.6 12.6 12.4 20.8a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1-.6-1.4V4.6A1.6 1.6 0 0 1 4.2 3h8.4a2 2 0 0 1 1.4.6l6.6 6.6a2 2 0 0 1 0 2.4z" /><circle cx="7.5" cy="7.5" r="1.3" />
  </svg>
);
const IconSliders = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ic} {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

const bn = (n: number | string) =>
  String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

/* ------------------------------------------------------------------ *
 * Shared data
 * ------------------------------------------------------------------ */
function useBookCategories(): Cat[] {
  const { data } = useQuery(
    ['indo-book-categories'],
    () => HttpClient.get<any>('book-categories', { limit: 30 }),
    { staleTime: 15 * 60 * 1000 },
  );
  return ((data as any)?.categories ?? []) as Cat[];
}

/* A dropdown that closes on outside click and on Escape. */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// On mobile the panel spans the nav row (its positioning ancestor) so it can never hang
// off the side of the screen; from lg it anchors to its own button again.
const panelBase =
  'absolute top-full z-50 mt-2 left-4 right-4 w-auto rounded-2xl border border-border-200 bg-white p-5 shadow-2xl lg:right-auto';

/* ------------------------------------------------------------------ *
 * Search — scope select + live suggestions
 * ------------------------------------------------------------------ */
type Scope = 'all' | 'book' | 'author' | 'publisher';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'book', label: 'বই' },
  { value: 'author', label: 'লেখক' },
  { value: 'publisher', label: 'প্রকাশনী' },
];

/** The scope decides WHICH books-listing filter the term becomes, so every option really narrows. */
function scopedSearchUrl(scope: Scope, term: string) {
  const t = term.trim();
  if (!t) return '/books/search';
  const key =
    scope === 'author' ? 'author' : scope === 'publisher' ? 'publisher' : 'text';
  return `/books/search?${key}=${encodeURIComponent(t)}`;
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQ((router.query?.text as string) ?? '');
  }, [router.query?.text]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Suggestions only make sense for title-ish scopes; author/publisher scope goes straight
  // to the filtered results page instead of guessing book titles.
  const suggestEnabled = debounced.length >= 2 && (scope === 'all' || scope === 'book');
  const { data: sugg } = useQuery(
    ['search-suggest', debounced],
    () => HttpClient.get<any>('books-listing', { text: debounced, limit: 6 }),
    { enabled: suggestEnabled, staleTime: 60 * 1000, keepPreviousData: true },
  );
  const results: any[] = ((sugg as any)?.data ?? []).slice(0, 6);

  const go = (url: string) => {
    setOpen(false);
    router.push(url);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(scopedSearchUrl(scope, q));
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={submit}
        className="flex h-12 w-full items-stretch overflow-hidden rounded-xl border-2 border-border-200 bg-white transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10"
      >
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          aria-label="সার্চ ক্যাটাগরি"
          // pr-8 leaves room for the chevron the base `select` rule paints on the right;
          // px-3 alone would let the label sit under it.
          className="hidden shrink-0 cursor-pointer border-0 border-r border-border-200 bg-gray-50 pl-3 pr-8 text-[13.5px] font-semibold text-heading outline-none sm:block"
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="সত্যজিৎ রায়, ফেলুদা সমগ্র, আনন্দ পাবলিশার্স..."
          aria-label="বই খুঁজুন"
          autoComplete="off"
          type="search"
          className="w-full min-w-0 bg-transparent px-4 text-[15px] text-heading placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="খুঁজুন"
          className="flex shrink-0 items-center gap-2 bg-accent px-4 text-[15px] font-bold text-white transition-colors hover:bg-accent-hover sm:px-6"
        >
          <IconSearch className="h-[18px] w-[18px]" />
          <span className="hidden sm:inline">খুঁজুন</span>
        </button>
      </form>

      {open && suggestEnabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border-200 bg-white shadow-xl">
          {results.length > 0 ? (
            <>
              {results.map((b) => (
                <button
                  key={b.id}
                  onClick={() => go(`/products/${b.slug}`)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image?.original || '/product-placeholder.svg'}
                    alt={b.name}
                    className="h-12 w-9 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-heading">{b.name}</span>
                    {b.author?.name && (
                      <span className="block truncate text-xs text-gray-400">{b.author.name}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-accent">
                    ৳{(b.sale_price > 0 ? b.sale_price : b.price)?.toLocaleString?.('en-IN')}
                  </span>
                </button>
              ))}
              <button
                onClick={() => go(scopedSearchUrl(scope, q))}
                className="block w-full border-t border-border-100 bg-gray-50 px-3 py-2.5 text-center text-sm font-semibold text-accent hover:bg-accent/5"
              >
                “{q.trim()}” — সব ফলাফল দেখুন →
              </button>
            </>
          ) : (
            <div className="px-4 py-4 text-center text-sm text-body">
              কিছু পাওয়া যায়নি।{' '}
              <button onClick={() => go(scopedSearchUrl(scope, q))} className="font-semibold text-accent hover:underline">
                সব বইয়ে খুঁজুন
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Today's deals — countdown to local midnight
 * ------------------------------------------------------------------ */
function DealsButton() {
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      const two = (n: number) => bn(String(n).padStart(2, '0'));
      setClock(`${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href="/flash-sales"
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-[13.5px] font-bold text-white shadow-md shadow-accent/25 transition hover:-translate-y-px hover:bg-accent-hover"
    >
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-white" />
      <IconBolt className="h-3.5 w-3.5" />
      আজকের ডিল
      {/* Rendered only after mount: the server has no idea what time it is where the reader is,
          and a server-rendered clock would hydrate to a different string. */}
      {clock && (
        <span className="hidden rounded bg-black/20 px-1.5 py-0.5 font-mono text-[11px] tabular-nums lg:inline">
          {clock}
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Offers dropdown — real coupons only
 * ------------------------------------------------------------------ */
function OffersMenu() {
  const { open, setOpen, ref } = useDropdown();
  const [copied, setCopied] = useState<string | null>(null);

  // Fetched only once the panel is opened: this header renders on every statically generated
  // page, and a build-time request here would run during `next build`.
  const { data } = useQuery(
    ['header-coupons'],
    () => HttpClient.get<any>('coupons', { limit: 20 }),
    { enabled: open, staleTime: 10 * 60 * 1000 },
  );

  const coupons: any[] = (((data as any)?.data ?? []) as any[]).filter(
    (c) => Boolean(c?.is_approve) && Boolean(c?.is_valid),
  );

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1600);
  };

  const amountLabel = (c: any) =>
    c?.type === 'percentage' ? `${bn(c.amount)}% ছাড়` : `৳${bn(c.amount)} ছাড়`;

  return (
    <div className="static shrink-0 lg:relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[14.5px] font-semibold transition',
          open ? 'bg-accent/10 text-accent' : 'text-heading hover:bg-accent/10 hover:text-accent',
        )}
      >
        <IconTag className="h-[17px] w-[17px]" />
        অফার
        <IconCaret className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(panelBase, 'lg:left-0 lg:w-[min(92vw,420px)]')}>
          <h5 className="mb-3 border-b border-border-100 pb-2.5 text-[13px] font-semibold text-body">
            এখন চলছে এমন অফার
          </h5>
          {coupons.length > 0 ? (
            <>
              <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-border-200 p-3 transition hover:border-accent hover:bg-accent/5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                      <IconTag className="h-[19px] w-[19px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-heading">
                        {/* The coupons endpoint has no title — `description` is the human line. */}
                        {c.description || amountLabel(c)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-body">
                        {amountLabel(c)}
                        {c.minimum_cart_amount
                          ? ` · ন্যূনতম ৳${bn(c.minimum_cart_amount)}`
                          : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(c.code)}
                      className={cn(
                        'shrink-0 rounded-lg border-[1.5px] border-dashed px-2.5 py-1.5 font-mono text-[11.5px] font-bold transition',
                        copied === c.code
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-accent text-accent hover:bg-accent hover:text-white',
                      )}
                    >
                      {copied === c.code ? 'কপি হয়েছে ✓' : c.code}
                    </button>
                  </div>
                ))}
              </div>
              <Link
                href="/offers"
                onClick={() => setOpen(false)}
                className="mt-3 block border-t border-border-100 pt-3 text-center text-[13.5px] font-semibold text-accent hover:underline"
              >
                সব অফার দেখুন →
              </Link>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-body">
              এই মুহূর্তে কোনো কুপন চালু নেই।
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Categories mega-menu + genre grid — both fed by real book categories
 * ------------------------------------------------------------------ */
/**
 * The one "all categories" menu. The card grid reads better than the three-column list that
 * used to carry this name, so that older mega-menu was removed rather than kept beside it —
 * two menus over the same categories only made the reader choose between identical things.
 */
function CategoriesMenu({ cats }: { cats: Cat[] }) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div className="static shrink-0 lg:relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[14.5px] font-semibold transition',
          open ? 'bg-accent/10 text-accent' : 'text-heading hover:bg-accent/10 hover:text-accent',
        )}
      >
        <IconBars className="h-[17px] w-[17px]" />
        সব বিভাগ
        <IconCaret className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && cats.length > 0 && (
        <div className={cn(panelBase, 'lg:left-0 lg:w-[min(94vw,600px)]')}>
          <h5 className="mb-3 border-b border-border-100 pb-2.5 text-[13px] font-semibold text-body">
            বিভাগ অনুযায়ী বই খুঁজুন
          </h5>
          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {cats.slice(0, 18).map((c) => (
              <Link
                key={c.id}
                href={`/books/search?category=${c.slug}`}
                onClick={() => setOpen(false)}
                className="flex flex-col gap-0.5 rounded-xl border border-border-200 px-3 py-2.5 transition hover:border-accent hover:bg-accent/10"
              >
                <b className="truncate text-[13.8px] font-semibold text-heading">{c.name}</b>
                <span className="font-mono text-[11px] text-gray-400">
                  {c.count.toLocaleString('en-IN')} books
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Advanced search — every field maps to a real books-listing filter
 * ------------------------------------------------------------------ */
function AdvancedSearch({ cats }: { cats: Cat[] }) {
  const { open, setOpen, ref } = useDropdown();
  const router = useRouter();
  const [f, setF] = useState({
    text: '', author: '', publisher: '', category: '',
    min_price: '', max_price: '', in_stock: true,
  });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const params = new URLSearchParams();
    (['text', 'author', 'publisher', 'category', 'min_price', 'max_price'] as const).forEach((k) => {
      const v = String(f[k]).trim();
      if (v) params.set(k, v);
    });
    if (f.in_stock) params.set('in_stock', '1');
    setOpen(false);
    const qs = params.toString();
    router.push(qs ? `/books/search?${qs}` : '/books/search');
  };

  const fld = 'h-10 w-full rounded-lg border-[1.5px] border-border-200 bg-white px-3 text-sm text-heading outline-none transition focus:border-accent';
  const lbl = 'mb-1.5 block text-[12.5px] font-semibold text-body';

  return (
    <div className="static shrink-0 lg:relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 whitespace-nowrap rounded-lg border-[1.5px] px-3 py-2 text-sm font-semibold transition',
          open ? 'border-accent bg-accent/10 text-accent' : 'border-border-200 text-heading hover:border-accent hover:text-accent',
        )}
      >
        <IconSliders className="h-4 w-4" />
        <span className="hidden xl:inline">অ্যাডভান্সড সার্চ</span>
      </button>

      {open && (
        <div className={cn(panelBase, 'lg:left-auto lg:right-0 lg:w-[min(94vw,620px)]')}>
          <h5 className="mb-3 border-b border-border-100 pb-2.5 text-[13px] font-semibold text-body">
            নির্দিষ্ট করে খুঁজুন
          </h5>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>বইয়ের নাম</label>
              <input className={fld} value={f.text} onChange={(e) => set('text', e.target.value)} placeholder="যেমন: চাঁদের পাহাড়" />
            </div>
            <div>
              <label className={lbl}>লেখক</label>
              <input className={fld} value={f.author} onChange={(e) => set('author', e.target.value)} placeholder="যেমন: বিভূতিভূষণ" />
            </div>
            <div>
              <label className={lbl}>প্রকাশনী</label>
              <input className={fld} value={f.publisher} onChange={(e) => set('publisher', e.target.value)} placeholder="যেমন: আনন্দ পাবলিশার্স" />
            </div>
            <div>
              <label className={lbl}>জঁর</label>
              <select className={cn(fld, 'cursor-pointer pr-8')} value={f.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">সব জঁর</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>মূল্যসীমা (৳)</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} className={fld} value={f.min_price} onChange={(e) => set('min_price', e.target.value)} placeholder="সর্বনিম্ন" />
                <span className="text-sm text-body">—</span>
                <input type="number" min={0} className={fld} value={f.max_price} onChange={(e) => set('max_price', e.target.value)} placeholder="সর্বোচ্চ" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-border-100 pt-4 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px] text-heading">
              <input
                type="checkbox"
                checked={f.in_stock}
                onChange={(e) => set('in_stock', e.target.checked)}
                className="h-[15px] w-[15px] accent-accent"
              />
              শুধু স্টকে আছে
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setF({ text: '', author: '', publisher: '', category: '', min_price: '', max_price: '', in_stock: true })}
                className="rounded-lg px-4 py-2.5 text-[13.5px] font-semibold text-body transition hover:bg-gray-100 hover:text-heading"
              >
                রিসেট
              </button>
              <button
                type="button"
                onClick={submit}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
              >
                সার্চ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */
const IndoHeader = () => {
  const cats = useBookCategories();
  const [isAuthorize] = useAtom(authorizationAtom);
  const [, setDrawer] = useAtom(drawerAtom);
  const { settings } = useSettings();
  const { total, totalUniqueItems } = useCart();

  // The cart total is client state; rendering it during SSR produces "৳0" in the static HTML
  // and then a hydration mismatch the moment a real cart loads from storage.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openCart = useCallback(
    () => setDrawer({ display: true, view: 'cart' }),
    [setDrawer],
  );

  const phone: string | undefined = (settings as any)?.contactDetails?.contact;
  const freeShipping = Boolean((settings as any)?.freeShipping);
  const freeShippingAmount = (settings as any)?.freeShippingAmount;

  return (
    <>
      {/* ===== utility strip ===== */}
      <div className="bg-[#1c1b1a] text-[12.5px] text-[#c9c4bb]">
        <div className="mx-auto flex h-9 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* Only claimed when the shop really offers it — the amount comes from settings. */}
          {freeShipping && freeShippingAmount ? (
            <div className="flex min-w-0 items-center gap-2 truncate">
              <IconTruck className="h-3.5 w-3.5 text-accent" />
              <span className="truncate">
                <b className="font-semibold text-[#f3efe7]">৳{bn(freeShippingAmount)}</b> এর উপরে
                অর্ডারে ডেলিভারি ফ্রি · সারা বাংলাদেশে
              </span>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2 truncate">
              <IconTruck className="h-3.5 w-3.5 text-accent" />
              <span className="truncate">সারা বাংলাদেশে দ্রুত ডেলিভারি</span>
            </div>
          )}
          <div className="hidden shrink-0 items-center divide-x divide-white/15 sm:flex">
            <Link href="/orders" className="px-3 transition-colors hover:text-white">অর্ডার ট্র্যাক</Link>
            <Link href="/help" className="px-3 transition-colors hover:text-white">সাপোর্ট</Link>
            {phone && (
              <a href={`tel:${phone}`} className="px-3 transition-colors hover:text-white">{bn(phone)}</a>
            )}
          </div>
        </div>
      </div>

      {/* ===== main bar ===== */}
      <header className="sticky top-0 z-50 w-full border-b border-border-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:h-[92px] lg:flex-nowrap lg:gap-6 lg:py-0 lg:px-10">
          <button
            onClick={() => setDrawer({ display: true, view: 'MAIN_MENU_VIEW' })}
            className="order-first flex h-9 w-9 shrink-0 items-center justify-center text-heading xl:hidden"
            aria-label="মেনু"
          >
            <IconBars className="h-6 w-6" />
          </button>

          <Logo className="shrink-0" />

          {/* basis-full, not w-full: `flex-1` sets flex-basis:0%, and in a flex row the basis
              beats width — so with w-full the search box did NOT wrap to its own line on
              mobile, it squeezed in between the logo and the icons and came out unusably
              narrow. basis-full forces the wrap; from lg it shares the row again. */}
          <div className="order-last min-w-0 grow basis-full lg:order-none lg:basis-0">
            <SearchBox />
            {/* Popular categories double as the "trending" chips — always real, always clickable. */}
            {cats.length > 0 && (
              <div className="mt-2 hidden items-center gap-2 overflow-x-auto text-[12.5px] text-body lg:flex">
                <span className="shrink-0">জনপ্রিয়:</span>
                {cats.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href={`/books/search?category=${c.slug}`}
                    className="shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-heading transition hover:bg-accent/10 hover:text-accent"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link
              href="/wishlists"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-heading transition hover:bg-gray-50 sm:px-3"
            >
              <IconHeart className="h-[22px] w-[22px]" />
              <span className="hidden leading-tight xl:block">
                <small className="block text-[11px] text-body">আমার</small>
                <b className="block text-[13.5px] font-bold">উইশলিস্ট</b>
              </span>
            </Link>

            <div className="hidden lg:inline-flex">
              {isAuthorize ? <AuthorizedMenu /> : <JoinButton />}
            </div>

            <span className="mx-1 hidden h-7 w-px bg-border-200 sm:block" />

            <button
              onClick={openCart}
              aria-label="কার্ট"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-heading transition hover:bg-gray-50 sm:px-3"
            >
              <span className="relative grid h-6 w-6 place-items-center">
                <IconBag className="h-[22px] w-[22px]" />
                {mounted && totalUniqueItems > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-accent px-1 font-mono text-[10.5px] font-bold text-white">
                    {totalUniqueItems}
                  </span>
                )}
              </span>
              <span className="hidden leading-tight xl:block">
                <small className="block text-[11px] text-body">কার্ট</small>
                <b className="block font-mono text-[13.5px] font-extrabold text-accent">
                  ৳{mounted ? bn(Math.round(total).toLocaleString('en-IN')) : '০'}
                </b>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== nav row ===== */}
      {/* Sticky only from lg up: below that the main bar wraps the search onto its own row, so
          its height is not a fixed number the offset could be pinned to. */}
      <div className="z-40 border-b border-border-200 bg-white shadow-sm lg:sticky lg:top-[92px]">
        {/* Wraps on mobile instead of scrolling horizontally. An `overflow-x-auto` strip CLIPS
            absolutely-positioned children, so every dropdown in this row (categories, offers,
            genres, advanced search) would open into nothing on small screens and the buttons
            would look dead — the same trap the previous header carried a warning about. */}
        <div className="relative mx-auto flex max-w-[1500px] flex-wrap items-center gap-1 px-4 py-2 sm:px-6 lg:h-14 lg:flex-nowrap lg:py-0 lg:px-10">
          <CategoriesMenu cats={cats} />
          <DealsButton />
          <OffersMenu />
          <Link
            href="/books/search?in_stock=1"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-heading transition hover:bg-accent/10 hover:text-accent"
          >
            নতুন স্টক
            <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-white">NEW</span>
          </Link>
          <Link
            href="/authors"
            className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-heading transition hover:bg-accent/10 hover:text-accent"
          >
            লেখক
          </Link>
          <Link
            href="/manufacturers"
            className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-heading transition hover:bg-accent/10 hover:text-accent"
          >
            প্রকাশনী
          </Link>

          <div className="hidden flex-1 lg:block" />
          <AdvancedSearch cats={cats} />
        </div>
      </div>
    </>
  );
};

export default IndoHeader;
