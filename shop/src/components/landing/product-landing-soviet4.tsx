import { useEffect, useRef } from 'react';
import Head from 'next/head';

/**
 * Bespoke, single-product landing design for "সোভিয়েত দেশের শিশুসাহিত্য সমগ্র ৪".
 * The markup + CSS below are the designer-authored page, verbatim; only the live
 * commerce bits (real price, order button, WhatsApp) are re-wired at runtime from
 * the product so cart / checkout keep working like every other page.
 *
 * Selected in the admin via the landing template dropdown (template: 'soviet4').
 */

const CSS = `:root{
  --ink:#221E1B;
  --ink-soft:#4A423B;
  --paper:#F6EFE2;
  --paper-2:#EFE4D1;
  --red:#EF3543;
  --red-deep:#A8161F;
  --gold:#E7B23C;
  --pine:#2C6350;
  --line:rgba(34,30,27,.16);
  --shadow:0 18px 44px rgba(34,30,27,.22);
  --display:'Baloo Da 2', system-ui, sans-serif;
  --body:'Noto Serif Bengali', Georgia, serif;
  --util:'Hind Siliguri', system-ui, sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--body);font-size:17px;line-height:1.85;
  -webkit-font-smoothing:antialiased;
}
img{display:block;max-width:100%}
a{color:inherit}
.wrap{width:min(1160px,92vw);margin-inline:auto}

/* ---------- top bar ---------- */
.topbar{
  position:sticky;top:0;z-index:40;background:var(--ink);color:var(--paper);
  border-bottom:3px solid var(--gold);
}
.topbar .wrap{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:9px 0}
.brandmark{font-family:var(--util);font-weight:700;letter-spacing:.14em;font-size:12px;text-transform:uppercase;opacity:.85}
.topbar .now{font-family:var(--util);font-weight:600;font-size:14px;display:flex;align-items:center;gap:12px}
.topbar .now b{color:var(--gold);font-size:16px}
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-family:var(--util);font-weight:700;font-size:16px;
  padding:12px 22px;border-radius:2px;border:0;cursor:pointer;text-decoration:none;
  background:var(--red);color:#fff;line-height:1.2;
  box-shadow:4px 4px 0 var(--ink);transition:transform .12s ease, box-shadow .12s ease;
}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink)}
.btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
.btn--sm{padding:8px 16px;font-size:14px;box-shadow:3px 3px 0 #000}
.btn--ghost{background:transparent;color:var(--ink);border:2px solid var(--ink);box-shadow:4px 4px 0 var(--gold)}
.btn--paper{background:var(--paper);color:var(--ink);box-shadow:4px 4px 0 var(--ink)}
:focus-visible{outline:3px solid var(--gold);outline-offset:3px}

/* ---------- hero ---------- */
.hero{
  position:relative;overflow:hidden;color:#fff;
  background:
    radial-gradient(ellipse at 78% 30%, #D0242F 0%, transparent 60%),
    repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 9px),
    var(--red-deep);
}
.hero::after{
  content:"";position:absolute;left:0;right:0;bottom:-1px;height:34px;
  background:radial-gradient(circle at 12px -4px, var(--paper) 13px, transparent 14px) 0 0/24px 34px repeat-x;
}
.hero .wrap{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;padding:74px 0 96px}
.eyebrow{
  font-family:var(--util);font-weight:700;font-size:12.5px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--gold);margin:0 0 14px;display:flex;align-items:center;gap:10px;
}
.eyebrow::before{content:"";width:34px;height:2px;background:var(--gold)}
h1{
  font-family:var(--display);font-weight:800;margin:0;
  font-size:clamp(40px,6.2vw,74px);line-height:1.08;letter-spacing:-.01em;
  text-shadow:3px 3px 0 rgba(0,0,0,.22);
}
h1 .vol{
  display:inline-block;background:var(--gold);color:var(--ink);
  padding:0 18px;border-radius:3px;transform:rotate(-2.5deg);margin-left:6px;text-shadow:none;
}
.lede{font-size:19px;line-height:1.8;margin:22px 0 26px;max-width:44ch;color:#FFEFE1}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:30px;padding:0;list-style:none}
.chips li{
  font-family:var(--util);font-weight:600;font-size:14px;
  border:1.5px solid rgba(255,255,255,.5);border-radius:999px;padding:5px 15px;
}
.buyline{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.price{display:flex;align-items:baseline;gap:10px}
.price b{font-family:var(--display);font-weight:800;font-size:44px;line-height:1;color:var(--gold)}
.price s{font-family:var(--util);opacity:.7;font-size:15px}

.coverstage{position:relative;display:flex;justify-content:center}
.coverstage .book{
  position:relative;width:min(400px,80%);transform:rotate(-3deg);
  box-shadow:var(--shadow), 14px 0 0 -4px rgba(0,0,0,.28);
  border-radius:2px 5px 5px 2px;overflow:hidden;
  animation:drop .9s cubic-bezier(.2,.8,.25,1) both;
}
.coverstage .book::before{
  content:"";position:absolute;inset:0;z-index:2;pointer-events:none;
  background:linear-gradient(90deg, rgba(0,0,0,.28) 0 8px, rgba(255,255,255,.28) 12px, transparent 34px);
}
@keyframes drop{from{opacity:0;transform:rotate(-8deg) translateY(28px)}to{opacity:1;transform:rotate(-3deg) translateY(0)}}
.seal{
  position:absolute;right:2%;top:-14px;z-index:3;width:104px;height:104px;border-radius:50%;
  background:var(--gold);color:var(--ink);display:grid;place-content:center;text-align:center;
  font-family:var(--display);font-weight:800;line-height:1.05;font-size:15px;
  box-shadow:0 8px 18px rgba(0,0,0,.3);transform:rotate(9deg);
  border:3px dashed rgba(34,30,27,.35);
}
.seal span{display:block;font-size:32px}

/* ---------- marquee ---------- */
.ticker{background:var(--ink);color:var(--paper);overflow:hidden;border-bottom:3px solid var(--gold)}
.ticker__track{display:flex;gap:0;width:max-content;animation:slide 34s linear infinite}
.ticker__track span{
  font-family:var(--display);font-weight:600;font-size:17px;padding:11px 0;white-space:nowrap;
}
.ticker__track span::after{content:"✦";color:var(--gold);margin:0 22px;font-size:13px;vertical-align:2px}
@keyframes slide{to{transform:translateX(-50%)}}

/* ---------- sections ---------- */
section{padding:84px 0}
.sec-head{max-width:60ch;margin-bottom:44px}
.kicker{
  font-family:var(--util);font-weight:700;font-size:12.5px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--red-deep);margin:0 0 10px;
}
h2{font-family:var(--display);font-weight:700;font-size:clamp(30px,4vw,44px);line-height:1.2;margin:0 0 14px}
.sec-head p{margin:0;color:var(--ink-soft);font-size:18px}

/* books */
.books{background:var(--paper-2);border-block:2px solid var(--line)}
.bookgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:30px}
.bookcard{background:var(--paper);border:2px solid var(--ink);box-shadow:6px 6px 0 var(--ink);padding:16px;
  transition:transform .16s ease, box-shadow .16s ease}
.bookcard:hover{transform:translate(-3px,-3px);box-shadow:9px 9px 0 var(--ink)}
.bookcard img{width:100%;border:1px solid var(--line)}
.bookcard h3{font-family:var(--display);font-weight:700;font-size:22px;margin:16px 0 6px;line-height:1.25}
.bookcard .meta{font-family:var(--util);font-size:14.5px;line-height:1.65;color:var(--ink-soft);margin:0}
.bookcard .meta b{color:var(--ink);font-weight:600}
.bookcard .no{
  font-family:var(--util);font-weight:700;font-size:12px;letter-spacing:.16em;color:var(--red-deep);
  display:block;margin-bottom:10px;
}

/* pages / signature */
.pages{background:var(--paper);position:relative}
.pages::before{
  content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background-image:radial-gradient(rgba(34,30,27,.13) 1px, transparent 1px);background-size:15px 15px;
}
.pages .wrap{position:relative}
.pagestrip{display:grid;grid-template-columns:repeat(5,1fr);gap:26px 22px}
.leaf{
  background:#fff;padding:9px 9px 12px;border:1px solid rgba(34,30,27,.2);
  box-shadow:0 10px 22px rgba(34,30,27,.16);cursor:zoom-in;
  transition:transform .2s ease, box-shadow .2s ease;
}
.leaf img{width:100%}
.leaf:nth-child(odd){transform:rotate(-1.4deg)}
.leaf:nth-child(even){transform:rotate(1.6deg)}
.leaf:nth-child(3n){transform:rotate(.7deg)}
.leaf:hover{transform:rotate(0) scale(1.045);box-shadow:0 18px 34px rgba(34,30,27,.26);z-index:2}
.pagenote{font-family:var(--util);font-size:14px;color:var(--ink-soft);margin-top:26px;text-align:center}

/* jacket */
.jacket{background:var(--ink);color:var(--paper)}
.jacket h2{color:#fff}
.jacket .sec-head p{color:rgba(246,239,226,.72)}
.jacket .kicker{color:var(--gold)}
.jacketshot{border:1px solid rgba(246,239,226,.25);padding:14px;background:#171412}
.jacketshot img{width:100%}
.jacketlegend{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:20px;padding:0;list-style:none;
  font-family:var(--util);font-size:14.5px;color:rgba(246,239,226,.8)}
.jacketlegend li::before{content:"■";color:var(--gold);margin-right:9px;font-size:11px;vertical-align:2px}

/* specs */
.specwrap{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:start}
.spec{list-style:none;padding:0;margin:0;border-top:2px solid var(--ink)}
.spec li{display:flex;justify-content:space-between;gap:20px;padding:15px 2px;border-bottom:1px solid var(--line);
  font-family:var(--util);font-size:16px}
.spec li span:first-child{color:var(--ink-soft)}
.spec li span:last-child{font-weight:600;text-align:right}
.note{
  background:var(--paper-2);border:2px solid var(--ink);box-shadow:7px 7px 0 var(--gold);padding:30px 28px;
}
.note h3{font-family:var(--display);font-size:24px;margin:0 0 12px}
.note p{margin:0 0 14px;font-size:16.5px;color:var(--ink-soft)}
.note p:last-child{margin-bottom:0}
.note .sig{font-family:var(--util);font-weight:600;font-size:14px;color:var(--red-deep)}

/* who */
.who{background:var(--pine);color:#F3EFE4}
.who h2{color:#fff}
.who .kicker{color:#9FD8BF}
.who .sec-head p{color:rgba(243,239,228,.75)}
.whogrid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.whocard{border:1.5px solid rgba(243,239,228,.35);padding:26px 24px;background:rgba(0,0,0,.1)}
.whocard h3{font-family:var(--display);font-size:21px;margin:0 0 10px;color:var(--gold)}
.whocard p{margin:0;font-size:16px;color:rgba(243,239,228,.86)}

/* order */
.order{background:var(--red);color:#fff;text-align:center}
.order h2{color:#fff;font-size:clamp(30px,4.4vw,48px)}
.order p{max-width:52ch;margin:0 auto 30px;color:#FFEADF;font-size:18px}
.order .price{justify-content:center;margin-bottom:26px}
.order .price b{color:#fff}
.order .price s{color:rgba(255,255,255,.72)}
.orderbtns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.order .fine{font-family:var(--util);font-size:14px;color:rgba(255,255,255,.8);margin-top:26px}

/* faq */
.faq details{border-bottom:1px solid var(--line);padding:6px 0}
.faq summary{
  font-family:var(--display);font-weight:600;font-size:20px;padding:16px 40px 16px 0;cursor:pointer;
  list-style:none;position:relative;
}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:6px;top:12px;font-size:28px;color:var(--red-deep);font-weight:500}
.faq details[open] summary::after{content:"–"}
.faq details p{margin:0 0 18px;color:var(--ink-soft);max-width:70ch}

/* footer */
footer{background:var(--ink);color:rgba(246,239,226,.7);padding:44px 0;font-family:var(--util);font-size:14.5px}
footer .wrap{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:center}
footer b{color:var(--paper);font-size:17px;letter-spacing:.02em}

/* sticky mobile bar */
.stickybuy{
  position:fixed;left:0;right:0;bottom:0;z-index:50;display:none;
  background:var(--ink);border-top:3px solid var(--gold);padding:10px 16px;
  align-items:center;justify-content:space-between;gap:14px;
}
.stickybuy .p{font-family:var(--display);font-weight:700;color:var(--gold);font-size:22px}
.stickybuy .p small{display:block;font-family:var(--util);font-weight:500;font-size:11px;color:rgba(246,239,226,.6)}

/* lightbox */
.lb{position:fixed;inset:0;z-index:60;background:rgba(20,17,15,.94);display:none;place-content:center;padding:24px}
.lb.on{display:grid}
.lb img{max-width:92vw;max-height:88vh;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.lb button{position:absolute;top:18px;right:20px;background:none;border:0;color:#fff;font-size:36px;cursor:pointer;line-height:1}

/* reveal */
.rv{opacity:0;transform:translateY(22px);transition:opacity .6s ease, transform .6s ease}
.rv.in{opacity:1;transform:none}

@media (max-width:960px){
  .hero .wrap{grid-template-columns:1fr;gap:44px;padding:56px 0 78px}
  .coverstage{order:-1}
  .coverstage .book{width:min(320px,72%)}
  .bookgrid{grid-template-columns:repeat(2,1fr);gap:22px}
  .pagestrip{grid-template-columns:repeat(3,1fr)}
  .specwrap{grid-template-columns:1fr;gap:34px}
  .whogrid{grid-template-columns:1fr}
  section{padding:64px 0}
}
@media (max-width:600px){
  body{font-size:16px}
  .topbar .now{display:none}
  .bookgrid{grid-template-columns:1fr}
  .pagestrip{grid-template-columns:repeat(2,1fr);gap:18px 14px}
  .stickybuy{display:flex}
  body{padding-bottom:74px}
  .seal{width:82px;height:82px;font-size:13px}
  .seal span{font-size:26px}
}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .rv{opacity:1;transform:none}
  html{scroll-behavior:auto}
}`;

const BODY = `<div class="topbar">
  <div class="wrap">
    <div class="brandmark">IndoBangla · অরিজিনাল ছাপা বই</div>
    <div class="now">সোভিয়েত দেশের শিশুসাহিত্য সমগ্র ৪ <b>৳৩,৫৫০</b></div>
    <a class="btn btn--sm" href="#order">অর্ডার করুন</a>
  </div>
</div>

<header class="hero">
  <div class="wrap">
    <div>
      <p class="eyebrow">রীডিং পাণ্ডা পাবলিকেশনস · কলকাতা</p>
      <h1>সোভিয়েত দেশের<br>শিশুসাহিত্য সমগ্র <span class="vol">৪</span></h1>
      <p class="lede">রাদুগা-প্রগতির সেই বইগুলো, যেগুলো একসময় বালিশের তলায় লুকিয়ে পড়া হতো। চারটি আস্ত বই, এক মলাটে — আগাগোড়া রঙিন ছাপায়।</p>
      <ul class="chips">
        <li>৪টি সম্পূর্ণ বই</li>
        <li>৩৮০ পৃষ্ঠা</li>
        <li>সম্পূর্ণ রঙিন</li>
        <li>৮০ GSM পেপার</li>
        <li>ডাস্টজ্যাকেটসহ</li>
      </ul>
      <div class="buyline">
        <div class="price"><b>৳৩,৫৫০</b><s>ভারতীয় মুদ্রিত মূল্য ₹২১০০</s></div>
        <a class="btn btn--paper" href="#order">এখনই অর্ডার করুন</a>
      </div>
    </div>
    <div class="coverstage">
      <div class="seal">খণ্ড<span>৪</span></div>
      <div class="book"><img src="/landing/soviet4/img-1.jpg" alt="সোভিয়েত দেশের শিশুসাহিত্য সমগ্র ৪ — প্রচ্ছদ"></div>
    </div>
  </div>
</header>

<div class="ticker" aria-hidden="true">
  <div class="ticker__track">
    <span>পিঁপড়ে ও পায়রা</span><span>এক যে ছিল ছেলে</span><span>দুষ্টু ছেলের কারসাজি</span><span>গল্প আর ছবি</span>
    <span>পিঁপড়ে ও পায়রা</span><span>এক যে ছিল ছেলে</span><span>দুষ্টু ছেলের কারসাজি</span><span>গল্প আর ছবি</span>
  </div>
</div>

<section class="books" id="books">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker">এই খণ্ডে যা আছে</p>
      <h2>চারটি বই, এক মলাটে</h2>
      <p>প্রতিটি বই সম্পূর্ণ — কোনো নির্বাচিত অংশ নয়, মূল অনুবাদ আর মূল ছবি নিয়েই ছাপা।</p>
    </div>
    <div class="bookgrid">
      <article class="bookcard rv">
        <img src="/landing/soviet4/img-2.jpg" alt="পিঁপড়ে ও পায়রা — প্রচ্ছদ">
        <span class="no">বই ০১</span>
        <h3>পিঁপড়ে ও পায়রা</h3>
        <p class="meta">লেখা <b>লেভ তলস্তয়</b><br>অনুবাদ <b>কৃষ্ণা রায়</b><br>ছবি <b>মিখাইল রোমাদিন</b></p>
      </article>
      <article class="bookcard rv">
        <img src="/landing/soviet4/img-3.jpg" alt="এক যে ছিল ছেলে — প্রচ্ছদ">
        <span class="no">বই ০২</span>
        <h3>এক যে ছিল ছেলে</h3>
        <p class="meta">লেখা <b>আগনিয়া বারতো</b><br>ছবি <b>ভ. লসিন, ইয়ে. রনিন ও ভ. পেতসভ</b></p>
      </article>
      <article class="bookcard rv">
        <img src="/landing/soviet4/img-4.jpg" alt="দুষ্টু ছেলের কারসাজি — প্রচ্ছদ">
        <span class="no">বই ০৩</span>
        <h3>দুষ্টু ছেলের কারসাজি</h3>
        <p class="meta">লেখা ও ছবি <b>ইউরি চেরেপানভ</b><br>ছবিতে বলা গল্প</p>
      </article>
      <article class="bookcard rv">
        <img src="/landing/soviet4/img-5.jpg" alt="গল্প আর ছবি — প্রচ্ছদ">
        <span class="no">বই ০৪</span>
        <h3>গল্প আর ছবি</h3>
        <p class="meta">লেখা ও ছবি <b>ভ্লাদিমির সুতেয়েভ</b><br>অনুবাদ <b>ননী ভৌমিক</b></p>
      </article>
    </div>
  </div>
</section>

<section class="pages" id="pages">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker">ভেতরের পাতা</p>
      <h2>ছবিগুলোই আসল কথা</h2>
      <p>মিখাইল রোমাদিন, সুতেয়েভ, লসিন — সোভিয়েত অলংকরণের সেরা হাতগুলো। প্রতিটি পাতা রঙিন ছাপা, ছবি কেটে ছোট করা হয়নি। ছবিতে ক্লিক করে বড় করে দেখুন।</p>
    </div>
    <div class="pagestrip">
      <figure class="leaf rv"><img src="/landing/soviet4/img-6.jpg" alt="ভেতরের পাতা — তলস্তয়ের গল্পের অলংকরণ" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-7.jpg" alt="ভেতরের পাতা — ময়ূর ও সারস" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-8.jpg" alt="ভেতরের পাতা — বনের সজারু ও কাঠবিড়ালি" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-9.jpg" alt="ভেতরের পাতা — পিঁপড়ে ও ব্যাঙের ছাতা" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-10.jpg" alt="ভেতরের পাতা — সমুদ্র ও জাহাজ" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-11.jpg" alt="ভেতরের পাতা — বল নিয়ে ছেলেমেয়েরা" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-12.jpg" alt="ভেতরের পাতা — বরফ পুতুল" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-13.jpg" alt="ভেতরের পাতা — মেষপালক" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-14.jpg" alt="ভেতরের পাতা — বেড়ায় বসা ছেলেমেয়েরা" loading="lazy"></figure>
      <figure class="leaf rv"><img src="/landing/soviet4/img-15.jpg" alt="ভেতরের পাতা — কাঠ কাঁধে ছেলে" loading="lazy"></figure>
    </div>
    <p class="pagenote">১০টি নমুনা পাতা · বইয়ের ৩৮০ পৃষ্ঠার প্রতিটিই এমন রঙিন</p>
  </div>
</section>

<section class="jacket">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker">বাঁধাই ও প্রকাশনা</p>
      <h2>সম্পূর্ণ ডাস্টজ্যাকেটসহ</h2>
      <p>ফ্ল্যাপে সম্পাদকের পরিচয় ও কৈফিয়ত, পিছনে চারটি বইয়ের মূল প্রচ্ছদ — পুরো র‍্যাপঅ্যারাউন্ড জ্যাকেটটি নিচে খুলে দেখানো হলো।</p>
    </div>
    <div class="jacketshot rv"><img src="/landing/soviet4/img-16.jpg" alt="সম্পূর্ণ ডাস্টজ্যাকেট — সামনে, স্পাইন, পিছন ও দুই ফ্ল্যাপ" loading="lazy"></div>
    <ul class="jacketlegend">
      <li>বাঁ ফ্ল্যাপ — সম্পাদক বৌধায়ন ভট্টাচার্যের পরিচয়</li>
      <li>পিছনে — চারটি মূল বইয়ের প্রচ্ছদ</li>
      <li>ডান ফ্ল্যাপ — সিরিজ সম্পর্কে কৈফিয়ত</li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap specwrap">
    <div class="rv">
      <p class="kicker">বইয়ের খুঁটিনাটি</p>
      <h2>স্পেসিফিকেশন</h2>
      <ul class="spec">
        <li><span>সিরিজ</span><span>সোভিয়েত দেশের শিশুসাহিত্য সমগ্র — খণ্ড ৪</span></li>
        <li><span>সম্পাদনা</span><span>বৌধায়ন ভট্টাচার্য</span></li>
        <li><span>প্রকাশক</span><span>রীডিং পাণ্ডা পাবলিকেশনস, কলকাতা</span></li>
        <li><span>অন্তর্ভুক্ত বই</span><span>৪টি সম্পূর্ণ বই</span></li>
        <li><span>পৃষ্ঠা</span><span>৩৮০</span></li>
        <li><span>ছাপা</span><span>আগাগোড়া রঙিন</span></li>
        <li><span>কাগজ</span><span>৮০ GSM</span></li>
        <li><span>বাঁধাই</span><span>হার্ডকভার, ডাস্টজ্যাকেটসহ</span></li>
        <li><span>ভাষা</span><span>বাংলা</span></li>
        <li><span>সংস্করণ</span><span>ভারতীয় অরিজিনাল প্রিন্ট</span></li>
      </ul>
    </div>
    <div class="note rv">
      <h3>পাইরেটেড কপি নয়</h3>
      <p>IndoBangla সরাসরি ভারত থেকে অরিজিনাল ছাপা বই আনে। রঙের গভীরতা, কাগজের ওজন, বাঁধাইয়ের টান — যে জন্য এই সিরিজটা সংগ্রহে রাখার মতো, তার কোনোটাই স্ক্যান-করা নকল সংস্করণে টিকে থাকে না।</p>
      <p>এই সিরিজের প্রতিটি খণ্ড সীমিত সংখ্যায় ছাপা হয়। আগের তিনটি খণ্ডের পুনর্মুদ্রণের অপেক্ষায় থাকতে হয়েছিল অনেককেই।</p>
      <p class="sig">— IndoBangla, ঢাকা</p>
    </div>
  </div>
</section>

<section class="who">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker">কার জন্য</p>
      <h2>কারা এই বইটা খুঁজছেন</h2>
    </div>
    <div class="whogrid">
      <article class="whocard rv">
        <h3>যাঁদের ছোটবেলা ফেরত চাই</h3>
        <p>মিশকা ভাল্লুক, সিভকা-বুর্কা, মাশা — সেই চেনা জগতের চতুর্থ কিস্তি। যাঁরা আগের খণ্ডগুলো নিয়েছেন, তাঁদের সংগ্রহ এখানে এসে পূর্ণ হয়।</p>
      </article>
      <article class="whocard rv">
        <h3>বাবা-মায়েরা</h3>
        <p>স্ক্রিনের বাইরে বসিয়ে রাখার মতো বই। ছবি এত জোরালো যে অক্ষর শিখতে শুরু করা বাচ্চাও পাতার পর পাতা উল্টে যায়।</p>
      </article>
      <article class="whocard rv">
        <h3>সংগ্রাহক ও ইলাস্ট্রেশন-প্রেমীরা</h3>
        <p>সোভিয়েত বই-অলংকরণের একটা গোটা স্কুল — রোমাদিন থেকে সুতেয়েভ — এক জায়গায়, রঙিন ছাপায়, রেফারেন্স মানের প্রিন্টে।</p>
      </article>
    </div>
  </div>
</section>

<section class="order" id="order">
  <div class="wrap">
    <h2 class="rv">স্টকে আছে — আজই নিয়ে নিন</h2>
    <p class="rv">মেসেজ করুন, আমরা স্টক আর ডেলিভারি সময় জানিয়ে দিচ্ছি। সারা বাংলাদেশে কুরিয়ার, ঢাকায় ২৪–৪৮ ঘণ্টায় ডেলিভারি।</p>
    <div class="price rv"><b>৳৩,৫৫০</b><s>ভারতীয় মুদ্রিত মূল্য ₹২১০০</s></div>
    <div class="orderbtns rv">
      <a class="btn btn--paper" href="https://indobangla.tech" target="_blank" rel="noopener">ওয়েবসাইটে অর্ডার করুন</a>
      <a class="btn btn--paper" href="https://wa.me/8801XXXXXXXXX" target="_blank" rel="noopener">হোয়াটসঅ্যাপে বলুন</a>
      <a class="btn btn--paper" href="https://m.me/indobangla" target="_blank" rel="noopener">মেসেঞ্জারে বলুন</a>
    </div>
    <p class="fine rv">ক্যাশ অন ডেলিভারি · বিকাশ / নগদ · অ্যাডভান্স পেমেন্টে ডেলিভারি চার্জ ফ্রি</p>
  </div>
</section>

<section class="faq">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker">প্রশ্ন-উত্তর</p>
      <h2>যা সবাই জিজ্ঞেস করেন</h2>
    </div>
    <details class="rv"><summary>আগের খণ্ডগুলো না পড়লে চলবে?</summary>
      <p>চলবে। প্রতিটি খণ্ড আলাদা আলাদা বইয়ের সংকলন, ধারাবাহিক গল্প নয়। ৪ নম্বর খণ্ড দিয়েই শুরু করা যায়।</p></details>
    <details class="rv"><summary>বইটা কি অরিজিনাল ভারতীয় ছাপা?</summary>
      <p>হ্যাঁ। রীডিং পাণ্ডা পাবলিকেশনসের কলকাতা সংস্করণ, সরাসরি আমদানি করা। কোনো ফটোকপি বা স্থানীয় নকল সংস্করণ নয়।</p></details>
    <details class="rv"><summary>ঢাকার বাইরে ডেলিভারি হয়?</summary>
      <p>হয়। সারা দেশে কুরিয়ারে পাঠানো হয়, সাধারণত ২–৪ কার্যদিবস। অর্ডারের সময় ঠিকানা দিলে চার্জ জানিয়ে দেওয়া হবে।</p></details>
    <details class="rv"><summary>বাচ্চাদের কোন বয়সের জন্য?</summary>
      <p>৫ থেকে ১২ — ছবির জোরে আরও ছোটরাও টানে। তবে সিরিজটির বড় একটা পাঠক বড়রাই, নিজের ছোটবেলার টানে।</p></details>
    <details class="rv"><summary>স্টক শেষ হলে আবার পাওয়া যাবে?</summary>
      <p>সীমিত সংখ্যায় আমদানি হয়। স্টক শেষ হলে পরের চালানের জন্য আপনার নাম তালিকায় রেখে দিই, বই এলে জানানো হয়।</p></details>
  </div>
</section>

<footer>
  <div class="wrap">
    <div><b>IndoBangla</b><br>অরিজিনাল ভারতীয় ও বাংলা ছাপা বই · ঢাকা</div>
    <div>indobangla.tech</div>
  </div>
</footer>

<div class="stickybuy">
  <div class="p">৳৩,৫৫০ <small>সোভিয়েত শিশুসাহিত্য সমগ্র ৪</small></div>
  <a class="btn btn--sm" href="#order">অর্ডার করুন</a>
</div>

<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="বড় করে দেখুন">
  <button type="button" aria-label="বন্ধ করুন">&times;</button>
  <img src="" alt="">
</div>`;

export type Soviet4Props = {
  name: string;
  author: string;
  publisher: string;
  cover: string;
  unit: number;
  rawPrice: number;
  hasSaving: boolean;
  stock: number;
  inStock: boolean;
  buyNow: () => void;
  addToCart: () => void;
  waLink: string;
  productHref: string;
  bdt: (n: number) => string;
};

export default function ProductLandingSoviet4({
  unit,
  inStock,
  buyNow,
  waLink,
  bdt,
}: Soviet4Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    // --- reveal-on-scroll (was an inline <script> in the original file) ---
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      }),
      { threshold: 0.12 },
    );
    root.querySelectorAll<HTMLElement>('.rv').forEach((el, i) => {
      el.style.transitionDelay = `${(i % 5) * 60}ms`;
      obs.observe(el);
    });
    cleanups.push(() => obs.disconnect());

    // --- lightbox on the page photos ---
    const lb = root.querySelector<HTMLElement>('#lb');
    const lbImg = lb?.querySelector('img') as HTMLImageElement | null;
    if (lb && lbImg) {
      root.querySelectorAll<HTMLElement>('.leaf').forEach((leaf) => {
        const img = leaf.querySelector('img');
        const open = () => {
          if (!img) return;
          lbImg.src = img.src;
          lbImg.alt = img.alt;
          lb.classList.add('on');
          document.body.style.overflow = 'hidden';
        };
        leaf.addEventListener('click', open);
        cleanups.push(() => leaf.removeEventListener('click', open));
      });
      const close = () => {
        lb.classList.remove('on');
        document.body.style.overflow = '';
      };
      lb.addEventListener('click', close);
      cleanups.push(() => {
        lb.removeEventListener('click', close);
        document.body.style.overflow = '';
      });
    }

    // --- real commerce: the file shipped a hard-coded price and an off-site link ---
    const priceEl = root.querySelector('.price b');
    if (priceEl && unit > 0) priceEl.textContent = bdt(unit);

    root.querySelectorAll<HTMLAnchorElement>('.orderbtns a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (/wa\.me/i.test(href)) {
        a.setAttribute('href', waLink);
        return;
      }
      if (/m\.me|messenger/i.test(href)) return; // leave the Messenger link alone
      // the "order on the website" button — we ARE the website: order for real
      a.textContent = inStock ? 'এখনই অর্ডার করুন' : 'স্টকে নেই';
      a.setAttribute('href', '#order');
      const onClick = (e: Event) => {
        e.preventDefault();
        if (inStock) buyNow();
      };
      a.addEventListener('click', onClick);
      cleanups.push(() => a.removeEventListener('click', onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [unit, inStock, buyNow, waLink, bdt]);

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      {/* Scoped to this page only — React drops the tag when the landing unmounts. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: BODY }} />
    </>
  );
}
