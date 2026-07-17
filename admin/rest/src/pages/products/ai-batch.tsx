import AdminLayout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PageHeading from '@/components/common/page-heading';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useBatchExtractMutation,
  useListCrawlMutation,
  useAiCreateProductMutation,
  useDuplicateCheckMutation,
  useAiUpdateProductMutation,
} from '@/data/ai';
import { useShopsQuery } from '@/data/shop';
import type {
  DuplicateMatch,
  DuplicateResult,
  UpdatableField,
} from '@/data/client/ai';

type Row = {
  index: number;
  status: 'success' | 'error';
  product?: any;
  message?: string;
  published?: boolean;
  publishing?: boolean;
  publishError?: string;
  /** Which shop this book gets created in. Seeded from the batch-level pick, overridable per row. */
  shopId?: number;
  /** Set by the duplicate check. `dupe` = ISBN/slug hit; `probable` = title-only hit. */
  dupe?: boolean;
  probable?: boolean;
  matches?: DuplicateMatch[];
  updated?: string[];
};

const REASON_LABEL: Record<DuplicateMatch['reason'], string> = {
  isbn: 'same ISBN',
  slug: 'same slug',
  name: 'similar title',
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
  const { mutateAsync: checkDupes, isLoading: checking } =
    useDuplicateCheckMutation();
  const { mutateAsync: updateProduct } = useAiUpdateProductMutation();

  const [listUrl, setListUrl] = useState('');
  const [limit, setLimit] = useState(10);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [publishingAll, setPublishingAll] = useState(false);
  /** Row index whose "update the existing book instead" panel is open. */
  const [openPanel, setOpenPanel] = useState<number | null>(null);
  /** Row whose full-data preview is expanded (independent of the dup panel). */
  const [previewRow, setPreviewRow] = useState<number | null>(null);
  /** Batch-level shop. Rows inherit it, and each row can still be pointed elsewhere. */
  const [shopId, setShopId] = useState<number | ''>('');

  const { shops } = useShopsQuery({ limit: 200 });
  const shopName = (id?: number) =>
    shops.find((s: any) => s.id === id)?.name ?? 'Default shop';

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
            // The API now explains *why* it found nothing (reader throttled vs
            // page genuinely empty) — surface that instead of a generic line.
            toast.error(res?.message || 'No product links found on that page.', {
              autoClose: 8000,
            });
          }
        },
        onError: (err: any) => toast.error(errMsg(err, err?.response?.data)),
      }
    );
  }

  /**
   * Ask the API which extracted books we already sell and fold the verdict into
   * the rows. Never throws outward: a failed check must not cost the admin the
   * extraction they just paid the AI for — they can retry with the button.
   */
  async function runDuplicateCheck(current: Row[]) {
    const payload = current
      .filter((r) => r.status === 'success' && r.product?.name)
      .map((r, i) => ({ ...r.product, index: r.index ?? i }));
    if (!payload.length) return;
    try {
      const res: any = await checkDupes(payload);
      const byIndex = new Map<number, DuplicateResult>(
        (res?.results ?? []).map(
          (d: DuplicateResult): [number, DuplicateResult] => [d.index, d]
        )
      );
      setRows((rs) =>
        rs.map((r, i) => {
          const d = byIndex.get(r.index ?? i);
          if (!d) return r;
          return {
            ...r,
            dupe: d.duplicate,
            probable: d.probable,
            matches: d.matches,
          };
        })
      );
      const dupes = (res?.results ?? []).filter(
        (d: DuplicateResult) => d.duplicate || d.probable
      ).length;
      if (dupes) {
        toast.warn(
          `${dupes} of these look like books you already sell — they are skipped by "Publish all".`
        );
      }
    } catch (err: any) {
      toast.error(`Duplicate check failed: ${errMsg(err, err?.response?.data)}`);
    }
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
          // Seed every row with the batch-level shop; the row select can still move it.
          const seeded: Row[] = res.results.map((r: Row) => ({
            ...r,
            shopId: shopId === '' ? undefined : shopId,
          }));
          setRows(seeded);
          setOpenPanel(null);
          toast.success('Extracted. Checking for books you already have…');
          runDuplicateCheck(seeded);
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
      const res: any = await createProduct({
        ...row.product,
        // Omitted entirely when unset, so the API keeps using its own default shop.
        ...(row.shopId ? { shop_id: row.shopId } : {}),
      });
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

  async function applyUpdate(i: number, match: DuplicateMatch, fields: UpdatableField[]) {
    const row = rows[i];
    if (!row?.product || !fields.length) return;
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, publishing: true } : x)));
    try {
      const res: any = await updateProduct({
        product_id: match.id,
        fields,
        product: row.product,
      });
      setRows((r) =>
        r.map((x, idx) =>
          idx === i
            ? {
                ...x,
                publishing: false,
                published: true,
                updated: res?.updated ?? fields,
                publishError: undefined,
              }
            : x
        )
      );
      setOpenPanel(null);
      toast.success(`Updated “${match.name}” (${(res?.updated ?? fields).join(', ')}).`);
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

  /**
   * Anything flagged is skipped — including title-only suspicions. Skipping is a
   * click to undo; a duplicate loose in an 8,000-book catalogue is not.
   */
  const isPublishable = (r: Row) =>
    r.status === 'success' && !r.published && !r.dupe && !r.probable;

  async function publishAllValid() {
    setPublishingAll(true);
    for (let i = 0; i < rows.length; i++) {
      if (isPublishable(rows[i])) {
        // eslint-disable-next-line no-await-in-loop
        await publishRow(i);
      }
    }
    setPublishingAll(false);
    toast.success('Done publishing valid books.');
  }

  const validCount = rows.filter(isPublishable).length;
  const flaggedCount = rows.filter((r) => !r.published && (r.dupe || r.probable)).length;

  return (
    <>
      <Card className="mb-6 flex flex-col">
        <div className="mb-5">
          <PageHeading title="AI Batch Upload" />
          <p className="mt-2 text-sm text-body">
            Import many books at once. Paste a listing/category page URL (e.g.
            https://www.anandapub.in/book-list) and how many you want — the AI
            finds the books, extracts each, and you review &amp; publish. Every
            row is checked against the catalogue first, so books you already sell
            are flagged instead of added twice. Requires an API key in Settings →
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

        {/* Asked up front, before a single book is extracted — but only a default:
            every row keeps its own select, so this is never a decision you are stuck with. */}
        <div className="mt-5 rounded border border-border-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-semibold text-body-dark">
            Which shop should these books go to?
          </label>
          <select
            value={shopId}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              setShopId(v);
              // Move only the rows still riding the batch default, so a row the admin
              // deliberately pointed somewhere else is left where they put it.
              setRows((rs) =>
                rs.map((r) =>
                  r.published || r.shopId !== (shopId === '' ? undefined : shopId)
                    ? r
                    : { ...r, shopId: v === '' ? undefined : v },
                ),
              );
            }}
            className="h-12 w-full max-w-md rounded border border-border-base bg-white px-4 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">Default shop (IndoBangla Store)</option>
            {shops.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_active ? '' : ' — inactive'}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-body">
            You can change this any time, and set a different shop per book in the
            review table below.
          </p>
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-heading">
                Review ({rows.filter((r) => r.status === 'success').length} ok /{' '}
                {rows.length})
              </h3>
              {checking ? (
                <p className="mt-1 text-xs text-body">Checking for duplicates…</p>
              ) : flaggedCount > 0 ? (
                <p className="mt-1 text-xs text-body">
                  {flaggedCount} already in the catalogue — publish is skipped, but you
                  can update the existing book instead.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => runDuplicateCheck(rows)}
                loading={checking}
                disabled={checking || !rows.some((r) => r.status === 'success')}
              >
                Re-check duplicates
              </Button>
              <Button
                type="button"
                onClick={publishAllValid}
                loading={publishingAll}
                disabled={publishingAll || checking || validCount === 0}
              >
                Publish all valid ({validCount})
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-200 text-left text-body-dark">
                  <th className="py-3 pe-3">#</th>
                  <th className="py-3 pe-3">Name</th>
                  <th className="py-3 pe-3">Price / Sale</th>
                  <th className="py-3 pe-3">Author</th>
                  <th className="py-3 pe-3">Shop</th>
                  <th className="py-3 pe-3">Status</th>
                  <th className="py-3 pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <BatchRow
                    key={i}
                    row={r}
                    i={i}
                    shops={shops}
                    shopName={shopName}
                    open={openPanel === i}
                    onToggle={() => setOpenPanel(openPanel === i ? null : i)}
                    previewOpen={previewRow === i}
                    onPreview={() => setPreviewRow(previewRow === i ? null : i)}
                    onProductPatch={(patch) =>
                      setRows((rs) =>
                        rs.map((x, idx) =>
                          idx === i ? { ...x, product: { ...x.product, ...patch } } : x,
                        ),
                      )
                    }
                    onPublish={() => publishRow(i)}
                    onUpdate={(m, f) => applyUpdate(i, m, f)}
                    onShopChange={(id) =>
                      setRows((rs) =>
                        rs.map((x, idx) => (idx === i ? { ...x, shopId: id } : x)),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function BatchRow({
  row: r,
  i,
  shops,
  shopName,
  open,
  onToggle,
  previewOpen,
  onPreview,
  onProductPatch,
  onPublish,
  onUpdate,
  onShopChange,
}: {
  row: Row;
  i: number;
  shops: any[];
  shopName: (id?: number) => string;
  open: boolean;
  onToggle: () => void;
  previewOpen: boolean;
  onPreview: () => void;
  onProductPatch: (patch: Record<string, any>) => void;
  onPublish: () => void;
  onUpdate: (match: DuplicateMatch, fields: UpdatableField[]) => void;
  onShopChange: (id: number | undefined) => void;
}) {
  const flagged = !!(r.dupe || r.probable);
  return (
    <>
      <tr
        className={`border-b border-border-100 align-top ${
          flagged && !r.published ? 'bg-amber-50/60' : ''
        }`}
      >
        <td className="py-3 pe-3">{(r.index ?? i) + 1}</td>
        <td className="py-3 pe-3">
          <div>{r.product?.name || '—'}</div>
          {/* Every successful row can be opened in full before it's published — the
              table only shows a handful of columns, and a book is worth a look first. */}
          {r.status === 'success' && (
            <button
              type="button"
              onClick={onPreview}
              className="mt-0.5 text-xs font-semibold text-accent hover:underline"
            >
              {previewOpen ? '▾ Hide details' : '▸ Preview full data'}
            </button>
          )}
        </td>
        <td className="py-3 pe-3">
          {r.product?.price ?? '—'}
          {r.product?.sale_price ? ` / ${r.product.sale_price}` : ''}
        </td>
        <td className="py-3 pe-3">
          {r.product?.author?.name ||
            (Array.isArray(r.product?.authors) ? r.product.authors.join(', ') : '—')}
        </td>
        <td className="py-3 pe-3">
          {r.published ? (
            // Frozen once created — the select would imply it can still be moved.
            <span className="text-xs text-body">{shopName(r.shopId)}</span>
          ) : (
            <select
              value={r.shopId ?? ''}
              onChange={(e) =>
                onShopChange(e.target.value === '' ? undefined : Number(e.target.value))
              }
              disabled={r.status !== 'success' || r.publishing}
              className="h-9 w-40 rounded border border-border-base bg-white px-2 text-xs focus:border-accent focus:outline-none disabled:opacity-50"
            >
              <option value="">Default shop</option>
              {shops.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </td>
        <td className="py-3 pe-3">
          {r.status !== 'success' ? (
            <span className="text-red-500">{r.message || 'extract error'}</span>
          ) : r.published ? (
            <span className="font-semibold text-accent">
              {r.updated ? `updated ✓ (${r.updated.join(', ')})` : 'published ✓'}
            </span>
          ) : r.publishError ? (
            <span className="text-red-500">{r.publishError}</span>
          ) : r.dupe ? (
            <span className="font-semibold text-amber-700">already in catalogue</span>
          ) : r.probable ? (
            <span className="font-semibold text-amber-700">possible duplicate</span>
          ) : (
            <span className="text-body">ready</span>
          )}
        </td>
        <td className="py-3 pe-3">
          {r.status === 'success' && !r.published && (
            <div className="flex flex-col items-start gap-1.5">
              {flagged && (
                <button
                  type="button"
                  onClick={onToggle}
                  className="rounded border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  {open ? 'Close' : `Update existing (${r.matches?.length ?? 0})`}
                </button>
              )}
              <button
                type="button"
                onClick={onPublish}
                disabled={r.publishing}
                className={`rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                  flagged
                    ? 'border border-border-base text-body hover:bg-gray-50'
                    : 'bg-accent text-white hover:bg-accent-hover'
                }`}
              >
                {r.publishing
                  ? 'Working…'
                  : flagged
                  ? 'Publish anyway'
                  : 'Publish'}
              </button>
            </div>
          )}
        </td>
      </tr>
      {previewOpen && r.status === 'success' && (
        <tr className="border-b border-border-100 bg-gray-50/70">
          <td colSpan={7} className="px-3 py-4">
            <PreviewPanel
              product={r.product}
              editable={!r.published}
              onProductPatch={onProductPatch}
            />
          </td>
        </tr>
      )}
      {open && flagged && !r.published && (
        <tr className="border-b border-border-100 bg-amber-50/40">
          <td colSpan={7} className="px-3 py-4">
            <MatchPanel row={r} onUpdate={onUpdate} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Everything the AI pulled for one book, laid out for a last look before publish.
 * Read-only on purpose — this is a verification surface, not an editor; anything
 * wrong here is a signal to skip the row and add the book by hand.
 */
function PreviewPanel({
  product: p,
  editable,
  onProductPatch,
}: {
  product: any;
  editable: boolean;
  onProductPatch: (patch: Record<string, any>) => void;
}) {
  if (!p) return <p className="text-xs text-body">Nothing extracted for this row.</p>;

  const cover: string | undefined =
    p.image_url ||
    p.image?.original ||
    p.image?.thumbnail ||
    (typeof p.image === 'string' ? p.image : undefined);

  const authors = p.author?.name
    ? p.author.name
    : Array.isArray(p.authors)
    ? p.authors.join(', ')
    : '—';
  const categories = Array.isArray(p.categories)
    ? p.categories.map((c: any) => (typeof c === 'string' ? c : c?.name)).filter(Boolean).join(', ')
    : '—';

  // The core fields plus whatever book_meta the extractor filled — only rows with
  // a value, so a sparse extraction doesn't render a wall of dashes.
  const rows: Array<[string, any]> = [
    ['Slug', p.slug],
    ['Regular price', p.price],
    ['Sale price', p.sale_price],
    ['MRP (source)', p.mrp ?? p.source_price],
    ['Source currency', p.source_currency],
    ['Unit', p.unit],
    ['SKU', p.sku],
    ['Publisher', p.manufacturer?.name ?? p.publisher],
    ['Type', p.type?.name],
    ['Indian edition', p.is_indian ? 'yes' : undefined],
    ['ISBN-13', p.isbn13],
    ['ISBN-10', p.isbn10],
    ['Language', p.language],
    ['Print type', p.print_type],
    ['Printed country', p.printed_country],
    ['Edition', p.edition],
    ['Pages', p.page_number],
    ['Weight', p.item_weight],
    ['Reading level', p.reading_level],
    ['Condition', p.condition],
  ];
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={p.name}
            className="h-40 w-28 rounded border border-border-200 object-cover"
          />
        ) : (
          <div className="flex h-40 w-28 items-center justify-center rounded border border-dashed border-border-300 text-[11px] text-body">
            no cover
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 font-semibold text-heading">{p.name || '—'}</p>
        <p className="mb-3 text-xs text-body">
          {authors} · {categories}
        </p>

        {/* Stock is the one field worth setting here — the AI defaults it to 1, and the
            owner usually knows the real quantity at import time. Everything else is
            read-only; correct those on the product page after publish. */}
        <div className="mb-3 flex items-center gap-3">
          <label className="text-xs font-semibold text-body-dark">Stock quantity</label>
          {editable ? (
            <input
              type="number"
              min={0}
              value={p.quantity ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onProductPatch({ quantity: v === '' ? undefined : Math.max(0, Number(v)) });
              }}
              className="h-8 w-24 rounded border border-border-base bg-white px-2 text-xs text-heading focus:border-accent focus:outline-none"
            />
          ) : (
            <span className="text-xs font-medium text-heading">{p.quantity ?? '—'}</span>
          )}
          {editable && (
            <span className="text-[11px] text-body">set before publishing</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 text-xs">
              <span className="text-body">{label}</span>
              <span className="text-end font-medium text-heading">{String(value)}</span>
            </div>
          ))}
        </div>

        {p.description ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-body-dark">Description</p>
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-border-200 bg-white p-2 text-xs text-heading">
              {p.description}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-amber-700">No description extracted.</p>
        )}
      </div>
    </div>
  );
}

/**
 * The existing books this row collided with, each with the fields the import
 * would refresh. Nothing is pre-ticked — an update overwrites live catalogue
 * data, so it should be a decision, not a default.
 */
function MatchPanel({
  row,
  onUpdate,
}: {
  row: Row;
  onUpdate: (match: DuplicateMatch, fields: UpdatableField[]) => void;
}) {
  const [picked, setPicked] = useState<Record<number, UpdatableField[]>>({});

  const toggle = (id: number, f: UpdatableField) =>
    setPicked((p) => {
      const cur = p[id] ?? [];
      return {
        ...p,
        [id]: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f],
      };
    });

  const has = (f: UpdatableField) => {
    if (f === 'quantity') return row.product?.quantity != null;
    if (f === 'price') return row.product?.price != null;
    return !!row.product?.description;
  };

  const incoming = (f: UpdatableField) => {
    if (f === 'quantity') return String(row.product?.quantity ?? '—');
    if (f === 'price')
      return `${row.product?.price ?? '—'}${
        row.product?.sale_price ? ` / ${row.product.sale_price}` : ''
      }`;
    const d = String(row.product?.description ?? '');
    return d.length > 60 ? `${d.slice(0, 60)}…` : d || '—';
  };

  const existing = (m: DuplicateMatch, f: UpdatableField) => {
    if (f === 'quantity') return String(m.quantity ?? '—');
    if (f === 'price')
      return `${m.price ?? '—'}${m.sale_price ? ` / ${m.sale_price}` : ''}`;
    return '(not compared)';
  };

  return (
    <div className="space-y-4">
      {row.probable && (
        <p className="text-xs text-amber-800">
          Matched on title only — this can legitimately be a different edition.
          Check before you update or publish.
        </p>
      )}
      {(row.matches ?? []).map((m) => {
        const fields = picked[m.id] ?? [];
        return (
          <div key={m.id} className="rounded border border-amber-200 bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                {/* New tab on purpose — navigating away would bin the whole
                    extraction the admin just paid the AI for. */}
                <Link
                  href={Routes.product.editWithoutLang(m.slug)}
                  target="_blank"
                  className="font-semibold text-heading underline hover:text-accent"
                >
                  {m.name}
                </Link>
                <span className="ms-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {REASON_LABEL[m.reason]}
                </span>
                <p className="mt-1 text-xs text-body">
                  #{m.id} · {m.author || 'no author'} · {m.detail}
                </p>
              </div>
              <button
                type="button"
                disabled={!fields.length || row.publishing}
                onClick={() => onUpdate(m, fields)}
                className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {row.publishing
                  ? 'Updating…'
                  : fields.length
                  ? `Update ${fields.length} field${fields.length > 1 ? 's' : ''}`
                  : 'Pick a field'}
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-body">
                  <th className="w-8 pb-1" />
                  <th className="pb-1 pe-3">Field</th>
                  <th className="pb-1 pe-3">Now</th>
                  <th className="pb-1 pe-3">From this import</th>
                </tr>
              </thead>
              <tbody>
                {(['quantity', 'price', 'description'] as UpdatableField[]).map((f) => (
                  <tr key={f} className="border-t border-border-100">
                    <td className="py-1.5">
                      <input
                        type="checkbox"
                        checked={fields.includes(f)}
                        disabled={!has(f)}
                        onChange={() => toggle(m.id, f)}
                      />
                    </td>
                    <td className="py-1.5 pe-3 capitalize text-body-dark">{f}</td>
                    <td className="py-1.5 pe-3 text-body">{existing(m, f)}</td>
                    <td className="py-1.5 pe-3 text-heading">
                      {has(f) ? incoming(f) : <span className="text-body">nothing extracted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
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
