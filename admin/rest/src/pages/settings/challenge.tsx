import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeading from '@/components/common/page-heading';
import Card from '@/components/common/card';
import { useEffect, useState } from 'react';
import {
  useChallengeSettingsQuery,
  useUpdateChallengeSettingsMutation,
} from '@/data/integrations';

const input =
  'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent';
const label = 'mb-1 block text-[11px] font-semibold uppercase text-slate-400';

const FIELDS = [
  { key: 'duration_sec', label: 'সময় (সেকেন্ড)', hint: 'চ্যালেঞ্জ কত সেকেন্ড চলবে' },
  { key: 'per_book_pct', label: 'প্রতি বইয়ে ছাড় (%)', hint: '১ বই = কত % ছাড়' },
  { key: 'cap_pct', label: 'সর্বোচ্চ ছাড় (%)', hint: 'যত বই-ই হোক, এর বেশি নয়' },
  { key: 'stake_points', label: 'বাজি (wallet পয়েন্ট)', hint: 'শুরুতে কাটা হবে; অর্ডার হলে ফেরত' },
  { key: 'coupon_minutes', label: 'কুপনের মেয়াদ (মিনিট)', hint: 'চ্যালেঞ্জ শেষে কত মিনিট ছাড় ধরে রাখবে' },
  { key: 'daily_limit', label: 'দিনে কতবার', hint: 'একজন কাস্টমার দিনে কতবার খেলতে পারবে' },
];

export default function ChallengeSettings() {
  const { config, loading } = useChallengeSettingsQuery();
  const { mutate: save, isLoading: saving } = useUpdateChallengeSettingsMutation();
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (config) setForm({ ...config });
  }, [config]);

  const maxBooks =
    Number(form.per_book_pct) > 0
      ? Math.ceil(Number(form.cap_pct) / Number(form.per_book_pct))
      : 0;

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <PageHeading title="১ মিনিট বই চ্যালেঞ্জ" />
        <p className="mt-1 text-sm text-slate-500">
          কাস্টমার চ্যালেঞ্জ শুরু করলে ওয়ালেট থেকে বাজি কাটা হয়। নির্দিষ্ট সময়ের মধ্যে যত আলাদা বই
          কার্টে দেবে, তত % ছাড় (সর্বোচ্চ সীমা পর্যন্ত)। অর্ডার সম্পন্ন করলে বাজির পয়েন্ট ফেরত পাবে;
          অর্ডার না করলে পয়েন্ট বাজেয়াপ্ত।
        </p>
      </Card>

      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <label className="mb-5 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={!!form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm font-semibold text-slate-700">
              চ্যালেঞ্জ চালু আছে
              {!form.enabled && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (বন্ধ থাকলে শপে দেখা যাবে না)
                </span>
              )}
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <span className={label}>{f.label}</span>
                <input
                  type="number"
                  step="0.5"
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={input}
                />
                <p className="mt-1 text-[11px] text-slate-400">{f.hint}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            এখনকার নিয়মে: <b>{form.duration_sec || 0} সেকেন্ডে</b> {maxBooks || 0} টি আলাদা বই দিলেই
            সর্বোচ্চ <b className="text-accent">{form.cap_pct || 0}% ছাড়</b>। বাজি{' '}
            <b>{form.stake_points || 0} পয়েন্ট</b>, দিনে <b>{form.daily_limit || 1} বার</b>।
          </p>

          <button
            onClick={() =>
              save({
                enabled: !!form.enabled,
                duration_sec: Number(form.duration_sec),
                per_book_pct: Number(form.per_book_pct),
                cap_pct: Number(form.cap_pct),
                stake_points: Number(form.stake_points),
                coupon_minutes: Number(form.coupon_minutes),
                daily_limit: Number(form.daily_limit),
              })
            }
            disabled={saving}
            className="mt-5 rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
          </button>
        </div>
      )}
    </>
  );
}

ChallengeSettings.authenticate = { permissions: adminOnly };
ChallengeSettings.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
