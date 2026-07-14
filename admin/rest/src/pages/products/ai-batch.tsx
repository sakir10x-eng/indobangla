import AdminLayout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PageHeading from '@/components/common/page-heading';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useBatchExtractMutation,
  useListCrawlMutation,
  useAiCreateProductMutation,
} from '@/data/ai';

type Row = {
  index: number;
  status: 'success' | 'error';
  product?: any;
  message?: string;
  published?: boolean;
  publishing?: boolean;
  publishError?: string;
};

function errMsg(err: any, body?: any) {
  return (
    body?.errors?.[0]?.message ||
    body?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.message ||
    'Request failed. Check Settings → AI.'
  );
}

export default function AiBatchPage() {
  const { mutate: batch, isLoading: extracting } = useBatchExtractMutation();
  const { mutate: crawl, isLoading: crawling } = useListCrawlMutation();
  const { mutateAsync: createProduct } = useAiCreateProductMutation();

  const [listUrl, setListUrl] = useState('');
  const [limit, setLimit] = useState(10);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [publishingAll, setPublishingAll] = useState(false);

  function fetchList() {
    if (!listUrl) {
      toast.error('Enter a list/category page URL first.');
      return;
    }
    crawl(
      { list_url: listUrl, limit: Number(limit) || 10 },
      {
        onSuccess: (res: any) => {
          if (res?.urls?.length) {
            setRaw(res.urls.join('\n'));
            toast.success(`Found ${res.count} product links. Review, then Extract.`);
          } else {
            toast.error('No product links found on that page.');
          }
        },
        onError: (err: any) => toast.error(errMsg(err, err?.response?.data)),
      }
    );
  }

  function extractAll() {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 25);
    if (!lines.length) {
      toast.error('Add at least one URL (one per line, max 25).');
      return;
    }
    const items = lines.map((line) =>
      /\.(png|jpe?g|webp|gif)(\?|$)/i.test(line)
        ? { image_url: line }
        : { product_url: line }
    );
    batch(items, {
      onSuccess: (res: any) => {
        if (res?.results) {
          setRows(res.results);
          toast.success('Extracted. Review the books below, then publish.');
        } else {
          toast.error(errMsg(null, res));
        }
      },
      onError: (err: any) => toast.error(errMsg(err, err?.response?.data)),
    });
  }

  async function publishRow(i: number) {
    const row = rows[i];
    if (!row?.product || row.published) return;
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, publishing: true } : x)));
    try {
      const res: any = await createProduct(row.product);
      setRows((r) =>
        r.map((x, idx) =>
          idx === i ? { ...x, publishing: false, published: true, publishError: undefined } : x
        )
      );
      return res;
    } catch (err: any) {
      setRows((r) =>
        r.map((x, idx) =>
          idx === i
            ? { ...x, publishing: false, publishError: errMsg(err, err?.response?.data) }
            : x
        )
      );
    }
  }

  async function publishAllValid() {
    setPublishingAll(true);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status === 'success' && !rows[i].published) {
        // eslint-disable-next-line no-await-in-loop
        await publishRow(i);
      }
    }
    setPublishingAll(false);
    toast.success('Done publishing valid books.');
  }

  const validCount = rows.filter((r) => r.status === 'success' && !r.published).length;

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <div className="mb-5">
          <PageHeading title="AI Batch Upload" />
          <p className="mt-2 text-sm text-body">
            Import many books at once. Paste a listing/category page URL (e.g.
            https://www.anandapub.in/book-list) and how many you want — the AI
            finds the books, extracts each, and you review &amp; publish. Valid
            rows can be published in one click. Requires an API key in Settings →
            AI.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Input
            label="Listing page URL"
            value={listUrl}
            onChange={(e) => setListUrl(e.target.value)}
            placeholder="https://www.anandapub.in/book-list"
          />
          <Input
            label="How many"
            type="number"
            value={limit as any}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
          <Button type="button" onClick={fetchList} loading={crawling} disabled={crawling}>
            {crawling ? 'Finding…' : 'Find books'}
          </Button>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-body-dark">
            Product URLs (one per line, max 25) — auto-filled by “Find books”, or paste your own
          </label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={6}
            className="w-full rounded border border-border-base bg-white px-4 py-3 text-sm text-heading focus:border-accent focus:outline-none"
            placeholder={'https://anandapub.in/book-details/1010\nhttps://…/product/…'}
          />
        </div>
        <div className="mt-4 text-end">
          <Button type="button" onClick={extractAll} loading={extracting} disabled={extracting}>
            {extracting ? 'Extracting…' : 'Extract All with AI'}
          </Button>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-heading">
              Review ({rows.filter((r) => r.status === 'success').length} ok /{' '}
              {rows.length})
            </h3>
            <Button
              type="button"
              onClick={publishAllValid}
              loading={publishingAll}
              disabled={publishingAll || validCount === 0}
            >
              Publish all valid ({validCount})
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-200 text-left text-body-dark">
                  <th className="py-3 pe-3">#</th>
                  <th className="py-3 pe-3">Name</th>
                  <th className="py-3 pe-3">Price / Sale</th>
                  <th className="py-3 pe-3">Author</th>
                  <th className="py-3 pe-3">Status</th>
                  <th className="py-3 pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border-100 align-top">
                    <td className="py-3 pe-3">{(r.index ?? i) + 1}</td>
                    <td className="py-3 pe-3">{r.product?.name || '—'}</td>
                    <td className="py-3 pe-3">
                      {r.product?.price ?? '—'}
                      {r.product?.sale_price ? ` / ${r.product.sale_price}` : ''}
                    </td>
                    <td className="py-3 pe-3">
                      {r.product?.author?.name ||
                        (Array.isArray(r.product?.authors)
                          ? r.product.authors.join(', ')
                          : '—')}
                    </td>
                    <td className="py-3 pe-3">
                      {r.status !== 'success' ? (
                        <span className="text-red-500">{r.message || 'extract error'}</span>
                      ) : r.published ? (
                        <span className="font-semibold text-accent">published ✓</span>
                      ) : r.publishError ? (
                        <span className="text-red-500">{r.publishError}</span>
                      ) : (
                        <span className="text-body">ready</span>
                      )}
                    </td>
                    <td className="py-3 pe-3">
                      {r.status === 'success' && !r.published && (
                        <button
                          type="button"
                          onClick={() => publishRow(i)}
                          disabled={r.publishing}
                          className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                        >
                          {r.publishing ? 'Publishing…' : 'Publish'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

AiBatchPage.authenticate = {
  permissions: adminOnly,
};
AiBatchPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
