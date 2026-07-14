import DashboardLayout from '@/layouts/_dashboard';
import { useQuery } from 'react-query';
import Link from '@/components/ui/link';
import { HttpClient } from '@/framework/client/http-client';
import { useUser } from '@/framework/user';
import Seo from '@/components/seo/seo';
export { getStaticProps } from '@/framework/general.ssr';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  requested: { label: '⏳ আমরা দেখছি', bg: '#FAEEDA', fg: '#854F0B' },
  confirmed: { label: '✅ আনা যাবে', bg: '#EAF3DE', fg: '#3B6D11' },
  ordered: { label: '🎉 অর্ডার হয়েছে', bg: '#EAF3DE', fg: '#3B6D11' },
  declined: { label: '❌ আনা যাচ্ছে না', bg: '#FCEBEB', fg: '#A32D2D' },
};

export default function RequestsPage() {
  const { isAuthorized } = useUser();
  const { data, isLoading } = useQuery(
    ['restock-mine'],
    () => HttpClient.get<any>('restock-mine'),
    { enabled: isAuthorized },
  );

  const requests = (data as any)?.data ?? [];
  const quota = (data as any)?.quota;

  return (
    <>
      <Seo title="আমার রিকোয়েস্ট" url="requests" noindex />
      <div className="w-full">
        <h1 className="mb-2 text-lg font-semibold text-heading">আমার বইয়ের রিকোয়েস্ট</h1>
        <p className="mb-6 text-sm text-body">
          স্টকে নেই এমন যে বইগুলো আনতে বলেছেন, সেগুলোর অবস্থা এখানে দেখুন।
          {quota ? (
            <>
              {' '}
              আপনার <b>{quota.free_left ?? 0}টি</b> ফ্রি রিকোয়েস্ট বাকি আছে।
            </>
          ) : null}
        </p>

        {isLoading ? (
          <p className="text-body">লোড হচ্ছে…</p>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-border-200 p-8 text-center text-body">
            আপনি এখনো কোনো বইয়ের রিকোয়েস্ট করেননি। স্টকে নেই এমন বইয়ের পেজে গিয়ে
            "রিস্টক রিকোয়েস্ট" করতে পারবেন।
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => {
              const st = STATUS[r.status] ?? {
                label: r.status,
                bg: '#F1EFE8',
                fg: '#5F5E5A',
              };
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-border-200 p-4"
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image && (
                      <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${r.slug}`}
                      className="block truncate text-sm font-semibold text-heading hover:text-accent"
                    >
                      {r.name}
                    </Link>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                      {r.status === 'confirmed' && (
                        <span className="text-xs font-semibold text-accent">{bdt(r.price)}</span>
                      )}
                      {r.points > 0 && (
                        <span className="text-[11px] text-muted">{r.points} পয়েন্ট কাটা হয়েছে</span>
                      )}
                    </div>

                    {r.expected_date && r.status !== 'declined' && (
                      <p className="mt-1 text-[12px] font-semibold text-[#1f7a52]">
                        📅 আনুমানিক {r.expected_date}-এর মধ্যে আসবে
                        {r.eta_days ? ` (প্রায় ${r.eta_days} দিন)` : ''}
                      </p>
                    )}
                    {r.customer_note && (
                      <p className="mt-1 text-[12px] text-muted">💬 আপনার নোট: {r.customer_note}</p>
                    )}
                    {r.admin_note && (
                      <p className="mt-1 text-[12px] text-body">📌 {r.admin_note}</p>
                    )}
                  </div>

                  {r.status === 'confirmed' && (
                    <Link
                      href={`/products/${r.slug}`}
                      className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-white hover:bg-accent-hover"
                    >
                      প্রি-অর্ডার করুন (৫০% অগ্রিম)
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

RequestsPage.authenticationRequired = true;
RequestsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};
