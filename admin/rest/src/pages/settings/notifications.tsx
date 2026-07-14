import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  useNotifySettingsQuery,
  useUpdateNotifyMutation,
  useTestNotifyMutation,
} from '@/data/integrations';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400';
const label = 'mb-1 block text-sm font-medium text-slate-600';

export default function NotificationsPage() {
  const { notify, loading } = useNotifySettingsQuery();
  const { mutate: save, isLoading: saving } = useUpdateNotifyMutation();
  const { mutate: test, isLoading: testing } = useTestNotifyMutation();

  const [tg, setTg] = useState({ enabled: false, bot_token: '', chat_id: '' });
  const [wa, setWa] = useState<any>({
    enabled: false, provider: 'twilio', sid: '', token: '', from: '', to: '', phone_id: '',
  });

  useEffect(() => {
    if (notify) {
      setTg({
        enabled: !!notify.telegram?.enabled,
        bot_token: notify.telegram?.bot_token ?? '',
        chat_id: notify.telegram?.chat_id ?? '',
      });
      setWa({
        enabled: !!notify.whatsapp?.enabled,
        provider: notify.whatsapp?.provider ?? 'twilio',
        sid: notify.whatsapp?.sid ?? '',
        token: notify.whatsapp?.token ?? '',
        from: notify.whatsapp?.from ?? '',
        to: notify.whatsapp?.to ?? '',
        phone_id: notify.whatsapp?.phone_id ?? '',
      });
    }
  }, [notify]);

  const onSave = () => save({ telegram: tg, whatsapp: wa });
  const onTest = () =>
    test(undefined, {
      onSuccess: () => toast.success('Test sent — check your Telegram/WhatsApp'),
      onError: (e: any) => toast.error(e?.response?.data?.message || 'Test failed'),
    });

  return (
    <>
      <SettingsPageHeader pageTitle="Order Notifications (Telegram / WhatsApp)" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-8 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          {/* Telegram */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Telegram</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tg.enabled}
                  onChange={(e) => setTg({ ...tg, enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Create a bot via @BotFather to get the token, and get your chat ID from @userinfobot.
              New orders, status changes and agent actions are sent here.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>Bot token</label>
                <input
                  className={input}
                  placeholder="8123456789:AAF..."
                  value={tg.bot_token}
                  onChange={(e) => setTg({ ...tg, bot_token: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Chat ID</label>
                <input
                  className={input}
                  placeholder="123456789"
                  value={tg.chat_id}
                  onChange={(e) => setTg({ ...tg, chat_id: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="border-t border-slate-100 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">WhatsApp</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wa.enabled}
                  onChange={(e) => setWa({ ...wa, enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Provider</label>
                <select
                  className={input}
                  value={wa.provider}
                  onChange={(e) => setWa({ ...wa, provider: e.target.value })}
                >
                  <option value="twilio">Twilio</option>
                  <option value="meta">Meta Cloud API</option>
                </select>
              </div>
              <div>
                <label className={label}>Recipient (to)</label>
                <input
                  className={input}
                  placeholder="+8801XXXXXXXXX"
                  value={wa.to}
                  onChange={(e) => setWa({ ...wa, to: e.target.value })}
                />
              </div>
              {wa.provider === 'twilio' ? (
                <>
                  <div>
                    <label className={label}>Account SID</label>
                    <input className={input} value={wa.sid} onChange={(e) => setWa({ ...wa, sid: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Auth token</label>
                    <input className={input} value={wa.token} onChange={(e) => setWa({ ...wa, token: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>From (WhatsApp number)</label>
                    <input className={input} placeholder="+14155238886" value={wa.from} onChange={(e) => setWa({ ...wa, from: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={label}>Phone number ID</label>
                    <input className={input} value={wa.phone_id} onChange={(e) => setWa({ ...wa, phone_id: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Access token</label>
                    <input className={input} value={wa.token} onChange={(e) => setWa({ ...wa, token: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onTest}
              disabled={testing}
              className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-400 disabled:opacity-60"
            >
              {testing ? 'Sending…' : 'Send test'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

NotificationsPage.authenticate = { permissions: adminOnly };
NotificationsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
