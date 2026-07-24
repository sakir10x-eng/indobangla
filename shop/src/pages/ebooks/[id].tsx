import Seo from '@/components/seo/seo';
import { HttpClient } from '@/framework/client/http-client';
import Link from '@/components/ui/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';

/**
 * E-book reader. The book file never reaches the browser: each page is fetched as a
 * server-rendered, watermarked JPEG through the authenticated client, shown, and released.
 * There is no download control, no page URL to copy, and no file to forward — the strongest
 * protection a browser reader can give (a screenshot is always possible, but it carries the
 * reader's own phone number burnt into the page).
 */
const EbookReaderPage = () => {
  const router = useRouter();
  const id = router.query.id as string;

  const [page, setPage] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const currentUrl = useRef<string | null>(null);

  // Two sources: the public sample (works logged out — its whole job is to help someone decide)
  // and the owner's full view. Whichever applies decides how many pages can be turned.
  const { data: previewInfo } = useQuery(
    ['ebook-preview', id],
    () => HttpClient.get<any>(`ebooks/${id}/preview`),
    { enabled: Boolean(id), retry: false },
  );
  const { data: info } = useQuery(
    ['ebook-open', id],
    () => HttpClient.get<any>(`ebooks/${id}/open`),
    { enabled: Boolean(id), retry: false },
  );

  const owned = Boolean((info as any)?.owned);
  const totalPages = Number(
    (info as any)?.page_count ?? (previewInfo as any)?.page_count ?? 0,
  );
  const pageCount = owned
    ? totalPages
    : Number((previewInfo as any)?.preview_pages ?? (info as any)?.readable_pages ?? 0);
  const title = (info as any)?.name ?? (previewInfo as any)?.name ?? '';
  const slug = (previewInfo as any)?.slug;
  const pageBase = owned ? `ebooks/${id}/page` : `ebooks/${id}/preview/page`;
  const isLoading = previewInfo === undefined && info === undefined;

  // Release the previous page's blob as soon as it's replaced, so a long reading session doesn't
  // accumulate the whole book in memory (and nothing lingers to be dug out afterwards).
  const swapUrl = (next: string | null) => {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = next;
    setUrl(next);
  };

  useEffect(() => {
    if (!id || !pageCount) return;
    let cancelled = false;
    setLoadingPage(true);
    setPageError(null);
    HttpClient.getBlob(`${pageBase}/${page}`)
      .then((blob) => {
        if (cancelled) return;
        swapUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) setPageError('পৃষ্ঠাটি লোড করা যায়নি। আবার চেষ্টা করুন।');
      })
      .finally(() => {
        if (!cancelled) setLoadingPage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, page, pageCount, pageBase]);

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = null;
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPage((p) => Math.min(pageCount || 1, p + 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageCount]);

  const go = (n: number) => setPage(Math.min(Math.max(1, n), pageCount || 1));

  if (isLoading) {
    return <p className="py-24 text-center text-sm text-body">লোড হচ্ছে…</p>;
  }
  if (!pageCount) {
    return (
      <div className="py-24 text-center text-sm text-body">
        <p>এই ই-বুকটি আপনি পড়তে পারবেন না, অথবা এটি এখনো প্রস্তুত নয়।</p>
        <Link href="/ebooks" className="mt-4 inline-block font-semibold text-accent">
          আমার ই-বুক-এ ফিরে যান
        </Link>
      </div>
    );
  }

  return (
    <>
      <Seo noindex={true} nofollow={true} />
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-[#f7f6f3]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-200 bg-white px-4 py-3">
          <Link href="/ebooks" className="shrink-0 text-sm font-semibold text-accent">
            ← ফিরে যান
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-heading">
            {title}
          </h1>
          <span className="shrink-0 text-xs text-body">
            {page} / {pageCount}
            {!owned && totalPages > 0 ? ` (ডেমো · মোট ${totalPages})` : ''}
          </span>
        </header>

        {!owned && (
          <div className="border-b border-[#f0e2c4] bg-[#fdf7e8] px-4 py-2.5 text-center text-[12.5px] text-[#7a5c1f]">
            📖 এটি <b>ফ্রি ডেমো</b> — প্রথম {pageCount} পৃষ্ঠা। পুরো বইটি পড়তে কিনুন।
            {slug ? (
              <Link href={`/products/${slug}`} className="ms-2 font-semibold text-accent underline">
                বইটি দেখুন →
              </Link>
            ) : null}
          </div>
        )}

        <main
          className="flex flex-1 items-start justify-center p-3 sm:p-5"
          // Discourage the obvious save/copy routes. Real protection is server-side: the file
          // never leaves the server and every page carries the reader's watermark.
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        >
          {pageError ? (
            <div className="py-20 text-center text-sm text-body">
              <p>{pageError}</p>
              <button
                type="button"
                onClick={() => setPage((p) => p)}
                className="mt-4 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={`পৃষ্ঠা ${page}`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className={`w-full rounded-lg bg-white shadow-sm transition-opacity ${
                loadingPage ? 'opacity-50' : 'opacity-100'
              }`}
            />
          ) : (
            <p className="py-20 text-center text-sm text-body">পৃষ্ঠা লোড হচ্ছে…</p>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-border-200 bg-white px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => go(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-border-200 px-4 py-2 text-sm font-semibold text-heading disabled:opacity-40"
            >
              ← আগের
            </button>
            <input
              type="number"
              min={1}
              max={pageCount}
              value={page}
              onChange={(e) => go(Number(e.target.value) || 1)}
              className="w-20 rounded-md border border-border-200 px-2 py-2 text-center text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => go(page + 1)}
              disabled={page >= pageCount}
              className="rounded-md border border-border-200 px-4 py-2 text-sm font-semibold text-heading disabled:opacity-40"
            >
              পরের →
            </button>
          </div>
          {!owned && page >= pageCount && (
            <div className="mt-3 rounded-lg bg-[#fdf7e8] p-3 text-center">
              <p className="text-[12.5px] font-semibold text-[#7a5c1f]">
                ডেমো এখানেই শেষ। পুরো বইটি পড়তে কিনে নিন।
              </p>
              {slug ? (
                <Link
                  href={`/products/${slug}`}
                  className="mt-2 inline-block rounded-md bg-accent px-5 py-2 text-xs font-bold text-white"
                >
                  বইটি কিনুন
                </Link>
              ) : null}
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-body">
            এই ই-বুক শুধু পড়ার জন্য — ডাউনলোড বা শেয়ার করা যায় না। প্রতিটি পৃষ্ঠায় আপনার
            পরিচয় যুক্ত থাকে।
          </p>
        </footer>
      </div>
    </>
  );
};

// Deliberately NOT auth-gated: the free sample has to be readable by someone who hasn't bought
// (or even signed in) yet. Full access is decided server-side per page, not by this flag.
export default EbookReaderPage;
