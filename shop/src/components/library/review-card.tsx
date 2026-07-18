import { useState } from 'react';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { productPlaceholder } from '@/lib/placeholders';
import {
  useReviewComments,
  useAddReviewComment,
  markReviewViewed,
  type LibraryReview,
} from '@/framework/library';

const placeholder =
  typeof productPlaceholder === 'string'
    ? productPlaceholder
    : (productPlaceholder as any).src;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-yellow-500" aria-label={`${rating} star`}>
      {'★'.repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-gray-300">
        {'★'.repeat(Math.max(0, 5 - rating))}
      </span>
    </span>
  );
}

export default function ReviewCard({
  review,
  showProduct = true,
}: {
  review: LibraryReview;
  showProduct?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { comments, isLoading } = useReviewComments(review.id, open);
  const { addComment, isAdding } = useAddReviewComment(review.id);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markReviewViewed(review.id); // opening counts as a read
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    addComment(v, { onSuccess: () => setText('') });
  };

  return (
    <div className="rounded-lg border border-border-200 bg-light p-4">
      <div className="flex items-start gap-3">
        {showProduct && review.product && (
          <Link
            href={Routes.product(review.product.slug)}
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={review.product.image || placeholder}
              alt={review.product.name}
              className="h-16 w-12 rounded border border-border-200 object-cover"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Stars rating={review.rating} />
            <span className="text-[11px] text-body">
              {review.user?.name || 'একজন পাঠক'}
            </span>
          </div>
          {showProduct && review.product && (
            <Link
              href={Routes.product(review.product.slug)}
              className="mt-0.5 block truncate text-[13px] font-medium text-heading hover:text-accent"
            >
              {review.product.name}
            </Link>
          )}
          {review.comment && (
            <p className="mt-1 text-sm leading-relaxed text-body-dark">
              {review.comment}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-[12px] text-body">
            <span title="কতবার পড়া হয়েছে">👁️ {review.reads}</span>
            <span title="লাইক">👍 {review.likes}</span>
            <button
              type="button"
              onClick={toggle}
              className="hover:text-accent"
              title="মন্তব্য"
            >
              💬 {review.comments_count}
            </button>
          </div>

          {open && (
            <div className="mt-3 border-t border-dashed border-border-200 pt-3">
              {isLoading ? (
                <p className="text-xs text-body">লোড হচ্ছে…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-body">
                  এখনও কোনো মন্তব্য নেই — প্রথম মন্তব্যটি করুন।
                </p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((c: any) => (
                    <li key={c.id} className="text-sm">
                      <span className="font-medium text-heading">
                        {c.user?.name || 'পাঠক'}:
                      </span>{' '}
                      <span className="text-body-dark">{c.comment}</span>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={submit} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="একটি মন্তব্য লিখুন…"
                  className="flex-1 rounded border border-border-200 px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isAdding || !text.trim()}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-light disabled:opacity-50"
                >
                  পাঠান
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
