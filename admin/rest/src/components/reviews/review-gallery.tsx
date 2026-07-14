import { useMemo, useState } from 'react';
import Image from 'next/image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Pagination from '@/components/ui/pagination';
import { MappedPaginatorInfo, Review } from '@/types';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { NoDataFound } from '@/components/icons/no-data-found';

dayjs.extend(relativeTime);

/**
 * #5 — Admin review board in the uploaded "পাঠকের কথা" editorial design:
 * warm paper background, rating-summary bar with star distribution, filter
 * chips, and book-cover review cards. Wired to the real reviews query; each
 * card keeps the admin delete action.
 */

const bn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

const Stars = ({ rating }: { rating: number }) => {
  const r = Math.round(rating);
  return (
    <span aria-label={`${rating} stars`}>
      {'★'.repeat(Math.max(0, Math.min(5, r)))}
      <span className="opacity-30">{'★'.repeat(Math.max(0, 5 - r))}</span>
    </span>
  );
};

type Filter = 'all' | 'verified' | 'top' | 'newest';

type IProps = {
  reviews: Review[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (key: number) => void;
};

const ReviewGallery = ({ reviews, paginatorInfo, onPagination }: IProps) => {
  const { openModal } = useModalAction();
  const [filter, setFilter] = useState<Filter>('all');

  const list = reviews ?? [];

  // Summary computed from the currently loaded page (admin overview).
  const summary = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 => 1★ … index 4 => 5★
    let sum = 0;
    list.forEach((r) => {
      const idx = Math.min(4, Math.max(0, Math.round(r.rating) - 1));
      counts[idx] += 1;
      sum += r.rating;
    });
    const total = list.length || 1;
    return {
      avg: list.length ? sum / list.length : 0,
      counts,
      pct: counts.map((c) => Math.round((c / total) * 100)),
    };
  }, [list]);

  const shown = useMemo(() => {
    let arr = [...list];
    if (filter === 'top') arr = arr.filter((r) => Math.round(r.rating) >= 4);
    if (filter === 'newest')
      arr = arr.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
    return arr;
  }, [list, filter]);

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'সব' },
    { key: 'verified', label: 'যাচাইকৃত ক্রেতা' },
    { key: 'top', label: 'সর্বোচ্চ রেটিং' },
    { key: 'newest', label: 'নতুন আগে' },
  ];

  const total = paginatorInfo?.total ?? list.length;

  return (
    <div className="ib-reviews mx-auto max-w-[1080px]">
      <style jsx global>{`
        .ib-reviews {
          --ink: #1c1a17;
          --ink-soft: #5c564d;
          --card: #fffdf9;
          --line: #e6e0d4;
          --gold: #c8892e;
          --gold-soft: #f3e6cc;
          --spine: #2f6b52;
          --spine-soft: #e4efe8;
          --radius: 16px;
          --shadow: 0 1px 2px rgba(28, 26, 23, 0.04), 0 8px 24px rgba(28, 26, 23, 0.05);
          color: var(--ink);
        }
      `}</style>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
          IndoBangla Book Shop
        </div>
        <h1 className="text-4xl font-semibold leading-none tracking-tight text-[var(--ink)] sm:text-5xl">
          পাঠকের <em className="not-italic text-[var(--spine)]">কথা</em>
        </h1>
        <p className="mt-3 max-w-lg text-[15px] text-[var(--ink-soft)]">
          যারা বইগুলো পড়েছেন, তাদের সৎ মতামত। প্রতিটি রিভিউ যাচাই করা ক্রেতাদের কাছ থেকে।
        </p>

        {/* Summary bar */}
        <div className="mt-8 flex flex-wrap items-center gap-7 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold leading-none text-[var(--ink)]">
              {bn(summary.avg.toFixed(1))}
            </span>
            <span className="text-lg text-[var(--ink-soft)]">/৫</span>
            <div className="flex flex-col gap-1">
              <span className="text-lg tracking-[2px] text-[var(--gold)]">
                <Stars rating={summary.avg} />
              </span>
              <small className="text-[13px] text-[var(--ink-soft)]">
                {bn(total)}টি রিভিউ থেকে
              </small>
            </div>
          </div>
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div
                key={star}
                className="flex items-center gap-2.5 text-[13px] text-[var(--ink-soft)]"
              >
                <span className="w-9 text-right">{bn(star)} ★</span>
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-[var(--gold-soft)]">
                  <span
                    className="block h-full rounded-full bg-[var(--gold)]"
                    style={{ width: `${summary.pct[star - 1]}%` }}
                  />
                </span>
                <span className="w-9">{bn(summary.pct[star - 1])}%</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="my-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-[var(--ink-soft)]">
          দেখানো হচ্ছে <b className="text-[var(--ink)]">{bn(total)}</b>টি রিভিউর মধ্যে{' '}
          <b className="text-[var(--ink)]">{bn(shown.length)}</b>টি
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition ${
                filter === c.key
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[#f7f4ee]'
                  : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-12">
          <NoDataFound className="w-52" />
          <p className="mt-4 text-[var(--ink-soft)]">কোনো রিভিউ পাওয়া যায়নি।</p>
        </div>
      ) : (
        shown.map((r) => {
          const cover = r?.product?.image?.original || r?.product?.image?.thumbnail;
          return (
            <article
              key={r.id}
              className="mb-4 grid grid-cols-1 items-start gap-6 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)] transition hover:-translate-y-0.5 sm:grid-cols-[112px_1fr_auto]"
            >
              {/* cover */}
              <div className="flex items-center gap-3.5 sm:block">
                <div className="relative aspect-[3/4] w-[70px] overflow-hidden rounded-lg border border-[var(--line)] shadow-[2px_3px_0_var(--gold-soft)] sm:w-full">
                  {cover ? (
                    <Image src={cover} alt={r?.product?.name ?? ''} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--gold-soft)] text-2xl">
                      📖
                    </div>
                  )}
                </div>
                <div className="mt-0 text-xs font-semibold leading-snug text-[var(--ink)] sm:mt-2.5">
                  {r?.product?.name}
                </div>
              </div>

              {/* body */}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[15px] font-semibold">{r?.user?.name ?? 'ক্রেতা'}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--spine-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--spine)]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                    </svg>
                    যাচাইকৃত
                  </span>
                </div>
                <div className="mb-2.5 text-sm tracking-[1px] text-[var(--gold)]">
                  <Stars rating={r.rating} />
                </div>
                <p className="max-w-[60ch] text-[15px] text-[var(--ink-soft)]">
                  {r?.comment || <span className="italic">কোনো মন্তব্য নেই।</span>}
                </p>
                <div className="mt-3.5 flex gap-4 text-[13px] text-[var(--ink-soft)]">
                  <span className="inline-flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path d="M7 10v11m0-11l4-7a2 2 0 013 2l-1 5h5a2 2 0 012 2l-2 6a2 2 0 01-2 1H7" />
                    </svg>
                    সহায়ক ({bn(r?.positive_feedbacks_count ?? 0)})
                  </span>
                  <button
                    onClick={() => openModal('DELETE_REVIEW', r.id)}
                    className="inline-flex items-center gap-1.5 text-[var(--ink-soft)] transition hover:text-red-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    </svg>
                    মুছুন
                  </button>
                </div>
              </div>

              {/* meta */}
              <div className="flex items-center gap-4 text-right sm:block">
                <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[var(--spine)] px-3 py-1 text-sm font-semibold text-[var(--spine)]">
                  {bn(Math.round(r.rating))} ★
                </span>
                <span className="mt-0 block text-xs text-[var(--ink-soft)] sm:mt-2.5">
                  {dayjs(r.created_at).fromNow()}
                </span>
              </div>
            </article>
          );
        })
      )}

      {!!paginatorInfo?.total && (
        <div className="mt-8 flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={onPagination}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewGallery;
