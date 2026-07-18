import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { productPlaceholder } from '@/lib/placeholders';
import type { LibraryBook } from '@/framework/library';

const placeholder =
  typeof productPlaceholder === 'string'
    ? productPlaceholder
    : (productPlaceholder as any).src;

export default function BookCard({ book }: { book: LibraryBook }) {
  const onSale =
    book.sale_price !== null &&
    book.price !== null &&
    book.sale_price > 0 &&
    book.sale_price < book.price;

  return (
    <Link
      href={Routes.product(book.slug)}
      className="group flex w-[140px] shrink-0 flex-col"
    >
      <div className="relative mb-2 h-[190px] w-full overflow-hidden rounded-md border border-border-200 bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={book.image || placeholder}
          alt={book.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {onSale && (
          <span className="absolute top-1 left-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-light">
            অফার
          </span>
        )}
      </div>
      <h4 className="line-clamp-2 text-[13px] font-medium leading-snug text-heading group-hover:text-accent">
        {book.name}
      </h4>
      {book.author && (
        <span className="mt-0.5 truncate text-[11px] text-body">
          {book.author}
        </span>
      )}
      <div className="mt-1 flex items-center gap-1.5">
        {onSale ? (
          <>
            <span className="text-[13px] font-semibold text-accent">
              ৳{book.sale_price}
            </span>
            <span className="text-[11px] text-body line-through">
              ৳{book.price}
            </span>
          </>
        ) : (
          book.price !== null && (
            <span className="text-[13px] font-semibold text-heading">
              ৳{book.price}
            </span>
          )
        )}
      </div>
      {book.ratings ? (
        <span className="mt-0.5 text-[11px] text-body">
          ★ {book.ratings}
          {book.total_reviews ? ` (${book.total_reviews})` : ''}
        </span>
      ) : null}
    </Link>
  );
}
