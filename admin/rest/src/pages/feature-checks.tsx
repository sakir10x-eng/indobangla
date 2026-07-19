import Layout from '@/components/layouts/admin';
import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { adminOnly } from '@/utils/auth-utils';
import { useMemo, useState } from 'react';
import PageHeading from '@/components/common/page-heading';
import {
  useFeatureChecksQuery,
  useSetFeatureCheckMutation,
} from '@/data/integrations';

const MARK: Record<string, { label: string; chip: string; dot: string }> = {
  passed: { label: '✓ ঠিক আছে', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-300', dot: 'bg-emerald-500' },
  failed: { label: '✕ কাজ করে না', chip: 'bg-rose-50 text-rose-700 ring-rose-300', dot: 'bg-rose-500' },
  untested: { label: '— দেখা হয়নি', chip: 'bg-slate-100 text-slate-500 ring-slate-300', dot: 'bg-slate-300' },
};

/** Short, readable date — the exact second is noise on a checklist. */
const when = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

// Any unknown / null status falls back to "untested" — a stray value must never crash the board
// (MARK[undefined].chip was the client-side exception).
const mark = (s?: string | null) => MARK[(s as string) in MARK ? (s as string) : 'untested'];

export default function FeatureChecksPage() {
  const { items, tally, env, loading, error } = useFeatureChecksQuery();
  const { mutate: setCheck, isLoading: saving } = useSetFeatureCheckMutation();
  const [only, setOnly] = useState<'all' | 'nobody' | 'no-human'>('all');

  const shown = useMemo(
    () =>
      (items ?? []).filter((i: any) =>
        only === 'nobody'
          ? i.ai_staging_status === 'untested' && i.ai_live_status === 'untested' && i.human_status === 'untested'
          : only === 'no-human'
          ? i.human_status === 'untested'
          : true,
      ),
    [items, only],
  );

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    shown.forEach((i: any) => (g[i.area_label] = [...(g[i.area_label] ?? []), i]));
    return g;
  }, [shown]);

  if (error) return <ErrorMessage message={error.message} />;
  if (loading) return <Loader text="লোড হচ্ছে..." />;

  const cycle = (cur: string) => (cur === 'untested' ? 'passed' : cur === 'passed' ? 'failed' : 'untested');

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageHeading title="🧪 ফিচার টেস্ট বোর্ড" />
        {/* Live and staging keep separate databases, so a tick here describes this site only. */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            env === 'production'
              ? 'bg-rose-50 text-rose-700 ring-rose-300'
              : 'bg-amber-50 text-amber-700 ring-amber-300'
          }`}
        >
          {env === 'production' ? '🔴 লাইভ সাইট' : `🟡 ${env}`}
        </span>
      </div>

      {tally && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['মোট ফিচার', tally.total, 'text-slate-700'],
            ['AI — staging', `${tally.ai_staging_pass}/${tally.total}`, 'text-amber-700'],
            ['AI — live', `${tally.ai_live_pass}/${tally.total}`, 'text-sky-700'],
            ['আপনি দেখেছেন', `${tally.human_pass}/${tally.total}`, tally.human_pass === 0 ? 'text-rose-600' : 'text-emerald-700'],
          ].map(([label, val, tone]: any, i: number) => (
            <div key={i} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className={`mt-0.5 text-lg font-extrabold ${tone}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ['all', 'সব'],
          ['no-human', 'আপনি যেগুলো দেখেননি'],
          ['nobody', 'কেউই দেখেনি'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setOnly(k as any)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ring-1 transition ${
              only === k ? 'bg-slate-800 text-white ring-slate-800' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-4 rounded-xl bg-sky-50 px-3 py-2.5 text-[12px] text-sky-900 ring-1 ring-sky-200">
        <b>AI staging</b> = promote করার আগে Claude স্টেজিংয়ে যা চালিয়েছে। <b>AI live</b> = promote করার পর
        লাইভে আবার যা যাচাই করেছে — দুটো আলাদা, কারণ স্টেজিংয়ে পাস করা মানে লাইভে পাস করা নয়। <b>আপনার চেক</b> =
        আপনি নিজে ক্লিক করে দেখেছেন; চাপ দিলে ✓ → ✕ → — বদলায়। প্রতিটা টিকের পাশে ঠিক কী চালানো হয়েছে সেটা লেখা —
        নোট ছাড়া টিক মানে শুধু দাবি, প্রমাণ নয়।
      </p>

      <div className="space-y-5">
        {Object.entries(grouped).map(([area, rows]) => (
          <div key={area}>
            <div className="mb-2 text-sm font-bold text-slate-700">{area}</div>
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              {rows.map((i: any, n: number) => (
                <div
                  key={i.key}
                  className={`flex flex-col gap-3 bg-white p-3 sm:flex-row sm:items-start ${
                    n > 0 ? 'border-t border-slate-100' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-800">{i.title}</div>
                    {/* The click path, not the feature name again — a checklist you can't act on gets ignored. */}
                    <div className="mt-0.5 text-[11px] text-slate-500">📍 {i.where}</div>
                    {i.ai_staging_note && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        <b className="text-amber-700">staging:</b> {i.ai_staging_note}
                      </div>
                    )}
                    {i.ai_live_note && (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        <b className="text-sky-700">live:</b> {i.ai_live_note}
                      </div>
                    )}
                    {i.human_note && (
                      <div className="mt-0.5 text-[11px] text-emerald-700">
                        <b>আপনি:</b> {i.human_note}
                        {i.human_by ? ` — ${i.human_by}` : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    {([
                      ['AI · staging', i.ai_staging_status, i.ai_staging_at],
                      ['AI · live', i.ai_live_status, i.ai_live_at],
                    ] as any[]).map(([label, status, at]) => (
                      <div key={label} className="w-[118px]">
                        <div className="mb-0.5 text-[10px] font-bold uppercase text-slate-400">{label}</div>
                        <span
                          className={`inline-flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ring-1 ${mark(status).chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${mark(status).dot}`} />
                          {mark(status).label}
                          {at ? <span className="ml-auto font-normal opacity-60">{when(at)}</span> : null}
                        </span>
                      </div>
                    ))}

                    <div className="w-[124px]">
                      <div className="mb-0.5 text-[10px] font-bold uppercase text-slate-400">আপনার চেক</div>
                      <button
                        disabled={saving}
                        onClick={() =>
                          setCheck({
                            key: i.key,
                            column: 'human',
                            status: cycle(i.human_status) as any,
                            note:
                              cycle(i.human_status) === 'failed'
                                ? window.prompt('কী সমস্যা হলো?') || undefined
                                : undefined,
                          })
                        }
                        className={`inline-flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ring-1 transition hover:brightness-95 ${mark(i.human_status).chip}`}
                        title="চাপ দিন: ✓ → ✕ → —"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${mark(i.human_status).dot}`} />
                        {mark(i.human_status).label}
                        {i.human_checked_at ? (
                          <span className="ml-auto font-normal opacity-60">{when(i.human_checked_at)}</span>
                        ) : null}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-200">
            এই ফিল্টারে কিছু নেই — সব দেখা হয়ে গেছে ✓
          </div>
        )}
      </div>
    </div>
  );
}

FeatureChecksPage.authenticate = { permissions: adminOnly };
FeatureChecksPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
