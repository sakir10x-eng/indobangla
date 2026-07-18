import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

/**
 * Bespoke, single-product landing design for the "আনন্দমেলা পূজাবার্ষিকী ১৪৩৩"
 * Puja annual. This is intentionally NOT config-driven — the layout, sections and
 * Bengali editorial copy are fixed for this one title. Only the live commerce bits
 * (price, MRP, stock, cover, gallery, order actions) are passed in from the product
 * so cart / checkout / WhatsApp keep working exactly like every other page.
 *
 * Selected in the admin via the landing template dropdown (template: 'anandamela').
 */

export type AnandamelaProps = {
  name: string;
  author: string;
  publisher: string;
  cover: string;
  gallery: { original?: string; thumbnail?: string; caption?: string }[];
  unit: number;          // effective price (sale if any, else MRP)
  rawPrice: number;      // MRP
  hasSaving: boolean;
  savePct: number;
  saveAmt: number;
  stock: number;
  inStock: boolean;
  qty: number;
  setQty: (fn: (q: number) => number) => void;
  buyNow: () => void;
  addToCart: () => void;
  waLink: string;
  productHref: string;   // /products/<slug>
  bdt: (n: number) => string;
  /** Free-gift offer, straight from the product (admin-defined pool). 0 = no offer. */
  giftMax?: number;
  giftPerCopy?: boolean;
  gifts?: { id: number; name: string; price?: number; in_stock?: boolean; image?: any }[];
};

/* --- fixed editorial content for আনন্দমেলা ১৪৩৩ --------------------------- */
const SPOTLIGHT = [
  { ic: '✒️', tag: 'কালেক্টরস আইটেম', title: 'সত্যজিতের খসড়ায় আনন্দমেলা', by: 'মুখবন্ধ: সন্দীপ রায়', pg: '৫২', text: 'আনন্দমেলার চেহারাটা যাঁর হাতে গড়া, সেই সত্যজিৎ রায়ের খসড়া — মুখবন্ধ লিখেছেন সন্দীপ রায়।' },
  // NOT "মিতিন মাসি" — that is সুচিত্রা ভট্টাচার্যের চরিত্র, not শীর্ষেন্দুর. The old copy said so
  // and it was simply wrong; the official contents only credits শীর্ষেন্দু with a গল্প.
  { ic: '✍️', tag: 'গল্প', title: 'শীর্ষেন্দুর কলমে', by: 'শীর্ষেন্দু মুখোপাধ্যায়', pg: '৩৮', text: 'প্রতি বছরের মতো এবারও পূজাবার্ষিকীর প্রথম দিকের পাতাতেই শীর্ষেন্দু মুখোপাধ্যায়।' },
  { ic: '🚀', tag: 'বড় গল্প', title: 'লক্ষ্য যখন হাতি-মানব', by: 'রূপম ইসলাম', pg: '৪৬৫', text: 'ফসিলস-এর ফ্রন্টম্যান এবার কলম হাতে, একখানা আস্ত বড় গল্প নিয়ে। গিটার নামিয়ে রেখে এবার অন্য সুর।' },
];

const TOC: { pill: string; items: { t: string; by?: string; pg?: string }[] }[] = [
  { pill: 'উপন্যাস', items: [
    { t: 'সেভেন পাইরেটস', by: 'স্মরণজিৎ চক্রবর্তী', pg: '৬২' },
    { t: 'নিশুতি রাতের হাতছানি', by: 'তিলোত্তমা মজুমদার', pg: '১৪৪' },
    { t: 'ক্যাপ্টেন অভিমন্যুর অভিযান', by: 'কৃষ্ণেন্দু মুখোপাধ্যায়', pg: '২৫০' },
    { t: 'ভুবনডাঙার চিতা', by: 'রম্যাণী গোস্বামী', pg: '৩৬৪' },
    { t: 'হারানো সাইকেল', by: 'সারস্বত চক্রবর্তী', pg: '৪৭৮' },
    { t: 'রঞ্জাবতীর স্কুলে', by: 'সর্বাণী বন্দ্যোপাধ্যায়', pg: '৫২০' },
  ] },
  { pill: 'বড় গল্প', items: [
    { t: 'গ্রামের গোয়েন্দা', by: 'সুকান্ত গঙ্গোপাধ্যায়', pg: '১২৬' },
    { t: 'লক্ষ্য যখন হাতি-মানব', by: 'রূপম ইসলাম', pg: '৪৬৫' },
  ] },
  { pill: 'গল্প', items: [
    { t: 'ঝুনঝুন', by: 'শীর্ষেন্দু মুখোপাধ্যায়', pg: '৩৮' },
    { t: 'পরেশবাবুর নাতনি', by: 'বাণী বসু', pg: '৪৭' },
    { t: 'হাড়িকাঠের পুণ্যকথা (নাদুখণ্ড)', by: 'সঞ্জীব চট্টোপাধ্যায়', pg: '৫৪' },
    { t: 'চোর ও জেঠামশাই', by: 'উল্লাস মল্লিক', pg: '৩৩৫' },
    { t: 'বৈঁচিপুরের কাকতাড়ুয়া', by: 'প্রচেত গুপ্ত', pg: '৪৭৩' },
    { t: 'ঝাঁকড়াবাবা', by: 'সুবর্ণ বসু', pg: '৫০৮' },
    { t: 'কুসুমপুরের ভূত অদ্ভুত', by: 'সুস্মিতা নাথ', pg: '৫১৬' },
    { t: 'হোরগোলপুরের ঘড়িবাবু', by: 'রঞ্জন দাশগুপ্ত', pg: '৫৫০' },
    { t: 'ব্লেড চেন', by: 'ধ্রুব মুখোপাধ্যায়', pg: '৫৫৫' },
  ] },
  { pill: 'কমিক্স', items: [
    { t: 'সেপ্টোপাসের খিদে', by: 'সত্যজিৎ রায় · ছবি: অভিজিৎ চট্টোপাধ্যায়', pg: '২০১' },
    { t: 'রাপ্পা রায়ের ওভারডোজ', by: 'সুযোগ বন্দ্যোপাধ্যায়', pg: '২৮৯' },
    { t: 'বলাই', by: 'রবীন্দ্রনাথ ঠাকুর · ছবি: পিনাকী দে', pg: '৩৪৩' },
    { t: 'হীরামানিক জ্বলে', by: 'বিভূতিভূষণ বন্দ্যোপাধ্যায় · ছবি: সুমন্ত গুহ', pg: '৪০৫' },
  ] },
  { pill: 'বিশেষ আকর্ষণ', items: [
    { t: 'সত্যজিতের খসড়ায় আনন্দমেলা', by: 'মুখবন্ধ: সন্দীপ রায়', pg: '৫২' },
  ] },
  // The sections below come off the publisher's official contents poster, which lists titles and
  // authors but no page numbers — so these carry no `pg`.
  { pill: 'বেড়ানো', items: [
    { t: 'দ্বীপের নাম অ্যালকাট্রাজ', by: 'উদ্দীপ্ত রায়' },
  ] },
  { pill: 'পুরাণ', items: [
    { t: 'দেবী-কথার চার রূপে', by: 'অর্ঘ্য বন্দ্যোপাধ্যায়' },
  ] },
  { pill: 'খেলা', items: [
    { t: 'ক্রিকেটের অজানা কাহিনি', by: 'সৌভিক নাহা' },
    { t: 'স্মৃতিরোমন্থন', by: 'গৌতম সরকার' },
    { t: 'ম্যারাথনের ম্যাজিক মানব', by: 'চন্দন রুদ্র' },
  ] },
  { pill: 'বিচিত্রা', items: [
    { t: 'চাঁদে আগুনের ঝিলিক', by: 'বিমান নাথ' },
    { t: 'বাড়ি থেকে পালিয়ে', by: 'অমিতাভ নাগ' },
    { t: 'নেতাজির খুদে সৈনিকরা', by: 'মধুশ্রী গুপ্ত' },
    { t: 'মহাকবির মৌচাক', by: 'শুভায়ু বন্দ্যোপাধ্যায়' },
    { t: 'জাপানের নতুন প্রজন্ম', by: 'অভিজিৎ মুখোপাধ্যায়' },
    { t: 'জ্যোতি ঠাকুর, ফ্রেনোলজি', by: 'আশিস পাঠক' },
    { t: 'শতবর্ষে মহাশ্বেতা', by: 'সুদেষ্ণা ঘোষ' },
    { t: 'অ্যাংলো ইন্ডিয়ানদের কথা', by: 'শুভশ্রী মুন্সী' },
    { t: 'ফিঙ্গারপ্রিন্টসের ইতিহাস', by: 'পৃথা বসু' },
  ] },
  { pill: 'নিয়মিত বিভাগ', items: [
    { t: 'আমার কুইজ', by: 'অভিজিৎ সুকুল' },
    { t: 'শব্দসন্ধান' },
  ] },
];

const COMICS = [
  { pow: 'সত্যজিৎ রায়', title: 'সেপ্টোপাসের খিদে', pg: '২০১', text: 'প্রোফেসর শঙ্কুর সেই চেনা রোমাঞ্চ, কমিকের পাতায়। চিত্রনাট্য ও ছবি: অভিজিৎ চট্টোপাধ্যায়।' },
  { pow: 'নতুন প্রজন্ম', title: 'রাপ্পা রায়ের ওভারডোজ', pg: '২৮৯', text: 'কাহিনি ও ছবি: সুযোগ বন্দ্যোপাধ্যায়। সহকারী শিল্পী: পাপিয়া বন্দ্যোপাধ্যায়।' },
  { pow: 'রবীন্দ্রনাথ', title: 'বলাই', pg: '৩৪৩', text: 'গাছকে ভালোবাসা সেই চেনা গল্পের কমিক, নতুন প্রাণে। ছবি: পিনাকী দে।' },
  { pow: 'বিভূতিভূষণ', title: 'হীরামানিক জ্বলে', pg: '৪০৫', text: 'গুপ্তধন-অভিযানের চিরসবুজ রোমাঞ্চ। চিত্রনাট্য ও ছবি: সুমন্ত গুহ।' },
];

const C = {
  gulal: '#E5187D', gulalDeep: '#B80E60',
  sky: '#3E97D6', skyDeep: '#16588F', skyPale: '#CDE9FA',
  kash: '#FDFAF2', rod: '#F2A93B', rodSoft: '#FCE3B4',
  maath: '#5E9E4D', lime: '#B9D732', kali: '#26333E', paper: '#FBF4E4',
};

export default function ProductLandingAnandamela(p: AnandamelaProps) {
  const {
    name, author, publisher, cover, gallery, unit, rawPrice, hasSaving,
    savePct, stock, inStock, qty, setQty, buyNow, addToCart, waLink, productHref, bdt,
    giftMax = 0, giftPerCopy = true, gifts = [],
  } = p;

  // Only advertise a gift that can actually be honoured: the offer must be switched on AND at
  // least one pool item must be in stock. guardGifts re-checks stock at order time, so promising
  // a sold-out gift here would just be a broken promise at checkout.
  const giftsInStock = (gifts ?? []).filter((g) => g?.in_stock !== false);
  const giftOn = giftMax > 0 && giftsInStock.length > 0;

  const [lightbox, setLightbox] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // reveal-on-scroll (component is client-only via ssr:false)
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.rv');
    if (!els?.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = lightbox ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lightbox]);

  const orderLabel = inStock ? 'সংগ্রহ করুন' : 'স্টক এলে জানাই';
  const galImgs = gallery.filter((g) => g && (g.original || g.thumbnail));

  return (
    <div ref={rootRef} className="am-root">
      <Head>
        <title>{`${name} — IndoBangla`}</title>
        <meta
          name="description"
          content="আনন্দমেলা পূজাবার্ষিকী ১৪৩৩ — অরিজিনাল কলকাতা সংস্করণ, এখন বাংলাদেশে। IndoBangla।"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=Noto+Serif+Bengali:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* ===================== HERO ===================== */}
      <header className="hero">
        <div className="cloud c1" /><div className="cloud c2" /><div className="cloud c3" />
        <div className="hero-inner">
          <div>
            {/* This is a Kolkata edition collected to order, so the badge talks about the
                pre-order rather than claiming the book is already on our shelf. */}
            <div className="badge-pub is-preorder">
              <span className="dot" /> বাংলাদেশে বসে সংগ্রহ করতে চাইলে — প্রি-অর্ডার চলছে
            </div>
            <p className="eyebrow">পূজাবার্ষিকী ১৪৩৩</p>
            <h1 className="masthead">আনন্দমেলা</h1>
            <p className="hero-sub">পুজো আসছে — আর আসছে সেই চেনা গন্ধ।<br />নতুন আনন্দমেলার পাতার গন্ধ।</p>
            <div className="hero-meta">
              <span className="meta-chip">৬টি <b>উপন্যাস</b></span>
              <span className="meta-chip">৯টি <b>গল্প</b></span>
              <span className="meta-chip">৪টি <b>কমিক্স</b></span>
              <span className="meta-chip">প্রচ্ছদ <b>কুনাল বর্মণ</b></span>
            </div>

            {/* Free-gift offer. Sits with the CTA because it is a reason to buy, not trivia —
                and it is rendered only when the offer is real (see giftOn). */}
            {giftOn && (
              <div className="gift-banner">
                <span className="gift-ic" aria-hidden="true">🎁</span>
                <div className="gift-txt">
                  <b>
                    এই বইয়ের সাথে {giftMax > 1 ? `${giftMax}টি` : '১টি'} উপহার <span className="gift-free">ফ্রি</span>
                  </b>
                  <span>
                    {giftsInStock.length > 1
                      ? `${giftsInStock.length}টি ম্যাগাজিন থেকে নিজে বেছে নিন — কার্টে যোগ করার সময়।`
                      : `${giftsInStock[0]?.name ?? 'উপহার'} — কার্টে যোগ করার সময় বেছে নিন।`}
                    {giftPerCopy && ' প্রতি কপিতেই।'}
                  </span>
                </div>
              </div>
            )}

            <div className="cta-row">
              <button className="btn btn-p" onClick={buyNow} disabled={!inStock}>{inStock ? orderLabel : 'স্টক শেষ'}</button>
              <a className="btn btn-g" href="#toc">সূচিপত্র দেখুন</a>
            </div>
          </div>
          <div className="cover-slot">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="cover" src={cover} alt={name} />
            ) : (
              <div className="cover cover-fallback">📕</div>
            )}
          </div>
        </div>
        <div className="kash-field" aria-hidden="true">
          <svg viewBox="0 0 1440 190" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,120 C240,90 480,150 720,120 C960,90 1200,150 1440,110 L1440,190 L0,190 Z" fill="#7FB56D" />
            <path d="M0,145 C260,115 520,170 780,142 C1040,115 1260,168 1440,138 L1440,190 L0,190 Z" fill="#5E9E4D" />
            {[
              [140, 150, 152, 8], [330, 322, 320, -6], [520, 530, 532, 7], [740, 748, 750, 5],
              [960, 952, 950, -7], [1160, 1170, 1172, 8], [1330, 1322, 1320, -6],
            ].map(([x1, x2, cx, rot], i) => (
              <g key={i} className={`stalk s${(i % 3) + 1}`} style={{ transformBox: 'fill-box' } as React.CSSProperties}>
                <line x1={x1} y1="184" x2={x2} y2="78" stroke="#8FAE6B" strokeWidth="4" />
                <ellipse cx={cx} cy="64" rx="13" ry="30" fill="#FDFAF2" transform={`rotate(${rot} ${cx} 64)`} />
              </g>
            ))}
          </svg>
        </div>
      </header>

      {/* ===================== নস্টালজিয়া ===================== */}
      <section className="smell">
        <div className="page rv">
          <div className="shiuli" aria-hidden="true">🌸 ☁️ 🍂</div>
          <h2>সেই চেনা অপেক্ষা, আবার</h2>
          <p className="serif dc">শরতের ভোরে শিশিরভেজা শিউলি, নীল আকাশে পেঁজা তুলোর মেঘ, আর মাঠ ভরা কাশফুল — পুজো মানে তো শুধু প্যান্ডেল নয়। পুজো মানে নতুন জামার গন্ধের পাশে আরেকটা গন্ধ: নতুন পূজাবার্ষিকী আনন্দমেলার পাতার গন্ধ।</p>
          <p className="serif">মনে আছে? পড়ার বইয়ের আড়ালে লুকিয়ে পড়া, বালিশে উপুড় হয়ে ডুবে যাওয়া, আর “এই পরীক্ষা শেষ হোক” বলে মায়ের তুলে রাখা সেই মোড়কবন্দি সংখ্যাটা? যে অপেক্ষাটা প্রতি বছর ফিরে আসত — সেই অপেক্ষা আবারও ফিরল।</p>
        </div>
      </section>

      {/* ===================== ঐতিহ্য ===================== */}
      <section className="legacy">
        <div className="wrap rv">
          <h2>১৯৭৫ থেকে <em>বাঙালির ছেলেবেলা</em></h2>
          <p className="lead">পঞ্চাশ বছর ধরে আনন্দমেলার পাতাতেই বড় হয়েছে প্রজন্মের পর প্রজন্ম। এই পাতাতেই এসেছে ফেলুদা, প্রোফেসর শঙ্কু, কাকাবাবু; বাংলায় কথা বলেছে টিনটিন আর অ্যাসটেরিক্স। যে বাবা-মা ছেলেবেলায় আনন্দমেলার জন্য অপেক্ষা করতেন, এই তাঁরাই সন্তানের হাতে তুলে দেন।</p>
          <div className="chips">
            {['ফেলুদা', 'প্রোফেসর শঙ্কু', 'কাকাবাবু', 'টিনটিন', 'অ্যাসটেরিক্স', 'অরণ্যদেব', 'রাপ্পা রায়'].map((c) => (
              <span className="chip" key={c}>{c}</span>
            ))}
          </div>
          <p className="note">প্রথম সংখ্যার প্রচ্ছদ এঁকেছিলেন স্বয়ং সত্যজিৎ রায়।</p>
        </div>
      </section>

      {/* ===================== বিশেষ আকর্ষণ ===================== */}
      <section className="spot">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="pill-eyebrow">বিশেষ আকর্ষণ</span>
            <h2>এবারের সংখ্যায় <span>যা মিস করা যাবে না</span></h2>
          </div>
          <div className="spot-grid">
            {SPOTLIGHT.map((s, i) => (
              <article className="spot-card rv" key={i}>
                <span className="big-ic" aria-hidden="true">{s.ic}</span>
                <p className="spot-tag">{s.tag}</p>
                <h3>{s.title}</h3>
                <p className="by"><b>{s.by}</b> · পৃষ্ঠা {s.pg}</p>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== সূচিপত্র ===================== */}
      <section className="toc" id="toc">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="pill-eyebrow">সূচিপত্র</span>
            <h2>ভেতরে <span>কী কী থাকছে</span></h2>
            <p className="sub">পৃষ্ঠা নম্বরসহ তালিকা</p>
          </div>
          <div className="toc-grid">
            {TOC.map((col, i) => (
              <div className="toc-card rv" key={i}>
                <span className="toc-pill">{col.pill}</span>
                <ul>
                  {col.items.map((it, j) => (
                    <li key={j}>
                      <span className="t">{it.t}{it.by && <small>{it.by}</small>}</span>
                      <span className="pg">{it.pg ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== কমিক্স ===================== */}
      <section className="comics">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="pill-eyebrow">কমিক্স</span>
            <h2>চার মাস্টারের গল্প, <span>কমিক্সের প্যানেলে</span></h2>
          </div>
          <div className="comic-grid">
            {COMICS.map((c, i) => (
              <article className="panel rv" key={i}>
                <span className="pow">{c.pow}</span>
                <h3>{c.title}</h3>
                <p className="pgtag">পৃষ্ঠা {c.pg}</p>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== ভেতরের ঝলক (product gallery) ===================== */}
      {galImgs.length > 0 && (
        <section className="peek">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="pill-eyebrow">ভেতরের ঝলক</span>
              <h2>পাতা উল্টে <span>দেখে নিন</span></h2>
              <p className="sub">ছবিতে ক্লিক করলে বড় করে দেখা যাবে</p>
            </div>
            <div className="gal">
              {galImgs.map((g, i) => {
                const src = g.original || g.thumbnail || '';
                return (
                  <figure key={i} onClick={() => setLightbox(src)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" src={src} alt={g.caption || `ভেতরের পাতা ${i + 1}`} />
                    {g.caption && <figcaption>{g.caption}</figcaption>}
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {lightbox && (
        <div className="lb on" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button className="lb-x" aria-label="বন্ধ করুন" onClick={() => setLightbox(null)}>×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ===================== বাংলাদেশ ===================== */}
      <section className="bd">
        <div className="wrap rv">
          <h2>অরিজিনাল কলকাতা সংস্করণ, <em>এখন আপনার শহরে</em></h2>
          <p className="lead">নীলক্ষেত্র ফুটপাতে খুঁজে বেড়ানোর দিন শেষ। আনন্দমেলা পূজাবার্ষিকী ১৪৩৩-এর আসল কলকাতা সংস্করণ IndoBangla নিয়ে আসছে সরাসরি আপনার দরজায়।</p>
          <div className="bd-grid">
            <div className="bd-card rv"><span className="ic">📦</span><h3>১০০% অরিজিনাল</h3><p>ভারত থেকে আমদানি করা আসল ছাপা সংস্করণ — ফটোকপি বা পাইরেটেড নয়।</p></div>
            <div className="bd-card rv"><span className="ic">🚚</span><h3>সারা দেশে ডেলিভারি</h3><p>ঢাকার ভিতরে ও বাইরে — ক্যাশ অন ডেলিভারিতে বই পৌঁছে যাবে হাতে।</p></div>
            <div className="bd-card rv"><span className="ic">💬</span><h3>সহজ অর্ডার</h3><p>{inStock ? 'সরাসরি অর্ডার করুন — কয়েক ক্লিকেই।' : 'স্টক এলে সবার আগে আপনাকে জানানো হবে।'}</p></div>
          </div>
        </div>
      </section>

      {/* ===================== FINAL ===================== */}
      <section className="final" id="order">
        <div className="wrap rv">
          <h2>{inStock ? 'অপেক্ষাটা আবার শেষ হোক' : 'এবারে নাম লিখিয়ে রাখুন'}</h2>
          <p>যে আনন্দমেলা আপনার ছেলেবেলা রাঙিয়েছিল, সেটাই তুলে দিন পরের প্রজন্মের হাতে। পূজাবার্ষিকী ১৪৩৩ — সংগ্রহে রাখার মতো একটা সংখ্যা।</p>

          <div className="price-tag">
            <b>{bdt(unit)}</b>
            {hasSaving && <s>{bdt(rawPrice)}</s>}
            <span>{inStock ? (stock <= 20 ? `🔥 মাত্র ${stock} কপি বাকি — আগে এলে আগে পাবেন` : 'স্টকে আছে — অর্ডার করলেই পাঠানো হবে') : 'স্টক এলে সবার আগে আপনাকে জানানো হবে'}</span>
          </div>

          {inStock && (
            <div className="qty-row">
              <span>পরিমাণ</span>
              <div className="qty">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="কমান">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(stock || 99, q + 1))} aria-label="বাড়ান">+</button>
              </div>
            </div>
          )}

          <div className="cta-row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-p" onClick={buyNow} disabled={!inStock}>{inStock ? orderLabel : 'স্টক শেষ'}</button>
            {inStock && <button className="btn btn-g" onClick={addToCart}>কার্টে যোগ করুন</button>}
          </div>
          <div className="secure">🔒 নিরাপদ চেকআউট · ক্যাশ অন ডেলিভারি · ১০০% অরিজিনাল</div>
          <a className="prod-link" href={productHref}>সাধারণ পণ্যের পেজ দেখুন →</a>
        </div>
      </section>

      <footer className="am-footer">
        <b>IndoBangla</b> — অরিজিনাল ভারতীয় ও বাংলা বইয়ের নির্ভরযোগ্য ঠিকানা ·{' '}
        <a href="/">সব বই</a><br />
        আনন্দমেলা ABP গোষ্ঠীর প্রকাশনা ও ট্রেডমার্ক। IndoBangla একটি স্বাধীন বই আমদানিকারক ও বিক্রেতা।
      </footer>

      <style jsx global>{styles}</style>
    </div>
  );
}

const styles = `
.am-root{--gulal:${C.gulal};--gulal-deep:${C.gulalDeep};--sky:${C.sky};--sky-deep:${C.skyDeep};--sky-pale:${C.skyPale};--kash:${C.kash};--rod:${C.rod};--rod-soft:${C.rodSoft};--maath:${C.maath};--lime:${C.lime};--kali:${C.kali};--paper:${C.paper};font-family:'Hind Siliguri',sans-serif;color:var(--kali);background:var(--kash);overflow-x:hidden;line-height:1.75}
.am-root h1,.am-root h2,.am-root h3{font-family:'Baloo Da 2',cursive;line-height:1.25}
.am-root .serif{font-family:'Noto Serif Bengali',serif}
.am-root .wrap{max-width:1100px;margin:0 auto;padding:0 22px}
.am-root img{max-width:100%;display:block}
.am-root a{color:inherit}
.am-root .rv{opacity:0;transform:translateY(26px);transition:opacity .8s ease,transform .8s ease}
.am-root .rv.in{opacity:1;transform:none}
.am-root .btn{font-family:'Baloo Da 2',cursive;font-weight:700;font-size:1.08rem;padding:13px 30px;border-radius:100px;text-decoration:none;transition:transform .25s,box-shadow .25s;display:inline-block;border:none;cursor:pointer}
.am-root .btn:hover{transform:translateY(-3px) scale(1.02)}
.am-root .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.am-root .btn-p{background:var(--gulal);color:#fff;box-shadow:0 12px 26px -10px rgba(184,14,96,.6)}
.am-root .btn-g{background:rgba(255,255,255,.92);color:var(--sky-deep);box-shadow:0 10px 24px -12px rgba(20,70,120,.5)}
.am-root .btn-wa{background:#25D366;color:#fff}
.am-root .cta-row{display:flex;gap:14px;flex-wrap:wrap}
/* Gift banner — reads as an offer, not a warning: gulal border on the paper tone, so it lifts
   off the hero without competing with the primary CTA underneath it. */
.am-root .gift-banner{display:flex;align-items:center;gap:12px;margin:16px 0 4px;padding:12px 16px;border:2px dashed var(--gulal);border-radius:14px;background:rgba(255,255,255,.92);max-width:560px}
.am-root .gift-ic{font-size:1.7rem;line-height:1;flex-shrink:0}
.am-root .gift-txt{display:flex;flex-direction:column;gap:2px;min-width:0}
.am-root .gift-txt b{color:var(--gulal-deep);font-size:1rem;font-weight:800}
.am-root .gift-txt span{color:var(--kali);font-size:.86rem;opacity:.85;line-height:1.5}
.am-root .gift-free{background:var(--gulal);color:#fff;border-radius:6px;padding:1px 8px;margin-left:2px;font-size:.85rem}
@media(max-width:640px){.am-root .gift-banner{padding:10px 12px;gap:10px}.am-root .gift-txt b{font-size:.94rem}}

/* HERO */
.am-root .hero{position:relative;min-height:100vh;background:linear-gradient(180deg,#1D74B8 0%,var(--sky) 34%,#8CC6EC 62%,var(--sky-pale) 82%,var(--kash) 100%);overflow:hidden;display:flex;flex-direction:column}
.am-root .cloud{position:absolute;background:#fff;border-radius:100px;opacity:.9;filter:blur(1px)}
.am-root .cloud::before,.am-root .cloud::after{content:"";position:absolute;background:#fff;border-radius:50%}
.am-root .c1{width:180px;height:52px;top:12%;left:-200px;animation:am-drift 65s linear infinite}
.am-root .c1::before{width:80px;height:80px;top:-38px;left:28px}
.am-root .c1::after{width:60px;height:60px;top:-26px;left:88px}
.am-root .c2{width:130px;height:40px;top:26%;left:-160px;animation:am-drift 90s linear infinite 8s;opacity:.75}
.am-root .c2::before{width:60px;height:60px;top:-28px;left:22px}
.am-root .c2::after{width:44px;height:44px;top:-18px;left:66px}
.am-root .c3{width:220px;height:60px;top:6%;left:-260px;animation:am-drift 110s linear infinite 20s;opacity:.65}
.am-root .c3::before{width:95px;height:95px;top:-45px;left:35px}
.am-root .c3::after{width:70px;height:70px;top:-30px;left:110px}
@keyframes am-drift{from{transform:translateX(0)}to{transform:translateX(calc(100vw + 320px))}}
.am-root .hero-inner{position:relative;z-index:3;flex:1;display:grid;grid-template-columns:1fr;gap:40px;align-items:center;max-width:1100px;margin:0 auto;padding:96px 22px 210px}
.am-root .badge-pub{display:inline-flex;align-items:center;gap:9px;background:var(--rod);color:#5B3A00;font-weight:700;font-size:.95rem;padding:6px 18px;border-radius:100px;transform:rotate(-2deg);box-shadow:0 6px 16px -6px rgba(0,0,0,.3);margin-bottom:18px;letter-spacing:.4px}
.am-root .badge-pub.is-preorder{background:#fff;color:var(--gulal-deep)}
.am-root .badge-pub .dot{width:9px;height:9px;border-radius:50%;background:#fff;animation:am-blink 1.6s ease infinite}
.am-root .badge-pub.is-preorder .dot{background:var(--gulal)}
@keyframes am-blink{0%,100%{opacity:1}50%{opacity:.25}}
.am-root .eyebrow{color:#EAF6FF;font-weight:600;font-size:clamp(1.05rem,2.2vw,1.35rem);letter-spacing:2px;text-shadow:0 2px 10px rgba(10,60,100,.35)}
.am-root .masthead{font-size:clamp(3.4rem,9.5vw,6.4rem);font-weight:800;color:var(--gulal);text-shadow:0 3px 0 #fff,0 10px 28px rgba(120,0,60,.35);letter-spacing:1px;margin:0 0 6px;transform:rotate(-1.2deg)}
.am-root .hero-sub{color:#F4FAFF;font-family:'Noto Serif Bengali',serif;font-size:clamp(1.05rem,2.1vw,1.3rem);max-width:30ch;text-shadow:0 2px 12px rgba(10,60,100,.45);margin-bottom:14px}
.am-root .hero-meta{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 26px}
.am-root .meta-chip{background:rgba(255,255,255,.9);color:var(--sky-deep);font-weight:600;font-size:.9rem;padding:4px 15px;border-radius:100px}
.am-root .meta-chip b{color:var(--gulal-deep)}
.am-root .cover-slot{display:flex;justify-content:center}
.am-root .cover{width:min(330px,76vw);border-radius:10px;transform:rotate(3deg);box-shadow:0 30px 60px -20px rgba(15,55,95,.55),0 0 0 8px rgba(255,255,255,.85);transition:transform .5s;animation:am-float 7s ease-in-out infinite}
.am-root .cover:hover{transform:rotate(0) scale(1.03)}
.am-root .cover-fallback{display:grid;place-items:center;height:min(430px,99vw);background:var(--gulal);color:#fff;font-size:64px}
@keyframes am-float{0%,100%{translate:0 0}50%{translate:0 -12px}}
.am-root .kash-field{position:absolute;bottom:-4px;left:0;width:100%;z-index:2;pointer-events:none}
.am-root .kash-field svg{display:block;width:100%;height:auto}
.am-root .stalk{transform-origin:bottom center;animation:am-sway 5.5s ease-in-out infinite}
.am-root .stalk.s2{animation-duration:6.8s;animation-delay:.7s}
.am-root .stalk.s3{animation-duration:6s;animation-delay:1.4s}
@keyframes am-sway{0%,100%{transform:rotate(-2.2deg)}50%{transform:rotate(2.4deg)}}

/* নস্টালজিয়া */
.am-root .smell{background:radial-gradient(ellipse at 20% 10%,rgba(242,169,59,.14),transparent 55%),radial-gradient(ellipse at 85% 90%,rgba(229,24,125,.07),transparent 50%),var(--paper);padding:96px 0 90px}
.am-root .smell .page{max-width:760px;margin:0 auto;padding:0 22px;text-align:center}
.am-root .shiuli{font-size:2rem;letter-spacing:14px;margin-bottom:18px}
.am-root .smell h2{font-size:clamp(1.7rem,4.4vw,2.5rem);color:var(--gulal-deep);margin-bottom:22px}
.am-root .smell p{font-family:'Noto Serif Bengali',serif;font-size:clamp(1.02rem,2vw,1.18rem);color:#4A4034;text-align:justify;text-align-last:center}
.am-root .smell p+p{margin-top:16px}
.am-root .smell .dc::first-letter{font-family:'Baloo Da 2',cursive;font-size:3.2em;color:var(--gulal);float:left;line-height:.85;padding:4px 10px 0 0}

/* ঐতিহ্য */
.am-root .legacy{background:var(--sky-deep);color:#EAF4FC;padding:80px 0;position:relative;overflow:hidden}
.am-root .legacy::before{content:"১৯৭৫";position:absolute;right:-40px;top:-60px;font-family:'Baloo Da 2',cursive;font-weight:800;font-size:22rem;color:rgba(255,255,255,.05);line-height:1}
.am-root .legacy h2{font-size:clamp(1.8rem,4.6vw,2.7rem);color:#fff;margin-bottom:10px}
.am-root .legacy h2 em{color:var(--rod);font-style:normal}
.am-root .legacy .lead{font-family:'Noto Serif Bengali',serif;max-width:60ch;opacity:.92;margin-bottom:34px}
.am-root .chips{display:flex;flex-wrap:wrap;gap:12px}
.am-root .chip{background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.35);padding:8px 20px;border-radius:100px;font-weight:600;font-size:.98rem;transition:background .3s,transform .3s}
.am-root .chip:hover{background:var(--gulal);border-color:var(--gulal);transform:translateY(-3px)}
.am-root .legacy .note{margin-top:26px;font-size:.9rem;opacity:.65}

/* spotlight */
.am-root .spot{padding:96px 0 46px;background:var(--kash)}
.am-root .sec-head{text-align:center;margin-bottom:50px}
.am-root .pill-eyebrow{display:inline-block;background:var(--lime);color:#3D4A00;font-family:'Baloo Da 2',cursive;font-weight:700;font-size:1.05rem;padding:6px 26px;border-radius:100px;margin-bottom:14px;transform:rotate(-1.5deg);box-shadow:0 6px 14px -8px rgba(80,100,0,.5)}
.am-root .sec-head h2{font-size:clamp(1.9rem,5vw,2.8rem);color:var(--kali)}
.am-root .sec-head h2 span{color:var(--gulal)}
.am-root .sec-head .sub{color:#6C7883;font-size:.98rem;margin-top:6px}
.am-root .spot-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.am-root .spot-card{background:#fff;border-radius:22px;padding:32px 28px 28px;box-shadow:0 18px 40px -18px rgba(22,88,143,.35);transition:transform .35s,box-shadow .35s;border-top:6px solid var(--gulal)}
.am-root .spot-card:nth-child(2){border-top-color:var(--rod)}
.am-root .spot-card:nth-child(3){border-top-color:var(--sky)}
.am-root .spot-card:hover{transform:translateY(-8px) rotate(-.4deg);box-shadow:0 26px 50px -20px rgba(22,88,143,.45)}
.am-root .spot-tag{font-size:.82rem;font-weight:700;letter-spacing:1.5px;color:var(--gulal);margin-bottom:8px}
.am-root .spot-card:nth-child(2) .spot-tag{color:#C07E12}
.am-root .spot-card:nth-child(3) .spot-tag{color:var(--sky-deep)}
.am-root .spot-card h3{font-size:1.4rem;margin-bottom:4px;color:var(--kali)}
.am-root .spot-card .by{font-size:.9rem;color:#7A8590;margin-bottom:10px}
.am-root .spot-card .by b{color:var(--gulal-deep)}
.am-root .spot-card p{font-size:.97rem;color:#55606A}
.am-root .spot-card .big-ic{font-size:2.1rem;margin-bottom:10px;display:block}

/* সূচিপত্র */
.am-root .toc{padding:60px 0 90px;background:var(--kash)}
.am-root .toc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px}
.am-root .toc-card{background:#fff;border-radius:18px;padding:26px 24px;box-shadow:0 10px 26px -14px rgba(22,88,143,.25)}
.am-root .toc-pill{display:inline-block;background:var(--lime);color:#37430A;font-family:'Baloo Da 2',cursive;font-weight:700;font-size:1.12rem;padding:4px 22px;border-radius:100px;margin-bottom:16px}
.am-root .toc-card ul{list-style:none;padding:0;margin:0}
.am-root .toc-card li{display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px dotted #E2DCCB}
.am-root .toc-card li:last-child{border-bottom:none}
.am-root .toc-card .t{font-family:'Noto Serif Bengali',serif;font-weight:600;color:var(--gulal-deep);font-size:1rem;flex:1;line-height:1.4}
.am-root .toc-card .t small{display:block;font-family:'Hind Siliguri',sans-serif;font-weight:400;color:#7C8792;font-size:.85rem}
.am-root .toc-card .pg{font-family:'Baloo Da 2',cursive;font-weight:700;color:var(--rod);font-size:1rem;min-width:34px;text-align:right}

/* গ্যালারি */
.am-root .peek{background:linear-gradient(180deg,var(--paper) 0%,#F6EEDA 100%);padding:90px 0}
.am-root .gal{columns:3;column-gap:18px}
.am-root .gal figure{break-inside:avoid;margin:0 0 18px;background:#fff;padding:10px 10px 0;border-radius:12px;box-shadow:0 10px 24px -14px rgba(60,40,10,.5);cursor:zoom-in;transition:transform .3s,box-shadow .3s;border:1px solid #EDE3CB}
.am-root .gal figure:hover{transform:translateY(-5px) rotate(-.5deg);box-shadow:0 20px 36px -16px rgba(60,40,10,.55)}
.am-root .gal img{border-radius:6px;width:100%}
.am-root .gal figcaption{font-size:.85rem;color:#8A7C61;text-align:center;padding:8px 4px 10px;font-weight:600}

/* lightbox */
.am-root .lb{position:fixed;inset:0;background:rgba(18,28,36,.93);display:none;align-items:center;justify-content:center;z-index:99;padding:24px}
.am-root .lb.on{display:flex}
.am-root .lb img{max-width:94vw;max-height:88vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.am-root .lb-x{position:absolute;top:16px;right:22px;background:var(--gulal);color:#fff;border:none;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer;font-family:sans-serif;line-height:1}

/* কমিক্স */
.am-root .comics{background:radial-gradient(circle at 8% 15%,rgba(229,24,125,.16),transparent 40%),radial-gradient(circle at 92% 85%,rgba(62,151,214,.18),transparent 40%),#FFF6E8;padding:96px 0;position:relative}
.am-root .comics::before{content:"";position:absolute;inset:0;opacity:.5;background-image:radial-gradient(rgba(229,24,125,.13) 1.3px,transparent 1.3px);background-size:18px 18px;pointer-events:none}
.am-root .comics .wrap{position:relative;z-index:1}
.am-root .comic-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:22px}
.am-root .panel{background:#fff;border:3px solid var(--kali);border-radius:14px;padding:26px 22px;position:relative;box-shadow:7px 7px 0 var(--kali);transition:transform .25s,box-shadow .25s}
.am-root .panel:hover{transform:translate(-3px,-3px);box-shadow:11px 11px 0 var(--gulal)}
.am-root .panel h3{font-size:1.28rem;color:var(--gulal-deep);margin-bottom:6px}
.am-root .panel .pgtag{font-family:'Baloo Da 2',cursive;color:var(--rod);font-weight:700;font-size:.9rem;margin-bottom:8px}
.am-root .panel p{font-size:.92rem;color:#4A555F}
.am-root .panel .pow{position:absolute;top:-15px;right:14px;background:var(--rod);font-family:'Baloo Da 2',cursive;font-weight:800;font-size:.8rem;color:#5B3A00;padding:3px 14px;border-radius:100px;transform:rotate(4deg);border:2px solid var(--kali)}

/* বাংলাদেশ */
.am-root .bd{background:var(--maath);color:#F3FAEF;padding:90px 0;position:relative;overflow:hidden}
.am-root .bd h2{font-size:clamp(1.8rem,4.6vw,2.6rem);color:#fff;margin-bottom:12px}
.am-root .bd h2 em{font-style:normal;color:#FFE9A8}
.am-root .bd .lead{font-family:'Noto Serif Bengali',serif;max-width:58ch;opacity:.95;margin-bottom:40px}
.am-root .bd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;position:relative;z-index:1}
.am-root .bd-card{background:rgba(255,255,255,.13);border:1.5px solid rgba(255,255,255,.3);border-radius:18px;padding:26px 24px}
.am-root .bd-card .ic{font-size:1.9rem;display:block;margin-bottom:10px}
.am-root .bd-card h3{font-size:1.22rem;color:#fff;margin-bottom:6px}
.am-root .bd-card p{font-size:.95rem;opacity:.9}

/* final */
.am-root .final{background:linear-gradient(180deg,var(--kash) 0%,var(--sky-pale) 60%,#9DCFF0 100%);padding:100px 0 130px;text-align:center}
.am-root .final h2{font-size:clamp(2rem,5.5vw,3.1rem);color:var(--gulal);margin-bottom:12px;transform:rotate(-1deg)}
.am-root .final p{font-family:'Noto Serif Bengali',serif;max-width:52ch;margin:0 auto 22px;color:#33475A}
.am-root .price-tag{display:inline-block;background:#fff;border:2px dashed var(--gulal);border-radius:14px;padding:10px 26px;margin-bottom:22px}
.am-root .price-tag b{font-family:'Baloo Da 2',cursive;color:var(--gulal-deep);font-size:1.6rem}
.am-root .price-tag s{color:#9AA5AF;margin-left:10px;font-size:1.1rem}
.am-root .price-tag span{display:block;font-size:.85rem;color:#7A8590}
.am-root .qty-row{display:flex;justify-content:center;align-items:center;gap:14px;margin-bottom:22px}
.am-root .qty-row>span{font-weight:700;color:#33475A}
.am-root .qty{display:inline-flex;align-items:center;background:#fff;border:1.5px solid var(--sky-pale);border-radius:12px;overflow:hidden}
.am-root .qty button{border:none;background:transparent;color:var(--gulal-deep);width:40px;height:42px;font-size:20px;cursor:pointer}
.am-root .qty>span{width:42px;text-align:center;font-weight:800;font-size:1.05rem}
.am-root .secure{margin-top:18px;font-size:.85rem;color:#4A6070}
.am-root .prod-link{display:inline-block;margin-top:14px;color:var(--sky-deep);font-weight:600;font-size:.9rem;text-decoration:underline}

.am-root .am-footer{background:var(--sky-deep);color:#BFDCF2;text-align:center;padding:28px 22px;font-size:.9rem}
.am-root .am-footer b{color:#fff}
.am-root .am-footer a{color:var(--rod);text-decoration:none;font-weight:600}

@media(min-width:900px){
  .am-root .hero-inner{grid-template-columns:1.15fr .85fr}
}
@media(max-width:900px){
  .am-root .hero-inner{text-align:center;padding-top:80px;padding-bottom:230px;gap:34px}
  .am-root .hero-sub{margin-left:auto;margin-right:auto}
  .am-root .cta-row,.am-root .hero-meta{justify-content:center}
  .am-root .badge-pub{margin-left:auto;margin-right:auto}
  .am-root .spot-grid,.am-root .bd-grid{grid-template-columns:1fr}
  .am-root .gal{columns:2}
}
@media(max-width:560px){.am-root .gal{columns:1}}
@media(prefers-reduced-motion:reduce){
  .am-root *,.am-root *::before,.am-root *::after{animation:none!important;transition:none!important}
  .am-root .rv{opacity:1;transform:none}
}
`;
