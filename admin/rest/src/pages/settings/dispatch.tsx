import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';
import {
  useDispatchCutoffQuery,
  useUpdateDispatchCutoffMutation,
} from '@/data/integrations';

const fld =
  'h-11 w-full rounded-lg border border-[#d8d8dc] bg-[#fafafb] px-3 text-[15px] font-medium outline-none focus:border-[#e63946] focus:bg-white focus:ring-4 focus:ring-[#e63946]/10';
const lab = 'mb-1.5 block text-xs font-semibold text-[#5f5f66]';
const card = 'mb-4 rounded-2xl border border-[#e6e6e8] bg-white p-6';

/** 18 -> "6:00 PM" — the same wall-clock the storefront counts down to. */
const pretty = (h: number) => {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${suffix}`;
};

export default function DispatchSettingsPage() {
  const { cutoffHour, loading } = useDispatchCutoffQuery();
  const { mutate: save, isLoading: saving } = useUpdateDispatchCutoffMutation();
  const [hour, setHour] = useState<number>(18);

  useEffect(() => {
    if (cutoffHour !== undefined && cutoffHour !== null) setHour(Number(cutoffHour));
  }, [cutoffHour]);

  return (
    <>
      <SettingsPageHeader pageTitle="Dispatch Cutoff" />

      <div className={card}>
        <h3 className="mb-1 text-base font-semibold text-heading">
          Next-day dispatch cutoff
        </h3>
        <p className="mb-5 text-sm text-body">
          The product page shows a live countdown — <em>&ldquo;Order within X hr Y min for
          next-day dispatch&rdquo;</em>. It counts down to this hour each day; once it passes,
          the countdown rolls over to the same hour tomorrow.
        </p>

        <div className="max-w-xs">
          <label className={lab} htmlFor="cutoff-hour">
            Cutoff hour (0–23, store local time)
          </label>
          <select
            id="cutoff-hour"
            className={fld}
            value={hour}
            disabled={loading || saving}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, '0')}:00 — {pretty(h)}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-body">
            Orders placed before <strong>{pretty(hour)}</strong> are advertised for next-day
            dispatch.
          </p>
        </div>

        <button
          onClick={() => save({ cutoff_hour: hour })}
          disabled={loading || saving}
          className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  );
}

DispatchSettingsPage.authenticate = { permissions: adminOnly };
DispatchSettingsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
