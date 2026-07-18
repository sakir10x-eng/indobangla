import type { LibraryBook } from '@/framework/library';
import BookCard from './book-card';

type Props = {
  title: string;
  subtitle?: string;
  books: LibraryBook[];
  emptyText?: string;
};

/** A titled, horizontally-scrolling row of book covers. */
export default function BookStrip({
  title,
  subtitle,
  books,
  emptyText,
}: Props) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-heading">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-body">{subtitle}</p>
          )}
        </div>
        {books.length > 0 && (
          <span className="text-xs text-body">{books.length}টি</span>
        )}
      </div>

      {books.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-200 bg-gray-50 px-4 py-6 text-center text-sm text-body">
          {emptyText || 'কিছু নেই'}
        </p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </section>
  );
}
