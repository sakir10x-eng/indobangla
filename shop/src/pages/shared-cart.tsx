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
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);

  useEffect(() => {
    const code = (router.query.c as string) || '';
    if (!router.isReady) return;
    const parsed = decodeCode(code);
    setLines(parsed);
    if (!parsed.length) {
      setLoading(false);
      return;
    }
    (async () => {
      const out: any[] = [];
      for (const l of parsed) {
        try {
          const p: any = await HttpClient.get(`products/${l.slug}`, { language: router.locale });
          if (p?.id) out.push({ ...p, _qty: l.qty });
        } catch {
          /* dropped product — skip */
        }
      }
      setProducts(out);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.c]);

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
            <a href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 22, letterSpacing: '-.4px' }}>
              <span style={{ color: '#2e6b5a' }}>Indo</span><span style={{ color: '#5ba474' }}>Bangla</span>
            </a>
            <div style={{ color: '#7a6f66', fontSize: 13, marginTop: 4, fontWeight: 500 }}>শেয়ার করা বইয়ের তালিকা</div>
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
                const outOfStock = Number(p.quantity) <= 0 && !p.is_preorder;
                const img = p?.image?.thumbnail || p?.image?.original;
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#fff', border: '1px solid #e7e8e3', borderRadius: 14, padding: 12 }}>
                    <a href={`/products/${p.slug}`} style={{ flexShrink: 0 }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.name} loading="lazy" style={{ width: 52, height: 70, objectFit: 'cover', borderRadius: '3px 6px 6px 3px', boxShadow: '0 1px 5px rgba(0,0,0,.15)' }} />
                      ) : (
                        <div style={{ width: 52, height: 70, borderRadius: '3px 6px 6px 3px', background: 'linear-gradient(145deg,#2e6b5a,#245247)' }} />
                      )}
                    </a>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <a href={`/products/${p.slug}`} style={{ textDecoration: 'none', color: '#241a14' }}>
                        <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.4 }}>{p.name}</div>
                      </a>
                      {p?.author?.name && <div style={{ color: '#7a6f66', fontSize: 12, marginTop: 2 }}>{p.author.name}</div>}
                      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4, color: '#2e6b5a' }}>
                        {bdt(priceOf(p))}
                        {Number(p._qty) > 1 && <span style={{ color: '#7a6f66', fontWeight: 500, fontSize: 12 }}> × {p._qty}</span>}
                      </div>
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
