import { HttpClient } from '@/framework/client/http-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function addrLine(a: any): string {
  if (!a) return '';
  const x = a?.address ?? a;
  return [x?.street_address, x?.city, x?.state, x?.zip, x?.country]
    .filter(Boolean)
    .join(', ');
}

export default function InvoicePage() {
  const router = useRouter();
  const token = router.query.token as string;
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await HttpClient.get<any>('invoice-info', { token });
        setInfo(r);
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'ইনভয়েসটি খুঁজে পাওয়া যায়নি।');
      }
    })();
  }, [token]);

  const inv = info?.invoice;
  const paid = !!inv?.paid;
  const due = Number(inv?.due) || 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1000px 500px at 50% -10%, #f4f7f5, transparent), #eef1ef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 16px',
        fontFamily: "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif",
        color: '#241a14',
      }}
    >
      {/* print: show only the invoice card, edge to edge */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .ib-noprint { display: none !important; }
          .ib-invoice-wrap { padding: 0 !important; background: #fff !important; }
          .ib-invoice-card { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="ib-invoice-wrap" style={{ width: '100%', maxWidth: 480 }}>
        <div
          className="ib-invoice-card"
          style={{
            width: '100%',
            background: '#fff',
            borderRadius: 22,
            boxShadow: '0 24px 60px rgba(36,82,71,.16)',
            overflow: 'hidden',
          }}
        >
          {/* header */}
          <div style={{ background: 'linear-gradient(140deg,#3d7a5f,#5ba474)', padding: '22px 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-.4px' }}>
                  <span style={{ color: '#fff' }}>Indo</span>
                  <span style={{ color: '#d9ecdf' }}>Bangla</span>
                </div>
                <div style={{ color: '#dcefe3', fontSize: 13, marginTop: 5, fontWeight: 500 }}>ইনভয়েস</div>
              </div>
              <div style={{ textAlign: 'right', background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 12, padding: '8px 14px' }}>
                <div style={{ color: '#d9ecdf', fontSize: 10, letterSpacing: 1.6, fontWeight: 600 }}>INVOICE</div>
                <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginTop: 2 }}>#{inv?.tracking_number ?? '—'}</div>
              </div>
            </div>
          </div>
          <div style={{ height: 14, background: '#5ba474', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 14, background: 'radial-gradient(circle at 8px -3px, transparent 8px, #fff 8.5px)', backgroundSize: '16px 14px', backgroundRepeat: 'repeat-x' }} />
          </div>

          <div style={{ padding: '22px 24px 24px' }}>
            {err && <div style={{ color: '#b91c1c', fontWeight: 600, padding: '8px 0' }}>{err}</div>}
            {!err && !inv && <div style={{ textAlign: 'center', color: '#7a6f66', padding: 24 }}>লোড হচ্ছে…</div>}

            {inv && (
              <>
                {/* status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16.5, textTransform: 'capitalize' }}>{inv.customer_name || 'Customer'}</div>
                    <div style={{ color: '#7a6f66', fontSize: 12.5, marginTop: 2 }}>
                      অর্ডার #{inv.tracking_number}{inv.placed_at ? ` · ${inv.placed_at}` : ''}
                    </div>
                    {inv.customer_contact && (
                      <div style={{ color: '#7a6f66', fontSize: 12.5, marginTop: 1 }}>{inv.customer_contact}</div>
                    )}
                    {addrLine(inv.shipping_address) && (
                      <div style={{ color: '#9b9188', fontSize: 11.5, marginTop: 2, maxWidth: 240 }}>{addrLine(inv.shipping_address)}</div>
                    )}
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontWeight: 800,
                      fontSize: 12.5,
                      background: paid ? '#e4f6ee' : '#fff4e6',
                      color: paid ? '#0f9d68' : '#b45309',
                      border: `1px solid ${paid ? '#a7d8bf' : '#f2d79a'}`,
                    }}
                  >
                    {paid ? '✓ পরিশোধিত' : due > 0 ? `বাকি ${bdt(due)}` : 'অপরিশোধিত'}
                  </div>
                </div>

                {/* items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(inv.items || []).map((it: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f7faf8', border: '1px solid #d7e9df', borderRadius: 14, padding: '11px 14px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.4 }}>{it.name}</div>
                        {it.manufacturer && (
                          <div style={{ color: '#9b9188', fontSize: 11.5, marginTop: 1 }}>{it.manufacturer}</div>
                        )}
                        <div style={{ color: '#7a6f66', fontSize: 12, marginTop: 2 }}>পরিমাণ: {it.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{bdt(it.price)}</div>
                    </div>
                  ))}
                </div>

                {/* breakdown */}
                <div style={{ margin: '16px 2px 0' }}>
                  <Row label="সাবটোটাল" value={bdt(inv.subtotal || inv.total)} />
                  {inv.discount > 0 && <Row label="ডিসকাউন্ট" value={'− ' + bdt(inv.discount)} green />}
                  <Row label="ডেলিভারি চার্জ" value={bdt(inv.delivery_fee)} />
                  {Number(inv.weight_charge) > 0 && (
                    <Row label="ওজন চার্জ" value={bdt(inv.weight_charge)} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '2px dashed #d7e9df', marginTop: 8, paddingTop: 14 }}>
                    <span style={{ fontSize: 16.5, fontWeight: 700 }}>মোট</span>
                    <span style={{ fontSize: 27, fontWeight: 700, color: '#2e6b5a', letterSpacing: '-.5px' }}>{bdt(inv.total)}</span>
                  </div>
                  {Number(inv.paid_total) > 0 && !paid && (
                    <>
                      <Row label="পরিশোধিত" value={'− ' + bdt(inv.paid_total)} green />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed #f2d79a', marginTop: 6, paddingTop: 10 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#9a3412' }}>বাকি</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#9a3412' }}>{bdt(due)}</span>
                      </div>
                    </>
                  )}
                  {inv.pay_method && (
                    <div style={{ textAlign: 'right', color: '#7a6f66', fontSize: 12, marginTop: 6 }}>
                      পেমেন্ট মেথড: {String(inv.pay_method).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* actions (hidden on print) */}
                <div className="ib-noprint" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!paid && due > 0 && inv.pay_link && (
                    <a
                      href={inv.pay_link}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: 'linear-gradient(135deg,#d43a2b,#b02a1e)', color: '#fff', fontWeight: 700, fontSize: 16, padding: 15, borderRadius: 14, boxShadow: '0 10px 24px rgba(212,58,43,.28)' }}
                    >
                      এখনই {bdt(due)} পরিশোধ করুন
                    </a>
                  )}
                  <button
                    onClick={() => window.print()}
                    style={{ width: '100%', border: '1.5px solid #cfe0d7', cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: '#2e6b5a', fontWeight: 700, fontSize: 15, padding: 13, borderRadius: 14 }}
                  >
                    🖨️ ইনভয়েস প্রিন্ট / ডাউনলোড
                  </button>
                </div>

                <div style={{ textAlign: 'center', color: '#7a6f66', fontSize: 12.5, marginTop: 16 }}>
                  IndoBangla · ১০০% অরিজিনাল বইয়ের নিশ্চয়তা
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', fontSize: 14, color: '#7a6f66' }}>
      <span>{label}</span>
      <b style={{ color: green ? '#1a8a55' : '#241a14', fontWeight: 600 }}>{value}</b>
    </div>
  );
}
