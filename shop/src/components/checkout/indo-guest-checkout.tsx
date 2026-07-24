import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-toastify';
import client from '@/framework/client';
import { HttpClient } from '@/framework/client/http-client';
import { useCart } from '@/store/quick-cart/cart.context';
import { calculateTotal } from '@/store/quick-cart/cart.utils';
import { formatOrderedProduct } from '@/lib/format-ordered-product';
import { useCreateOrder } from '@/framework/order';
import { useSettings } from '@/framework/settings';
import AreaPicker from '@/components/address/area-picker';
import { PaymentGateway } from '@/types';

const DHAKA_RX = /dhaka|ঢাকা/i;
const bn = (v: number | string) =>
  String(v ?? '').replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d as any]);
const bdt = (n: number) => '৳ ' + bn(Math.round(Number(n) || 0).toLocaleString('en-IN'));

/**
 * Single-page guest checkout built to the user's mockup, wired to the real flow:
 * cart (quick-cart) → zone delivery charge → RedX AreaPicker → SMS OTP (when settings.useOtp)
 * → useCreateOrder (which redirects to the thank-you / pay page on success).
 */
export default function IndoGuestCheckout() {
  const router = useRouter();
  const { items } = useCart();
  const { settings, isLoading: settingsLoading } = useSettings();
  // Fail safe: only an EXPLICIT useOtp:false disables the code. While settings are still
  // loading (or the dehydrated cache hasn't hydrated) settings?.useOtp is undefined — and a
  // half-loaded read must never let an order slip through without OTP.
  const useOtp = settings?.useOtp !== false;
  const { createOrder, isLoading: placing } = useCreateOrder();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [pay, setPay] = useState<'COD' | 'BKASH'>('COD');

  // OTP modal — sms.net.bd sends a 4-digit code.
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpId, setOtpId] = useState<string | undefined>();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [otpErr, setOtpErr] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const subtotal = useMemo(() => calculateTotal(items as any), [items]);

  // The zone charge is Dhaka-inside vs outside. RedX area names ("Dhanmondi - Road 3") don't
  // contain the word "Dhaka", so look the picked area up in the courier list and read its
  // district. Custom/typed areas (no match) fall back to outside — never undercharge.
  const areaQ = area.trim();
  const { data: areaHit } = useQuery(
    ['co-area-district', areaQ],
    () => HttpClient.get<any>('courier-areas', { q: areaQ }),
    { enabled: areaQ.length > 1, keepPreviousData: true, staleTime: 5 * 60 * 1000 },
  );
  const district = useMemo(() => {
    const list: any[] = (areaHit as any)?.data ?? [];
    const exact = list.find((a) => a?.name === areaQ);
    return (exact ?? list[0])?.district ?? '';
  }, [areaHit, areaQ]);
  const insideDhaka = DHAKA_RX.test(district) || DHAKA_RX.test(address);
  const delivery =
    subtotal > 0
      ? insideDhaka
        ? Number(settings?.dhakaDeliveryCharge) || 60
        : Number(settings?.outsideDhakaDeliveryCharge) || 120
      : 0;
  // Per-vendor delivery (other vendors' products). The server ADDS this on top of delivery_fee at
  // order creation, so fetch + show it here too — otherwise the guest is charged more than shown.
  const cartIdsKey = useMemo(
    () => (items as any[]).map((it) => (it as any).productId ?? (it as any).id).sort().join(','),
    [items],
  );
  const { data: vendorDeliveryData } = useQuery(
    ['vendor-delivery', cartIdsKey, insideDhaka],
    () =>
      HttpClient.post<any>('vendor-delivery-quote', {
        products: (items as any[]).map((it) => formatOrderedProduct(it)),
        shipping_address: { city: insideDhaka ? 'Dhaka' : 'Bangladesh' },
      }),
    { enabled: (items as any[]).length > 0, keepPreviousData: true, staleTime: 60 * 1000 },
  );
  const vendorDelivery = Number((vendorDeliveryData as any)?.vendor_delivery_charge ?? 0);
  const total = subtotal + delivery + vendorDelivery;

  const to880 = (p: string) => '880' + p.replace(/\D/g, '').replace(/^0/, '');

  const sendOtp = useMutation((phone_number: string) =>
    client.users.sendOtpCode({ phone_number } as any),
  );
  const verifyOtp = useMutation(
    (v: { otp_id: string; code: string; phone_number: string }) =>
      client.users.verifyOtpCode(v as any),
  );

  const busy = placing || sendOtp.isLoading || verifyOtp.isLoading;

  function buildInput() {
    const addr = {
      street_address: address.trim(),
      city: insideDhaka ? 'Dhaka' : (area.trim() || 'Bangladesh'),
      state: area.trim(),
      country: 'BD',
      zip: '',
    };
    return {
      products: (items as any[]).map((it) => formatOrderedProduct(it)),
      amount: subtotal,
      discount: 0,
      paid_total: total,
      sales_tax: 0,
      delivery_fee: delivery,
      total,
      delivery_time: 'Express Delivery',
      customer_contact: phone.trim(),
      customer_name: name.trim(),
      payment_gateway: pay === 'BKASH' ? PaymentGateway.BKASH : PaymentGateway.COD,
      use_wallet_points: false,
      billing_address: addr,
      shipping_address: addr,
    };
  }

  // useCreateOrder handles the redirect (thank-you page, or /pay/{token} for online payment).
  const placeNow = () => createOrder(buildInput() as any);

  function validate() {
    if (!items?.length) {
      toast.error('আপনার কার্ট খালি।');
      return false;
    }
    if (!name.trim() || !phone.trim() || !address.trim() || !area.trim()) {
      toast.error('নাম, মোবাইল নম্বর, ঠিকানা ও এলাকা পূরণ করুন।');
      return false;
    }
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
      toast.error('সঠিক ১১-সংখ্যার মোবাইল নম্বর দিন (যেমন 017XXXXXXXX)।');
      return false;
    }
    return true;
  }

  function onPlaceClick() {
    if (settingsLoading) {
      toast.error('এক মুহূর্ত অপেক্ষা করুন — লোড হচ্ছে…');
      return;
    }
    if (!validate()) return;
    if (!useOtp) {
      placeNow();
      return;
    }
    sendOtp.mutate(to880(phone), {
      onSuccess: (d: any) => {
        if (d?.success === false) {
          toast.error(d?.message || 'OTP পাঠানো যায়নি। নম্বরটি দেখে আবার চেষ্টা করুন।');
          return;
        }
        setOtpId(d?.id);
        setDigits(['', '', '', '']);
        setOtpErr('');
        setOtpOpen(true);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      },
      onError: () =>
        toast.error('OTP পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।'),
    });
  }

  function submitOtp(code: string) {
    if (!otpId) return;
    verifyOtp.mutate(
      { otp_id: otpId, code, phone_number: to880(phone) },
      {
        onSuccess: (d: any) => {
          if (d?.success === false) {
            setOtpErr('কোডটি সঠিক নয়। আবার চেষ্টা করুন।');
            setDigits(['', '', '', '']);
            otpRefs.current[0]?.focus();
            return;
          }
          setOtpOpen(false);
          placeNow();
        },
        onError: () => {
          setOtpErr('কোডটি সঠিক নয়। আবার চেষ্টা করুন।');
          setDigits(['', '', '', '']);
          otpRefs.current[0]?.focus();
        },
      },
    );
  }

  // Fill the boxes from a (possibly multi-digit) value — typed or pasted — and auto-submit
  // once all four are in. Most shoppers copy the code out of the SMS and paste it, so a box
  // that only kept the last character was the whole "code doesn't work, ask again" loop.
  function fillCode(start: number, raw: string) {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[start] = '';
      setDigits(next);
      return;
    }
    const next = start === 0 && clean.length > 1 ? ['', '', '', ''] : [...digits];
    for (let k = 0; k < clean.length && start + k < 4; k++) {
      next[start + k] = clean[k];
    }
    setDigits(next);
    setOtpErr('');
    const lastFilled = Math.min(start + clean.length, 4);
    otpRefs.current[Math.min(lastFilled, 3)]?.focus();
    const code = next.join('');
    if (code.length === 4) submitOtp(code);
  }

  function onDigit(i: number, v: string) {
    fillCode(i, v.length > 1 ? v : v.slice(-1));
  }

  const canResend = !sendOtp.isLoading;

  return (
    <div className="ibco">
      <div className="steps">
        <span>কার্ট</span>
        <i>›</i>
        <b>চেকআউট</b>
        <i>›</i>
        <span>নিশ্চিতকরণ</span>
      </div>

      <h1 className="ibco-h1">চেকআউট</h1>
      <p className="ibco-sub">অতিথি হিসেবে অর্ডার করছেন — অ্যাকাউন্ট লাগবে না।</p>

      <div className="grid">
        {/* LEFT */}
        <div>
          <div className="panel">
            <div className="p-title">
              <span className="n">১</span> যোগাযোগ ও ডেলিভারি
            </div>
            <div className="field">
              <label>
                পুরো নাম <span className="req">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: সাজ্জাদ হোসেন"
              />
            </div>
            <div className="field">
              <label>
                মোবাইল নম্বর <span className="req">*</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="field">
              <label>
                সম্পূর্ণ ঠিকানা <span className="req">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="বাসা/রোড, এলাকা, থানা"
              />
            </div>
            <div className="field areawrap">
              <AreaPicker value={area} onChange={setArea} />
            </div>
          </div>

          <div className="panel">
            <div className="p-title">
              <span className="n">২</span> পেমেন্ট পদ্ধতি
            </div>
            <label className={`pay-opt ${pay === 'COD' ? 'on' : ''}`} onClick={() => setPay('COD')}>
              <span className="dot" />
              <div>
                <div className="lbl">ক্যাশ অন ডেলিভারি</div>
                <div className="desc">বই হাতে পেয়ে টাকা দিন</div>
              </div>
            </label>
            <label className={`pay-opt ${pay === 'BKASH' ? 'on' : ''}`} onClick={() => setPay('BKASH')}>
              <span className="dot" />
              <div>
                <div className="lbl">বিকাশ</div>
                <div className="desc">অনলাইনে পেমেন্ট করে অর্ডার নিশ্চিত করুন</div>
              </div>
            </label>
          </div>
        </div>

        {/* RIGHT */}
        <div className="summary">
          <div className="panel">
            <div className="p-title" style={{ marginBottom: 8 }}>
              অর্ডার সারাংশ
            </div>

            {!items?.length ? (
              <p className="empty">
                আপনার কার্ট খালি।{' '}
                <a onClick={() => router.push('/')}>বই দেখুন →</a>
              </p>
            ) : (
              (items as any[]).map((it) => (
                <div className="item" key={it.id}>
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="thumb" src={it.image} alt={it.name} />
                  ) : (
                    <div className="thumb ph">বই</div>
                  )}
                  <div className="info">
                    <div className="t">{it.name}</div>
                    <div className="q">পরিমাণ: {bn(it.quantity)}</div>
                  </div>
                  <div className="price">{bdt(it.price * it.quantity)}</div>
                </div>
              ))
            )}

            {items?.length ? (
              <div className="totals">
                <div className="row">
                  <span>সাবটোটাল</span>
                  <span>{bdt(subtotal)}</span>
                </div>
                <div className="row muted">
                  <span>ডেলিভারি চার্জ {insideDhaka ? '(ঢাকা)' : '(ঢাকার বাইরে)'}</span>
                  <span>{bdt(delivery)}</span>
                </div>
                {vendorDelivery > 0 && (
                  <div className="row muted">
                    <span>অন্য বিক্রেতার ডেলিভারি</span>
                    <span>{bdt(vendorDelivery)}</span>
                  </div>
                )}
                <div className="grand">
                  <span>সর্বমোট</span>
                  <span>{bdt(total)}</span>
                </div>
              </div>
            ) : null}

            <button
              className="place"
              onClick={onPlaceClick}
              disabled={busy || !items?.length}
            >
              {busy ? 'অপেক্ষা করুন…' : 'অর্ডার করুন'}
              <span className="arw">→</span>
            </button>
            <div className="trust">🔒 আপনার তথ্য সুরক্ষিত ও গোপন</div>
          </div>
        </div>
      </div>

      {/* OTP MODAL */}
      {otpOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOtpOpen(false)}>
          <div className="modal">
            <div className="micon">📱</div>
            <h2>যাচাই করুন</h2>
            <p>
              আমরা <b>{phone.slice(0, 5) + '-XX' + phone.slice(9)}</b> নম্বরে একটি ৪-সংখ্যার কোড পাঠিয়েছি।
            </p>
            <div className="otp-inputs">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    fillCode(0, e.clipboardData.getData('text') || '');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digits[i] && i > 0) otpRefs.current[i - 1]?.focus();
                  }}
                  inputMode="numeric"
                  maxLength={4}
                />
              ))}
            </div>
            <div className="oerr">{otpErr}</div>
            <button className="verify" onClick={() => submitOtp(digits.join(''))} disabled={verifyOtp.isLoading}>
              {verifyOtp.isLoading ? 'যাচাই হচ্ছে…' : 'যাচাই ও অর্ডার নিশ্চিত করুন'}
            </button>
            <div className="resend">
              কোড পাননি?{' '}
              <a
                className={canResend ? '' : 'dis'}
                onClick={() => canResend && onPlaceClick()}
              >
                পুনরায় পাঠান
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ibco {
          --red: #e63946;
          --red-d: #c82f3c;
          --charcoal: #333132;
          --paper: #faf8f4;
          --line: #ece7de;
          --muted: #8a857c;
          --green: #2e9e5b;
          max-width: 1080px;
          margin: 0 auto;
          padding: 8px 20px 60px;
          color: var(--charcoal);
        }
        .steps {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 0;
          font-size: 0.82rem;
          color: var(--muted);
          font-weight: 600;
        }
        .steps b {
          color: var(--red);
        }
        .steps i {
          font-style: normal;
          opacity: 0.5;
        }
        .ibco-h1 {
          font-weight: 700;
          font-size: 1.9rem;
          margin-bottom: 4px;
        }
        .ibco-sub {
          color: var(--muted);
          margin-bottom: 24px;
          font-size: 0.95rem;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 28px;
          align-items: start;
        }
        .panel {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 26px;
          box-shadow: 0 4px 24px rgba(51, 49, 50, 0.07);
          margin-bottom: 20px;
        }
        .p-title {
          font-weight: 700;
          font-size: 1.08rem;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .p-title .n {
          width: 26px;
          height: 26px;
          background: var(--red);
          color: #fff;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 0.85rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .field {
          margin-bottom: 16px;
        }
        label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .req {
          color: var(--red);
        }
        input,
        textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--line);
          border-radius: 9px;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--charcoal);
          background: var(--paper);
        }
        input:focus,
        textarea:focus {
          outline: none;
          border-color: var(--red);
          background: #fff;
        }
        textarea {
          resize: vertical;
          min-height: 70px;
        }
        .areawrap :global(label) {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .pay-opt {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 10px;
          cursor: pointer;
        }
        .pay-opt.on {
          border-color: var(--red);
          background: #fdf3f4;
        }
        .pay-opt .dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid var(--line);
          flex-shrink: 0;
        }
        .pay-opt.on .dot {
          border-color: var(--red);
          background: radial-gradient(circle, var(--red) 40%, #fff 45%);
        }
        .pay-opt .lbl {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .pay-opt .desc {
          font-size: 0.8rem;
          color: var(--muted);
        }
        .summary {
          position: sticky;
          top: 20px;
        }
        .item {
          display: flex;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
        }
        .thumb {
          width: 52px;
          height: 70px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
          background: linear-gradient(135deg, #e8e2d8, #d6cfc2);
        }
        .thumb.ph {
          display: grid;
          place-items: center;
          color: #9a9284;
          font-size: 0.85rem;
        }
        .info {
          flex: 1;
          min-width: 0;
        }
        .info .t {
          font-weight: 600;
          font-size: 0.9rem;
          line-height: 1.35;
        }
        .info .q {
          font-size: 0.8rem;
          color: var(--muted);
        }
        .price {
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .empty {
          padding: 20px 0;
          color: var(--muted);
          font-size: 0.9rem;
        }
        .empty a {
          color: var(--red);
          font-weight: 600;
          cursor: pointer;
        }
        .totals {
          padding-top: 16px;
          font-size: 0.92rem;
        }
        .totals .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
        }
        .totals .row.muted {
          color: var(--muted);
        }
        .totals .grand {
          display: flex;
          justify-content: space-between;
          padding-top: 14px;
          margin-top: 6px;
          border-top: 1.5px dashed var(--line);
          font-weight: 700;
          font-size: 1.15rem;
        }
        .totals .grand span:last-child {
          color: var(--red);
        }
        .place {
          width: 100%;
          padding: 16px;
          background: var(--red);
          color: #fff;
          border: none;
          border-radius: 11px;
          font-family: inherit;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }
        .place:hover {
          background: var(--red-d);
        }
        .place:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .arw {
          font-weight: 700;
        }
        .trust {
          text-align: center;
          font-size: 0.78rem;
          color: var(--muted);
          margin-top: 14px;
        }
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(51, 49, 50, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal {
          background: #fff;
          border-radius: 18px;
          max-width: 410px;
          width: 100%;
          padding: 34px 30px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .micon {
          font-size: 34px;
          margin-bottom: 8px;
        }
        .modal h2 {
          font-size: 1.4rem;
          margin-bottom: 6px;
        }
        .modal p {
          color: var(--muted);
          font-size: 0.92rem;
          margin-bottom: 22px;
        }
        .modal p b {
          color: var(--charcoal);
        }
        .otp-inputs {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 8px;
          direction: ltr;
        }
        .otp-inputs input {
          width: 52px;
          height: 58px;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          background: var(--paper);
          padding: 0;
        }
        .otp-inputs input:focus {
          border-color: var(--red);
          background: #fff;
        }
        .oerr {
          color: var(--red);
          font-size: 0.82rem;
          font-weight: 600;
          min-height: 20px;
          margin-bottom: 8px;
        }
        .verify {
          width: 100%;
          padding: 14px;
          background: var(--red);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: inherit;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        }
        .verify:disabled {
          opacity: 0.5;
        }
        .resend {
          margin-top: 16px;
          font-size: 0.85rem;
          color: var(--muted);
        }
        .resend a {
          color: var(--red);
          font-weight: 600;
          cursor: pointer;
        }
        .resend a.dis {
          color: var(--muted);
          cursor: default;
        }
        @media (max-width: 860px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .summary {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
