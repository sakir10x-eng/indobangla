/**
 * IndoBangla printable COD invoice — opens a print window styled after
 * invoice (2).html (red accent, A4 half-sheet slip). Populated from the
 * order-board's mapped order object.
 */

const bdt = (n: number) =>
  '৳' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * The promo line printed under the QR block. Comes from
 * settings.options.invoiceCoupon so every admin's slips agree. Undefined (an older
 * settings row that predates the key) means don't print it.
 */
export type InvoiceCoupon = {
  enabled?: boolean;
  code?: string;
  amount?: number;
};

export function printInvoice(o: any, coupon?: InvoiceCoupon) {
  const items: any[] = o.items || [];
  const subTotal = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const delivery = Number(o.delivery) || 0;
  const discount = Number(o.discount) || 0;
  const total = Number(o.total) || Math.max(0, subTotal + delivery - discount);
  // Wallet points are settled at checkout and are NOT deducted from `total`, so the slip has
  // to take them off itself — otherwise the courier collects money the customer already paid.
  const walletPaid = Number(o.walletPoints) || 0;
  const payable = Math.max(0, total - walletPaid);
  const qtyTotal = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const paid = !!o.paid;
  // An advance collected up front: the courier then only collects the remainder. Only treat it
  // as an advance when it is a genuine partial (0 < paid < payable), so a fully-paid or plain
  // COD slip is unaffected.
  const advancePaid = Number(o.paidTotal) || 0;
  const isPartial = !paid && advancePaid > 0 && advancePaid < payable - 0.5;
  const dueNow = Math.max(0, payable - advancePaid);
  const placed = o.createdAt
    ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const courier = o.courier || 'Courier';

  // Promo line is opt-in: it prints only when switched on and actually filled in, so a
  // half-configured setting can never put "🎁 Next order:  — ৳ OFF" on a customer's slip.
  const couponCode = String(coupon?.code ?? '').trim();
  const couponAmount = Number(coupon?.amount) || 0;
  const showCoupon = !!coupon?.enabled && couponCode !== '' && couponAmount > 0;

  const rows = items
    .map(
      (it, i) => `
      <tr>
        <td class="c-idx">${i + 1}</td>
        <td class="c-book"><b>${esc(it.title)}</b>${it.manufacturer ? `<div class="c-mfr">${esc(it.manufacturer)}</div>` : ''}</td>
        <td class="c-qty">${esc(it.qty)}</td>
        <td class="c-total">${bdt(it.price)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice #${esc(o.id)}</title>
<style>
  :root{--red:#EF3543;--red-dark:#C82634;--ink:#2B2A2B;--ink-soft:#6B6870;--line:#E7E3E1;--parchment:#FBF8F6;--gold:#B8892F;--green:#1E8E5A;--green-bg:#EAF7F1;--amber:#C9740B;--amber-bg:#FDF3E4;--brand:#0f766e;}
  /* force colours to render on screen AND in print */
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
  html,body{margin:0;padding:0;background:#DADADA;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);}
  /* screen-only control bar */
  .ib-bar{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#111;}
  .ib-bar button{border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;}
  .ib-bar .b1{background:var(--brand);color:#fff;} .ib-bar .b2{background:#fff;color:#111;}
  body.bw .sheet, body.bw .sheet *{color:#000 !important;background:#fff !important;border-color:#999 !important;}
  body.bw .brand h1 span{color:#000 !important;}
  @media print{.ib-bar{display:none !important;}}
  @page{size:A4;margin:0;}
  .sheet-wrap{width:210mm;margin:6mm auto;}
  .sheet{width:210mm;min-height:148mm;background:#fff;padding:8mm 10mm;position:relative;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.14);}
  /* Half-A4 tear guide: the slip occupies the top 148mm (half of A4), cut along this line. */
  .cut{margin:5mm -10mm 0;border-top:1px dashed #B7B2AE;position:relative;height:0;}
  .cut span{position:absolute;top:-6px;left:50%;transform:translateX(-50%);background:#fff;padding:0 3mm;font-size:8px;letter-spacing:.5px;color:var(--ink-soft);}
  @media print{
    body{background:#fff;}
    .sheet-wrap{margin:0 auto;width:210mm;}
    .sheet{box-shadow:none;margin:0 auto;}
    /* "Compact" scales the slip from its TOP-CENTRE, so a smaller print stays centred on the
       sheet. The browser's own Scale slider anchors to the top-left corner instead — that's why
       scaling there shoves the slip to one side. Use the Compact button + keep Scale = Default. */
    body.compact .sheet{transform:scale(.72);transform-origin:top center;}
  }
  .header{display:flex;justify-content:space-between;align-items:flex-start;gap:6mm;}
  .brand h1{margin:0;font-size:20px;font-weight:800;letter-spacing:.3px;}
  .brand h1 span{color:var(--red);}
  .brand-addr{font-size:9px;line-height:1.5;color:var(--ink-soft);margin-top:2px;}
  .brand-addr b{color:var(--ink);}
  .meta{text-align:right;font-size:9px;color:var(--ink-soft);line-height:1.6;}
  .meta .order-no{font-size:15px;font-weight:800;color:var(--ink);}
  .meta .order-no span{color:var(--red);}
  .pay-pill{display:inline-flex;align-items:center;gap:3px;margin-top:3px;padding:2px 8px;border-radius:20px;border:1px solid currentColor;font-size:9px;font-weight:800;letter-spacing:.3px;}
  .pay-cod{color:var(--amber);}.pay-paid{color:var(--green);}
  .divider{height:1mm;margin:4mm 0;border-radius:1px;background:var(--red);}
  .info-row{display:grid;grid-template-columns:1fr 1fr;gap:6mm;font-size:10px;line-height:1.55;}
  .info-col .h{font-size:9px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--red);margin-bottom:2mm;}
  .info-line{color:var(--ink-soft);}.info-line b{color:var(--ink);}
  .courier-tag{display:inline-block;margin-top:2px;color:var(--green);font-weight:700;}
  table{width:100%;border-collapse:collapse;margin-top:4mm;font-size:10.5px;}
  thead th{background:var(--parchment);color:var(--ink-soft);text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:2.5mm 3mm;border-bottom:2px solid var(--red);}
  tbody td{padding:2.6mm 3mm;border-bottom:1px solid var(--line);vertical-align:top;}
  .c-idx{width:8mm;color:var(--ink-soft);}.c-qty{width:14mm;text-align:center;}.c-total{width:26mm;text-align:right;font-weight:700;}
  .c-mfr{margin-top:.6mm;font-size:8.5px;color:var(--ink-soft);font-weight:600;}
  .badges{display:flex;gap:4mm;margin-top:3mm;font-size:8.5px;color:var(--green);font-weight:600;}
  .quote{margin-top:3mm;font-style:italic;font-size:9px;color:var(--gold);}
  /* Book list ends, then a two-column summary: quote+QR fill the left, totals sit right,
     side by side — no wasted vertical space, keeps the slip inside the half-A4. */
  .summary-grid{display:flex;gap:8mm;margin-top:4mm;align-items:flex-start;}
  .summary-left{flex:1;min-width:0;}
  .summary-right{width:74mm;flex-shrink:0;}
  .totals{margin-left:auto;width:70mm;font-size:10.5px;}
  .totals .row{display:flex;justify-content:space-between;padding:1.6mm 0;color:var(--ink-soft);}
  .totals .row b{color:var(--ink);}
  .totals .grand{border-top:2px solid var(--red);margin-top:1mm;padding-top:2.4mm;font-size:13px;font-weight:800;color:var(--ink);}
  .guarantee{margin-top:5mm;background:var(--green-bg);border-radius:8px;padding:3mm 4mm;font-size:9px;color:#166a44;}
  .guarantee b{color:#0f4d31;}
  .nb{margin-top:3mm;font-size:9px;color:var(--amber);}
  .foot{margin-top:4mm;font-size:8.5px;color:var(--ink-soft);text-align:center;}
</style></head><body>
<div class="ib-bar">
  <span style="color:#fff;font-size:12px;align-self:center;">Include on invoice:</span>
  <label style="color:#fff;font-size:12px;align-self:center;display:inline-flex;gap:4px;align-items:center;"><input type="checkbox" checked onchange="document.getElementById('bdg-bookmark').style.display=this.checked?'inline-flex':'none';">Free bookmark</label>
  <label style="color:#fff;font-size:12px;align-self:center;display:inline-flex;gap:4px;align-items:center;"><input type="checkbox" checked onchange="document.getElementById('bdg-tamper').style.display=this.checked?'inline-flex':'none';">Tamper-proof</label>
  <label style="color:#fff;font-size:12px;align-self:center;display:inline-flex;gap:4px;align-items:center;"><input type="checkbox" checked onchange="document.getElementById('bdg-replace').style.display=this.checked?'inline-flex':'none';">3-day replacement</label>
  <label style="color:#fff;font-size:12px;align-self:center;display:inline-flex;gap:4px;align-items:center;" title="Print a smaller slip centred on the page. Keep the browser's Scale on Default — its Scale slider pushes the print to one side."><input type="checkbox" onchange="document.body.classList.toggle('compact', this.checked);">🗜 Compact (center)</label>
  <button class="b1" onclick="document.body.classList.remove('bw');window.print();">🖨️ Print (Colour)</button>
  <button class="b2" onclick="document.body.classList.add('bw');window.print();">⬛ Print B&amp;W</button>
</div>
<div class="sheet-wrap"><div class="sheet">
  <div class="header">
    <div class="brand" style="display:flex;flex-direction:column;gap:2mm;align-items:flex-start;">
      <img src="https://indobanglabook.s3.us-east-2.amazonaws.com/7827/Transparent-horizontal.png" alt="IndoBangla"
           style="height:15mm;width:auto;max-width:62mm;object-fit:contain;flex-shrink:0;" />
      <div>
        <h1 style="margin:0;color:var(--brand);position:absolute;left:-9999px;">Indo<span style="color:var(--red);">Bangla</span></h1>
        <div class="brand-addr"><b>IndoBangla Book Store</b><br>Dhanmondi, Dhaka 1205, Bangladesh<br>Mobile: 01556 436147 · hello@indobangla.tech</div>
      </div>
    </div>
    <div class="meta">
      <div class="order-no">Order #<span>${esc(o.id)}</span></div>
      <div>Invoice Date: ${today}</div>
      ${isPartial
        ? `<div class="pay-pill pay-cod">● ADVANCE PAID · ${bdt(dueNow)} DUE</div>`
        : `<div class="pay-pill ${paid ? 'pay-paid' : 'pay-cod'}">${paid ? '● PAID' : '● CASH ON DELIVERY'}</div>`}
    </div>
  </div>
  <div class="divider"></div>
  <div class="info-row">
    <div class="info-col">
      <div class="h">Order Info</div>
      <div class="info-line">Placed: <b>${placed}</b></div>
      <div class="info-line">Items: <b>${items.length} title${items.length > 1 ? 's' : ''}</b> · Qty: <b>${qtyTotal}</b></div>
      <div class="courier-tag">🚚 ${esc(courier)}</div>
    </div>
    <div class="info-col">
      <div class="h">Deliver To</div>
      <div class="info-line"><b>${esc(o.name)}</b> · ${esc(o.phone)}</div>
      <div class="info-line">${esc(o.address) || '—'}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Book</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <!-- Book list ends → left column carries the quote + QR right where the table stops,
       totals sit alongside on the right, so nothing wastes vertical space. -->
  <div class="summary-grid">
    <div class="summary-left">
      ${o.note ? `<div class="nb" style="margin-top:0;">N.B. ${esc(o.note)}</div>` : ''}
      <div class="quote" style="margin-top:0;">"A room without books is like a body without a soul." — Cicero</div>
      <div class="qr-slip" style="margin-top:2mm;display:flex;gap:5mm;align-items:center;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https%3A%2F%2Findobangla.tech%2Forders" alt="QR" style="width:20mm;height:20mm;flex-shrink:0;" />
        <div style="flex:1;">
          <div style="font-size:9px;font-weight:800;color:var(--ink);">📱 Track &amp; Reorder</div>
          <div style="font-size:8.5px;color:var(--ink-soft);margin-top:1mm;">Scan the QR to track this order or reorder your favourite titles in one tap.</div>
          ${showCoupon ? `<div style="margin-top:2mm;display:inline-block;border:1px dashed var(--red);border-radius:4px;padding:1.5mm 3mm;font-size:9px;color:var(--red);font-weight:800;">🎁 Next order: <span style="font-family:monospace;">${esc(couponCode)}</span> — ৳${esc(couponAmount)} OFF</div>` : ''}
        </div>
      </div>
      <div class="badges" style="margin-top:3mm;">
        <span id="bdg-bookmark" style="display:inline-flex;">✓ Free bookmark included</span>
        <span id="bdg-tamper" style="display:inline-flex;">✓ Tamper-proof packaging</span>
        <span id="bdg-replace" style="display:inline-flex;">✓ 3-day damage replacement</span>
      </div>
    </div>
    <div class="summary-right">
      <div class="totals">
        <div class="row">Sub Total <b>${bdt(subTotal)}</b></div>
        ${discount ? `<div class="row">Discount <b>- ${bdt(discount)}</b></div>` : ''}
        <div class="row">Delivery Fee <b>${bdt(delivery)}</b></div>
        ${walletPaid ? `<div class="row">Wallet Points Used <b>- ${bdt(walletPaid)}</b></div>` : ''}
        ${paid
          ? // A settled order must never print a payable figure: the pill said PAID while the
            // grand total still read "Total Payable", and a courier reading the slip would
            // collect the money a second time.
            `<div class="row">Total <b>${bdt(payable)}</b></div>
        <div class="row">Paid <b style="color:var(--green);">- ${bdt(payable)}</b></div>
        <div class="row grand"><span>Due on Delivery</span><span>${bdt(0)}</span></div>`
          : isPartial
          ? `<div class="row">Total <b>${bdt(payable)}</b></div>
        <div class="row">Advance Paid <b style="color:var(--green);">- ${bdt(advancePaid)}</b></div>
        <div class="row grand"><span>Due on Delivery</span><span>${bdt(dueNow)}</span></div>`
          : `<div class="row grand"><span>Total Payable</span><span>${bdt(payable)}</span></div>`}
      </div>
    </div>
  </div>

  <div class="guarantee" style="margin-top:3mm;"><b>Genuine Book Guarantee.</b> 100% original edition. Damaged or wrong book? Free replacement within 3 days — no questions asked.</div>

  <div class="foot">Order Processed By: IndoBangla — Dhanmondi Hub · Thank you for reading with us.</div>
  <div class="cut"><span>✂ CUT HERE · HALF-A4 SLIP</span></div>
</div></div>
<script>window.onload=function(){window.focus();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
