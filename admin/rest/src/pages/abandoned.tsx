import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useAbandonedCheckoutsQuery, useAbandonedContactedMutation } from '@/data/integrations';

const bdt = (n: any) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const RED = '#e63946';

export default function AbandonedPage() {
  const { items, total, value, loading } = useAbandonedCheckoutsQuery();
  const { mutate: markContacted, isLoading: marking } = useAbandonedContactedMutation();

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-2xl border border-[#f4c4c8] p-6" style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}>
        <h1 className="text-xl font-bold text-slate-800">🛒 চেকআউট ছেড়ে চলে গেছে</h1>
        <p className="mt-1 text-sm text-[#8a4048]">
          যারা চেকআউট পেজ পর্যন্ত এসেছিল কিন্তু অর্ডার করেনি। নক দিয়ে জিজ্ঞেস করুন — কোথায় আটকেছে, সাহায্য লাগবে কি না।
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px]">🧺 কার্ট: <b>{total}</b></span>
          <span className="rounded-lg border border-[#e6e6e8] bg-white px-3 py-2 text-[13px]">💰 সম্ভাব্য বিক্রি: <b style={{ color: RED }}>{bdt(value)}</b></span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">কেউ চেকআউট ছেড়ে যায়নি — চমৎকার! 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">কাস্টমার</th>
                  <th className="py-2 pr-3">বই</th>
                  <th className="py-2 pr-3">মূল্য</th>
                  <th className="py-2 pr-3">কতক্ষণ আগে</th>
                  <th className="py-2">নক</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r: any) => (
                  <tr key={r.id} className={`border-b border-slate-50 ${r.contacted ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-slate-700">{r.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.contact || r.email || '—'}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-[12px] text-slate-600">
                        {(r.items ?? []).slice(0, 2).map((i: any) => i.name).join(', ')}
                        {r.item_count > 2 ? ` +${r.item_count - 2}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400">{r.item_count}টি বই</div>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold" style={{ color: RED }}>{bdt(r.total)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{r.hours_ago}h</td>
                    <td className="py-2.5">
                      {r.contacted ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">✓ নক দেওয়া হয়েছে</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.contact && (
                            <a
                              href={`https://wa.me/88${String(r.contact).replace(/^\+?88/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                            >💬 WhatsApp</a>
                          )}
                          {r.contact && (
                            <a href={`tel:${r.contact}`} className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-400">📞 কল</a>
                          )}
                          <button
                            disabled={marking}
                            onClick={() => markContacted({ id: r.id })}
                            className="rounded px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                            style={{ background: RED }}
                          >✓ হয়েছে</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

AbandonedPage.authenticate = { permissions: adminOnly };
AbandonedPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
