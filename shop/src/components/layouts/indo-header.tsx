import Logo from '@/components/ui/logo';
import Link from '@/components/ui/link';
import { HttpClient } from '@/framework/client/http-client';
import { drawerAtom } from '@/store/drawer-atom';
import { authorizationAtom } from '@/store/authorization-atom';
import { SearchIcon } from '@/components/icons/search-icon';
import CartCheckBagIcon from '@/components/icons/cart-check-bag';
import { useCart } from '@/store/quick-cart/cart.context';
import { useAtom } from 'jotai';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import dynamic from 'next/dynamic';
import cn from 'classnames';

const AuthorizedMenu = dynamic(() => import('./menu/authorized-menu'), {
  ssr: false,
});
const JoinButton = dynamic(() => import('./menu/join-button'), { ssr: false });

type Cat = { id: number; name: string; slug: string };

function useBookCategories(): Cat[] {
  const { data } = useQuery(['indo-menu-categories'], () =>
    HttpClient.get<any>('home-categories', { categories: 14, per: 6 }),
  );
  return ((data as any)?.sections ?? []).map((s: any) => s.category);
}

function SearchBox({ big }: { big?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = (router.query?.text as string) ?? '';
    setQ(t);
  }, [router.query?.text]);

  // debounce the query for suggestions
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

  const { data: sugg } = useQuery(
    ['search-suggest', debounced],
    () => HttpClient.get<any>('books-listing', { text: debounced, limit: 6 }),
    { enabled: debounced.length >= 2, staleTime: 60 * 1000, keepPreviousData: true },
  );
  const results: any[] = ((sugg as any)?.data ?? []).slice(0, 6);

  const go = (url: string) => {
    setOpen(false);
    router.push(url);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    go(text ? `/books/search?text=${encodeURIComponent(text)}` : '/books/search');
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={submit}
        className={cn(
          'flex w-full items-stretch overflow-hidden rounded-full border border-border-200 bg-white shadow-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
          big ? 'h-11' : 'h-10',
        )}
      >
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="বই, লেখক বা প্রকাশনী খুঁজুন…"
          aria-label="Search books"
          autoComplete="off"
          className="w-full bg-transparent px-4 text-sm text-heading placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex shrink-0 items-center gap-2 bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover sm:px-5"
        >
          <SearchIcon className="h-4 w-4" />
          <span className="hidden sm:inline">খুঁজুন</span>
        </button>
      </form>

      {open && debounced.length >= 2 && (
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
                    {b.author?.name && <span className="block truncate text-xs text-gray-400">{b.author.name}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-accent">
                    ৳{(b.sale_price > 0 ? b.sale_price : b.price)?.toLocaleString?.('en-IN')}
                  </span>
                </button>
              ))}
              <button
                onClick={() => go(`/books/search?text=${encodeURIComponent(q.trim())}`)}
                className="block w-full border-t border-border-100 bg-gray-50 px-3 py-2.5 text-center text-sm font-semibold text-accent hover:bg-accent/5"
              >
                “{q.trim()}” — সব ফলাফল দেখুন →
              </button>
            </>
          ) : (
            <div className="px-4 py-4 text-center text-sm text-body">
              কিছু পাওয়া যায়নি।{' '}
              <button onClick={() => go(`/books/search?text=${encodeURIComponent(q.trim())}`)} className="font-semibold text-accent hover:underline">
                সব বইয়ে খুঁজুন
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CartButton() {
  const { totalUniqueItems } = useCart();
  const [, setDrawer] = useAtom(drawerAtom);
  return (
    <button
      onClick={() => setDrawer({ display: true, view: 'cart' })}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border-200 bg-white text-heading transition-colors hover:border-accent hover:text-accent"
      aria-label="Cart"
    >
      <CartCheckBagIcon width={18} height={20} />
      {totalUniqueItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
          {totalUniqueItems}
        </span>
      )}
    </button>
  );
}

const IndoHeader = () => {
  const cats = useBookCategories();
  const [isAuthorize] = useAtom(authorizationAtom);
  const [, setDrawer] = useAtom(drawerAtom);
  const [openAll, setOpenAll] = useState(false);
  const allRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (allRef.current && !allRef.current.contains(e.target as Node)) {
        setOpenAll(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const inline = cats.slice(0, 8);
  const rest = cats.slice(8);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-200 bg-white shadow-sm">
      {/* top strip */}
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 lg:px-10">
        {/* mobile hamburger */}
        <button
          onClick={() => setDrawer({ display: true, view: 'MAIN_MENU_VIEW' })}
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1 xl:hidden"
          aria-label="Menu"
        >
          <span className="h-0.5 w-5 rounded bg-gray-700" />
          <span className="h-0.5 w-5 rounded bg-gray-700" />
          <span className="h-0.5 w-5 rounded bg-gray-700" />
        </button>

        <Logo className="shrink-0" />

        {/* search — takes the middle, moved to the top */}
        <div className="hidden flex-1 md:block">
          <SearchBox big />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden lg:inline-flex">
            {isAuthorize ? <AuthorizedMenu /> : <JoinButton />}
          </div>
          <CartButton />
        </div>
      </div>

      {/* search on mobile */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>

      {/* category menu bar */}
      <nav className="border-t border-border-100 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-4 py-2 text-sm font-medium text-heading sm:px-6 lg:px-10">
          {/* All categories dropdown. This stays OUTSIDE the scrolling strip below: that strip's
              overflow-x-auto clips absolutely-positioned children, which silently swallowed this
              panel and made the button look dead. */}
          <div className="relative shrink-0" ref={allRef}>
            <button
              type="button"
              aria-expanded={openAll}
              onClick={(e) => {
                e.stopPropagation();
                setOpenAll((v) => !v);
              }}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <span className="flex flex-col gap-0.5">
                <span className="h-0.5 w-4 rounded bg-white" />
                <span className="h-0.5 w-4 rounded bg-white" />
                <span className="h-0.5 w-4 rounded bg-white" />
              </span>
              সব বিভাগ
            </button>
            {openAll && cats.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-2 grid max-h-[70vh] w-[min(90vw,520px)] grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-border-200 bg-white p-3 shadow-xl">
                {cats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/books/search?category=${c.slug}`}
                    onClick={() => setOpenAll(false)}
                    className="truncate rounded-lg px-3 py-2 text-heading transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {inline.map((c) => (
              <Link
                key={c.id}
                href={`/books/search?category=${c.slug}`}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-body transition-colors hover:bg-accent/10 hover:text-accent"
              >
                {c.name}
              </Link>
            ))}

            <span className="mx-1 hidden h-4 w-px shrink-0 bg-border-200 sm:block" />
            <Link
              href="/authors"
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-body transition-colors hover:bg-accent/10 hover:text-accent"
            >
              লেখক
            </Link>
            <Link
              href="/manufacturers"
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-body transition-colors hover:bg-accent/10 hover:text-accent"
            >
              প্রকাশনী
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default IndoHeader;
