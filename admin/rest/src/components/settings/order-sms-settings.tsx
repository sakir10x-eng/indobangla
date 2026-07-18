import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSettingsQuery, useUpdateSettingsMutation } from '@/data/settings';
import Button from '@/components/ui/button';

/**
 * Admin-editable customer SMS per order status. Whatever the admin turns on here
 * is exactly what the customer receives on that status change — no dev round-trip.
 * Saved to settings.options.orderStatusSms; the backend (OrderSmsTrait) reads it.
 */

// Statuses worth texting a customer about. Order mirrors the real flow.
const SMS_STATUSES: [string, string][] = [
  ['order-pending', 'Pending'],
  ['order-processing', 'Ready to ship'],
  ['order-shipped', 'Shipped'],
  ['order-out-for-delivery', 'Out for delivery'],
  ['order-in-transit', 'In transit'],
  ['order-on-hold', 'On-Hold'],
  ['order-completed', 'Delivered'],
  ['order-partial-delivered', 'Partial Delivered'],
  ['order-cancelled', 'Cancelled'],
];

// Starter text shown as a placeholder until the admin writes their own.
const SUGGESTED: Record<string, string> = {
  'order-pending': 'ইন্দো বাংলা: অর্ডার #{order} পেয়েছি, শীঘ্রই কনফার্ম করব। ধন্যবাদ।',
  'order-processing': 'ইন্দো বাংলা: অর্ডার #{order} কনফার্ম, শীঘ্রই কুরিয়ারে পাঠাব।',
  'order-completed': 'ইন্দো বাংলা: অর্ডার #{order} ডেলিভারি সম্পন্ন। ধন্যবাদ!',
};

const PLACEHOLDERS = ['{order}', '{name}', '{brand}', '{status}', '{total}', '{paid}', '{due}', '{courier}', '{tracking}'];

// A Bengali/Unicode SMS is 70 chars single-part, 67 per part when split; a plain
// ASCII SMS is 160 / 153. Any non-ASCII char forces the Unicode limit.
function segments(text: string) {
  const len = [...(text || '')].length;
  if (len === 0) return { len, seg: 0 };
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { len, seg: len <= single ? 1 : Math.ceil(len / multi) };
}

type Row = { enabled: boolean; template: string };

export default function OrderSmsSettings() {
  const { locale } = useRouter();
  const { settings } = useSettingsQuery({ language: locale as string });
  const options: any = (settings as any)?.options;
  const { mutate: updateSettings, isLoading } = useUpdateSettingsMutation();

  const [rows, setRows] = useState<Record<string, Row>>({});

  useEffect(() => {
    const saved = (options?.orderStatusSms as Record<string, Row>) || {};
    const next: Record<string, Row> = {};
    SMS_STATUSES.forEach(([key]) => {
      next[key] = {
        enabled: !!saved[key]?.enabled,
        template: saved[key]?.template ?? '',
      };
    });
    setRows(next);
  }, [options]);

  const set = (key: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [key]: { ...r[key], ...patch } }));

  const save = () => {
    if (!options) return; // never write a blank options object over the row
    updateSettings({ language: locale, options: { ...options, orderStatusSms: rows } } as any);
  };

  const enabledCount = Object.values(rows).filter((r) => r?.enabled && r?.template?.trim()).length;

  return (
    <div className="rounded-lg border border-border-200 p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-semibold text-heading">Order status → customer SMS</p>
        <span className="text-xs text-body">{enabledCount} active</span>
      </div>
      <p className="mb-3 text-xs text-body">
        প্রতিটি status-এ কী SMS যাবে নিজে লিখে On করুন — যেকোনো সময় বদলাতে পারবেন।
        Off থাকলে সেই status-এ কোনো SMS যায় না। প্লেসহোল্ডার:{' '}
        <span className="font-mono text-[11px] text-heading">{PLACEHOLDERS.join(' ')}</span>
      </p>

      <div className="space-y-3">
        {SMS_STATUSES.map(([key, label]) => {
          const row = rows[key] || { enabled: false, template: '' };
          const { len, seg } = segments(row.template);
          return (
            <div key={key} className="rounded-md border border-border-100 p-3">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-heading">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => set(key, { enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                {label}
                <span className="ml-1 font-mono text-[11px] text-body">{key}</span>
              </label>
              <textarea
                rows={2}
                value={row.template}
                placeholder={SUGGESTED[key] || 'এই status-এ যে SMS যাবে…'}
                onChange={(e) => set(key, { template: e.target.value })}
                className="w-full rounded border border-border-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-body">
                <span>
                  {len} chars · {seg} SMS segment{seg === 1 ? '' : 's'}
                  {seg >= 2 ? ' (2× খরচ)' : ''}
                </span>
                {SUGGESTED[key] && !row.template.trim() && (
                  <button
                    type="button"
                    onClick={() => set(key, { template: SUGGESTED[key] })}
                    className="font-medium text-accent hover:underline"
                  >
                    Use suggestion
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <Button size="small" loading={isLoading} onClick={save}>
          Save SMS settings
        </Button>
      </div>
    </div>
  );
}
