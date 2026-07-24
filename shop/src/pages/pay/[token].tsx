import { HttpClient } from '@/framework/client/http-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { trackJourneyError } from '@/lib/analytics';

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// MarvelException on this API comes back as HTTP 200 with a GraphQL-style
// `{errors:[{message}]}` body, NOT a 4xx/5xx — so axios resolves instead of
// rejecting and a bare try/catch never sees it. Every real success response
// from pay-confirm/pay-info/pay-bank-proof carries an explicit `status`;
// anything else (including this envelope) must be treated as a failure.
const errorMessage = (r: any): string | null => r?.errors?.[0]?.message || null;

// Which of these actually appear is decided by the API (`info.methods`) — Nagad stays out
// until its credentials land, so it must never be assumed present here.
const METHODS: { id: string; name: string; tag: string; logo: string; color: string }[] = [
  // The tag doubles as the honest expectation: bKash settles itself the moment bKash confirms,
  // a bank transfer waits on a human checking the statement.
  { id: 'bkash', name: 'বিকাশ', tag: 'সাথে সাথে ✓', logo: 'b', color: '#e2136e' },
  { id: 'nagad', name: 'নগদ', tag: 'Send Money', logo: 'ন', color: '#f6921e' },
  { id: 'bank', name: 'ব্যাংক', tag: '২৪-৪৮ ঘণ্টা', logo: '🏦', color: '#2e6b5a' },
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
  const [payFull, setPayFull] = useState(false); // buyer opts to pay 100% instead of the advance
  const [payFullTouched, setPayFullTouched] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const r = await HttpClient.get<any>('pay-info', { token });
      const msg = errorMessage(r);
      if (msg) throw new Error(msg);
      setInfo(r);
      if (r?.order?.paid) setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'লিংকটি সঠিক নয় বা মেয়াদ শেষ।');
      trackJourneyError('payment', 'pay-info', e?.response?.data?.message ?? e?.message ?? 'pay link load failed');
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Mirror however the link is currently stamped — until the buyer touches the choice, at which
  // point their pick wins and must not be stomped by the next refetch.
  useEffect(() => {
    if (!payFullTouched && info?.order?.pay_purpose) {
      setPayFull(info.order.pay_purpose === 'full');
    }
  }, [info?.order?.pay_purpose, payFullTouched]);

  const pay = async () => {
    setPaying(true);
    setErr('');
    try {
      const r = await HttpClient.post<any>('pay-confirm', { token, method, purpose: payFull ? 'full' : 'advance' });
      const msg = errorMessage(r);
      if (msg) throw new Error(msg);
      if (r?.status === 'redirect' && r?.url) {
        window.location.href = r.url;
        return;
      }
      // Only an explicit server-confirmed success may show the ✅ screen — anything
      // else (an unrecognised body, a gateway that never redirected) is a failure,
      // not a free pass. This is the exact shape settlePayment/payConfirm return for
      // an order that's already paid.
      if (r?.status === 'success') {
        setDone(true);
        load();
        return;
      }
      throw new Error('পেমেন্ট সম্পন্ন করা যায়নি।');
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'পেমেন্ট সম্পন্ন করা যায়নি।');
      trackJourneyError('payment', 'pay-confirm', e?.response?.data?.message ?? e?.message ?? 'payment failed');
    } finally {
      setPaying(false);
    }
  };

  // Bank transfers don't go through pay-confirm at all — the slip is parked for an admin, and
  // the order stays unpaid until they say otherwise.
  const submitProof = async () => {
    if (!proofFile) return;
    setErr('');
    setPaying(true);
    try {
      const body = new FormData();
      body.append('token', token);
      body.append('screenshot', proofFile);
      // The axios instance defaults to application/json, so multipart has to be asked for
      // explicitly — same as settings.upload does.
      const r = await HttpClient.post<any>('pay-bank-proof', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const msg = errorMessage(r);
      if (msg) throw new Error(msg);
      setProofFile(null);
      // Flip to the confirmation immediately. `load()` re-reads bank_proof from the server and
      // keeps it across refreshes, but the buyer should not sit looking at the upload form
      // while that round-trip happens — that's what made the button feel dead.
      setProofSubmitted(true);
      toast.success('স্লিপ জমা হয়েছে — যাচাইয়ের পর নিশ্চিত করা হবে।');
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'স্লিপ জমা দেওয়া যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setPaying(false);
    }
  };

  const order = info?.order;
  const dueAmount = order?.due ?? order?.total;
  // Drive the choice off the advance the order actually HAS, not off pay_purpose. pay_purpose
  // records the last attempt, so keying the toggle to it meant that bouncing to bKash on the
  // 100% option and coming back without paying hid the 50% option for good.
  const advanceOption = Number(order?.advance_option) || 0;
  const isAdvanceLink = advanceOption > 0 && advanceOption < Number(dueAmount);
  const payNow = isAdvanceLink && !payFull ? advanceOption : dueAmount;
  const bank = info?.bank ?? null;
  const bankProofPending = order?.bank_proof?.status === 'pending_review' || proofSubmitted;
  const bankProofRejected = order?.bank_proof?.status === 'rejected' && !proofSubmitted;
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
                {isAdvanceLink && !(done || order.paid) ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7a6f66', marginBottom: 8 }}>কত টাকা এখন দেবেন?</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        onClick={() => { setPayFullTouched(true); setPayFull(false); }}
                        style={{ border: `1.5px solid ${!payFull ? '#c2820c' : '#ece7de'}`, background: !payFull ? '#fff7ed' : '#fff', borderRadius: 14, padding: '12px 10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#9a3412' }}>অগ্রিম ৫০%</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: '#9a3412', marginTop: 2 }}>{bdt(advanceOption)}</div>
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>বাকি {bdt(Math.max(0, dueAmount - advanceOption))} ডেলিভারিতে</div>
                      </button>
                      <button
                        onClick={() => { setPayFullTouched(true); setPayFull(true); }}
                        style={{ border: `1.5px solid ${payFull ? '#2e6b5a' : '#ece7de'}`, background: payFull ? 'linear-gradient(180deg,#fff,#e9f3ee)' : '#fff', borderRadius: 14, padding: '12px 10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#2e6b5a' }}>পুরো ১০০%</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: '#2e6b5a', marginTop: 2 }}>{bdt(dueAmount)}</div>
                        <div style={{ fontSize: 11, color: '#1a8a55', marginTop: 2 }}>একবারেই সম্পূর্ণ পরিশোধ</div>
                      </button>
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
                  {/* auto-fit, so switching Nagad on later doesn't strand a lone tile */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(88px,1fr))', gap: 10 }}>
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

                  {method === 'bank' ? (
                    bankProofPending ? (
                      <div style={{ marginTop: 18, borderRadius: 14, background: '#fff7e6', border: '1px solid #f2d79a', padding: 18, textAlign: 'center' }}>
                        <div style={{ fontSize: 32 }}>⏳</div>
                        <div style={{ fontSize: 15.5, fontWeight: 800, color: '#96690d', marginTop: 6 }}>স্লিপ জমা হয়েছে — যাচাই চলছে</div>
                        <div style={{ fontSize: 12.5, color: '#8a6d2f', marginTop: 5, lineHeight: 1.6 }}>
                          আমাদের টিম ব্যাংক স্টেটমেন্টের সাথে মিলিয়ে দেখে পেমেন্ট নিশ্চিত করবে। নিশ্চিত হলে এই পেজেই ✅ দেখতে পাবেন।
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 16 }}>
                        {bankProofRejected && (
                          <div style={{ marginBottom: 12, borderRadius: 12, background: '#fdf0f1', border: '1px solid #f4c4c8', padding: 12, fontSize: 12.5, color: '#8a4048', lineHeight: 1.6 }}>
                            <b style={{ color: '#e63946' }}>আগের স্লিপটি গ্রহণ করা যায়নি।</b>
                            {order.bank_proof?.note ? <> {order.bank_proof.note}</> : ' অনুগ্রহ করে সঠিক স্লিপটি আবার আপলোড করুন।'}
                          </div>
                        )}
                        {bank ? (
                          <div style={{ borderRadius: 14, border: '1px dashed #b9cfc4', background: '#f4f8f6', padding: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#2e6b5a', marginBottom: 10 }}>
                              🏦 এই একাউন্টে {bdt(payNow)} পাঠান
                            </div>
                            <BankRow label="ব্যাংক" value={`${bank.bank_name}${bank.branch ? ` (${bank.branch})` : ''}`} />
                            <BankRow label="একাউন্ট নাম" value={bank.account_name} />
                            <BankRow label="একাউন্ট নম্বর" value={bank.account_no} mono copyable />
                            {bank.routing_no ? <BankRow label="রাউটিং নম্বর" value={bank.routing_no} mono copyable /> : null}
                            <div style={{ marginTop: 12, borderTop: '1px dashed #cfe0d7', paddingTop: 10, fontSize: 11.5, color: '#5c7a6d', lineHeight: 1.6 }}>
                              <b style={{ color: '#1f4d3d' }}>⚡ NPSB-তে পাঠান</b> — অন্য ব্যাংক থেকে পাঠালে
                              <b> NPSB</b> বেছে নিন, তাহলে টাকা <b>৬ ঘণ্টার মধ্যে</b> আমাদের একাউন্টে পৌঁছে যায়।
                              অন্য মাধ্যমে পাঠালে ব্যাংকভেদে ১-২ কর্মদিবস লাগতে পারে।
                              <br />
                              টাকা পাঠানোর পর <b>ডিপোজিট স্লিপ / ট্রান্সফারের স্ক্রিনশট</b> আপলোড করুন।
                              আমরা স্টেটমেন্টের সাথে মিলিয়ে দেখে নিশ্চিত করব — এতে <b>২৪–৪৮ ঘণ্টা</b> লাগতে পারে।
                              {isAdvanceLink && ' প্রি-অর্ডারের ক্ষেত্রে অগ্রিম নিশ্চিত হওয়ার পরই আপনার কপি বুক করা হবে।'}
                              <br />
                              <span style={{ color: '#8a6d2f' }}>
                                তাড়াতাড়ি নিশ্চিত করতে চাইলে <b>বিকাশে</b> দিন — ওটা সাথে সাথেই অনুমোদিত হয়।
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <label style={{ display: 'block', marginTop: 14, borderRadius: 12, border: '1.5px dashed #c9c1b4', background: '#fff', padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            style={{ display: 'none' }}
                            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                          />
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: proofFile ? '#2e6b5a' : '#7a6f66' }}>
                            {proofFile ? `📎 ${proofFile.name}` : '📎 স্লিপের ছবি বাছুন'}
                          </div>
                          <div style={{ fontSize: 11, color: '#9b9188', marginTop: 3 }}>JPG / PNG / WEBP · সর্বোচ্চ ৫ MB</div>
                        </label>

                        <button onClick={submitProof} disabled={paying || !proofFile} style={{ width: '100%', marginTop: 14, border: 'none', cursor: proofFile ? 'pointer' : 'not-allowed', fontFamily: 'inherit', background: 'linear-gradient(135deg,#3d7a5f,#2e6b5a)', color: '#fff', fontWeight: 700, fontSize: 16, padding: 15, borderRadius: 14, opacity: paying || !proofFile ? 0.55 : 1 }}>
                          {paying ? 'আপলোড হচ্ছে…' : 'স্লিপ জমা দিন'}
                        </button>
                      </div>
                    )
                  ) : (
                    <button onClick={pay} disabled={paying} style={{ width: '100%', marginTop: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#d43a2b,#b02a1e)', color: '#fff', fontWeight: 700, fontSize: 17, padding: 16, borderRadius: 14, boxShadow: '0 10px 24px rgba(212,58,43,.30)', opacity: paying ? 0.7 : 1 }}>
                      {paying ? 'প্রসেস হচ্ছে…' : `${methodName}ে ${bdt(payNow)} ${order.pay_purpose === 'advance' ? 'অগ্রিম ' : ''}পরিশোধ করুন`}
                    </button>
                  )}
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

/** One line of the bank account block. Long numbers get a tap-to-copy so nobody mistypes. */
function BankRow({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!copyable || !navigator?.clipboard) return;
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ fontSize: 12, color: '#5c7a6d', flexShrink: 0 }}>{label}</span>
      <b
        onClick={copy}
        title={copyable ? 'কপি করুন' : undefined}
        style={{
          fontSize: mono ? 13.5 : 12.5, color: '#1f4d3d', fontWeight: 700, textAlign: 'right',
          fontFamily: mono ? 'monospace' : 'inherit', cursor: copyable ? 'pointer' : 'default',
          wordBreak: 'break-all',
        }}
      >
        {value}{copied ? ' ✓' : copyable ? ' ⧉' : ''}
      </b>
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
