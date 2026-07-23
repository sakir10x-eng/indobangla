import { useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from '@/framework/client/http-client';
import { useCart } from '@/store/quick-cart/cart.context';
import { generateCartItem } from '@/store/quick-cart/generate-cart-item';
import { useSettings } from '@/framework/settings';
import ProductLandingAnandamela from '@/components/landing/product-landing-anandamela';
import ProductLandingSoviet4 from '@/components/landing/product-landing-soviet4';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// ---- theme palettes -------------------------------------------------------
type Theme = { bg: string; panel: string; ink: string; sub: string; accent: string; accent2: string; soft: string; ribbon: string };
const THEMES: Record<string, Theme> = {
  royal:   { bg: '#f6f1e7', panel: '#fffdf8', ink: '#2a1a12', sub: '#7a6a5a', accent: '#7c1d2b', accent2: '#b8862f', soft: '#f3e6cf', ribbon: '#b8862f' },
  classic: { bg: '#f4f2ec', panel: '#ffffff', ink: '#241f1a', sub: '#6f6a63', accent: '#1f6f5b', accent2: '#b7791f', soft: '#e9efe9', ribbon: '#1f6f5b' },
  festive: { bg: '#fdf3f1', panel: '#ffffff', ink: '#2a1414', sub: '#7d6363', accent: '#c0202c', accent2: '#e0912f', soft: '#fbe3df', ribbon: '#c0202c' },
  modern:  { bg: '#eef2f1', panel: '#ffffff', ink: '#12211d', sub: '#647069', accent: '#0f766e', accent2: '#d97706', soft: '#dbeae6', ribbon: '#0f766e' },
};

const FONT = "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif";

function ytEmbed(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function stripHtml(html: string): string {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ProductLanding({ data }: { data: any }) {
  const router = useRouter();
  const { settings } = useSettings();
  const { addItemToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const product = data?.product ?? {};
  const cfg = data?.config ?? {};
  const t = THEMES[cfg.theme as string] ?? THEMES.royal;
  const book = product.book ?? {};

  const name = product.name ?? '';
  const author = product.author?.name ?? '';
  const publisher = product.manufacturer?.name ?? '';
  const cover = product.image?.original ?? product.image?.thumbnail ?? '';
  const gallery: any[] = Array.isArray(product.gallery)
    ? product.gallery.filter((g: any) => g && (g.original || g.thumbnail))
    : [];

  const rawPrice = Number(product.price ?? 0);
  const rawSale = Number(product.sale_price ?? 0);
  const hasSaving = rawSale > 0 && rawPrice > 0 && rawSale < rawPrice;
  const unit = hasSaving ? rawSale : rawPrice;
  const savePct = hasSaving ? Math.round((1 - rawSale / rawPrice) * 100) : 0;
  const saveAmt = hasSaving ? Math.round(rawPrice - rawSale) : 0;
  const stock = Number(product.quantity ?? 0);
  const inStock = stock > 0;

  // ---- defaults derived from the product when config fields are empty ----
  const headline = cfg.headline || name;
  const subheadline = cfg.subheadline || book.hook || stripHtml(product.description).slice(0, 160);
  const ctaPrimary = cfg.cta_primary || 'এখনই অর্ডার করুন';
  const ctaSecondary = cfg.cta_secondary || 'বিস্তারিত দেখুন';

  const highlights: string[] = (cfg.highlights?.length ? cfg.highlights : [
    author && `লেখক: ${author}`,
    publisher && `প্রকাশক: ${publisher}`,
    book.page_number && `${book.page_number} পৃষ্ঠা`,
    book.language && `ভাষা: ${book.language}`,
    '১০০% অরিজিনাল বই — ক্যাশ অন ডেলিভারি',
    'সারা বাংলাদেশে দ্রুত ডেলিভারি',
  ].filter(Boolean)) as string[];

  const stats: { value: string; label: string }[] = cfg.stats?.length ? cfg.stats : [
    book.page_number && { value: String(book.page_number), label: 'পৃষ্ঠা' },
    book.language && { value: book.language, label: 'ভাষা' },
    book.edition && { value: book.edition, label: 'সংস্করণ' },
    { value: '4.8★', label: 'পাঠক রেটিং' },
  ].filter(Boolean) as any[];

  const spec: [string, any][] = [
    ['লেখক', author],
    ['প্রকাশক', publisher],
    ['ভাষা', book.language],
    ['পৃষ্ঠা', book.page_number],
    ['সংস্করণ', book.edition],
    ['ISBN', book.isbn13 || book.isbn10],
    ['ধরন', book.print_type],
    ['SKU', product.sku],
  ].filter(([, v]) => v);

  const videoUrl = ytEmbed(cfg.video);

  // ---- related books ----
  const { data: relRes } = useQuery(
    ['landing-related', product.id],
    () => HttpClient.get<any>('related-books', { product_id: product.id }),
    { enabled: !!product.id && cfg.show_related !== false },
  );
  const related: any[] = useMemo(() => {
    // Same author and same publisher lead — those are the books a reader of THIS title
    // actually wants next. Category, then best-sellers, only fill the row if it is short.
    const all = [
      ...((relRes as any)?.by_author ?? []),
      ...((relRes as any)?.by_publisher ?? []),
      ...((relRes as any)?.by_category ?? []),
      ...((relRes as any)?.recommended ?? []),
    ];
    const seen = new Set<any>();
    return all.filter((p: any) => {
      if (!p || p.id === product.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, 6);
  }, [relRes, product.id]);

  // ---- cart actions ----
  const withShop = (p: any) => ({ ...p, shop: p?.shop ?? product?.shop });
  const addToCart = () => {
    if (!inStock) return;
    try {
      addItemToCart(generateCartItem(withShop(product), {} as any), Math.max(1, qty));
      toast.success('কার্টে যোগ হয়েছে');
    } catch {
      toast.error('কার্টে যোগ করা যায়নি।');
    }
  };
  const buyNow = () => {
    if (!inStock) return;
    try {
      addItemToCart(generateCartItem(withShop(product), {} as any), Math.max(1, qty));
      router.push('/checkout');
    } catch {
      toast.error('অর্ডার শুরু করা যায়নি।');
    }
  };

  const waNumber = String((settings as any)?.contactDetails?.contact ?? '').replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(`আসসালামু আলাইকুম, আমি "${name}" বইটি অর্ডার করতে চাই।`);
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : '/contact';

  // Bespoke, single-product templates take over the whole page. Commerce state
  // (price/stock/qty/cart) computed above is passed down so checkout still works.
  if (cfg.template === 'anandamela') {
    return (
      <ProductLandingAnandamela
        name={name}
        author={author}
        publisher={publisher}
        cover={cover}
        gallery={gallery}
        unit={unit}
        rawPrice={rawPrice}
        hasSaving={hasSaving}
        savePct={savePct}
        saveAmt={saveAmt}
        stock={stock}
        inStock={inStock}
        qty={qty}
        setQty={setQty}
        buyNow={buyNow}
        addToCart={addToCart}
        waLink={waLink}
        productHref={`/products/${product.slug}`}
        bdt={bdt}
        giftMax={Number((product as any)?.gift_max) || 0}
        giftPerCopy={(product as any)?.gift_per_copy !== false}
        gifts={(product as any)?.gift_products ?? []}
      />
    );
  }

  if (cfg.template === 'soviet4') {
    return (
      <ProductLandingSoviet4
        name={name}
        author={author}
        publisher={publisher}
        cover={cover}
        unit={unit}
        rawPrice={rawPrice}
        hasSaving={hasSaving}
        stock={stock}
        inStock={inStock}
        buyNow={buyNow}
        addToCart={addToCart}
        waLink={waLink}
        productHref={`/products/${product.slug}`}
        bdt={bdt}
      />
    );
  }

  const scrollTo = (id: string) => {
    if (typeof document !== 'undefined') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---- shared styles ----
  const wrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '0 20px' };
  const sectionTitle: React.CSSProperties = { fontSize: 26, fontWeight: 800, color: t.ink, textAlign: 'center', margin: '0 0 8px', letterSpacing: '-.3px' };
  const sectionSub: React.CSSProperties = { fontSize: 14.5, color: t.sub, textAlign: 'center', margin: '0 auto 30px', maxWidth: 560 };
  const btnPrimary: React.CSSProperties = { border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: t.accent, color: '#fff', fontWeight: 800, fontSize: 16, padding: '15px 26px', borderRadius: 13, boxShadow: `0 12px 26px ${t.accent}44` };
  const btnGhost: React.CSSProperties = { cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: t.accent, fontWeight: 700, fontSize: 15, padding: '14px 22px', borderRadius: 13, border: `1.6px solid ${t.accent}55` };
  const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: t.soft, color: t.ink, fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999 };

  return (
    <div style={{ background: t.bg, minHeight: '100vh', fontFamily: FONT, color: t.ink, paddingBottom: 84 }}>
      <Head>
        <title>{`${name} — IndoBangla`}</title>
        <meta name="description" content={stripHtml(subheadline).slice(0, 155)} />
      </Head>

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: `${t.panel}ee`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${t.soft}` }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          <a href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 21, letterSpacing: '-.5px' }}>
            <span style={{ color: t.accent }}>Indo</span><span style={{ color: t.ink }}>Bangla</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/" style={{ textDecoration: 'none', color: t.sub, fontSize: 13.5, fontWeight: 600 }}>সব বই</a>
            <a href={`/products/${product.slug}`} style={{ textDecoration: 'none', color: t.sub, fontSize: 13.5, fontWeight: 600 }}>পণ্যের পেজ</a>
            <button onClick={() => scrollTo('order')} style={{ ...btnPrimary, padding: '9px 18px', fontSize: 13.5, borderRadius: 10 }}>অর্ডার</button>
          </div>
        </div>
      </div>

      {/* ===================== HERO ===================== */}
      <section style={{ background: `linear-gradient(180deg, ${t.panel}, ${t.bg})`, borderBottom: `1px solid ${t.soft}` }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: '1fr', gap: 36, padding: '40px 20px 48px' }} className="ib-hero">
          {/* text */}
          <div style={{ maxWidth: 560 }}>
            {cfg.badge && (
              <span style={{ display: 'inline-block', background: t.accent, color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: '.5px', padding: '6px 14px', borderRadius: 999, marginBottom: 16 }}>
                {cfg.badge}
              </span>
            )}
            <h1 style={{ fontSize: 40, lineHeight: 1.12, fontWeight: 800, margin: '0 0 14px', letterSpacing: '-.6px' }}>{headline}</h1>
            {subheadline && <p style={{ fontSize: 16.5, lineHeight: 1.6, color: t.sub, margin: '0 0 20px' }}>{subheadline}</p>}

            {/* price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 38, fontWeight: 800, color: t.accent, letterSpacing: '-1px' }}>{bdt(unit)}</span>
              {hasSaving && <span style={{ fontSize: 20, color: t.sub, textDecoration: 'line-through' }}>{bdt(rawPrice)}</span>}
              {hasSaving && <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>{savePct}% ছাড় · {bdt(saveAmt)} সাশ্রয়</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.accent2, fontSize: 14, fontWeight: 700, marginBottom: 20 }}>
              <span style={{ color: '#f5b301' }}>★★★★★</span> <span style={{ color: t.sub }}>পাঠকপ্রিয় বই</span>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <button onClick={buyNow} disabled={!inStock} style={{ ...btnPrimary, opacity: inStock ? 1 : 0.5 }}>{inStock ? ctaPrimary : 'স্টক শেষ'}</button>
              <button onClick={() => scrollTo('about')} style={btnGhost}>{ctaSecondary}</button>
            </div>

            {cfg.hero_note && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 10, marginBottom: 16 }}>
                ⚡ {cfg.hero_note}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={chip}>🚚 দ্রুত ডেলিভারি</span>
              <span style={chip}>💵 ক্যাশ অন ডেলিভারি</span>
              <span style={chip}>✅ ১০০% অরিজিনাল</span>
            </div>
          </div>

          {/* cover */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative' }}>
              {hasSaving && (
                <div style={{ position: 'absolute', top: -12, right: -12, zIndex: 2, background: t.ribbon, color: '#fff', fontWeight: 800, fontSize: 15, width: 62, height: 62, borderRadius: '50%', display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px rgba(0,0,0,.25)', textAlign: 'center', lineHeight: 1 }}>
                  <span>{savePct}%<br /><span style={{ fontSize: 9, fontWeight: 700 }}>OFF</span></span>
                </div>
              )}
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={name} style={{ width: 'min(300px, 74vw)', borderRadius: '6px 12px 12px 6px', boxShadow: `0 30px 60px rgba(0,0,0,.28), inset 4px 0 0 rgba(255,255,255,.15)`, display: 'block' }} />
              ) : (
                <div style={{ width: 260, height: 360, borderRadius: 12, background: t.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 40 }}>📕</div>
              )}
              {inStock && stock <= 20 && (
                <div style={{ marginTop: 14, textAlign: 'center', color: '#b45309', fontSize: 13, fontWeight: 700 }}>🔥 মাত্র {stock} কপি বাকি</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      {stats.length > 0 && (
        <section style={{ background: t.panel, borderBottom: `1px solid ${t.soft}` }}>
          <div style={{ ...wrap, display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 8, padding: '26px 20px' }}>
            {stats.slice(0, 4).map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '4px 6px' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: t.accent, letterSpacing: '-.5px' }}>{s.value}</div>
                <div style={{ fontSize: 12.5, color: t.sub, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===================== HIGHLIGHTS ===================== */}
      {highlights.length > 0 && (
        <section id="about" style={{ padding: '48px 0' }}>
          <div style={wrap}>
            <h2 style={sectionTitle}>কেন এই বইটি নেবেন</h2>
            <p style={sectionSub}>এক নজরে যা যা পাচ্ছেন</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, maxWidth: 760, margin: '0 auto' }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: t.panel, border: `1px solid ${t.soft}`, borderRadius: 12, padding: '14px 16px' }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: t.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 600 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== FEATURE CARDS ===================== */}
      {Array.isArray(cfg.features) && cfg.features.length > 0 && (
        <section style={{ padding: '10px 0 52px' }}>
          <div style={wrap}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {cfg.features.map((f: any, i: number) => (
                <div key={i} style={{ background: t.panel, border: `1px solid ${t.soft}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>{f.icon || '📘'}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px' }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.sub, margin: 0 }}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== VIDEO ===================== */}
      {videoUrl && (
        <section style={{ padding: '0 0 52px' }}>
          <div style={{ ...wrap, maxWidth: 820 }}>
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 44px rgba(0,0,0,.2)' }}>
              <iframe src={videoUrl} title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          </div>
        </section>
      )}

      {/* ===================== DESCRIPTION + SPEC ===================== */}
      {(product.description || spec.length > 0) && (
        <section style={{ background: t.panel, borderTop: `1px solid ${t.soft}`, borderBottom: `1px solid ${t.soft}`, padding: '52px 0' }}>
          <div style={{ ...wrap, display: 'grid', gridTemplateColumns: '1fr', gap: 34, maxWidth: 920 }} className="ib-desc">
            {product.description && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px' }}>বইটি সম্পর্কে</h2>
                <div
                  style={{ fontSize: 15, lineHeight: 1.8, color: t.ink }}
                  // admin/publisher-authored product description (trusted content)
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
            {spec.length > 0 && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px' }}>বইয়ের বিবরণ</h2>
                <div style={{ border: `1px solid ${t.soft}`, borderRadius: 12, overflow: 'hidden' }}>
                  {spec.map(([k, v], i) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 16px', fontSize: 14, background: i % 2 ? t.bg : 'transparent' }}>
                      <span style={{ color: t.sub, whiteSpace: 'nowrap' }}>{k}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================== GALLERY ===================== */}
      {gallery.length > 0 && (
        <section style={{ padding: '52px 0' }}>
          <div style={wrap}>
            <h2 style={sectionTitle}>ভেতরের কিছু ঝলক</h2>
            <p style={sectionSub}>বইয়ের ভেতরের পাতা</p>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
              {gallery.map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={g.original || g.thumbnail} alt={`preview ${i + 1}`} style={{ height: 220, borderRadius: 12, flexShrink: 0, boxShadow: '0 10px 24px rgba(0,0,0,.15)' }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TESTIMONIALS ===================== */}
      {Array.isArray(cfg.testimonials) && cfg.testimonials.length > 0 && (
        <section style={{ background: t.panel, borderTop: `1px solid ${t.soft}`, padding: '52px 0' }}>
          <div style={wrap}>
            <h2 style={sectionTitle}>পাঠকরা যা বলছেন</h2>
            <p style={sectionSub}>যাচাইকৃত ক্রেতাদের মতামত</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {cfg.testimonials.map((r: any, i: number) => (
                <div key={i} style={{ background: t.bg, border: `1px solid ${t.soft}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ color: '#f5b301', fontSize: 15, marginBottom: 8 }}>{'★'.repeat(r.rating || 5)}<span style={{ color: t.soft }}>{'★'.repeat(5 - (r.rating || 5))}</span></div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: '0 0 12px' }}>“{r.text}”</p>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{r.name || 'পাঠক'}</div>
                  {r.role && <div style={{ fontSize: 12, color: t.sub }}>{r.role}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== RELATED ===================== */}
      {cfg.show_related !== false && related.length > 0 && (
        <section style={{ padding: '52px 0' }}>
          <div style={wrap}>
            <h2 style={sectionTitle}>এই বইয়ের সাথে যা পড়েন</h2>
            <p style={sectionSub}>আরও যেসব বই আপনার ভালো লাগতে পারে</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {related.map((p: any) => {
                const psale = Number(p.sale_price ?? 0);
                const pprice = Number(p.price ?? 0);
                const pu = psale > 0 && psale < pprice ? psale : pprice;
                return (
                  <a key={p.id} href={`/products/${p.slug}`} style={{ textDecoration: 'none', color: t.ink, background: t.panel, border: `1px solid ${t.soft}`, borderRadius: 12, padding: 10, display: 'block' }}>
                    {p.image?.original || p.image?.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image.original || p.image.thumbnail} alt={p.name} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 7 }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '2/3', background: t.soft, borderRadius: 7 }} />
                    )}
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, lineHeight: 1.35, height: 34, overflow: 'hidden' }}>{p.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: t.accent, marginTop: 4 }}>{bdt(pu)}</div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===================== FAQ ===================== */}
      {Array.isArray(cfg.faqs) && cfg.faqs.length > 0 && (
        <section style={{ background: t.panel, borderTop: `1px solid ${t.soft}`, padding: '52px 0' }}>
          <div style={{ ...wrap, maxWidth: 720 }}>
            <h2 style={sectionTitle}>সাধারণ প্রশ্ন</h2>
            <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
              {cfg.faqs.map((f: any, i: number) => {
                const on = openFaq === i;
                return (
                  <div key={i} style={{ border: `1px solid ${t.soft}`, borderRadius: 12, overflow: 'hidden', background: t.bg }}>
                    <button onClick={() => setOpenFaq(on ? null : i)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '15px 18px', fontSize: 15, fontWeight: 700, color: t.ink, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>{f.q}</span><span style={{ color: t.accent, flexShrink: 0 }}>{on ? '−' : '+'}</span>
                    </button>
                    {on && <div style={{ padding: '0 18px 16px', fontSize: 14, lineHeight: 1.65, color: t.sub }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===================== FINAL ORDER CTA ===================== */}
      <section id="order" style={{ padding: '56px 0' }}>
        <div style={{ ...wrap, maxWidth: 720 }}>
          <div style={{ background: `linear-gradient(140deg, ${t.accent}, ${t.accent2})`, borderRadius: 22, padding: '38px 28px', textAlign: 'center', color: '#fff', boxShadow: `0 26px 56px ${t.accent}40` }}>
            <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>আজই সংগ্রহ করুন</h2>
            <p style={{ fontSize: 15, opacity: 0.92, margin: '0 0 20px' }}>{name}{author ? ` · ${author}` : ''}</p>

            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 40, fontWeight: 800 }}>{bdt(unit)}</span>
              {hasSaving && <span style={{ fontSize: 19, textDecoration: 'line-through', opacity: 0.7 }}>{bdt(rawPrice)}</span>}
            </div>

            {/* qty */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>পরিমাণ</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,.18)', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ border: 'none', background: 'transparent', color: '#fff', width: 38, height: 40, fontSize: 20, cursor: 'pointer' }}>−</button>
                <span style={{ width: 40, textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(inStock ? stock : 99, q + 1))} style={{ border: 'none', background: 'transparent', color: '#fff', width: 38, height: 40, fontSize: 20, cursor: 'pointer' }}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={buyNow} disabled={!inStock} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: t.accent, fontWeight: 800, fontSize: 16, padding: '15px 30px', borderRadius: 13, opacity: inStock ? 1 : 0.5 }}>
                {inStock ? ctaPrimary : 'স্টক শেষ'}
              </button>
              <button onClick={addToCart} disabled={!inStock} style={{ cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 13, border: '1.6px solid rgba(255,255,255,.6)', opacity: inStock ? 1 : 0.5 }}>
                কার্টে যোগ করুন
              </button>
            </div>
            <div style={{ marginTop: 18, fontSize: 12.5, opacity: 0.9 }}>🔒 নিরাপদ চেকআউট · ক্যাশ অন ডেলিভারি · ১০০% অরিজিনাল বই</div>
          </div>
        </div>
      </section>

      {/* ===================== STICKY MOBILE BAR ===================== */}
      <div className="ib-sticky" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, background: t.panel, borderTop: `1px solid ${t.soft}`, boxShadow: '0 -6px 20px rgba(0,0,0,.08)', padding: '10px 16px', display: 'none', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: t.sub }}>{inStock ? `${stock} কপি স্টকে` : 'স্টক শেষ'}</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: t.accent }}>{bdt(unit)}{hasSaving && <span style={{ fontSize: 12, color: t.sub, textDecoration: 'line-through', marginLeft: 6 }}>{bdt(rawPrice)}</span>}</div>
        </div>
        <button onClick={buyNow} disabled={!inStock} style={{ ...btnPrimary, padding: '13px 24px', fontSize: 15, opacity: inStock ? 1 : 0.5 }}>{inStock ? ctaPrimary : 'স্টক শেষ'}</button>
      </div>

      {/* responsive tweaks */}
      <style jsx global>{`
        @media (min-width: 860px) {
          .ib-hero { grid-template-columns: 1.15fr 0.85fr !important; align-items: center; }
          .ib-desc { grid-template-columns: 1.4fr 1fr !important; align-items: start; }
        }
        @media (max-width: 640px) {
          .ib-sticky { display: flex !important; }
          .ib-hero h1 { font-size: 30px !important; }
        }
      `}</style>
    </div>
  );
}
