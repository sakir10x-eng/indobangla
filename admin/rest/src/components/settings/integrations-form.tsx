import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import OrderSmsSettings from '@/components/settings/order-sms-settings';
import { useState } from 'react';
import {
  useCourierSettingsQuery,
  useUpdateCourierMutation,
  useTestCourierMutation,
  usePaymentSettingsQuery,
  useUpdatePaymentMutation,
  useTestPaymentMutation,
  useReplygenieSettingsQuery,
  useUpdateReplygenieMutation,
  useTestReplygenieMutation,
} from '@/data/integrations';

function TestResult({ result }: { result: any }) {
  if (!result) return null;
  return (
    <span
      className={`text-xs font-semibold ${
        result.status === 'ok' ? 'text-status-complete' : 'text-red-500'
      }`}
    >
      {result.status === 'ok' ? (result.message || 'OK ✓') : result.message}
    </span>
  );
}

const COURIERS = [
  { key: 'redx', name: 'RedX', fields: ['token', 'base_url', 'pickup_store_id'] },
  { key: 'steadfast', name: 'Steadfast', fields: ['api_key', 'secret'] },
  { key: 'pathao', name: 'Pathao', fields: ['api_key', 'secret', 'base_url'] },
  { key: 'paperfly', name: 'Paperfly', fields: ['token', 'base_url'] },
  { key: 'sundarban', name: 'Sundarban', fields: ['token', 'base_url'] },
];

const PAYMENTS = [
  { key: 'bkash', name: 'bKash', fields: ['app_key', 'app_secret', 'username', 'password'] },
  { key: 'nagad', name: 'Nagad', fields: ['merchant_id', 'app_key', 'app_secret'] },
  { key: 'bank', name: 'Bank Transfer', fields: ['account'] },
];

// Friendly labels for our order statuses in the courier-status mapping dropdown.
const OUR_STATUS_LABELS: Record<string, string> = {
  'order-pending': 'Pending',
  'order-processing': 'Ready to ship',
  'order-at-local-facility': 'At facility',
  'order-shipped': 'Shipped',
  'order-out-for-delivery': 'Out for delivery',
  'order-in-transit': 'In transit',
  'order-on-hold': 'On-Hold',
  'order-completed': 'Delivered',
  'order-partial-delivered': 'Partial Delivered',
  'order-cancelled': 'Cancelled',
  'order-refunded': 'Refunded',
  'order-failed': 'Failed',
  'order-void': 'Void',
};

function CourierCard({ c, orderStatuses = [] }: { c: any; orderStatuses?: string[] }) {
  const { mutate: save, isLoading } = useUpdateCourierMutation();
  const { mutate: test, isLoading: testing } = useTestCourierMutation();
  const [form, setForm] = useState<any>({ enabled: !!c.enabled });
  const [result, setResult] = useState<any>(null);
  // RedX status → our-status overrides. Seed every known RedX status with its
  // effective value (saved override, else the built-in default) so a save always
  // sends the complete map — the backend replaces the whole thing.
  const [statusMap, setStatusMap] = useState<Record<string, string>>(() => {
    const defaults = c.status_defaults || {};
    const saved = c.status_map || {};
    const m: Record<string, string> = {};
    Object.keys(defaults).forEach((k) => {
      m[k] = k in saved ? saved[k] ?? '' : defaults[k] ?? '';
    });
    return m;
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const courier = COURIERS.find((x) => x.key === c.key)!;
  const savePayload = () => ({
    provider: c.key,
    ...form,
    ...(c.key === 'redx' ? { status_map: statusMap } : {}),
  });

  return (
    <div className="rounded-lg border border-border-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-heading">{courier.name}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={!!c.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4"
          />
          Enabled {c.has_token ? '· key saved' : ''}
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courier.fields.map((f) => (
          <Input
            key={f}
            label={f.replace('_', ' ')}
            type={f.includes('secret') || f === 'token' ? 'password' : 'text'}
            onChange={(e) => set(f, e.target.value)}
            placeholder={c.has_token ? '•••• (unchanged)' : ''}
          />
        ))}
      </div>
      {c.key === 'redx' && Object.keys(statusMap).length > 0 && (
        <div className="mt-4 rounded-md border border-border-200 p-3">
          <p className="text-sm font-semibold text-heading">
            RedX status → order status
          </p>
          <p className="mb-3 mt-0.5 text-xs text-body">
            RedX যে status পাঠায়, তার বিপরীতে আমাদের কোন order status বসবে সেটা বেছে দিন।
            “— No change —” দিলে ওই RedX status এলে আমাদের order status অপরিবর্তিত থাকবে।
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.keys(statusMap).map((rk) => (
              <label key={rk} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-heading">{rk}</span>
                <select
                  value={statusMap[rk]}
                  onChange={(e) =>
                    setStatusMap((m) => ({ ...m, [rk]: e.target.value }))
                  }
                  className="min-w-[9rem] rounded border border-border-200 bg-white px-2 py-1 text-xs"
                >
                  <option value="">— No change —</option>
                  {orderStatuses.map((os) => (
                    <option key={os} value={os}>
                      {OUR_STATUS_LABELS[os] || os}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button
          size="small"
          loading={isLoading}
          onClick={() => save(savePayload())}
        >
          Save
        </Button>
        <Button
          size="small"
          variant="outline"
          loading={testing}
          onClick={() =>
            test(c.key, { onSuccess: (r: any) => setResult(r) })
          }
        >
          Test connection
        </Button>
        {result && (
          <span
            className={`text-xs font-semibold ${
              result.status === 'ok' ? 'text-status-complete' : 'text-red-500'
            }`}
          >
            {result.status === 'ok' ? 'OK ✓' : result.message}
          </span>
        )}
      </div>
    </div>
  );
}

function PaymentCard({ p }: { p: any }) {
  const { mutate: save, isLoading } = useUpdatePaymentMutation();
  const { mutate: test, isLoading: testing } = useTestPaymentMutation();
  const [form, setForm] = useState<any>({ enabled: !!p.enabled, mode: p.mode || 'sandbox' });
  const [result, setResult] = useState<any>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const gw = PAYMENTS.find((x) => x.key === p.key)!;

  return (
    <div className="rounded-lg border border-border-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-heading">{gw.name}</p>
        <div className="flex items-center gap-3 text-sm">
          <select
            defaultValue={p.mode || 'sandbox'}
            onChange={(e) => set('mode', e.target.value)}
            className="rounded border border-border-base px-2 py-1 text-xs"
          >
            <option value="sandbox">sandbox</option>
            <option value="live">live</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              defaultChecked={!!p.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
              className="h-4 w-4"
            />
            Enabled {p.has_creds ? '· saved' : ''}
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gw.fields.map((f) => (
          <Input
            key={f}
            label={f.replace('_', ' ')}
            type={f.includes('secret') || f === 'password' ? 'password' : 'text'}
            onChange={(e) => set(f, e.target.value)}
            placeholder={p.has_creds ? '•••• (unchanged)' : ''}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="small" loading={isLoading} onClick={() => save({ gateway: p.key, ...form })}>
          Save
        </Button>
        <Button
          size="small"
          variant="outline"
          loading={testing}
          onClick={() => test(p.key, { onSuccess: (r: any) => setResult(r) })}
        >
          Test
        </Button>
        <TestResult result={result} />
      </div>
    </div>
  );
}

function ReplyGenieCard() {
  const { replygenie: rg, loading } = useReplygenieSettingsQuery();
  const { mutate: save, isLoading } = useUpdateReplygenieMutation();
  const { mutate: test, isLoading: testing } = useTestReplygenieMutation();
  const [form, setForm] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const copy = (v: string) => navigator?.clipboard?.writeText(v);

  if (loading) return <p>Loading…</p>;

  return (
    <div className="rounded-lg border border-border-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-heading">ReplyGenie / FB Messenger bot</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={!!rg?.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4"
          />
          Enabled
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Target shop slug"
          defaultValue={rg?.shop_slug}
          onChange={(e) => set('shop_slug', e.target.value)}
        />
        <Input
          label="Default delivery fee (৳)"
          type="number"
          defaultValue={rg?.delivery_fee}
          onChange={(e) => set('delivery_fee', e.target.value)}
        />
      </div>

      {/* Connect token */}
      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-body">
          Connect token — paste this into ReplyGenie
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-gray-100 px-3 py-2 text-xs text-heading">
            {rg?.connect_token || '— not generated yet — click Save —'}
          </code>
          {rg?.connect_token && (
            <Button size="small" variant="outline" onClick={() => copy(rg.connect_token)}>
              Copy
            </Button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-body">
          Send it as the <code>{rg?.auth_header || 'X-Connect-Token'}</code> header on every request.
        </p>
      </div>

      {/* Endpoints */}
      <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-body">
        <p>
          <b className="text-heading">Search products:</b>{' '}
          <code className="break-all">{rg?.endpoints?.product_search}</code>
        </p>
        <p>
          <b className="text-heading">Create order (POST):</b>{' '}
          <code className="break-all">{rg?.endpoints?.create_order}</code>
        </p>
        <p className="text-[11px]">
          Order body: <code>{`{ customer_name, customer_contact, address, items:[{id|sku|name, quantity}] }`}</code>
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button size="small" loading={isLoading} onClick={() => save(form)}>
          Save
        </Button>
        <Button
          size="small"
          variant="outline"
          loading={isLoading}
          onClick={() => save({ ...form, regenerate: true })}
        >
          Regenerate token
        </Button>
        <Button
          size="small"
          variant="outline"
          loading={testing}
          onClick={() => test(undefined as any, { onSuccess: (r: any) => setResult(r) })}
        >
          Test connection
        </Button>
        <TestResult result={result} />
      </div>
    </div>
  );
}

export default function IntegrationsForm() {
  const { couriers, loading } = useCourierSettingsQuery();
  const { payments, loading: pLoading } = usePaymentSettingsQuery();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap border-b border-dashed border-border-base pb-8">
        <Description
          title="Courier / Delivery"
          details="Connect Bangladeshi couriers. Paste each provider's access token/API key, save, then test the connection. Enter your own credentials — they are stored on your server only."
          className="w-full px-0 sm:w-4/12 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full space-y-4 sm:w-8/12 md:w-2/3">
          {loading ? <p>Loading…</p> : COURIERS.map((c) => (
            <CourierCard key={c.key} c={{ key: c.key, ...(couriers?.[c.key] || {}) }} orderStatuses={couriers?.order_statuses || []} />
          ))}
        </Card>
      </div>

      <div className="flex flex-wrap border-b border-dashed border-border-base pb-8">
        <Description
          title="Payment gateways"
          details="bKash, Nagad and bank transfer. Enter your merchant credentials and switch to live when ready."
          className="w-full px-0 sm:w-4/12 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full space-y-4 sm:w-8/12 md:w-2/3">
          {pLoading ? <p>Loading…</p> : PAYMENTS.map((p) => (
            <PaymentCard key={p.key} p={{ key: p.key, ...(payments?.[p.key] || {}) }} />
          ))}
        </Card>
      </div>

      <div className="flex flex-wrap border-b border-dashed border-border-base pb-8">
        <Description
          title="ReplyGenie / Messenger bot"
          details="Let your Facebook Messenger bot (ReplyGenie) search your catalogue and place orders. Enable it, copy the connect token into ReplyGenie, and point it at the endpoints shown here."
          className="w-full px-0 sm:w-4/12 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full space-y-4 sm:w-8/12 md:w-2/3">
          <ReplyGenieCard />
        </Card>
      </div>

      <div className="flex flex-wrap pb-8">
        <Description
          title="Order status SMS"
          details="প্রতিটি order status-এ গ্রাহক কী SMS পাবে সেটা নিজে লিখে On/Off করুন। Off থাকলে সেই status-এ কোনো SMS যায় না। যেকোনো সময় বদলানো যায়।"
          className="w-full px-0 sm:w-4/12 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full space-y-4 sm:w-8/12 md:w-2/3">
          <OrderSmsSettings />
        </Card>
      </div>
    </div>
  );
}
