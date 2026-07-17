import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, ExternalLink, Rocket } from 'lucide-react';
import { useUpdateLandingMutation } from '@/data/integrations';

const C = {
  ink: '#16221f', sub: '#6b7773', line: '#e7e8e3', brand: '#0f766e',
  brandSoft: '#e6f2f0', paper: '#f6f6f3', card: '#fff',
};

// Preview/live link points at the shop on the SAME host as this admin, so the
// staging admin opens the staging storefront and the live admin opens the live one.
const SHOP =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://indobangla.tech';

const THEMES = [
  { id: 'royal', label: 'Royal (maroon/gold)' },
  { id: 'classic', label: 'Classic (paper)' },
  { id: 'festive', label: 'Festive (red)' },
  { id: 'modern', label: 'Modern (teal)' },
];

// Which storefront layout renders. 'default' is the generic, config-driven template
// (every field below drives it). Anything else is a bespoke design built for one
// specific product — its look is fixed in the shop, so the generic fields become
// decorative. Add new special designs here as they are built.
const TEMPLATES = [
  { id: 'default', label: 'Default — customisable template', special: false },
  { id: 'anandamela', label: 'আনন্দমেলা ১৪৩৩ — special (fixed design)', special: true },
];
const isSpecialTemplate = (id: string) =>
  !!TEMPLATES.find((t) => t.id === id && t.special);

const emptyConfig = () => ({
  enabled: false,
  template: 'default',
  theme: 'royal',
  badge: '',
  headline: '',
  subheadline: '',
  hero_note: '',
  cta_primary: '',
  cta_secondary: '',
  video: '',
  show_related: true,
  highlights: [] as string[],
  features: [] as { icon: string; title: string; text: string }[],
  stats: [] as { value: string; label: string }[],
  testimonials: [] as { name: string; role: string; text: string; rating: number }[],
  faqs: [] as { q: string; a: string }[],
});

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13.5, outline: 'none',
  background: C.paper, fontFamily: 'inherit', color: C.ink,
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.sub, display: 'block', marginBottom: 5 };
const sec: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, background: C.card };
const secTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 800, color: C.ink, margin: '0 0 12px' };
const miniBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
  color: C.brand, background: C.brandSoft, border: 'none', borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 32, height: 32, flexShrink: 0,
  borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer',
};

export default function LandingEditorModal({
  product,
  initialConfig,
  onClose,
}: {
  product: { id: number; title: string; slug: string; cover?: string | null; author?: string };
  initialConfig?: any;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<any>(emptyConfig());
  const { mutate: save, isLoading } = useUpdateLandingMutation();

  useEffect(() => {
    setCfg({ ...emptyConfig(), ...(initialConfig || {}) });
  }, [initialConfig]);

  const set = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }));

  const special = isSpecialTemplate(cfg.template);

  // ---- list helpers ----
  const addHighlight = () => set('highlights', [...cfg.highlights, '']);
  const setHighlight = (i: number, v: string) =>
    set('highlights', cfg.highlights.map((x: string, j: number) => (j === i ? v : x)));
  const delHighlight = (i: number) => set('highlights', cfg.highlights.filter((_: any, j: number) => j !== i));

  const addFeature = () => set('features', [...cfg.features, { icon: '📘', title: '', text: '' }]);
  const setFeature = (i: number, k: string, v: string) =>
    set('features', cfg.features.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)));
  const delFeature = (i: number) => set('features', cfg.features.filter((_: any, j: number) => j !== i));

  const addStat = () => set('stats', [...cfg.stats, { value: '', label: '' }]);
  const setStat = (i: number, k: string, v: string) =>
    set('stats', cfg.stats.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)));
  const delStat = (i: number) => set('stats', cfg.stats.filter((_: any, j: number) => j !== i));

  const addTesti = () => set('testimonials', [...cfg.testimonials, { name: '', role: '', text: '', rating: 5 }]);
  const setTesti = (i: number, k: string, v: any) =>
    set('testimonials', cfg.testimonials.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)));
  const delTesti = (i: number) => set('testimonials', cfg.testimonials.filter((_: any, j: number) => j !== i));

  const addFaq = () => set('faqs', [...cfg.faqs, { q: '', a: '' }]);
  const setFaq = (i: number, k: string, v: string) =>
    set('faqs', cfg.faqs.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)));
  const delFaq = (i: number) => set('faqs', cfg.faqs.filter((_: any, j: number) => j !== i));

  const doSave = (enabled: boolean) => {
    save(
      { product_id: product.id, config: { ...cfg, enabled } },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(16,34,31,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 16px', overflowY: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, background: C.paper, borderRadius: 18, boxShadow: '0 30px 70px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px 20px', background: C.card, borderBottom: `1px solid ${C.line}` }}>
          {product.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover} alt="" style={{ width: 40, height: 52, borderRadius: 5, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 40, height: 52, borderRadius: 5, background: C.brandSoft, display: 'grid', placeItems: 'center' }}><Rocket size={18} color={C.brand} /></div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</div>
            <div style={{ fontSize: 12, color: C.sub }}>Landing page · #{product.id}</div>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={16} color={C.sub} /></button>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 16, maxHeight: '76vh', overflowY: 'auto' }}>
          {/* enable state */}
          <div style={{ ...sec, display: 'flex', alignItems: 'center', gap: 12, background: cfg.enabled ? '#e4f6ee' : C.card, borderColor: cfg.enabled ? '#a7d8bf' : C.line }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: C.ink }}>
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => set('enabled', e.target.checked)} style={{ width: 17, height: 17 }} />
              Enable landing page
            </label>
            <span style={{ fontSize: 12, color: C.sub }}>
              {cfg.enabled ? 'Live at ' : 'Preview at '}
              <a href={`${SHOP}/landing/${product.slug}`} target="_blank" rel="noreferrer" style={{ color: C.brand, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>/landing/{product.slug} <ExternalLink size={11} /></a>
            </span>
          </div>

          {/* template picker */}
          <div style={sec}>
            <h4 style={secTitle}>Template</h4>
            <select value={cfg.template} onChange={(e) => set('template', e.target.value)} style={{ ...inp, appearance: 'none' }}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {special && (
              <div style={{ marginTop: 10, display: 'flex', gap: 9, alignItems: 'flex-start', background: '#fbf1da', border: '1px solid #ecd9a6', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>✨</span>
                <span style={{ fontSize: 12, color: '#7a5a12', lineHeight: 1.5 }}>
                  This is a <b>fixed, single-product design</b> built just for this title. The price, cover, stock and
                  gallery still come from the product — but the layout and copy below are <b>not used</b>. Just enable it
                  and hit publish.
                </span>
              </div>
            )}
          </div>

          {!special && (
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5, margin: '-4px 2px 0' }}>
              All fields are optional — leave them blank and the page auto-fills from the product (title, cover, price,
              description, book details). Fill these to customise the pitch.
            </div>
          )}

          {!special && <>

          {/* hero */}
          <div style={sec}>
            <h4 style={secTitle}>Hero</h4>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Theme</label>
                  <select value={cfg.theme} onChange={(e) => set('theme', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                    {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Eyebrow badge</label>
                  <input value={cfg.badge} onChange={(e) => set('badge', e.target.value)} placeholder="পূজা বার্ষিকী ১৪৩৩" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Headline</label>
                <input value={cfg.headline} onChange={(e) => set('headline', e.target.value)} placeholder={product.title} style={inp} />
              </div>
              <div>
                <label style={lbl}>Subheadline</label>
                <input value={cfg.subheadline} onChange={(e) => set('subheadline', e.target.value)} placeholder="এক মলাটে সেরা উপন্যাস, গল্প, কমিক্স আর ফিচার…" style={inp} />
              </div>
              <div>
                <label style={lbl}>Offer / urgency note</label>
                <input value={cfg.hero_note} onChange={(e) => set('hero_note', e.target.value)} placeholder="সীমিত স্টক · আজ অর্ডার করলে দ্রুত ডেলিভারি" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Primary button text</label>
                  <input value={cfg.cta_primary} onChange={(e) => set('cta_primary', e.target.value)} placeholder="এখনই অর্ডার করুন" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Secondary button text</label>
                  <input value={cfg.cta_secondary} onChange={(e) => set('cta_secondary', e.target.value)} placeholder="বিস্তারিত দেখুন" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>YouTube / video URL (optional)</label>
                <input value={cfg.video} onChange={(e) => set('video', e.target.value)} placeholder="https://youtube.com/watch?v=…" style={inp} />
              </div>
            </div>
          </div>

          {/* highlights */}
          <div style={sec}>
            <h4 style={secTitle}>Key highlights (bullets)</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {cfg.highlights.map((h: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input value={h} onChange={(e) => setHighlight(i, e.target.value)} placeholder="যেমন: ৩০+ খ্যাতিমান লেখকের লেখা" style={inp} />
                  <button onClick={() => delHighlight(i)} style={iconBtn}><Trash2 size={15} color="#d23f3f" /></button>
                </div>
              ))}
              <button onClick={addHighlight} style={miniBtn}><Plus size={13} /> Add highlight</button>
            </div>
          </div>

          {/* stats */}
          <div style={sec}>
            <h4 style={secTitle}>Stat strip</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {cfg.stats.map((s: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input value={s.value} onChange={(e) => setStat(i, 'value', e.target.value)} placeholder="৫০০+" style={{ ...inp, flex: '0 0 120px' }} />
                  <input value={s.label} onChange={(e) => setStat(i, 'label', e.target.value)} placeholder="পৃষ্ঠা" style={inp} />
                  <button onClick={() => delStat(i)} style={iconBtn}><Trash2 size={15} color="#d23f3f" /></button>
                </div>
              ))}
              <button onClick={addStat} style={miniBtn}><Plus size={13} /> Add stat</button>
            </div>
          </div>

          {/* feature cards */}
          <div style={sec}>
            <h4 style={secTitle}>Feature cards</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              {cfg.features.map((f: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input value={f.icon} onChange={(e) => setFeature(i, 'icon', e.target.value)} placeholder="📘" style={{ ...inp, flex: '0 0 56px', textAlign: 'center' }} />
                  <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                    <input value={f.title} onChange={(e) => setFeature(i, 'title', e.target.value)} placeholder="Feature title" style={inp} />
                    <input value={f.text} onChange={(e) => setFeature(i, 'text', e.target.value)} placeholder="Short description" style={inp} />
                  </div>
                  <button onClick={() => delFeature(i)} style={iconBtn}><Trash2 size={15} color="#d23f3f" /></button>
                </div>
              ))}
              <button onClick={addFeature} style={miniBtn}><Plus size={13} /> Add feature card</button>
            </div>
          </div>

          {/* testimonials */}
          <div style={sec}>
            <h4 style={secTitle}>Reviews / testimonials</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              {cfg.testimonials.map((tt: any, i: number) => (
                <div key={i} style={{ display: 'grid', gap: 6, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={tt.name} onChange={(e) => setTesti(i, 'name', e.target.value)} placeholder="Name" style={inp} />
                    <input value={tt.role} onChange={(e) => setTesti(i, 'role', e.target.value)} placeholder="Verified buyer" style={inp} />
                    <select value={tt.rating} onChange={(e) => setTesti(i, 'rating', Number(e.target.value))} style={{ ...inp, flex: '0 0 70px', appearance: 'none' }}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}★</option>)}
                    </select>
                    <button onClick={() => delTesti(i)} style={iconBtn}><Trash2 size={15} color="#d23f3f" /></button>
                  </div>
                  <textarea value={tt.text} onChange={(e) => setTesti(i, 'text', e.target.value)} placeholder="What they said…" rows={2} style={{ ...inp, resize: 'vertical' }} />
                </div>
              ))}
              <button onClick={addTesti} style={miniBtn}><Plus size={13} /> Add testimonial</button>
            </div>
          </div>

          {/* faqs */}
          <div style={sec}>
            <h4 style={secTitle}>FAQ</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              {cfg.faqs.map((fq: any, i: number) => (
                <div key={i} style={{ display: 'grid', gap: 6, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={fq.q} onChange={(e) => setFaq(i, 'q', e.target.value)} placeholder="Question" style={inp} />
                    <button onClick={() => delFaq(i)} style={iconBtn}><Trash2 size={15} color="#d23f3f" /></button>
                  </div>
                  <textarea value={fq.a} onChange={(e) => setFaq(i, 'a', e.target.value)} placeholder="Answer" rows={2} style={{ ...inp, resize: 'vertical' }} />
                </div>
              ))}
              <button onClick={addFaq} style={miniBtn}><Plus size={13} /> Add FAQ</button>
            </div>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: C.ink, fontWeight: 600 }}>
            <input type="checkbox" checked={cfg.show_related} onChange={(e) => set('show_related', e.target.checked)} style={{ width: 16, height: 16 }} />
            Show “Readers also bought” / related books section
          </label>

          </>}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 20px', background: C.card, borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} style={{ padding: '10px 18px', border: `1px solid ${C.line}`, borderRadius: 10, background: C.card, fontWeight: 700, fontSize: 13.5, color: C.sub, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => doSave(false)} disabled={isLoading} style={{ padding: '10px 18px', border: `1px solid ${C.line}`, borderRadius: 10, background: C.paper, fontWeight: 700, fontSize: 13.5, color: C.ink, cursor: 'pointer', opacity: isLoading ? 0.6 : 1 }}>Save as draft</button>
          <button onClick={() => doSave(true)} disabled={isLoading} style={{ padding: '10px 20px', border: 'none', borderRadius: 10, background: C.brand, color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: isLoading ? 0.6 : 1 }}>
            <Rocket size={15} /> {isLoading ? 'Saving…' : 'Save & publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
