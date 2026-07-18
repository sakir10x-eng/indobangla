import { HttpClient } from '@/framework/client/http-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useCart } from '@/store/quick-cart/cart.context';
import { generateCartItem } from '@/store/quick-cart/generate-cart-item';
import { Routes } from '@/config/routes';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

type Line = { slug: string; qty: number };

// The share link carries the cart as base64url(JSON [[slug, qty], …]). Decoding it here means the
// link is fully self-contained — no server-side cart storage.
function decodeCode(code: string): Line[] {
  try {
    const json = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))));
    const arr = JSON.parse(json);
    return (Array.isArray(arr) ? arr : [])
      .map((x: any) => ({ slug: String(x[0]), qty: Math.max(1, Number(x[1]) || 1) }))
      .filter((l: Line) => l.slug);
  } catch {
    return [];
  }
}

export default function SharedCartPage() {
  const router = useRouter();
  const { addItemToCart, isInCart } = useCart() as any;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);

  useEffect(() => {
    if (!router.isReady) return;
    const idsParam = (router.query.i as string) || '';
    const codeParam = (router.query.c as string) || '';
    (async () => {
      let out: any[] = [];
      if (idsParam) {
        // Short link: i=id.qty-id.qty. One batched fetch by product id.
        const parts = idsParam
          .split('-')
          .map((s) => {
            const [id, q] = s.split('.');
            return { id: Number(id), qty: Math.max(1, Number(q) || 1) };
          })
          .filter((x) => x.id);
        const qtyById = new Map(parts.map((p) => [p.id, p.qty]));
        try {
          const r: any = await HttpClient.get('share-cart', {
            ids: parts.map((p) => p.id).join(','),
          });
          out = (r?.products || []).map((p: any) => ({ ...p, _qty: qtyById.get(p.id) || 1 }));
        } catch {
          /* dropped — show empty */
        }
      } else if (codeParam) {
        // Legacy link: c=base64url([[slug, qty], …]). Fetch each by slug.
        for (const l of decodeCode(codeParam)) {
          try {
            const p: any = await HttpClient.get(`products/${l.slug}`, { language: router.locale });
            if (p?.id) out.push({ ...p, _qty: l.qty });
          } catch {
            /* dropped product — skip */
          }
        }
      }
      setProducts(out);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.i, router.query.c]);

  const priceOf = (p: any) => Number(p?.sale_price ? p.sale_price : p?.price) || 0;

  const addOne = (p: any) => {
    addItemToCart(generateCartItem(p, {} as any), Number(p._qty) || 1);
    toast.success(`${p.name} কার্টে যোগ হয়েছে`);
    force((n) => n + 1);
  };

  const addAll = () => {
    products.forEach((p) => {
      if (!isInCart(p.id)) addItemToCart(generateCartItem(p, {} as any), Number(p._qty) || 1);
    });
    toast.success('সব বই কার্টে যোগ হয়েছে');
    force((n) => n + 1);
  };

  const addAllAndCheckout = () => {
    addAll();
    router.push(Routes.checkout);
  };

  const total = products.reduce((s, p) => s + priceOf(p) * (Number(p._qty) || 1), 0);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(1000px 500px at 50% -10%, #f4f7f5, transparent), #eef1ef',
        padding: '24px 14px 60px',
        fontFamily: "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif",
        color: '#241a14',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div style={{ lineHeight: 1 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://indobanglabook.s3.us-east-2.amazonaws.com/7827/Transparent-horizontal.png"
                alt="IndoBangla"
                style={{ height: 36, width: 'auto', maxWidth: 200, objectFit: 'contain', display: 'block' }}
              />
            </a>
            <div style={{ color: '#7a6f66', fontSize: 13, marginTop: 7, fontWeight: 500 }}>শেয়ার করা বইয়ের তালিকা</div>
          </div>
          <a
            href="/"
            style={{ fontSize: 12.5, fontWeight: 600, color: '#2e6b5a', textDecoration: 'none', border: '1px solid #cfe0d7', borderRadius: 999, padding: '7px 14px' }}
          >
            🏬 দোকানে যান
          </a>
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#7a6f66', padding: 40 }}>লোড হচ্ছে…</div>}

        {!loading && !products.length && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 10px 30px rgba(36,82,71,.08)' }}>
            <div style={{ fontSize: 40 }}>🛒</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>তালিকাটি খালি বা মেয়াদোত্তীর্ণ</div>
            <div style={{ color: '#7a6f66', fontSize: 13, marginTop: 4 }}>লিংকটি সঠিক নয় অথবা বইগুলো আর নেই।</div>
            <a href="/products" style={{ display: 'inline-block', marginTop: 16, background: 'linear-gradient(135deg,#3d7a5f,#2e6b5a)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 12, textDecoration: 'none' }}>
              সব বই দেখুন
            </a>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.map((p) => {
                const inCart = isInCart(p.id);
                const stock = Number(p.quantity) || 0;
                const outOfStock = stock <= 0 && !p.is_preorder;
                const img = p?.image?.original || p?.image?.thumbnail;
                const hasDiscount = Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price);
                const discountPct = hasDiscount ? Math.round((1 - Number(p.sale_price) / Number(p.price)) * 100) : 0;
                const stockInfo = p.is_preorder
                  ? { text: '📘 প্রি-অর্ডার', color: '#1d4ed8' }
                  : outOfStock
                  ? { text: '✕ স্টক নেই', color: '#b02a1e' }
                  : stock <= 5
                  ? { text: `⚠ মাত্র ${stock} কপি বাকি`, color: '#b45309' }
                  : { text: '✓ স্টকে আছে', color: '#0f9d68' };
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#fff', border: '1px solid #e7e8e3', borderRadius: 14, padding: 14 }}>
                    <a href={`/products/${p.slug}`} style={{ flexShrink: 0 }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.name} loading="lazy" style={{ width: 78, height: 108, objectFit: 'cover', borderRadius: '4px 8px 8px 4px', boxShadow: 'inset 2px 0 0 rgba(255,255,255,.1), 0 2px 8px rgba(0,0,0,.18)' }} />
                      ) : (
                        <div style={{ width: 78, height: 108, borderRadius: '4px 8px 8px 4px', background: 'linear-gradient(145deg,#2e6b5a,#245247)' }} />
                      )}
                    </a>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <a href={`/products/${p.slug}`} style={{ textDecoration: 'none', color: '#241a14' }}>
                        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{p.name}</div>
                      </a>
                      {p?.author?.name && <div style={{ color: '#7a6f66', fontSize: 12, marginTop: 2 }}>{p.author.name}</div>}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 16.5, color: '#2e6b5a' }}>{bdt(priceOf(p))}</span>
                        {hasDiscount && <span style={{ fontSize: 12.5, color: '#9b9188', textDecoration: 'line-through' }}>{bdt(p.price)}</span>}
                        {hasDiscount && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#b02a1e', background: '#fdecea', borderRadius: 6, padding: '1px 6px' }}>{discountPct}% ছাড়</span>}
                        {Number(p._qty) > 1 && <span style={{ color: '#7a6f66', fontWeight: 500, fontSize: 12 }}>× {p._qty}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 4, color: stockInfo.color }}>{stockInfo.text}</div>
                    </div>
                    <button
                      onClick={() => addOne(p)}
                      disabled={outOfStock}
                      style={{
                        flexShrink: 0, border: 'none', cursor: outOfStock ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        background: outOfStock ? '#e7e8e3' : inCart ? '#e4f6ee' : 'linear-gradient(135deg,#3d7a5f,#2e6b5a)',
                        color: outOfStock ? '#9b9188' : inCart ? '#0f9d68' : '#fff',
                        fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 10, whiteSpace: 'nowrap',
                      }}
                    >
                      {outOfStock ? 'স্টক নেই' : inCart ? '✓ কার্টে আছে' : '+ কার্টে দিন'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* sticky action bar */}
            <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e7e8e3', borderRadius: 16, padding: 16, boxShadow: '0 10px 30px rgba(36,82,71,.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#7a6f66', fontWeight: 600 }}>{products.length} টি বই</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#2e6b5a' }}>{bdt(total)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={addAll}
                  style={{ border: '1.5px solid #2e6b5a', cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: '#2e6b5a', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 12 }}
                >
                  সব কার্টে দিন
                </button>
                <button
                  onClick={addAllAndCheckout}
                  style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#d43a2b,#b02a1e)', color: '#fff', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 12, boxShadow: '0 8px 20px rgba(212,58,43,.26)' }}
                >
                  চেকআউট করুন →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
