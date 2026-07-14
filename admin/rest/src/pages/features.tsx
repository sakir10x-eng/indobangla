import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from '@/components/ui/link';
import { useFeatureRegistryQuery } from '@/data/integrations';

const RED = '#e63946';

const DOT: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-rose-600',
};
const ROW: Record<string, string> = {
  ok: 'border-slate-100',
  warn: 'border-amber-200 bg-amber-50/40',
  fail: 'border-rose-300 bg-rose-50/60',
};
const LABEL: Record<string, string> = {
  ok: 'ঠিক আছে',
  warn: 'নজর দিন',
  fail: 'সমস্যা',
};

export default function FeaturesPage() {
  const { features, counts, checkedAt, loading, refetch, isFetching } = useFeatureRegistryQuery();

  // newest release first, and inside a day keep the areas together
  const byDate: Record<string, any[]> = {};
  features.forEach((f: any) => {
    (byDate[f.date] ??= []).push(f);
  });
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800">🧩 ফিচার রেজিস্ট্রি ও হেলথ</h1>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-[#e63946] px-3 py-1 text-xs font-semibold text-[#e63946] hover:bg-white disabled:opacity-50"
          >
            {isFetching ? 'চেক হচ্ছে…' : '↻ আবার চেক করুন'}
          </button>
        </div>
        <p className="mt-1 text-sm text-[#8a4048]">
          প্রতিটি ফিচার <b>সত্যিকারের প্রোব</b> দিয়ে যাচাই হয় (টেবিল / কলাম / সেটিং / টোকেন আছে কি না)।
          কোনোটা কাজ করতে না পারলে <b className="text-rose-600">লাল</b> দেখাবে।
        </p>
        {checkedAt && (
          <p className="mt-1 text-[11px] text-[#b06068]">শেষ চেক: {new Date(checkedAt).toLocaleString('en-GB')}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2.5">
          <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px]">
            মোট ফিচার: <b>{counts.total ?? 0}</b>
          </span>
          <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px] text-emerald-700">
            ✅ ঠিক আছে: <b>{counts.ok ?? 0}</b>
          </span>
          <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px] text-amber-700">
            ⚠️ নজর দিন: <b>{counts.warn ?? 0}</b>
          </span>
          <span
            className="rounded-lg border px-3 py-2 text-[13px]"
            style={
              counts.fail
                ? { borderColor: RED, background: '#fff', color: RED, fontWeight: 700 }
                : { borderColor: '#e6e6e8', background: '#fff', color: '#a0a0a6' }
            }
          >
            🔴 সমস্যা: <b>{counts.fail ?? 0}</b>
          </span>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
      ) : (
        dates.map((date) => (
          <div key={date} className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full bg-[#2e1518] px-3 py-1 font-mono text-[12px] font-bold text-[#f2969d]">
                {date}
              </span>
              <span className="text-[12px] text-slate-400">{byDate[date].length}টি ফিচার</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-2">
              {byDate[date].map((f: any) => (
                <div key={f.key} className={`rounded-xl border p-4 ${ROW[f.status]}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[f.status]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{f.name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                          v{f.version}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {f.area}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            f.status === 'ok'
                              ? 'bg-emerald-50 text-emerald-700'
                              : f.status === 'warn'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-600 text-white'
                          }`}
                        >
                          {LABEL[f.status]}
                        </span>
                      </div>
                      {f.detail && <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{f.detail}</p>}
                      {f.note && (
                        <p
                          className={`mt-1 text-[11.5px] font-medium ${
                            f.status === 'fail'
                              ? 'text-rose-700'
                              : f.status === 'warn'
                                ? 'text-amber-800'
                                : 'text-slate-400'
                          }`}
                        >
                          {f.status === 'fail' ? '🔴 ' : f.status === 'warn' ? '⚠️ ' : '· '}
                          {f.note}
                        </p>
                      )}
                    </div>
                    {f.admin && (
                      <Link
                        href={f.admin}
                        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#e63946] hover:text-[#e63946]"
                      >
                        খুলুন →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-500">
        <b className="text-slate-700">নতুন ফিচার যোগ করলে:</b> API-র{' '}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">FeatureRegistry.php</code>{' '}
        ফাইলে একটা এন্ট্রি যোগ করুন (নাম, ভার্সন, তারিখ, আর একটা <b>সত্যিকারের check</b>)। তাহলে সেটা এখানে
        তারিখ অনুযায়ী চলে আসবে আর লাইভ হেলথ চেক হবে — এই তালিকাটাই পরের আপডেটের সময় <b>মেমরি</b> হিসেবে কাজ করবে।
      </div>
    </div>
  );
}

FeaturesPage.authenticate = { permissions: adminOnly };
FeaturesPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: { ...(await serverSideTranslations(locale, ['form', 'common', 'table'])) },
});
