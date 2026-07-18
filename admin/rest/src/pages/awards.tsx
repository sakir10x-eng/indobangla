import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';
import {
  useAwardsQuery,
  useSaveAwardMutation,
  useDeleteAwardMutation,
  useBookSearchQuery,
} from '@/data/integrations';

const RED = '#e63946';

const imgUrl = (image: any): string | null => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  return image.original || image.thumbnail || null;
};

type BookLite = { id: number; name: string; slug?: string; image?: any };

function BookPicker({
  selected,
  setSelected,
}: {
  selected: BookLite[];
  setSelected: (b: BookLite[]) => void;
}) {
  const [q, setQ] = useState('');
  const { results, searching } = useBookSearchQuery(q);
  const ids = new Set(selected.map((s) => s.id));

  const add = (b: BookLite) => {
    if (ids.has(b.id)) return;
    setSelected([...selected, b]);
  };
  const remove = (id: number) =>
    setSelected(selected.filter((s) => s.id !== id));

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
        যে বইগুলো এই পুরস্কার পেয়েছে
      </label>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2 pr-1 text-[12px] text-slate-700"
            >
              {b.name}
              <button
                type="button"
                onClick={() => remove(b.id)}
                className="ml-0.5 rounded-full bg-slate-300 px-1.5 text-[10px] text-slate-700 hover:bg-rose-300"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="বইয়ের নাম / ISBN দিয়ে খুঁজুন…"
        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#e63946]"
      />
      {q.trim().length > 1 && (
        <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-100">
          {searching ? (
            <p className="px-3 py-2 text-xs text-slate-400">খোঁজা হচ্ছে…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">কিছু পাওয়া যায়নি।</p>
          ) : (
            results.map((b: any) => (
              <button
                type="button"
                key={b.id}
                onClick={() => add(b)}
                disabled={ids.has(b.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                {imgUrl(b.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl(b.image) as string}
                    alt=""
                    className="h-8 w-6 rounded object-cover"
                  />
                )}
                <span className="flex-1">{b.name}</span>
                {ids.has(b.id) && (
                  <span className="text-[11px] text-emerald-600">যুক্ত</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  id: 0,
  title: '',
  year: '',
  description: '',
  image: '',
  is_active: true,
};

function AwardForm({ editing, onClose }: { editing: any; onClose: () => void }) {
  const { mutate, isLoading } = useSaveAwardMutation();
  const [form, setForm] = useState<any>(
    editing
      ? {
          id: editing.id,
          title: editing.title ?? '',
          year: editing.year ? String(editing.year) : '',
          description: editing.description ?? '',
          image: imgUrl(editing.image) ?? '',
          is_active: Boolean(editing.is_active),
        }
      : { ...emptyForm },
  );
  const [books, setBooks] = useState<BookLite[]>(
    editing?.products?.map((p: any) => ({ id: p.id, name: p.name })) ?? [],
  );

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title.trim()) return;
    mutate(
      {
        id: form.id || undefined,
        title: form.title.trim(),
        year: form.year ? Number(form.year) : null,
        description: form.description || null,
        image: form.image ? { original: form.image, thumbnail: form.image } : null,
        is_active: form.is_active,
        product_ids: books.map((b) => b.id),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mb-5 rounded-xl border border-[#f4c4c8] bg-[#fff7f7] p-5">
      <h3 className="mb-3 text-sm font-bold text-slate-800">
        {form.id ? '✏️ পুরস্কার সম্পাদনা' : '🏆 নতুন পুরস্কার'}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            পুরস্কারের নাম *
          </label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#e63946]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            সাল
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set('year', e.target.value)}
            placeholder="2024"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#e63946]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            বর্ণনা
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e63946]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            ব্যাজ ছবির URL (ঐচ্ছিক)
          </label>
          <input
            value={form.image}
            onChange={(e) => set('image', e.target.value)}
            placeholder="https://…"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#e63946]"
          />
        </div>
        <div className="sm:col-span-2">
          <BookPicker selected={books} setSelected={setBooks} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
          />
          সক্রিয় (লাইব্রেরিতে দেখাবে)
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          disabled={isLoading || !form.title.trim()}
          onClick={save}
          className="h-9 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: RED }}
        >
          {form.id ? 'আপডেট করুন' : 'সেভ করুন'}
        </button>
        <button
          onClick={onClose}
          className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600"
        >
          বাতিল
        </button>
      </div>
    </div>
  );
}

export default function AwardsPage() {
  const { awards, loading } = useAwardsQuery();
  const { mutate: del } = useDeleteAwardMutation();
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const showForm = creating || editing;
  const list = useMemo(() => awards ?? [], [awards]);

  return (
    <div className="pb-10">
      <div
        className="mb-5 rounded-2xl border border-[#f4c4c8] p-6"
        style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">🏆 বইয়ের পুরস্কার</h1>
            <p className="mt-1 text-sm text-[#8a4048]">
              কোন বই কোন পুরস্কার পেয়েছে তা এখানে যোগ করুন — পাঠকের “আমার লাইব্রেরি”তে দেখাবে।
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setCreating(true)}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-white"
              style={{ background: RED }}
            >
              + নতুন পুরস্কার
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <AwardForm
          editing={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            এখনও কোনো পুরস্কার যোগ করা হয়নি।
          </p>
        ) : (
          <div className="space-y-3">
            {list.map((a: any) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-4"
              >
                {imgUrl(a.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl(a.image) as string}
                    alt=""
                    className="h-11 w-11 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {a.title}
                    </span>
                    {a.year && (
                      <span className="text-xs text-slate-400">({a.year})</span>
                    )}
                    {!a.is_active && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {a.products_count ?? a.products?.length ?? 0}টি বই
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(a);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-300 hover:text-sky-600"
                >
                  এডিট
                </button>
                <button
                  onClick={() => {
                    if (confirm('এই পুরস্কারটি মুছে ফেলবেন?')) del(a.id);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600"
                >
                  মুছুন
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

AwardsPage.authenticate = { permissions: adminOnly };
AwardsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
