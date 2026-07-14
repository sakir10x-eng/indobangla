import { HttpClient } from '@/framework/client/http-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const METHODS: { id: string; name: string; tag: string; logo: string; color: string }[] = [
  { id: 'bkash', name: 'বিকাশ', tag: 'Send Money', logo: 'b', color: '#e2136e' },
  { id: 'nagad', name: 'নগদ', tag: 'Send Money', logo: 'ন', color: '#f6921e' },
  { id: 'card', name: 'কার্ড', tag: 'Visa · Master', logo: '💳', color: '#2b4a8a' },
];

export default function PayPage() {
  const router = useRouter();
  const token = router.query.token as string;
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState('');
  const [method, setMethod] = useState('bkash');
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const r = await HttpClient.get<any>('pay-info', { token });
      setInfo(r);
      if (r?.order?.paid) setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'লিংকটি সঠিক নয় বা মেয়াদ শেষ।');
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pay = async () => {
    setPaying(true);
    try {
      const r = await HttpClient.post<any>('pay-confirm', { token, method });
      if (r?.status === 'redirect' && r?.url) {
        window.location.href = r.url;
        return;
      }
      setDone(true);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'পেমেন্ট সম্পন্ন করা যায়নি।');
    } finally {
      setPaying(false);
    }
  };

  const order = info?.order;
  const payNow = order?.pay_purpose === 'advance' && order?.pay_amount ? order.pay_amount : order?.total;
  const methodName = METHODS.find((m) => m.id === method)?.name ?? '';
  const initial = (order?.customer_name || 'C').trim().charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1000px 500px at 50% -10%, #f4f7f5, transparent), #eef1ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', fontFamily: "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif", color: '#241a14' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 22, boxShadow: '0 24px 60px rgba(36,82,71,.16)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ background: 'linear-gradient(140deg,#3d7a5f,#5ba474)', padding: '22px 24px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-.4px' }}>
                <span style={{ color: '#fff' }}>Indo</span><span style={{ color: '#d9ecdf' }}>Bangla</span>
              </div>
              <div style={{ color: '#dcefe3', fontSize: 13, marginTop: 5, fontWeight: 500 }}>অর্ডার পেমেন্ট</div>
            </div>
            <div style={{ textAlign: 'right', background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 12, padding: '8px 14px' }}>
              <div style={{ color: '#d9ecdf', fontSize: 10, letterSpacing: 1.6, fontWeight: 600 }}>ORDER ID</div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginTop: 2 }}>#{order?.tracking_number ?? '—'}</div>
            </div>
          </div>
        </div>
        <div style={{ height: 14, background: '#5ba474', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 14, background: 'radial-gradient(circle at 8px -3px, transparent 8px, #fff 8.5px)', backgroundSize: '16px 14px', backgroundRepeat: 'repeat-x' }} />
        </div>

        <div style={{ padding: '22px 24px 24px' }}>
          {err && <div style={{ color: '#b91c1c', fontWeight: 600, padding: '8px 0' }}>{err}</div>}
          {!err && !order && <div style={{ textAlign: 'center', color: '#7a6f66', padding: 24 }}>লোড হচ্ছে…</div>}

          {order && (
            <>
              {/* customer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e9f3ee', color: '#2e6b5a', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>{initial}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16.5, textTransform: 'capitalize' }}>{order.customer_name || 'Customer'}</div>
                  <div style={{ color: '#7a6f66', fontSize: 12.5, marginTop: 1 }}>অর্ডার #{order.tracking_number}{order.placed_at ? ` · ${order.placed_at}` : ''}</div>
                </div>
              </div>

              {/* items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(order.items || []).map((it: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#f7faf8', border: '1px solid #d7e9df', borderRadius: 14, padding: '13px 14px' }}>
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt={it.name}
                        loading="lazy"
                        style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: '3px 5px 5px 3px', flexShrink: 0, boxShadow: 'inset 2px 0 0 rgba(255,255,255,.12), 0 1px 4px rgba(0,0,0,.15)' }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 60, borderRadius: '3px 5px 5px 3px', background: 'linear-gradient(145deg,#2e6b5a,#245247)', flexShrink: 0, boxShadow: 'inset 2px 0 0 rgba(255,255,255,.12)' }} />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.4 }}>{it.name}</div>
                      <div style={{ color: '#7a6f66', fontSize: 12.5, marginTop: 2 }}>পরিমাণ: {it.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{bdt(it.price)}</div>
                  </div>
                ))}
              </div>

              {/* breakdown */}
              <div style={{ margin: '16px 2px 0' }}>
                <Row label="সাবটোটাল" value={bdt(order.subtotal || order.total)} />
                {order.discount > 0 && <Row label="ডিসকাউন্ট" value={'− ' + bdt(order.discount)} green />}
                {order.advance !== 0 && order.advance != null && (
                  <Row label={order.advance < 0 ? 'অ্যাডভান্স ছাড়' : 'অ্যাডজাস্টমেন্ট'} value={(order.advance < 0 ? '− ' : '+ ') + bdt(Math.abs(order.advance))} green={order.advance < 0} />
                )}
                <Row label="ডেলিভারি চার্জ" value={bdt(order.delivery_fee)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '2px dashed #d7e9df', marginTop: 8, paddingTop: 14 }}>
                  <span style={{ fontSize: 16.5, fontWeight: 700 }}>মোট</span>
                  <span style={{ fontSize: 27, fontWeight: 700, color: '#2e6b5a', letterSpacing: '-.5px' }}>{bdt(order.total)}</span>
                </div>
                {order.pay_purpose === 'advance' && order.pay_amount ? (
                  <div style={{ marginTop: 12, borderRadius: 12, background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 15, fontWeight: 700, color: '#9a3412' }}>
                      <span>এখন অগ্রিম (৫০%)</span>
                      <span style={{ fontSize: 20 }}>{bdt(order.pay_amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#b45309', marginTop: 5 }}>
                      <span>ডেলিভারির সময় বাকি</span>
                      <span>{bdt(Math.max(0, (order.due ?? order.total) - order.pay_amount))}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {done || order.paid ? (
                <div style={{ marginTop: 18, borderRadius: 14, background: '#e4f6ee', padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f9d68', marginTop: 6 }}>পেমেন্ট সম্পন্ন ও নিশ্চিত</div>
                  <div style={{ fontSize: 13, color: '#166a44', marginTop: 4 }}>Payment done and confirmed{order.pay_method ? ` · ${order.pay_method.toUpperCase()}` : ''}</div>
                  {order.is_club && order.club_coupon && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #a7d8bf' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#166a44' }}>🪪 Readers&apos; Club সক্রিয়!</div>
                      <div style={{ marginTop: 6, display: 'inline-block', border: '2px dashed #0f9d68', borderRadius: 8, padding: '6px 16px', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#2e6b5a' }}>{order.club_coupon}</div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14.5, margin: '22px 0 10px' }}>পেমেন্ট মেথড</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {(info.methods || METHODS.map((m) => m.id)).map((mid: string) => {
                      const m = METHODS.find((x) => x.id === mid) || { id: mid, name: mid, tag: '', logo: '💰', color: '#2e6b5a' };
                      const on = method === m.id;
                      return (
                        <button key={m.id} onClick={() => setMethod(m.id)} style={{ border: `1.5px solid ${on ? '#2e6b5a' : '#ece7de'}`, background: on ? 'linear-gradient(180deg,#fff,#e9f3ee)' : '#fff', borderRadius: 14, padding: '14px 8px 12px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 11, margin: '0 auto 8px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 14, background: m.color }}>{m.logo}</div>
                          <div style={{ fontWeight: on ? 700 : 600, fontSize: 13.5, color: on ? '#2e6b5a' : '#241a14' }}>{m.name}</div>
                          <div style={{ fontSize: 10.5, color: '#7a6f66', marginTop: 1 }}>{m.tag}</div>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={pay} disabled={paying} style={{ width: '100%', marginTop: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#d43a2b,#b02a1e)', color: '#fff', fontWeight: 700, fontSize: 17, padding: 16, borderRadius: 14, boxShadow: '0 10px 24px rgba(212,58,43,.30)', opacity: paying ? 0.7 : 1 }}>
                    {paying ? 'প্রসেস হচ্ছে…' : `${methodName}ে ${bdt(payNow)} ${order.pay_purpose === 'advance' ? 'অগ্রিম ' : ''}পরিশোধ করুন`}
                  </button>
                  <div style={{ textAlign: 'center', color: '#7a6f66', fontSize: 12.5, marginTop: 14 }}>
                    🔒 নিরাপদ পেমেন্ট · IndoBangla · ১০০% অরিজিনাল বইয়ের নিশ্চয়তা
                  </div>
                </>
              )}
            </>
          )}
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
