import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useImageSizesQuery, useUpdateImageSizesMutation } from '@/data/integrations';
import { useEffect, useState } from 'react';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400';

const DEFAULTS = { single_max: 200, fbt_h: 128, home_cols: 5, home_card_style: 'mindful' as 'mindful' | 'classic' };

type NumKey = 'single_max' | 'fbt_h' | 'home_cols';
const FIELDS: { key: NumKey; label: string; hint: string; min: number; max: number; unit: string }[] = [
  { key: 'single_max', label: 'Single product cover — max width', hint: 'The book cover on the product page (100–480px).', min: 100, max: 480, unit: 'px' },
  { key: 'fbt_h', label: 'Frequently-bought cover — height', hint: 'The small covers in the “Frequently bought together” row (72–320px).', min: 72, max: 320, unit: 'px' },
  { key: 'home_cols', label: 'Home “All books” — columns (desktop)', hint: 'Fewer columns = larger covers on the home grid (3–8).', min: 3, max: 8, unit: 'cols' },
];

export default function ImageSizesPage() {
  const { sizes, loading } = useImageSizesQuery();
  const { mutate: save, isLoading: saving } = useUpdateImageSizesMutation();
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    if (sizes) {
      setForm({
        single_max: Number(sizes.single_max) || DEFAULTS.single_max,
        fbt_h: Number(sizes.fbt_h) || DEFAULTS.fbt_h,
        home_cols: Number(sizes.home_cols) || DEFAULTS.home_cols,
        home_card_style: sizes.home_card_style === 'classic' ? 'classic' : 'mindful',
      });
    }
  }, [sizes]);

  const clamp = (k: NumKey, v: number) => {
    const f = FIELDS.find((x) => x.key === k)!;
    return Math.max(f.min, Math.min(f.max, v || f.min));
  };

  return (
    <>
      <SettingsPageHeader pageTitle="Storefront image sizes" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Manually control how large book images appear across the storefront.
            Leave the defaults for the standard look.
          </p>

          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="grid grid-cols-[1fr_120px] items-center gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700">{f.label}</div>
                  <div className="text-xs text-slate-400">{f.hint}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    className={input}
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                    onBlur={(e) => setForm((s) => ({ ...s, [f.key]: clamp(f.key, Number(e.target.value)) }))}
                  />
                  <span className="text-xs text-slate-400">{f.unit}</span>
                </div>
              </div>
            ))}

            {/* Home product-card design */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-slate-100 pt-4">
              <div>
                <div className="text-sm font-medium text-slate-700">Home product-card design</div>
                <div className="text-xs text-slate-400">
                  “Mindful Reads” = the new card (rating, hook, stock urgency, red CTA).
                  “Classic” = the previous simple card.
                </div>
              </div>
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm font-medium">
                {(['mindful', 'classic'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setForm((s) => ({ ...s, home_card_style: v }))}
                    className={`rounded-md px-4 py-1.5 transition ${
                      form.home_card_style === v
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {v === 'mindful' ? 'Mindful (new)' : 'Classic (previous)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                save({
                  single_max: clamp('single_max', form.single_max),
                  fbt_h: clamp('fbt_h', form.fbt_h),
                  home_cols: clamp('home_cols', form.home_cols),
                  home_card_style: form.home_card_style,
                })
              }
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save image sizes'}
            </button>
            <button
              onClick={() => setForm(DEFAULTS)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-400"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </>
  );
}

ImageSizesPage.authenticate = { permissions: adminOnly };
ImageSizesPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
