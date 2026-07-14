import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import Pagination from '@/components/ui/pagination';
import { MappedPaginatorInfo, Question } from '@/types';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { NoDataFound } from '@/components/icons/no-data-found';

/**
 * #7 — Admin "প্রশ্ন ও উত্তর" board in the uploaded editorial design: warm paper
 * background, answered/pending filter chips, and product-thumbnail Q&A cards.
 * Wired to the real questions query; keeps admin reply & delete actions.
 */

const bn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

const initials = (name?: string) =>
  (name || 'C')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

type Filter = 'all' | 'answered' | 'pending';

type IProps = {
  questions: Question[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (key: number) => void;
};

const QuestionGallery = ({ questions, paginatorInfo, onPagination }: IProps) => {
  const { openModal } = useModalAction();
  const [filter, setFilter] = useState<Filter>('all');

  const list = questions ?? [];
  const pendingCount = useMemo(
    () => list.filter((q) => !q.answer).length,
    [list],
  );

  const shown = useMemo(() => {
    if (filter === 'answered') return list.filter((q) => !!q.answer);
    if (filter === 'pending') return list.filter((q) => !q.answer);
    return list;
  }, [list, filter]);

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'সব' },
    { key: 'answered', label: 'উত্তর দেওয়া' },
    { key: 'pending', label: 'অপেক্ষমাণ' },
  ];

  const total = paginatorInfo?.total ?? list.length;

  return (
    <div className="ib-qa mx-auto max-w-[1080px]">
      <style jsx global>{`
        .ib-qa {
          --ink: #1c1a17;
          --ink-soft: #5c564d;
          --paper: #f7f4ee;
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
          প্রশ্ন ও <em className="not-italic text-[var(--spine)]">উত্তর</em>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-[var(--ink-soft)]">
          বই সম্পর্কে ক্রেতাদের প্রশ্ন এবং আপনার উত্তর। অপেক্ষমাণ প্রশ্নের উত্তর দিতে
          &ldquo;উত্তর দিন&rdquo; বাটনে ক্লিক করুন।
        </p>
      </header>

      {/* Toolbar */}
      <div className="my-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-[var(--ink-soft)]">
          <b className="text-[var(--ink)]">{bn(total)}</b>টি প্রশ্ন ·{' '}
          <b className="text-[var(--ink)]">{bn(pendingCount)}</b>টি উত্তরের অপেক্ষায়
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition ${
                filter === c.key
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
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
          <p className="mt-4 text-[var(--ink-soft)]">কোনো প্রশ্ন পাওয়া যায়নি।</p>
        </div>
      ) : (
        shown.map((q) => {
          const cover = q?.product?.image?.thumbnail || q?.product?.image?.original;
          return (
            <article
              key={q.id}
              className="mb-4 grid grid-cols-1 gap-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)] sm:grid-cols-[96px_1fr]"
            >
              {/* product thumb */}
              <div className="relative">
                <span className="mb-2 inline-block text-xs font-semibold text-[var(--ink-soft)] sm:absolute sm:-top-1 sm:left-0">
                  #{bn(q.id)}
                </span>
                <div className="relative mt-0 aspect-square w-20 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--gold-soft)] sm:mt-6 sm:w-full">
                  {cover ? (
                    <Image src={cover} alt={q?.product?.name ?? ''} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">📚</div>
                  )}
                </div>
              </div>

              {/* content */}
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--spine)] text-xs font-bold text-white">
                    {initials(q?.user?.name)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold">
                        {q?.user?.name ?? 'ক্রেতা'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--spine-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--spine)]">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                        </svg>
                        যাচাইকৃত ক্রেতা
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--ink-soft)]">
                    {dayjs(q.created_at).format('D MMM YYYY, h:mm A')}
                  </span>
                </div>

                <Link
                  href={`${process.env.NEXT_PUBLIC_SHOP_URL}/products/${q?.product?.slug}`}
                  className="mt-3 block text-sm font-semibold text-[var(--spine)] hover:underline"
                >
                  {q?.product?.name}
                </Link>

                {/* Q */}
                <div className="mt-3 flex gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--gold-soft)] text-xs font-bold text-[var(--gold)]">
                    Q
                  </span>
                  <p className="text-[15px] text-[var(--ink)]">{q.question}</p>
                </div>

                {/* A or pending */}
                {q.answer ? (
                  <div className="mt-3 flex gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--spine-soft)] text-xs font-bold text-[var(--spine)]">
                      A
                    </span>
                    <div>
                      <p className="text-[15px] text-[var(--ink-soft)]">{q.answer}</p>
                      <button
                        onClick={() => openModal('REPLY_QUESTION', q)}
                        className="mt-2 text-[13px] font-medium text-[var(--gold)] hover:underline"
                      >
                        উত্তর সম্পাদনা করুন
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => openModal('REPLY_QUESTION', q)}
                      className="rounded-full bg-[var(--ink)] px-5 py-2 text-[13px] font-semibold text-[var(--paper)] transition hover:bg-[var(--spine)]"
                    >
                      উত্তর দিন
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--gold)]">
                      অপেক্ষমাণ
                    </span>
                  </div>
                )}

                {/* foot */}
                <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                  <span className="text-[13px] text-[var(--ink-soft)]">
                    সহায়ক ({bn(q?.positive_feedbacks_count ?? 0)})
                  </span>
                  <button
                    onClick={() => openModal('DELETE_QUESTION', q.id)}
                    className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-soft)] transition hover:text-red-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    </svg>
                    মুছুন
                  </button>
                </div>
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

export default QuestionGallery;
