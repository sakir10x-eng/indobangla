import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  useClubSettingsQuery,
  useUpdateClubMutation,
  useMembershipSearchQuery,
  useMembershipAssignMutation,
  useMembershipCardActionMutation,
} from '@/data/integrations';
import { useEffect, useState } from 'react';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400';
const label = 'mb-1 block text-xs font-medium text-slate-500';
const btn =
  'rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60';

type Tier = {
  id?: string;
  name: string;
  main_fee: number;
  discount_fee: number;
  discount_pct: number;
  card_color: string;
  validity_years: number;
};

const blankTier = (): Tier => ({
  name: '',
  main_fee: 500,
  discount_fee: 300,
  discount_pct: 15,
  card_color: '#d4af37',
  validity_years: 1,
});

const money = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/* ---------------------------------------------------------------- card preview */
function CardPreview({ tier }: { tier: Tier }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md"
      style={{
        background: `linear-gradient(135deg, ${tier.card_color} 0%, rgba(0,0,0,0.55) 160%)`,
      }}
    >
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest opacity-90">
        <span>Readers’ Club</span>
        <span>📖</span>
      </div>
      <div className="mt-6 font-mono text-lg font-bold tracking-[0.3em]">• • • •  8 DIGIT</div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase opacity-70">{tier.name || 'Tier'} · saves</div>
          <div className="text-2xl font-extrabold">{tier.discount_pct}%</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase opacity-70">Fee · {tier.validity_years}yr</div>
          <div className="text-lg font-bold">
            {tier.main_fee > tier.discount_fee && (
              <span className="mr-1 text-xs line-through opacity-60">{money(tier.main_fee)}</span>
            )}
            {money(tier.discount_fee)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- member manager */
function MemberManager({ tiers }: { tiers: Tier[] }) {
  const [q, setQ] = useState('');
  const results = useMembershipSearchQuery(q);
  const { mutate: assign, isLoading: assigning } = useMembershipAssignMutation();
  const { mutate: cardAction, isLoading: acting } = useMembershipCardActionMutation();
  const busy = assigning || acting;

  const statusChip = (s?: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-slate-200 text-slate-600',
      banned: 'bg-red-100 text-red-700',
    };
    return map[s || ''] || 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Members</h3>
      <p className="mb-3 text-xs text-slate-400">
        Search a customer by name, email, phone or 8-digit card number to give a tier or
        suspend a card.
      </p>
      <input
        className={input}
        placeholder="Search customers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="mt-3 space-y-2">
        {q.trim().length > 1 && results.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-400">No customers found.</div>
        )}
        {results.map((u: any) => (
          <div
            key={u.id}
            className="rounded-lg border border-slate-100 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                <div className="text-xs text-slate-400">{u.email}</div>
                <div className="mt-0.5 font-mono text-xs tracking-widest text-slate-500">
                  💳 {u.membership_no || '—'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {u.membership_tier && (
                  <span className={`rounded-full px-2 py-0.5 font-medium ${statusChip(u.membership_status || 'active')}`}>
                    {(u.membership_status || 'active')}
                  </span>
                )}
                {u.membership_expires_at && (
                  <span className="text-slate-400">
                    exp {String(u.membership_expires_at).slice(0, 10)}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                value={u.membership_tier || ''}
                disabled={busy}
                onChange={(e) => assign({ user_id: u.id, tier: e.target.value })}
              >
                <option value="">— No tier —</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.discount_pct}%)
                  </option>
                ))}
              </select>

              {u.membership_tier && (
                <>
                  {u.membership_status !== 'banned' && (
                    <button
                      disabled={busy}
                      onClick={() => cardAction({ user_id: u.id, action: 'ban' })}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      Ban card
                    </button>
                  )}
                  {u.membership_status !== 'cancelled' && (
                    <button
                      disabled={busy}
                      onClick={() => cardAction({ user_id: u.id, action: 'cancel' })}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  )}
                  {(u.membership_status === 'cancelled' || u.membership_status === 'banned') && (
                    <button
                      disabled={busy}
                      onClick={() => cardAction({ user_id: u.id, action: 'reactivate' })}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Reactivate
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function ReadersClubPage() {
  const { club, loading } = useClubSettingsQuery();
  const { mutate: save, isLoading: saving } = useUpdateClubMutation();

  const [enabled, setEnabled] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([blankTier()]);
  const [rules, setRules] = useState('');

  useEffect(() => {
    if (club) {
      setEnabled(!!club.enabled);
      setTiers(
        Array.isArray(club.tiers) && club.tiers.length
          ? club.tiers.map((t: any) => ({ ...blankTier(), ...t }))
          : [blankTier()]
      );
      setRules(club.rules ?? '');
    }
  }, [club]);

  const patchTier = (i: number, key: keyof Tier, val: any) =>
    setTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, [key]: val } : t)));

  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <>
      <SettingsPageHeader pageTitle="Readers’ Club membership" />
      {loading ? (
        <div className="p-8 text-slate-500">Loading…</div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-6">
          {/* status */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Club open for new members
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Every customer already carries a unique 8-digit card number. Giving them a tier
              turns that number into a personal discount coupon — usable only from their own
              logged-in account.
            </p>
          </div>

          {/* tiers */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Membership tiers</h3>
              <button
                type="button"
                onClick={() => setTiers((ts) => [...ts, blankTier()])}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                + Add tier
              </button>
            </div>

            <div className="space-y-5">
              {tiers.map((t, i) => (
                <div key={i} className="grid gap-4 rounded-xl border border-slate-100 p-4 md:grid-cols-2">
                  <CardPreview tier={t} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={label}>Tier name</label>
                      <input
                        className={input}
                        placeholder="Gold"
                        value={t.name}
                        onChange={(e) => patchTier(i, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={label}>Main fee (৳)</label>
                      <input
                        type="number"
                        className={input}
                        value={t.main_fee}
                        onChange={(e) => patchTier(i, 'main_fee', num(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={label}>Discount fee (৳)</label>
                      <input
                        type="number"
                        className={input}
                        value={t.discount_fee}
                        onChange={(e) => patchTier(i, 'discount_fee', num(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={label}>Discount %</label>
                      <input
                        type="number"
                        className={input}
                        value={t.discount_pct}
                        onChange={(e) => patchTier(i, 'discount_pct', num(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={label}>Validity (years)</label>
                      <input
                        type="number"
                        min={1}
                        className={input}
                        value={t.validity_years}
                        onChange={(e) => patchTier(i, 'validity_years', num(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 flex items-end justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <label className={label}>Card color</label>
                          <input
                            type="color"
                            className="h-9 w-14 cursor-pointer rounded border border-slate-200"
                            value={t.card_color}
                            onChange={(e) => patchTier(i, 'card_color', e.target.value)}
                          />
                        </div>
                      </div>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTiers((ts) => ts.filter((_, idx) => idx !== i))}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* rules */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800">Rules &amp; regulations</h3>
            <p className="mb-2 text-xs text-slate-400">
              Shown to members on the club page. One rule per line.
            </p>
            <textarea
              className={`${input} min-h-[220px] font-[inherit] leading-relaxed`}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                save({
                  enabled,
                  rules,
                  tiers: tiers.filter((t) => t.name.trim() !== ''),
                })
              }
              disabled={saving}
              className={btn}
            >
              {saving ? 'Saving…' : 'Save club settings'}
            </button>
            <span className="text-xs text-slate-400">
              Saving re-issues every member’s card at the new rate.
            </span>
          </div>

          <MemberManager tiers={tiers.filter((t) => t.name.trim() !== '')} />
        </div>
      )}
    </>
  );
}

ReadersClubPage.authenticate = { permissions: adminOnly };
ReadersClubPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
