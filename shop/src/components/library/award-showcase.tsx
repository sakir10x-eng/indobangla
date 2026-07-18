import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { productPlaceholder } from '@/lib/placeholders';
import type { LibraryAward } from '@/framework/library';

const placeholder =
  typeof productPlaceholder === 'string'
    ? productPlaceholder
    : (productPlaceholder as any).src;

export default function AwardShowcase({ awards }: { awards: LibraryAward[] }) {
  if (!awards || awards.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="mb-3 text-base font-semibold text-heading">
        📚 বইয়ের পুরস্কার
      </h3>
      <div className="space-y-4">
        {awards.map((award) => (
          <div
            key={award.id}
            className="rounded-lg border border-border-200 bg-light p-4"
          >
            <div className="flex items-center gap-3">
              {award.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={award.image}
                  alt={award.title}
                  className="h-12 w-12 rounded object-cover"
                />
              )}
              <div>
                <h4 className="text-sm font-semibold text-heading">
                  {award.title}
                  {award.year ? (
                    <span className="ml-1 text-body">({award.year})</span>
                  ) : null}
                </h4>
                {award.description && (
                  <p className="mt-0.5 text-xs text-body">
                    {award.description}
                  </p>
                )}
              </div>
            </div>

            {award.books.length > 0 && (
              <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
                {award.books.map((b) => (
                  <Link
                    key={b.id}
                    href={Routes.product(b.slug)}
                    className="group w-[92px] shrink-0"
                    title={b.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.image || placeholder}
                      alt={b.name}
                      className="h-[124px] w-full rounded border border-border-200 object-cover group-hover:opacity-90"
                    />
                    <span className="mt-1 line-clamp-2 text-[11px] text-heading group-hover:text-accent">
                      {b.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
