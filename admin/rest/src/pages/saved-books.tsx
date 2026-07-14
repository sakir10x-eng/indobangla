import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeading from '@/components/common/page-heading';
import Card from '@/components/common/card';
import { useEffect, useState } from 'react';
import { useWishlistInsightsQuery, useQuickPriceMutation } from '@/data/integrations';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const SORTS = [
  { value: 'saved', label: 'সবচেয়ে বেশি সেভ (Most saved)' },
  { value: 'recent', label: 'সাম্প্রতিক সেভ (Recently saved)' },
  { value: 'oldest', label: 'পুরোনো সেভ (Oldest saved)' },
  { value: 'price_high', label: 'দাম বেশি → কম' },
  { value: 'price_low', label: 'দাম কম → বেশি' },
  { value: 'name', label: 'নাম (A–Z)' },
];

const inputClass =
  'h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent';

function PriceEditor({ item }: { item: any }) {
  const { mutate: save, isLoading } = useQuickPriceMutation();
  const [price, setPrice] = useState(String(Math.round(item.price)));
  const [sale, setSale] = useState(item.sale_price ? String(Math.round(item.sale_price)) : '');
  return (
    <div className="flex items-center gap-2">
      <div>
        <span className="mb-0.5 block text-[10px] font-semibold text-slate-400">Price</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number"
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <span className="mb-0.5 block text-[10px] font-semibold text-slate-400">Sale (opt.)</span>
        <input value={sale} onChange={(e) => setSale(e.target.value)} type="number" placeholder="—"
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <button
        onClick={() => save({ product_id: item.product_id, price: Number(price), sale_price: sale ? Number(sale) : null })}
        disabled={isLoading}
        className="mt-4 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        Save
      </button>
    </div>
  );
}

export default function SavedBooks() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('saved');
  const [page, setPage] = useState(1);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { items, total, lastPage, authors, publishers, loading, fetching } =
    useWishlistInsightsQuery({
      search,
      author_id: authorId,
      manufacturer_id: publisherId,
      from,
      to,
      sort,
      page,
      limit: 20,
    });

  // Changing any filter starts the result set over at page one.
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  const hasFilters = Boolean(search || authorId || publisherId || from || to);
  const reset = () => {
    setSearchInput('');
    setSearch('');
    setAuthorId('');
    setPublisherId('');
    setFrom('');
    setTo('');
    setSort('saved');
    setPage(1);
  };

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <PageHeading title="Saved books (wishlist insights)" />
        <p className="mt-1 text-sm text-slate-500">
          Books shoppers saved to their wishlist, most-saved first — with who saved them. Edit the
          price here; shoppers see a price-drop alert on the home page for books they saved.
        </p>
      </Card>

      <div className="mb-5 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="বই, লেখক, প্রকাশক বা যিনি সেভ করেছেন তার নাম/ইমেইল দিয়ে খুঁজুন…"
          className={`${inputClass} w-full`}
        />

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-400">লেখক (Author)</span>
            <select value={authorId} onChange={(e) => filter(setAuthorId)(e.target.value)}
              className={`${inputClass} w-48`}>
              <option value="">সব লেখক</option>
              {authors.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-400">প্রকাশক (Publisher)</span>
            <select value={publisherId} onChange={(e) => filter(setPublisherId)(e.target.value)}
              className={`${inputClass} w-48`}>
              <option value="">সব প্রকাশক</option>
              {publishers.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-400">সেভ হয়েছে — from</span>
            <input type="date" value={from} onChange={(e) => filter(setFrom)(e.target.value)}
              className={`${inputClass} w-40`} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-400">to</span>
            <input type="date" value={to} onChange={(e) => filter(setTo)(e.target.value)}
              className={`${inputClass} w-40`} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-400">সাজান (Sort)</span>
            <select value={sort} onChange={(e) => filter(setSort)(e.target.value)}
              className={`${inputClass} w-56`}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button onClick={reset}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-500 hover:border-accent hover:text-accent">
              রিসেট
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {fetching ? 'লোড হচ্ছে…' : `${total.toLocaleString('en-IN')} টি বই পাওয়া গেছে`}
          {from || to ? ' · এই সময়ের মধ্যে সেভ করা' : ''}
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500">
          {hasFilters
            ? 'এই ফিল্টারে কোনো সেভ করা বই নেই।'
            : 'No books have been wishlisted yet.'}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((it: any) => (
              <div key={it.product_id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image && <img src={it.image} alt={it.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{it.name}</div>
                  {(it.author || it.publisher) && (
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {[it.author, it.publisher].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div className="mt-0.5 text-xs text-slate-400">
                    {bdt(it.sale_price || it.price)}
                    {it.sale_price ? <span className="ml-1 line-through">{bdt(it.price)}</span> : null}
                    {' · '}<b className="text-accent">{it.count}</b> জন সেভ করেছে
                    {it.last_saved_at ? (
                      <span> · শেষ সেভ {String(it.last_saved_at).slice(0, 10)}</span>
                    ) : null}
                  </div>
                  {it.users?.length > 0 && (
                    <div className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                      {it.users.slice(0, 8).join(', ')}{it.users.length > 8 ? ` +${it.count - 8} more` : ''}
                    </div>
                  )}
                </div>
                <PriceEditor item={it} />
              </div>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                ← আগের
              </button>
              <span className="text-sm text-slate-500">
                {page} / {lastPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                পরের →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

SavedBooks.authenticate = { permissions: adminOnly };
SavedBooks.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
