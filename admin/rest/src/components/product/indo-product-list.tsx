import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import Link from '@/components/ui/link';
import {
  Search, Pencil, Eye, Heart, TrendingUp, TrendingDown, Minus, Star,
  Percent, PackageX, AlertTriangle, ArrowUpDown, ChevronDown, Package,
  ShoppingBag, Megaphone, Rocket, Copy, ArrowRightLeft, X, Sparkles, Trash2, RotateCcw,
} from 'lucide-react';
import {
  useLandingSettingsQuery,
  useProductShopsQuery,
  useProductCopyMutation,
  useProductMoveMutation,
} from '@/data/integrations';
import { useDeleteProductMutation } from '@/data/product';
import LandingEditorModal from '@/components/product/landing-editor-modal';

const C = {
  paper: '#f6f6f3', card: '#fff', ink: '#16221f', sub: '#6b7773', line: '#e7e8e3',
  brand: '#0f766e', brandSoft: '#e6f2f0', green: '#0f9d68', greenSoft: '#e4f6ee',
  amber: '#c07a06', amberSoft: '#fdf2dd', red: '#d23f3f', redSoft: '#fdecec',
  rose: '#d6336c', roseSoft: '#fbe9f0', gold: '#b7791f', goldSoft: '#fbf1da',
};
const covers = [['#e8632a', '#b8401a'], ['#2f6f6b', '#17423f'], ['#7a4bd0', '#4a2a8c'], ['#c9962a', '#8a6412'], ['#3d6cc9', '#22437f'], ['#c94f6d', '#8a2f47']];
const money = (n: number) => '৳' + (Number(n) || 0).toLocaleString('en-IN');
const LOW = 10;

// Bespoke, single-product landing designs. When a product's landing_template matches
// one of these it gets a distinct "Special" badge in the list (vs the generic purple
// "Landing" pill) so it's obvious the page is a one-off custom design.
const SPECIAL_LANDINGS: Record<string, string> = {
  anandamela: 'আনন্দমেলা ১৪৩৩',
};
const specialLandingLabel = (p: any) =>
  p?.has_landing ? SPECIAL_LANDINGS[p?.landing_template as string] : undefined;

function Cover({ p, size = 46 }: any) {
  const [a, b] = covers[p.id % covers.length];
  if (p.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.cover} alt={p.title} style={{ width: size, height: size * 1.28, borderRadius: 5, objectFit: 'cover', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.18)' }} />;
  }
  const initials = (p.title || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('');
  return (
    <div style={{ width: size, height: size * 1.28, borderRadius: 5, flexShrink: 0, background: `linear-gradient(150deg, ${a}, ${b})`, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.3 }}>{initials}</div>
  );
}
function Pill({ text, fg, bg, icon: Icon }: any) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: bg, color: fg, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{Icon && <Icon size={11} strokeWidth={2.6} />}{text}</span>;
}
function Demand({ p }: any) {
  const m: any = { high: { c: C.green, Icon: TrendingUp, t: 'High' }, medium: { c: C.amber, Icon: Minus, t: 'Medium' }, low: { c: C.red, Icon: TrendingDown, t: 'Low' } }[p.demand] || { c: C.sub, Icon: Minus, t: '—' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: m.c, fontWeight: 700, fontSize: 12 }}><m.Icon size={13} strokeWidth={2.6} />{m.t} · {p.units30} in 30d</span>;
}
function Stock({ p }: any) {
  if (p.stock === 0) return <div><Pill text="Out of stock" icon={PackageX} fg={C.red} bg={C.redSoft} /><div style={{ marginTop: 4, color: C.red, fontSize: 11.5, fontWeight: 700 }}>Restock now</div></div>;
  const low = p.stock <= LOW;
  return <div><span style={{ color: low ? C.amber : C.ink, fontWeight: 700, fontSize: 14 }}>{p.stock}</span><span style={{ color: C.sub, fontSize: 12 }}> in stock</span>{low && <div style={{ marginTop: 3, color: C.amber, fontSize: 11.5, fontWeight: 700 }}>Low stock</div>}</div>;
}
function Kpi({ icon: Icon, label, value, fg, bg }: any) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 168px' }}><div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'grid', placeItems: 'center' }}><Icon size={19} color={fg} strokeWidth={2.3} /></div><div><div style={{ fontSize: 21, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{value}</div><div style={{ fontSize: 11.5, color: C.sub, fontWeight: 600 }}>{label}</div></div></div>;
}

export default function IndoProductList() {
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('all');
  // Last-edited first by default — after saving a book you land back on the list and it's on top.
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [shopModal, setShopModal] = useState<{ product: any; mode: 'copy' | 'move' } | null>(null);

  const { items: landingItems } = useLandingSettingsQuery();
  const landingConfigFor = (id: number) =>
    (landingItems as any[]).find((x) => x?.product?.id === id)?.config;

  const { data, isLoading } = useQuery(
    ['product-admin-list', q, chip, sort, page],
    () => HttpClient.get<any>('product-admin-list', { search: q, chip, sort, page, limit: 20, trashed: chip === 'trash' ? 1 : undefined }),
    { keepPreviousData: true },
  );
  const rows: any[] = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const lastPage = (data as any)?.last_page ?? 1;
  const inTrash = chip === 'trash';

  const queryClient = useQueryClient();
  const { mutate: deleteProduct } = useDeleteProductMutation();
  const refetchList = () => queryClient.invalidateQueries(['product-admin-list']);
  function handleDelete(p: any) {
    // Soft delete -> recycle bin (restorable for 30 days, then auto-purged).
    if (typeof window !== 'undefined' && !window.confirm(`Move “${p.title}” to the recycle bin? You can restore it within 30 days.`)) return;
    deleteProduct({ id: p.id }, { onSuccess: refetchList });
  }
  function handleRestore(p: any) {
    HttpClient.post(`products/${p.id}/restore`, {}).then(refetchList).catch(() => {});
  }
  function handleForceDelete(p: any) {
    if (typeof window !== 'undefined' && !window.confirm(`Permanently delete “${p.title}”? This CANNOT be undone.`)) return;
    HttpClient.delete(`products/${p.id}/force`).then(refetchList).catch(() => {});
  }

  const chips = [
    { id: 'all', label: 'All products' },
    { id: 'bestseller', label: 'Bestsellers', icon: Star },
    { id: 'restock', label: 'Low stock', icon: AlertTriangle },
    { id: 'out', label: 'Out of stock', icon: PackageX },
    { id: 'draft', label: 'Drafts', icon: Megaphone },
    { id: 'trash', label: 'Recycle bin', icon: Trash2 },
  ];

  const th: any = { padding: '11px 14px', fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
  const td: any = { padding: '14px', verticalAlign: 'middle', borderTop: `1px solid ${C.line}` };

  return (
    <div style={{ background: C.paper, minHeight: '100%', padding: '20px 4px 40px', fontFamily: "'Inter', system-ui, sans-serif", color: C.ink }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 5, height: 30, background: C.brand, borderRadius: 3 }} />
            <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Products</h1><div style={{ fontSize: 12.5, color: C.sub }}>IndoBangla • Catalogue overview</div></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* AI batch import — the page existed but nothing linked to it. */}
            <Link href="/products/ai-batch" style={{ background: '#fff', color: C.brand, border: `1.5px solid ${C.brand}`, borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Sparkles size={16} /> AI Batch Upload</Link>
            <Link href="/indo-bangla/products/create" style={{ background: C.brand, color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Package size={16} /> Add product</Link>
          </div>
        </div>

        {/* toolbar */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative', minWidth: 200 }}>
              <Search size={17} color={C.sub} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by title or author…" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 38px', border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13.5, outline: 'none', background: C.paper }} />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} style={{ appearance: 'none', padding: '10px 34px', border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13, fontWeight: 600, background: C.paper, color: C.ink }}>
                <option value="updated">Recently updated</option>
                <option value="sold">Top selling</option>
                <option value="wishlist">Most wishlisted</option>
                <option value="stock">Lowest stock</option>
                <option value="price">Highest price</option>
                <option value="newest">Newest</option>
              </select>
              <ArrowUpDown size={14} color={C.sub} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <ChevronDown size={14} color={C.sub} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
            {chips.map((ch: any) => {
              const on = chip === ch.id;
              return <button key={ch.id} onClick={() => { setChip(ch.id); setPage(1); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? C.brand : C.line}`, background: on ? C.brand : C.card, color: on ? '#fff' : C.sub }}>{ch.icon && <ch.icon size={13} strokeWidth={2.4} />}{ch.label}</button>;
            })}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: C.sub, margin: '0 2px 10px', fontWeight: 600 }}>{isLoading ? 'Loading…' : `${total} products`}</div>

        {/* table */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead style={{ background: C.paper }}>
              <tr>
                <th style={{ ...th, paddingLeft: 18 }}>Product</th>
                <th style={th}>Price &amp; Stock</th>
                <th style={th}>Performance</th>
                <th style={{ ...th, textAlign: 'right', paddingRight: 18 }}>Status &amp; Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...td, paddingLeft: 18 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Cover p={p} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{p.title}{p.bestseller && <Pill text="Bestseller" icon={Star} fg={C.gold} bg={C.goldSoft} />}</div>
                        <div style={{ fontSize: 12, color: C.sub }}>{p.author || '—'}</div>
                        <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>#{p.id} • {p.type}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{money(p.price)}</span>
                      {p.hasOffer && <span style={{ fontSize: 12, color: C.sub, textDecoration: 'line-through' }}>{money(p.mrp)}</span>}
                    </div>
                    {p.hasOffer && <div style={{ marginBottom: 6 }}><Pill text={`${p.discountPct}% OFF`} icon={Percent} fg="#2563c9" bg="#e7eefb" /></div>}
                    <Stock p={p} />
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.sold.toLocaleString()} <span style={{ color: C.sub, fontWeight: 500, fontSize: 12 }}>sold</span></span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Heart size={14} color={C.rose} fill={C.rose} /><b>{p.wishlist}</b></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 999, overflow: 'hidden', minWidth: 60 }}><div style={{ width: p.sellThrough + '%', height: '100%', background: p.sellThrough >= 80 ? C.green : p.sellThrough >= 40 ? C.amber : C.sub }} /></div>
                      <span style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>{p.sellThrough}% sold</span>
                    </div>
                    <Demand p={p} />
                  </td>
                  <td style={{ ...td, paddingRight: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {p.status === 'publish' ? <Pill text="Publish" fg={C.green} bg={C.greenSoft} /> : <Pill text="Draft" fg={C.sub} bg="#eef0ec" />}
                        {p.has_landing && (
                          specialLandingLabel(p)
                            ? <Pill text={`Special · ${specialLandingLabel(p)}`} icon={Sparkles} fg={C.gold} bg={C.goldSoft} />
                            : <Pill text="Landing" icon={Rocket} fg="#7c3aed" bg="#f0eafd" />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {inTrash ? (
                          <>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: (p.days_left ?? 0) <= 3 ? C.red : C.sub, marginRight: 2 }}>
                              {p.days_left ?? 0}d left
                            </span>
                            <button type="button" onClick={() => handleRestore(p)} title="Restore from recycle bin" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.green}`, background: C.greenSoft, color: C.green, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><RotateCcw size={14} /> Restore</button>
                            <button type="button" onClick={() => handleForceDelete(p)} title="Delete forever" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.redSoft}`, background: C.redSoft, cursor: 'pointer' }}><Trash2 size={15} color={C.red} /></button>
                          </>
                        ) : (
                          <>
                        {(() => {
                          const sp = specialLandingLabel(p);
                          const on = p.has_landing;
                          return (
                            <button
                              onClick={() => setEditing(p)}
                              title={sp ? `Special landing: ${sp}` : on ? 'Edit landing page' : 'Create landing page'}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 8, border: `1px solid ${sp ? '#ecd9a6' : on ? '#d9cbf7' : C.line}`, background: sp ? C.goldSoft : on ? '#f0eafd' : C.card, color: sp ? C.gold : on ? '#7c3aed' : C.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              {sp ? <Sparkles size={14} /> : <Rocket size={14} />} Landing
                            </button>
                          );
                        })()}
                        <Link href={`/products/${p.slug}/edit`} title="Edit" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}` }}><Pencil size={15} color={C.brand} /></Link>
                        <button type="button" onClick={() => setShopModal({ product: p, mode: 'copy' })} title="Copy to a shop" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer' }}><Copy size={15} color={C.sub} /></button>
                        <button type="button" onClick={() => setShopModal({ product: p, mode: 'move' })} title="Move to another shop" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer' }}><ArrowRightLeft size={15} color={C.sub} /></button>
                        <a href={`https://indobangla.tech/products/${p.slug}`} target="_blank" rel="noreferrer" title="View" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}` }}><Eye size={15} color={C.sub} /></a>
                        <button type="button" onClick={() => handleDelete(p)} title="Delete product" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.redSoft}`, background: C.redSoft, cursor: 'pointer' }}><Trash2 size={15} color={C.red} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {lastPage > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 18, fontSize: 13 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '8px 16px', border: `1px solid ${C.line}`, borderRadius: 10, background: C.card, fontWeight: 600, opacity: page <= 1 ? 0.4 : 1 }}>← Prev</button>
            <span style={{ alignSelf: 'center', color: C.sub }}>Page {page} / {lastPage}</span>
            <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage} style={{ padding: '8px 16px', border: `1px solid ${C.line}`, borderRadius: 10, background: C.card, fontWeight: 600, opacity: page >= lastPage ? 0.4 : 1 }}>Next →</button>
          </div>
        )}
      </div>

      {editing && (
        <LandingEditorModal
          product={editing}
          initialConfig={landingConfigFor(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}

      {shopModal && (
        <ShopPickerModal
          product={shopModal.product}
          mode={shopModal.mode}
          onClose={() => setShopModal(null)}
        />
      )}
    </div>
  );
}

function ShopPickerModal({ product, mode, onClose }: { product: any; mode: 'copy' | 'move'; onClose: () => void }) {
  const { shops, loading } = useProductShopsQuery();
  const copy = useProductCopyMutation();
  const move = useProductMoveMutation();
  const [target, setTarget] = useState<number>(product?.shop_id || 0);
  const busy = copy.isLoading || move.isLoading;

  // Default the picker to the product's current shop once shops load.
  React.useEffect(() => {
    if (!target && product?.shop_id) setTarget(product.shop_id);
    else if (!target && shops.length) setTarget(shops[0].id);
  }, [shops]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMove = mode === 'move';
  const disabled = busy || !target || (isMove && target === product?.shop_id);

  const submit = () => {
    if (!target) return;
    const input = { product_id: product.id, target_shop_id: target };
    const m = isMove ? move : copy;
    m.mutate(input, { onSuccess: () => onClose() });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,20,0.45)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 'min(440px, 100%)', padding: 22, fontFamily: "'Inter', system-ui, sans-serif", boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: C.ink }}>
            {isMove ? <ArrowRightLeft size={18} color={C.brand} /> : <Copy size={18} color={C.brand} />}
            {isMove ? 'Move product' : 'Copy product'}
          </div>
          <button type="button" onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', cursor: 'pointer' }}><X size={16} color={C.sub} /></button>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 1.4 }}>
          {isMove
            ? <>Move <b style={{ color: C.ink }}>{product?.title}</b> to another shop. It leaves its current shop.</>
            : <>Make a copy of <b style={{ color: C.ink }}>{product?.title}</b> in a shop. The copy is saved as a draft.</>}
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
          {isMove ? 'Move to shop' : 'Copy into shop'}
        </label>
        <select
          value={target || ''}
          onChange={(e) => setTarget(Number(e.target.value))}
          disabled={loading || busy}
          style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, background: '#fff', color: C.ink, marginBottom: 6 }}
        >
          {loading && <option>Loading shops…</option>}
          {!loading && shops.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.id === product?.shop_id ? ' (current)' : ''}{!s.is_active ? ' — inactive' : ''}
            </option>
          ))}
        </select>
        {isMove && target === product?.shop_id && (
          <div style={{ fontSize: 12, color: '#b45309', marginBottom: 4 }}>Pick a different shop to move.</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={busy} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.line}`, background: '#fff', fontWeight: 700, fontSize: 13.5, color: C.sub, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={submit} disabled={disabled} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: C.brand, color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
            {busy ? 'Working…' : isMove ? 'Move product' : 'Copy product'}
          </button>
        </div>
      </div>
    </div>
  );
}
