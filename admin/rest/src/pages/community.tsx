import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import {
  useReportedPostsQuery,
  useSetPostStatusMutation,
  useDeletePostAdminMutation,
} from '@/data/integrations';

const RED = '#e63946';

const imgUrl = (image: any): string | null => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  return image.original || image.thumbnail || null;
};

export default function CommunityModerationPage() {
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const { posts, total, loading } = useReportedPostsQuery(hiddenOnly);
  const { mutate: setStatus } = useSetPostStatusMutation();
  const { mutate: del } = useDeletePostAdminMutation();

  return (
    <div className="pb-10">
      <div
        className="mb-5 rounded-2xl border border-[#f4c4c8] p-6"
        style={{ background: 'linear-gradient(135deg,#fdf0f1,#fef7f2)' }}
      >
        <h1 className="text-xl font-bold text-slate-800">
          🛡️ কমিউনিটি মডারেশন
        </h1>
        <p className="mt-1 text-sm text-[#8a4048]">
          রিপোর্ট হওয়া বা লুকানো পোস্ট। ৫টি রিপোর্ট পেলে পোস্ট নিজে থেকেই লুকিয়ে
          যায় — এখান থেকে দেখে হাইড/আনহাইড বা মুছে ফেলা যায়।
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        {[
          [false, `রিপোর্ট হওয়া (${total})`],
          [true, 'শুধু লুকানো'],
        ].map(([k, l]) => (
          <button
            key={String(k)}
            onClick={() => setHiddenOnly(k as boolean)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ${
              hiddenOnly === k
                ? 'bg-[#2e1518] text-[#f2969d] ring-[#5a2b2f]'
                : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {l as string}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
        ) : posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            কোনো পোস্ট নেই।
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((p: any) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-800">
                      {p.user?.name || 'পাঠক'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.status === 'hidden'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {p.status === 'hidden' ? 'লুকানো' : 'লাইভ'}
                    </span>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                      🚩 {p.report_count}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'hidden' ? (
                      <button
                        onClick={() => setStatus({ id: p.id, status: 'published' })}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:border-emerald-300"
                      >
                        আনহাইড
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus({ id: p.id, status: 'hidden' })}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-amber-300 hover:text-amber-600"
                      >
                        হাইড
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('পোস্টটি স্থায়ীভাবে মুছবেন?')) del(p.id);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>

                {p.book && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-[12px] text-slate-600">
                    📖 {p.book.name}
                  </div>
                )}
                {p.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {p.body}
                  </p>
                )}
                {p.photos?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.photos.map((ph: any, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={imgUrl(ph) as string}
                        alt=""
                        className="h-20 w-20 rounded object-cover"
                      />
                    ))}
                  </div>
                )}

                {p.reports?.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    রিপোর্ট:{' '}
                    {p.reports
                      .map((r: any) => `${r.user || 'পাঠক'}${r.reason ? ` (${r.reason})` : ''}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

CommunityModerationPage.authenticate = { permissions: adminOnly };
CommunityModerationPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
