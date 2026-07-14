import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';
import {
  useRotatingBannersQuery,
  useUpdateRotatingBannersMutation,
  usePrehomeQuery,
  useUpdatePrehomeMutation,
} from '@/data/integrations';

type Banner = {
  style: string; badge: string; headline: string; subtext: string;
  cta_text: string; cta_link: string; category: string;
};

const STYLES = [
  { key: 'parchment', label: 'Parchment (cream)' },
  { key: 'cloth', label: 'Cloth (teal + gold)' },
  { key: 'kraft', label: 'Kraft (block-print)' },
  { key: 'library', label: 'Library card' },
];

const BLANK: Banner = { style: 'parchment', badge: 'IndoBangla গ্যালারি', headline: '', subtext: '', cta_text: 'দেখুন', cta_link: '/books/search', category: '' };

const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent';

export default function BannersPage() {
  const { banners: loaded, loading } = useRotatingBannersQuery();
  const { mutate: save, isLoading: saving } = useUpdateRotatingBannersMutation();
  const { enabled: prehomeOn } = usePrehomeQuery();
  const { mutate: togglePrehome, isLoading: togglingPrehome } = useUpdatePrehomeMutation();
  const [rows, setRows] = useState<Banner[]>([]);

  useEffect(() => {
    if (loaded?.length) setRows(loaded as Banner[]);
  }, [loaded]);

  const set = (i: number, k: keyof Banner, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const add = () => setRows((r) => [...r, { ...BLANK }]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <>
      <SettingsPageHeader pageTitle="Home rotating banners" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-5">
          {/* #8 — pre-home intro page toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div>
              <div className="text-sm font-bold text-slate-700">Pre-home intro page</div>
              <div className="text-xs text-slate-400">
                When ON, first-time visitors see the marketing intro page (with an “enter shop” button) before the home page.
              </div>
            </div>
            <button
              onClick={() => togglePrehome({ enabled: !prehomeOn })}
              disabled={togglingPrehome}
              className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${prehomeOn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 hover:bg-slate-500'}`}
            >
              {prehomeOn ? 'ON — click to turn off' : 'OFF — click to turn on'}
            </button>
          </div>

          <p className="text-sm text-slate-500">
            The second hero on the home page rotates through these banners (15s each). Pick a
            style, write the text, choose the book category whose covers appear, and set the button link.
          </p>

          {rows.map((b, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Banner {i + 1}</span>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">↓</button>
                  <button onClick={() => remove(i)} className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">Remove</button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-500">Style
                  <select className={input} value={b.style} onChange={(e) => set(i, 'style', e.target.value)}>
                    {STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-500">Badge
                  <input className={input} value={b.badge} onChange={(e) => set(i, 'badge', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Headline
                  <input className={input} value={b.headline} onChange={(e) => set(i, 'headline', e.target.value)} placeholder="যেমন: ইতিহাস ও প্রবন্ধ" />
                </label>
                <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Subtext
                  <input className={input} value={b.subtext} onChange={(e) => set(i, 'subtext', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-slate-500">Button text
                  <input className={input} value={b.cta_text} onChange={(e) => set(i, 'cta_text', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-slate-500">Button link
                  <input className={input} value={b.cta_link} onChange={(e) => set(i, 'cta_link', e.target.value)} placeholder="/books/search?category=..." />
                </label>
                <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Book category slug (covers shown)
                  <input className={input} value={b.category} onChange={(e) => set(i, 'category', e.target.value)} placeholder="history / fiction / thriller / bengali-books" />
                </label>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button onClick={add} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-accent">+ Add banner</button>
            <button
              onClick={() => save({ banners: rows.filter((r) => r.headline.trim()) })}
              disabled={saving}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save banners'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

BannersPage.authenticate = { permissions: adminOnly };
BannersPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
