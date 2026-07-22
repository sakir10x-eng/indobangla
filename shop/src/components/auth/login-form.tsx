import { useState, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useMutation, useQueryClient } from 'react-query';
import { useAtom } from 'jotai';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import client from '@/framework/client';
import { useLogin } from '@/framework/user';
import { useToken } from '@/lib/hooks/use-token';
import { authorizationAtom } from '@/store/authorization-atom';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { useSettings } from '@/framework/settings';
import { Routes } from '@/config/routes';

/**
 * IndoBangla login — the uploaded multi-step design.
 * Step 1 (phone): mobile → 4-digit OTP  |  Google  |  email  |  guest
 * Step 2 (email): email + password (with a remembered-user chip)
 * Step 3 (otp):   verify the 4-digit code → log in (new numbers are sent to registration).
 * Wired to the real endpoints: /send-otp-code, /otp-login, and the email useLogin().
 */

const RED = '#e63946';
const RED_DARK = '#c42b38';
const STORE = 'ib_login';

type Step = 'phone' | 'email' | 'otp';

function loadPrefs(): any {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(STORE) || '{}') || {};
  } catch {
    return {};
  }
}
function savePrefs(o: any) {
  try {
    localStorage.setItem(STORE, JSON.stringify(o));
  } catch {}
}
function clearPrefs() {
  try {
    localStorage.removeItem(STORE);
  } catch {}
}

export default function LoginView() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { openModal, closeModal } = useModalAction();
  const { setToken } = useToken();
  const [, setAuthorized] = useAtom(authorizationAtom);
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const isCheckout = router.pathname.includes('checkout');
  const guestCheckout = (settings as any)?.guestCheckout;

  const { mutate: emailLogin, isLoading: emailLoading, serverError, setServerError } = useLogin();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(''); // local 11-digit 01XXXXXXXXX
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState(['', '', '', '']);
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const [password, setPassword] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [known, setKnown] = useState<any>({});
  const [cooldown, setCooldown] = useState(0);

  const boxRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    const p = loadPrefs();
    setKnown(p);
    if (p.email) setEmail(p.email);
    if (p.phone) setPhone('0' + p.phone);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const intlPhone = () => '+880' + phone.slice(1); // 01XXXXXXXXX -> +8801XXXXXXXXX
  const phoneOk = /^01[3-9]\d{8}$/.test(phone);

  const sendMutation = useMutation(client.users.sendOtpCode, {
    onSuccess: (data: any) => {
      if (data && data.success === false) {
        setPhoneErr('OTP পাঠানো যায়নি — একটু পরে আবার চেষ্টা করুন।');
        return;
      }
      setOtpId(data?.id ?? null);
      // remember whether this number already has an account (drives the new-user redirect below)
      (window as any).__ib_contact_exist = !!data?.is_contact_exist;
      setCode(['', '', '', '']);
      setOtpErr(null);
      setStep('otp');
      setCooldown(30);
      setTimeout(() => boxRefs[0].current?.focus(), 80);
    },
    onError: (e: any) => setPhoneErr(e?.response?.data?.message || 'OTP পাঠানো যায়নি — একটু পরে আবার চেষ্টা করুন।'),
  });

  const otpLoginMutation = useMutation(client.users.OtpLogin, {
    onSuccess: (data: any) => {
      if (!data?.token) {
        // new number — no account yet: send them to the registration flow
        setOtpErr('এই নম্বরে অ্যাকাউন্ট নেই — রেজিস্ট্রেশন করুন।');
        openModal('REGISTER');
        return;
      }
      const p = loadPrefs();
      savePrefs({ ...p, phone: phone.slice(1), method: 'phone' });
      setToken(data.token);
      setAuthorized(true);
      queryClient.clear();
      closeModal();
    },
    onError: () => setOtpErr('OTP মিলছে না বা মেয়াদ শেষ — আবার চেষ্টা করুন।'),
  });

  function onPhoneInput(v: string) {
    setPhone(v.replace(/\D/g, '').slice(0, 11));
    setPhoneErr(null);
  }
  function sendOtp() {
    if (!phoneOk) {
      setPhoneErr('১১ ডিজিটের সঠিক নম্বর দিন (যেমন 01712345678)।');
      return;
    }
    sendMutation.mutate({ phone_number: intlPhone() } as any);
  }
  function resend() {
    if (cooldown > 0) return;
    sendMutation.mutate({ phone_number: intlPhone() } as any);
    setCooldown(30);
  }
  function onOtpBox(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    setOtpErr(null);
    if (d && i < 3) boxRefs[i + 1].current?.focus();
  }
  function onOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxRefs[i - 1].current?.focus();
    if (e.key === 'Enter') verifyOtp();
  }
  function onOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4).split('');
    if (!d.length) return;
    const next = ['', '', '', ''];
    d.forEach((ch, j) => (next[j] = ch));
    setCode(next);
    boxRefs[Math.min(d.length, 3)].current?.focus();
  }
  function verifyOtp() {
    const c = code.join('');
    if (c.length < 4) {
      setOtpErr('৪ ডিজিটের কোডটি সম্পূর্ণ লিখুন।');
      return;
    }
    otpLoginMutation.mutate({ phone_number: intlPhone(), otp_id: otpId, code: c } as any);
  }

  function doEmailLogin() {
    let bad = false;
    // Accept a phone number here too: many accounts were created by OTP or guest checkout
    // and have no email their owner would remember, but everyone knows their own number.
    // The API decides which one it is; this only stops obvious typos.
    const id = email.trim();
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(id);
    const isPhone = /^(\+?88)?0?1[3-9]\d{8}$/.test(id.replace(/[\s-]/g, ''));
    if (!isEmail && !isPhone) { setEmailErr(true); bad = true; }
    if (!password) { setPwErr(true); bad = true; }
    if (bad) return;
    if (remember) savePrefs({ ...loadPrefs(), email: email.trim(), method: 'email' });
    else clearPrefs();
    emailLogin({ email: email.trim(), password });
  }

  // ---- shared styles ----
  const card: React.CSSProperties = { width: '100%', maxWidth: 400 };
  const inp: React.CSSProperties = { width: '100%', height: 46, padding: '0 13px', border: '1px solid #cfcbc4', borderRadius: 10, fontSize: 15, outline: 'none' };
  const primaryBtn: React.CSSProperties = { width: '100%', height: 50, marginTop: 14, border: 0, borderRadius: 10, background: RED, color: '#fff', fontSize: 15.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const outBtn: React.CSSProperties = { flex: 1, height: 46, border: '1px solid #cfcbc4', borderRadius: 10, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#333132', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
  const dashBtn: React.CSSProperties = { width: '100%', height: 44, border: '1.5px dashed #cfcbc4', borderRadius: 10, background: 'transparent', fontSize: 13.5, fontWeight: 600, color: '#333132', cursor: 'pointer' };
  const backBtn: React.CSSProperties = { border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6e6c6d', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', marginBottom: 8 };
  const link: React.CSSProperties = { border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: RED, padding: 0 };
  const errText: React.CSSProperties = { fontSize: 12, color: RED_DARK, fontWeight: 600, marginTop: 6 };
  const Divider = ({ label }: { label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '18px 0 14px' }}>
      <span style={{ flex: 1, height: 1, background: '#e4e1dc' }} />
      <em style={{ fontStyle: 'normal', fontSize: 11.5, color: '#9a9899' }}>{label}</em>
      <span style={{ flex: 1, height: 1, background: '#e4e1dc' }} />
    </div>
  );

  return (
    <div className="flex h-full min-h-screen w-screen flex-col items-center justify-center bg-light px-4 py-6 sm:p-8 md:h-auto md:min-h-0 md:max-w-[440px] md:rounded-2xl">
      <div style={card}>
        <div className="mb-5 text-center">
          <div className="font-serif text-[26px] font-bold leading-none">
            <span style={{ color: RED }}>Indo</span><span className="text-charcoal">Bangla</span>
          </div>
          <div className="mt-1.5 text-[8.5px] uppercase tracking-[2.4px]" style={{ color: RED }}>widen your outlook on life</div>
        </div>

        {serverError && (
          <div className="mb-3 rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: '#fdedee', color: RED_DARK }}>
            {t(serverError)}
            <button className="ml-2 underline" onClick={() => setServerError(null)}>×</button>
          </div>
        )}

        {/* ---------------- STEP: PHONE ---------------- */}
        {step === 'phone' && (
          <div>
            <div className="mb-4 text-center">
              <h1 className="font-serif text-[22px] font-bold text-charcoal">স্বাগতম</h1>
              <p className="mt-1 text-[13px] text-body">মোবাইল নম্বর দিয়ে এক মিনিটে লগইন করুন</p>
            </div>
            <label className="mb-1.5 block text-[12px] font-semibold text-body">মোবাইল নম্বর</label>
            <div className="flex items-stretch overflow-hidden rounded-[10px]" style={{ height: 46, border: `1px solid ${phoneErr ? RED : '#cfcbc4'}` }}>
              <span className="flex flex-none items-center gap-1.5 border-r px-3 text-[14px] text-body" style={{ borderColor: '#e4e1dc' }}>🇧🇩 +880</span>
              <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="01712345678" value={phone}
                onChange={(e) => onPhoneInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                className="h-full w-full border-0 bg-transparent px-3 text-[15px] outline-none" />
            </div>
            {phoneErr && <p style={errText}>{phoneErr}</p>}
            <button style={primaryBtn} onClick={sendOtp} disabled={sendMutation.isLoading}>
              {sendMutation.isLoading ? 'পাঠানো হচ্ছে…' : 'OTP পাঠান'} <span>→</span>
            </button>
            <p className="mt-2 text-center text-[11.5px] text-hint" style={{ color: '#9a9899' }}>SMS-এ ৪ ডিজিটের কোড যাবে · পাসওয়ার্ড মনে রাখতে হবে না</p>
            <Divider label="অথবা" />
            <div className="flex gap-2.5">
              <button style={outBtn} onClick={() => signIn('google')}>Google</button>
              <button style={outBtn} onClick={() => setStep('email')}>পাসওয়ার্ড</button>
            </div>
            {isCheckout && guestCheckout && (
              <div className="mt-4 border-t pt-4 text-center" style={{ borderColor: '#e4e1dc' }}>
                <p className="mb-2 text-[13px] text-body">অ্যাকাউন্ট ছাড়াই অর্ডার করতে চান?</p>
                <button style={dashBtn} onClick={() => router.push(Routes.checkoutGuest)}>গেস্ট হিসেবে চেকআউট →</button>
              </div>
            )}
            <p className="mt-4 text-center text-[13px] text-body">
              নতুন?{' '}
              <button style={link} onClick={() => openModal('REGISTER')}>নতুন অ্যাকাউন্ট খুলুন</button>
            </p>
          </div>
        )}

        {/* ---------------- STEP: EMAIL ---------------- */}
        {step === 'email' && (
          <div>
            <button style={backBtn} onClick={() => setStep('phone')}>← সব অপশন</button>
            <div className="mb-4 text-center">
              <h1 className="font-serif text-[22px] font-bold text-charcoal">আবার স্বাগতম</h1>
              <p className="mt-1 text-[13px] text-body">ইমেইল বা মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করুন</p>
            </div>
            {known?.email ? (
              <div className="mb-3.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#f3f0ea' }}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[14px] font-bold" style={{ background: '#fdedee', color: RED_DARK }}>{(known.email[0] || 'আ').toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[13.5px] font-semibold text-charcoal">ফিরে আসার জন্য ধন্যবাদ</b>
                  <span className="block truncate text-[12px] text-body">{known.email}</span>
                </div>
                <button style={link} onClick={() => { clearPrefs(); setKnown({}); setEmail(''); setPassword(''); }}>বদলান</button>
              </div>
            ) : (
              <div className="mb-3">
                <label className="mb-1.5 block text-[12px] font-semibold text-body">ইমেইল বা মোবাইল</label>
                <input type="text" inputMode="email" autoComplete="username" placeholder="ইমেইল বা মোবাইল নম্বর" value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && doEmailLogin()}
                  style={{ ...inp, borderColor: emailErr ? RED : '#cfcbc4' }} />
                {emailErr && <p style={errText}>সঠিক ইমেইল বা মোবাইল নম্বর দিন</p>}
              </div>
            )}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label className="text-[12px] font-semibold text-body">পাসওয়ার্ড</label>
                <button style={{ ...link, fontSize: 12 }} onClick={() => openModal('FORGOT_VIEW')}>পাসওয়ার্ড ভুলে গেছেন?</button>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwErr(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && doEmailLogin()}
                  style={{ ...inp, paddingRight: 44, borderColor: pwErr ? RED : '#cfcbc4' }} />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-hint" style={{ color: '#9a9899' }} aria-label="পাসওয়ার্ড দেখান">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /></svg>
                </button>
              </div>
              {pwErr && <p style={errText}>পাসওয়ার্ড দিন</p>}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12.5px] text-body">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4" style={{ accentColor: RED }} />
              এই ডিভাইসে আমাকে মনে রাখুন
            </label>
            <button style={primaryBtn} onClick={doEmailLogin} disabled={emailLoading}>{emailLoading ? 'লগইন হচ্ছে…' : 'লগইন'}</button>
            <Divider label="অথবা" />
            <div className="flex gap-2.5">
              <button style={outBtn} onClick={() => setStep('phone')}>মোবাইল OTP</button>
              <button style={outBtn} onClick={() => signIn('google')}>Google</button>
            </div>
            <p className="mt-4 text-center text-[13px] text-body">
              অ্যাকাউন্ট নেই? <button style={link} onClick={() => openModal('REGISTER')}>নতুন অ্যাকাউন্ট খুলুন</button>
            </p>
          </div>
        )}

        {/* ---------------- STEP: OTP ---------------- */}
        {step === 'otp' && (
          <div>
            <button style={backBtn} onClick={() => { setCooldown(0); setStep('phone'); }}>← নম্বর বদলান</button>
            <div className="mb-4 text-center">
              <h1 className="font-serif text-[22px] font-bold text-charcoal">কোডটি লিখুন</h1>
              <p className="mt-1 text-[13px] text-body"><b className="text-charcoal">+880 {phone}</b> নম্বরে ৪ ডিজিটের কোড পাঠানো হয়েছে</p>
            </div>
            <div className="flex justify-center gap-2.5" style={{ direction: 'ltr' }}>
              {code.map((c, i) => (
                <input key={i} ref={boxRefs[i]} type="tel" inputMode="numeric" maxLength={1} value={c}
                  onChange={(e) => onOtpBox(i, e.target.value)} onKeyDown={(e) => onOtpKey(i, e)} onPaste={onOtpPaste}
                  className="text-center font-semibold outline-none"
                  style={{ width: 54, height: 60, fontSize: 22, border: `1px solid ${c ? '#333132' : '#cfcbc4'}`, borderRadius: 12 }} />
              ))}
            </div>
            {otpErr && <p style={{ ...errText, textAlign: 'center' }}>{otpErr}</p>}
            <button style={primaryBtn} onClick={verifyOtp} disabled={otpLoginMutation.isLoading}>{otpLoginMutation.isLoading ? 'যাচাই হচ্ছে…' : 'যাচাই করে লগইন'}</button>
            <p className="mt-3 text-center text-[12.5px] text-body">
              {cooldown > 0 ? (
                <>আবার পাঠান {String(Math.floor(cooldown / 60)).padStart(2, '0')}:{String(cooldown % 60).padStart(2, '0')}</>
              ) : (
                <button style={link} onClick={resend}>আবার কোড পাঠান</button>
              )}
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-[11px]" style={{ color: '#9a9899' }}>
          লগইন করলে আপনি আমাদের শর্তাবলি ও গোপনীয়তা নীতি মেনে নিচ্ছেন
        </p>
      </div>
    </div>
  );
}
