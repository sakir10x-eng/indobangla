import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeading from '@/components/common/page-heading';
import Card from '@/components/common/card';
import { useEffect, useState } from 'react';
import {
  usePreorderSettingsQuery,
  useUpdatePreorderSettingsMutation,
} from '@/data/integrations';

const input =
  'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent';
const label = 'mb-1 block text-[11px] font-semibold uppercase text-slate-400';

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'in_rate', label: 'amazon.in রেট (INR → ৳)', hint: 'INR দামকে এই সংখ্যা দিয়ে গুণ করা হবে' },
  { key: 'com_rate', label: 'amazon.com রেট (USD → ৳)', hint: 'USD দামকে এই সংখ্যা দিয়ে গুণ করা হবে' },
  { key: 'weight_per_kg', label: 'ওজন চার্জ (৳ / কেজি)', hint: 'বইয়ের ওজন × এই হার, দামের সাথে যোগ হবে' },
  { key: 'delivery_fee', label: 'ডিফল্ট ডেলিভারি চার্জ (৳)', hint: '' },
  { key: 'advance_pct', label: 'ডিফল্ট অগ্রিম (%)', hint: '' },
  { key: 'eta_min_days', label: 'ডেলিভারি — সর্বনিম্ন দিন', hint: 'পেমেন্ট কনফার্মের পর থেকে' },
  { key: 'eta_max_days', label: 'ডেলিভারি — সর্বোচ্চ দিন', hint: '' },
  {
    key: 'pay_hours',
    label: 'পেমেন্ট লিংকের মেয়াদ (ঘণ্টা)',
    hint: 'Amazon-এ দাম দ্রুত বদলায় — মেয়াদ ছোট রাখুন',
  },
];

const TOKENS = '{name} {items} {total} {advance} {due} {eta} {link} {hours}';

export default function PreorderSettings() {
  const { config, loading } = usePreorderSettingsQuery();
  const { mutate: save, isLoading: saving } = useUpdatePreorderSettingsMutation();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config) {
      setForm({
        ...Object.fromEntries(
          FIELDS.map((f) => [f.key, String((config as any)[f.key] ?? '')]),
        ),
        msg_template: (config as any).msg_template ?? '',
      });
    }
  }, [config]);

  const sample = () => {
    const price = 500 * Number(form.in_rate || 0) + 0.5 * Number(form.weight_per_kg || 0);
    return Math.round(price);
  };

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <PageHeading title="প্রি-অর্ডার সেটিংস" />
        <p className="mt-1 text-sm text-slate-500">
          দাম = <b>Amazon দাম × রেট + ওজন × প্রতি-কেজি চার্জ</b>। লিংক amazon.in হলে INR রেট,
          amazon.com হলে USD রেট নিজে থেকেই বসবে।
        </p>
      </Card>

      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <span className={label}>{f.label}</span>
                <input
                  type="number"
                  step="0.01"
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={input}
                />
                {f.hint && <p className="mt-1 text-[11px] text-slate-400">{f.hint}</p>}
              </div>
            ))}
          </div>

          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            উদাহরণ: amazon.in-এ ৫০০ INR, ওজন ০.৫ কেজি →{' '}
            <b className="text-accent">৳{sample().toLocaleString('en-IN')}</b>
          </p>

          <div className="mt-6">
            <span className={label}>কাস্টমারকে পাঠানোর মেসেজ টেমপ্লেট</span>
            <textarea
              rows={12}
              value={form.msg_template ?? ''}
              onChange={(e) => setForm({ ...form, msg_template: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-accent"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              এই টোকেনগুলো নিজে থেকেই বসে যাবে: <b>{TOKENS}</b>। অর্ডার তৈরির পর মেসেজটা
              আরেকবার এডিট করার সুযোগ থাকবে।
            </p>
          </div>

          <button
            onClick={() =>
              save({
                ...Object.fromEntries(
                  FIELDS.map((f) => [f.key, Number(form[f.key])]),
                ),
                msg_template: form.msg_template ?? '',
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

PreorderSettings.authenticate = { permissions: adminOnly };
PreorderSettings.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
