import Card from '@/components/ui/cards/card';
import Seo from '@/components/seo/seo';
import DashboardLayout from '@/layouts/_dashboard';
import Link from '@/components/ui/link';
import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';

export { getStaticProps } from '@/framework/general.ssr';

/**
 * "আমার ই-বুক" — the books this account may read. There is no download link anywhere by design:
 * opening a book streams watermarked page images from the server, one page at a time.
 */
const MyEbooksPage = () => {
  const { data, isLoading, isError, refetch } = useQuery(['my-ebooks'], () =>
    HttpClient.get<any>('my-ebooks'),
  );
  const ebooks: any[] = (data as any)?.ebooks ?? [];

  return (
    <>
      <Seo noindex={true} nofollow={true} />
      <Card className="relative w-full self-stretch shadow-none sm:shadow">
        <h1 className="mb-2 text-center text-lg font-semibold text-heading sm:text-xl">
          আমার ই-বুক
        </h1>
        <p className="mb-8 text-center text-sm text-body">
          কেনা ই-বুক এখানেই পড়ুন। ই-বুক ডাউনলোড বা শেয়ার করা যায় না।
        </p>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-body">লোড হচ্ছে…</p>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-body">
            <p>ই-বুক লোড করা যায়নি।</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : ebooks.length === 0 ? (
          <p className="py-16 text-center text-sm text-body">
            আপনি এখনো কোনো ই-বুক কেনেননি।
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ebooks.map((b) => (
              <Link
                key={b.product_id}
                href={`/ebooks/${b.product_id}`}
                className="group rounded-xl border border-border-200 p-3 transition hover:border-accent"
              >
                <div className="mb-3 aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-100">
                  {b?.image?.original ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image.original}
                      alt={b.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-heading group-hover:text-accent">
                  {b.name}
                </h3>
                <p className="mt-1 text-xs text-body">{b.page_count} পৃষ্ঠা</p>
                <span className="mt-2 inline-block text-xs font-semibold text-accent">
                  পড়া শুরু করুন →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

MyEbooksPage.authenticationRequired = true;

MyEbooksPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default MyEbooksPage;
