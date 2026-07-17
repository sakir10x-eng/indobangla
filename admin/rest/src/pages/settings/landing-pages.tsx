import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Rocket, ExternalLink, Pencil, Search } from 'lucide-react';
import { useProductsQuery } from '@/data/product';
import { useLandingSettingsQuery } from '@/data/integrations';
import LandingEditorModal from '@/components/product/landing-editor-modal';

const SHOP = 'https://indobangla.tech';

export default function LandingPagesPage() {
  const { items, loading } = useLandingSettingsQuery();
  const [editing, setEditing] = useState<any>(null);
  const [term, setTerm] = useState('');

  const { products } = useProductsQuery(
    { name: term, limit: 8, status: 'publish' } as any,
    { enabled: term.trim().length > 1 },
  );

  const existingIds = useMemo(
    () => new Set((items as any[]).map((x) => x?.product?.id)),
    [items],
  );
  const searchResults = (products as any[]).filter((p) => !existingIds.has(p.id));

  const openForProduct = (p: any, config?: any) => {
    setEditing({
      product: { id: p.id, title: p.name || p.title, slug: p.slug, cover: p.image?.original || p.cover || null },
      config,
    });
    setTerm('');
  };

  return (
    <>
      <SettingsPageHeader pageTitle="Landing Pages" />

      <div className="mx-auto w-full max-w-4xl space-y-6 py-2">
        <p className="text-sm text-slate-500">
          Give any product its own standalone marketing landing page at{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/landing/&lt;slug&gt;</code>. The product keeps
          working normally in the catalogue — this is an extra view. You can also open the editor straight from the{' '}
          <b>Products</b> list (the “Landing” button on each row).
        </p>

        {/* add new */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Create a landing page</h3>
          <p className="mb-3 text-xs text-slate-400">Search a product to design its landing page.</p>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search product by name…"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          {term.trim().length > 1 && (
            <div className="mt-3 space-y-1.5">
              {searchResults.length === 0 && <div className="text-xs text-slate-400">No matching products.</div>}
              {searchResults.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => openForProduct(p)}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <span className="grid h-9 w-9 place-items-center overflow-hidden rounded bg-slate-100">
                    {p.image?.thumbnail ? (
                      <Image src={p.image.thumbnail} alt={p.name} width={36} height={36} className="h-9 w-9 object-cover" />
                    ) : '📘'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-700">{p.name}</span>
                    <span className="block text-xs text-slate-400">#{p.id}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Rocket size={13} /> Design</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* existing */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Configured landing pages {items.length > 0 && <span className="text-slate-400">({items.length})</span>}
          </h3>
          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              No landing pages yet — search a product above to create the first one.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(items as any[]).map((it) => (
                <div key={it.product.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className="grid h-14 w-11 flex-shrink-0 place-items-center overflow-hidden rounded bg-slate-100">
                    {it.product.image ? (
                      <Image src={it.product.image} alt={it.product.name} width={44} height={56} className="h-14 w-11 object-cover" />
                    ) : <Rocket size={16} className="text-slate-400" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{it.product.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${it.config.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {it.config.enabled ? 'Live' : 'Draft'}
                      </span>
                      <a href={`${SHOP}/landing/${it.product.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        /landing/{it.product.slug} <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => openForProduct(it.product, it.config)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <LandingEditorModal
          product={editing.product}
          initialConfig={editing.config}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

LandingPagesPage.authenticate = { permissions: adminOnly };
LandingPagesPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
