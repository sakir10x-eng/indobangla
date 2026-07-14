import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useProductsQuery } from '@/data/product';
import { useFeaturedBooksQuery, useUpdateFeaturedBooksMutation } from '@/data/integrations';

type Book = { id: number; name: string; image?: { thumbnail?: string; original?: string } };

function BookPicker({
  title,
  hint,
  max,
  selected,
  onChange,
}: {
  title: string;
  hint: string;
  max: number;
  selected: Book[];
  onChange: (books: Book[]) => void;
}) {
  const [term, setTerm] = useState('');
  const { products, loading } = useProductsQuery(
    { name: term, limit: 8, status: 'publish' } as any,
    { enabled: term.trim().length > 1 },
  );
  const selectedIds = useMemo(() => new Set(selected.map((b) => b.id)), [selected]);
  const results = (products as any[]).filter((p) => !selectedIds.has(p.id));

  const add = (b: Book) => {
    if (selected.length >= max) return;
    onChange([...selected, { id: b.id, name: b.name, image: b.image }]);
    setTerm('');
  };
  const remove = (id: number) => onChange(selected.filter((b) => b.id !== id));

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div>
        {title && <h3 className="text-sm font-semibold text-slate-700">{title}</h3>}
        <p className="text-xs text-slate-400">{hint}</p>
      </div>

      {/* selected chips */}
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 && (
          <span className="text-xs text-slate-400">No books selected — auto (algorithmic) selection is used.</span>
        )}
        {selected.map((b, i) => (
          <span key={b.id} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-1 pe-2 ps-1 text-xs">
            <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white">
              {b.image?.thumbnail ? (
                <Image src={b.image.thumbnail} alt={b.name} width={24} height={24} className="h-6 w-6 object-cover" />
              ) : (
                '📖'
              )}
            </span>
            <span className="max-w-[160px] truncate font-medium text-emerald-800">{i + 1}. {b.name}</span>
            <button onClick={() => remove(b.id)} className="text-emerald-500 hover:text-rose-500">✕</button>
          </span>
        ))}
      </div>

      {/* search */}
      <div className="relative">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={selected.length >= max ? `Max ${max} reached` : 'Search a book by name…'}
          disabled={selected.length >= max}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-50"
        />
        {term.trim().length > 1 && (
          <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {loading ? (
              <div className="p-3 text-xs text-slate-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">No matches.</div>
            ) : (
              results.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2 text-left hover:bg-emerald-50"
                >
                  <span className="grid h-9 w-9 place-items-center overflow-hidden rounded bg-slate-100">
                    {p.image?.thumbnail ? (
                      <Image src={p.image.thumbnail} alt={p.name} width={36} height={36} className="h-9 w-9 object-cover" />
                    ) : (
                      '📖'
                    )}
                  </span>
                  <span className="truncate text-sm text-slate-700">{p.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Target = { product: Book; books: Book[] };

/** Search box that picks a single target book to configure its own FBT row. */
function TargetAdder({ onAdd, existingIds }: { onAdd: (b: Book) => void; existingIds: Set<number> }) {
  const [term, setTerm] = useState('');
  const { products, loading } = useProductsQuery(
    { name: term, limit: 8, status: 'publish' } as any,
    { enabled: term.trim().length > 1 },
  );
  const results = (products as any[]).filter((p) => !existingIds.has(p.id));
  return (
    <div className="relative">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search a book to set its own “frequently bought together”…"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      {term.trim().length > 1 && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-3 text-xs text-slate-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-slate-400">No matches.</div>
          ) : (
            results.map((p: any) => (
              <button
                key={p.id}
                onClick={() => {
                  onAdd({ id: p.id, name: p.name, image: p.image });
                  setTerm('');
                }}
                className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2 text-left hover:bg-emerald-50"
              >
                <span className="grid h-9 w-9 place-items-center overflow-hidden rounded bg-slate-100">
                  {p.image?.thumbnail ? (
                    <Image src={p.image.thumbnail} alt={p.name} width={36} height={36} className="h-9 w-9 object-cover" />
                  ) : (
                    '📖'
                  )}
                </span>
                <span className="truncate text-sm text-slate-700">{p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function FeaturedBooksPage() {
  const { featured, loading } = useFeaturedBooksQuery();
  const { mutate: save, isLoading: saving } = useUpdateFeaturedBooksMutation();
  const [banner, setBanner] = useState<Book[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    if (featured) {
      setBanner((featured.banner ?? []) as Book[]);
      setTargets(
        ((featured.fbt_targets ?? []) as any[]).map((t) => ({
          product: t.product as Book,
          books: (t.books ?? []) as Book[],
        })),
      );
    }
  }, [featured]);

  const existingTargetIds = useMemo(() => new Set(targets.map((t) => t.product.id)), [targets]);

  const addTarget = (b: Book) => setTargets((ts) => [...ts, { product: b, books: [] }]);
  const removeTarget = (pid: number) => setTargets((ts) => ts.filter((t) => t.product.id !== pid));
  const setTargetBooks = (pid: number, books: Book[]) =>
    setTargets((ts) => ts.map((t) => (t.product.id === pid ? { ...t, books } : t)));

  return (
    <>
      <SettingsPageHeader pageTitle="Featured books (banner & frequently-bought)" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <p className="text-sm text-slate-500">
            Pick specific books to feature. Leave a section empty to keep the automatic
            (algorithmic) selection.
          </p>

          <BookPicker
            title="Home banner books"
            hint="Shown in the home hero cover-fan. Up to 5. Order matters."
            max={5}
            selected={banner}
            onChange={setBanner}
          />

          {/* Per-product ("alada") frequently-bought-together */}
          <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Frequently bought together — per book</h3>
              <p className="text-xs text-slate-400">
                Choose the companion books shown on <b>each</b> book&apos;s page. Books with no
                selection here fall back to the automatic (same author → same category) suggestion.
              </p>
            </div>

            <TargetAdder onAdd={addTarget} existingIds={existingTargetIds} />

            {targets.length === 0 ? (
              <p className="text-xs text-slate-400">No per-book FBT set yet — all pages use auto suggestions.</p>
            ) : (
              <div className="space-y-4">
                {targets.map((t) => (
                  <div key={t.product.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded bg-white">
                        {t.product.image?.thumbnail ? (
                          <Image src={t.product.image.thumbnail} alt={t.product.name} width={32} height={32} className="h-8 w-8 object-cover" />
                        ) : (
                          '📖'
                        )}
                      </span>
                      <span className="flex-1 truncate text-sm font-semibold text-slate-800">{t.product.name}</span>
                      <button onClick={() => removeTarget(t.product.id)} className="text-xs text-slate-400 hover:text-rose-500">
                        Remove
                      </button>
                    </div>
                    <BookPicker
                      title=""
                      hint="Up to 3 companion books shown with this book."
                      max={3}
                      selected={t.books}
                      onChange={(books) => setTargetBooks(t.product.id, books)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() =>
              save({
                banner: banner.map((b) => b.id),
                fbt: [],
                fbt_map: targets.reduce((acc, t) => {
                  if (t.books.length) acc[t.product.id] = t.books.map((b) => b.id);
                  return acc;
                }, {} as Record<number, number[]>),
              })
            }
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save featured books'}
          </button>
        </div>
      )}
    </>
  );
}

FeaturedBooksPage.authenticate = { permissions: adminOnly };
FeaturedBooksPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
