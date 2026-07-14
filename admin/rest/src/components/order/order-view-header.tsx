import { OrderStatus, PaymentStatus } from '@/types';

interface OrderViewHeaderProps {
  order: any;
  wrapperClassName?: string;
  buttonSize?: 'big' | 'medium' | 'small';
}

const bdt = (n: any) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const label = (s?: string) =>
  (s ?? '').replace(/^order-|^payment-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—';

/** Green when settled, amber while pending, red when cancelled/failed. */
function tone(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('cancel') || s.includes('fail') || s.includes('reject')) return { fg: '#f07a83', bg: '#2e1518' };
  if (s.includes('complete') || s.includes('success') || s.includes('delivered')) return { fg: '#6cd39b', bg: '#12291d' };
  if (s.includes('pending')) return { fg: '#efc05d', bg: '#2a2410' };
  return { fg: '#c9c9cd', bg: '#232326' };
}

const cellBase: any = {
  flex: 1,
  minWidth: 130,
  padding: '14px 18px',
  borderRight: '0.5px solid #232326',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};
const capStyle: any = { fontSize: 11, letterSpacing: '0.08em', color: '#7a7a80' };
const chip = (t: { fg: string; bg: string }): any => ({
  fontSize: 12, fontWeight: 500, color: t.fg, background: t.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
});
const statCard: any = { background: '#141416', borderRadius: 12, padding: 16 };
const statCap: any = { fontSize: 11, letterSpacing: '0.06em', color: '#7a7a80' };
const statNum: any = { fontSize: 30, fontWeight: 500, color: '#fff', marginTop: 6, lineHeight: 1 };
const statSub: any = { fontSize: 12, color: '#7a7a80', marginTop: 6 };

export default function OrderViewHeader({ order }: OrderViewHeaderProps) {
  const oStatus = order?.order_status ?? '';
  const pStatus = order?.payment_status ?? '';
  const items = Array.isArray(order?.products)
    ? order.products.reduce((n: number, p: any) => n + Number(p?.pivot?.order_quantity ?? 1), 0)
    : 0;
  const paid = Number(order?.paid_total ?? 0);
  const total = Number(order?.total ?? 0);
  const isPaid = [PaymentStatus.SUCCESS, PaymentStatus.WALLET].includes(pStatus) || paid >= total;
  const created = order?.created_at
    ? new Date(order.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  const ot = tone(oStatus);
  const pt = tone(isPaid ? 'success' : pStatus);

  return (
    <div style={{ background: '#1a1a1c', borderRadius: 16, border: '0.5px solid #2c2c2f', overflow: 'hidden', color: '#eaeaec' }}>
      {/* meta strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: '#141416', borderBottom: '0.5px solid #2c2c2f' }}>
        <div style={{ ...cellBase, minWidth: 120 }}>
          <span style={capStyle}>ORDER</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#eaeaec' }}>#{order?.tracking_number ?? '—'}</span>
        </div>
        <div style={cellBase}>
          <span style={capStyle}>STATUS</span>
          <span style={chip(ot)}>{label(oStatus)}</span>
        </div>
        <div style={cellBase}>
          <span style={capStyle}>PAYMENT</span>
          <span style={chip(pt)}>{isPaid ? 'Paid' : label(pStatus)}</span>
        </div>
        <div style={{ ...cellBase, flex: 1.4, minWidth: 150 }}>
          <span style={capStyle}>METHOD</span>
          <span style={chip({ fg: '#c9c9cd', bg: '#232326' })}>{(order?.payment_gateway ?? '—').toString().toUpperCase().replace(/_/g, ' ')}</span>
        </div>
        <div style={{ ...cellBase, flex: 1.3, minWidth: 150, borderRight: 'none' }}>
          <span style={capStyle}>CREATED</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#c9c9cd' }}>{created}</span>
        </div>
      </div>

      <div style={{ padding: '24px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#2e1518', border: '0.5px solid #5a2b2f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>
                Order <span style={{ color: '#e63946' }}>#{order?.tracking_number ?? '—'}</span>
              </div>
              <div style={{ fontSize: 14, color: '#9a9aa0', marginTop: 4 }}>
                Processed by <span style={{ color: '#e63946' }}>{order?.shop?.name ?? 'indobangla'}</span>
              </div>
              <div style={{ fontSize: 13, color: '#7a7a80', marginTop: 3 }}>
                {order?.customer_name ?? order?.customer?.name ?? '—'} · {order?.customer_contact ?? '—'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={capStyle}>TRANSACTION REF</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#c9c9cd', marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
              TXN-IB-{order?.tracking_number ?? '—'}
            </div>
          </div>
        </div>

        <div style={{ height: '0.5px', background: '#2c2c2f', margin: '22px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14 }}>
          <div style={statCard}>
            <div style={statCap}>TOTAL ITEMS</div>
            <div style={statNum}>{items}</div>
            <div style={statSub}>books</div>
          </div>
          <div style={statCard}>
            <div style={statCap}>SUBTOTAL</div>
            <div style={statNum}>{bdt(order?.amount)}</div>
            <div style={statSub}>before charges</div>
          </div>
          <div style={statCard}>
            <div style={statCap}>PAID</div>
            <div style={{ ...statNum, color: paid > 0 ? '#6cd39b' : '#efc05d' }}>{bdt(paid)}</div>
            <div style={statSub}>{paid >= total && total > 0 ? 'settled' : 'outstanding'}</div>
          </div>
          <div style={{ ...statCard, background: '#2e1518', border: '0.5px solid #5a2b2f' }}>
            <div style={{ ...statCap, color: '#f2969d' }}>{paid > 0 && paid < total ? 'DUE' : 'TOTAL PAYABLE'}</div>
            <div style={{ ...statNum, color: '#e63946' }}>{bdt(paid > 0 && paid < total ? total - paid : total)}</div>
            <div style={{ ...statSub, color: '#f2969d' }}>
              {[OrderStatus.CANCELLED, OrderStatus.FAILED].includes(oStatus) ? 'cancelled' : isPaid ? 'paid' : 'on delivery'}
            </div>
          </div>
        </div>

        <div style={{ height: '0.5px', background: '#2c2c2f', margin: '22px 0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: '#7a7a80' }}>
          <span style={{ color: '#e63946', fontWeight: 500 }}>IndoBangla</span>
          <span style={{ color: '#4a4a4e' }}>·</span>
          <span style={{ fontStyle: 'italic' }}>widen your outlook on life</span>
        </div>
      </div>
    </div>
  );
}
