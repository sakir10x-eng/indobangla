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

export function printInvoice(o: any) {
  const items: any[] = o.items || [];
  const subTotal = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const delivery = Number(o.delivery) || 0;
  const discount = Number(o.discount) || 0;
  const total = Number(o.total) || Math.max(0, subTotal + delivery - discount);
  const qtyTotal = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const paid = !!o.paid;
  const placed = o.createdAt
    ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const courier = o.courier || 'Courier';

  const rows = items
    .map(
      (it, i) => `
      <tr>
        <td class="c-idx">${i + 1}</td>
        <td class="c-book"><b>${esc(it.title)}</b></td>
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
  .sheet{width:210mm;min-height:150mm;background:#fff;padding:8mm 10mm;position:relative;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.14);}
  @media print{body{background:#fff;}.sheet-wrap{margin:0;width:auto;}.sheet{box-shadow:none;margin:0;}}
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
  .badges{display:flex;gap:4mm;margin-top:3mm;font-size:8.5px;color:var(--green);font-weight:600;}
  .quote{margin-top:3mm;font-style:italic;font-size:9px;color:var(--gold);}
  .totals{margin-top:4mm;margin-left:auto;width:70mm;font-size:10.5px;}
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
  <button class="b1" onclick="document.body.classList.remove('bw');window.print();">🖨️ Print (Colour)</button>
  <button class="b2" onclick="document.body.classList.add('bw');window.print();">⬛ Print B&amp;W</button>
</div>
<div class="sheet-wrap"><div class="sheet">
  <div class="header">
    <div class="brand" style="display:flex;gap:10px;align-items:flex-start;">
      <img src="https://indobanglabook.s3.us-east-2.amazonaws.com/7827/Transparent-horizontal.png" alt="IndoBangla"
           style="height:14mm;width:auto;max-width:52mm;object-fit:contain;flex-shrink:0;margin-top:1px;" />
      <div>
        <h1 style="margin:0;color:var(--brand);position:absolute;left:-9999px;">Indo<span style="color:var(--red);">Bangla</span></h1>
        <div class="brand-addr"><b>IndoBangla Book Store</b><br>Dhanmondi, Dhaka 1205, Bangladesh<br>Mobile: 01556 436147 · hello@indobangla.tech</div>
      </div>
    </div>
    <div class="meta">
      <div class="order-no">Order #<span>${esc(o.id)}</span></div>
      <div>Invoice Date: ${today}</div>
      <div class="pay-pill ${paid ? 'pay-paid' : 'pay-cod'}">${paid ? '● PAID' : '● CASH ON DELIVERY'}</div>
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
  <div class="badges">
    <span id="bdg-bookmark" style="display:inline-flex;">✓ Free bookmark included</span>
    <span id="bdg-tamper" style="display:inline-flex;">✓ Tamper-proof packaging</span>
    <span id="bdg-replace" style="display:inline-flex;">✓ 3-day damage replacement</span>
  </div>
  <div class="quote">"A room without books is like a body without a soul." — Cicero</div>
  ${o.note ? `<div class="nb">N.B. ${esc(o.note)}</div>` : ''}
  <div class="totals">
    <div class="row">Sub Total <b>${bdt(subTotal)}</b></div>
    ${discount ? `<div class="row">Discount <b>- ${bdt(discount)}</b></div>` : ''}
    <div class="row">Delivery Fee <b>${bdt(delivery)}</b></div>
    <div class="row grand"><span>Total Payable</span><span>${bdt(total)}</span></div>
  </div>
  <div style="margin-top:2mm;display:flex;gap:5mm;align-items:center;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https%3A%2F%2Findobangla.tech%2Forders" alt="QR" style="width:20mm;height:20mm;flex-shrink:0;" />
    <div style="flex:1;">
      <div style="font-size:9px;font-weight:800;color:var(--ink);">📱 Track &amp; Reorder</div>
      <div style="font-size:8.5px;color:var(--ink-soft);margin-top:1mm;">Scan the QR to track this order or reorder your favourite titles in one tap.</div>
      <div style="margin-top:2mm;display:inline-block;border:1px dashed var(--red);border-radius:4px;padding:1.5mm 3mm;font-size:9px;color:var(--red);font-weight:800;">🎁 Next order: <span style="font-family:monospace;">WELCOME50</span> — ৳50 OFF</div>
    </div>
  </div>

  <div class="guarantee" style="margin-top:3mm;"><b>Genuine Book Guarantee.</b> 100% original edition. Damaged or wrong book? Free replacement within 3 days — no questions asked.</div>

  <div class="foot">Order Processed By: IndoBangla — Dhanmondi Hub · Thank you for reading with us.</div>
</div></div>
<script>window.onload=function(){window.focus();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
