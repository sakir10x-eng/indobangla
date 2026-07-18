import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useAtom } from 'jotai';
import client from '@/framework/client';
import { useToken } from '@/lib/hooks/use-token';
import { authorizationAtom } from '@/store/authorization-atom';
import { useModalAction } from '@/components/ui/modal/modal.context';

/**
 * IndoBangla mobile registration / login — the uploaded multi-step "Create your account" design.
 * Steps: 1) mobile number → 2) 4-digit OTP → 3) name + password → 4) done.
 * A returning number (is_contact_exist) skips step 3 and logs straight in after the OTP.
 * Wired to the real endpoints: /send-otp-code, /otp-login (verify + register/login in one call).
 */

const RED = '#e63946';
const RED_DARK = '#c32a37';

type Step = 1 | 2 | 3 | 4;

function ProgressBars({ step }: { step: Step }) {
  return (
    <div className="mb-6 flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-1 flex-1 rounded-full transition-colors"
          style={{ background: n <= Math.min(step, 3) ? RED : '#e3e1de' }}
        />
      ))}
    </div>
  );
}

export function IndoOtpRegister() {
  const { setToken } = useToken();
  const [, setAuthorized] = useAtom(authorizationAtom);
  const { closeModal } = useModalAction();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState(''); // local 11-digit 01XXXXXXXXX
  const [phoneWarn, setPhoneWarn] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [isContactExist, setIsContactExist] = useState(false);
  const [code, setCode] = useState(['', '', '', '']);
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState(false);
  const [password, setPassword] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const boxRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const intlPhone = () => '+880' + phone.slice(1); // 01XXXXXXXXX -> +8801XXXXXXXXX
  const validBd = /^01[3-9]\d{8}$/.test(phone);

  const sendMutation = useMutation(client.users.sendOtpCode, {
    onSuccess: (data: any) => {
      setError(null);
      if (data && data.success === false) {
        setError('OTP পাঠানো যায়নি — একটু পরে আবার চেষ্টা করুন।');
        return;
      }
      setOtpId(data?.id ?? null);
      setIsContactExist(!!data?.is_contact_exist);
      setCode(['', '', '', '']);
      setOtpErr(null);
      setStep(2);
      setCooldown(60);
      setTimeout(() => boxRefs[0].current?.focus(), 80);
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'OTP পাঠানো যায়নি — একটু পরে আবার চেষ্টা করুন।'),
  });

  const loginMutation = useMutation(client.users.OtpLogin, {
    onSuccess: (data: any) => {
      if (!data?.token) {
        setOtpErr('OTP মিলছে না — সঠিক কোড দিন।');
        return;
      }
      setToken(data.token);
      setAuthorized(true);
      queryClient.clear();
      setStep(4);
    },
    onError: (e: any) => setOtpErr(e?.response?.data?.message || 'OTP মিলছে না বা মেয়াদ শেষ — আবার চেষ্টা করুন।'),
  });

  function onPhoneChange(v: string) {
    const digits = v.replace(/\D/g, '');
    if (digits.length > 11) setPhoneWarn('মোবাইল নম্বর ১১ ডিজিটের বেশি হবে না।');
    else setPhoneWarn(null);
    setPhone(digits.slice(0, 11));
  }

  function sendOtp() {
    if (!validBd) {
      setPhoneWarn('১১ ডিজিটের সঠিক নম্বর দিন (যেমন 01712345678)।');
      return;
    }
    setPhoneWarn(null);
    sendMutation.mutate({ phone_number: intlPhone() } as any);
  }

  function resend() {
    if (cooldown > 0) return;
    sendMutation.mutate({ phone_number: intlPhone() } as any);
    setCooldown(60);
  }

  function onOtpBox(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    setOtpErr(null);
    if (d && i < 3) boxRefs[i + 1].current?.focus();
    if (i === 3 && d) verifyStep([...next.slice(0, 3), d].join(''));
  }

  function onOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxRefs[i - 1].current?.focus();
  }

  function onOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4).split('');
    if (!d.length) return;
    const next = ['', '', '', ''];
    d.forEach((ch, j) => (next[j] = ch));
    setCode(next);
    if (d.length === 4) verifyStep(d.join(''));
    else boxRefs[Math.min(d.length, 3)].current?.focus();
  }

  function verifyStep(fullCode?: string) {
    const c = fullCode ?? code.join('');
    if (c.length < 4) {
      setOtpErr('সঠিক ৪ ডিজিটের কোড দিন।');
      return;
    }
    if (isContactExist) {
      // returning user — log in directly (backend verifies the code)
      loginMutation.mutate({ phone_number: intlPhone(), otp_id: otpId, code: c } as any);
    } else {
      setStep(3);
    }
  }

  function finish() {
    let ok = true;
    if (!name.trim()) { setNameErr(true); ok = false; }
    if (password.length < 6) { setPwErr(true); ok = false; }
    if (!ok) return;
    loginMutation.mutate({
      phone_number: intlPhone(),
      otp_id: otpId,
      code: code.join(''),
      name: name.trim(),
      password,
    } as any);
  }

  const pwScore = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  })();
  const pwPct = [0, 30, 55, 80, 100][pwScore];
  const pwCol = pwScore <= 1 ? RED : pwScore === 2 ? '#d98324' : '#1d9e75';
  const pwTxt = password.length === 0 ? '' : pwScore <= 1 ? 'দুর্বল' : pwScore === 2 ? 'মোটামুটি' : pwScore === 3 ? 'ভালো' : 'শক্তিশালী';

  const inputBase =
    'h-[46px] w-full rounded-lg border px-3.5 text-[15px] text-ink outline-none transition focus:border-[color:var(--fc)] focus:ring-2 focus:ring-[color:var(--fr)]';
  const focusVars = { ['--fc' as any]: RED, ['--fr' as any]: '#fdecee' } as React.CSSProperties;

  return (
    <div className="mt-2">
      <ProgressBars step={step} />

      {error && (
        <div className="mb-4 rounded-lg px-3.5 py-2.5 text-[13px] font-medium" style={{ background: '#fdecee', color: RED_DARK }}>
          {error}
        </div>
      )}

      {/* STEP 1 — phone */}
      {step === 1 && (
        <div>
          <h1 className="mb-1 text-[20px] font-bold text-charcoal">অ্যাকাউন্ট তৈরি করুন</h1>
          <p className="mb-5 text-[13.5px] leading-relaxed text-body">মোবাইল নম্বর দিন — আমরা একটি ভেরিফিকেশন কোড পাঠাব।</p>
          <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">মোবাইল নম্বর</label>
          <div className="flex">
            <span className="flex h-[46px] flex-shrink-0 items-center gap-1.5 rounded-l-lg border border-r-0 bg-paper px-3 text-[14.5px] font-medium text-charcoal">
              <span className="flex h-[13px] w-[19px] items-center justify-center rounded-sm" style={{ background: '#006a4e' }}>
                <span className="block h-[7px] w-[7px] rounded-full" style={{ background: RED }} />
              </span>
              BD
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              autoComplete="tel"
              placeholder="01712345678"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              className={`${inputBase} rounded-l-none`}
              style={focusVars}
            />
          </div>
          {phoneWarn && <p className="mt-1.5 text-[12.5px]" style={{ color: RED }}>{phoneWarn}</p>}
          <button
            onClick={sendOtp}
            disabled={sendMutation.isLoading}
            className="mt-5 h-12 w-full rounded-lg text-[15px] font-semibold text-white transition disabled:opacity-60"
            style={{ background: RED }}
          >
            {sendMutation.isLoading ? 'পাঠানো হচ্ছে…' : 'OTP পাঠান'}
          </button>
        </div>
      )}

      {/* STEP 2 — OTP */}
      {step === 2 && (
        <div>
          <h1 className="mb-1 text-[20px] font-bold text-charcoal">নম্বর ভেরিফাই করুন</h1>
          <p className="mb-5 text-[13.5px] text-body">
            কোড পাঠানো হয়েছে <b className="text-charcoal">+880 {phone}</b> ·{' '}
            <button className="font-semibold underline" style={{ color: RED }} onClick={() => { setStep(1); setCooldown(0); }}>
              পরিবর্তন
            </button>
          </p>
          <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">OTP কোড</label>
          <div className="flex gap-2.5">
            {code.map((c, i) => (
              <input
                key={i}
                ref={boxRefs[i]}
                inputMode="numeric"
                maxLength={1}
                autoComplete="one-time-code"
                value={c}
                onChange={(e) => onOtpBox(i, e.target.value)}
                onKeyDown={(e) => onOtpKey(i, e)}
                onPaste={onOtpPaste}
                className="h-[58px] flex-1 rounded-lg border text-center text-[22px] font-semibold outline-none transition focus:ring-2"
                style={{ borderColor: c ? '#333132' : '#e3e1de', ['--tw-ring-color' as any]: '#fdecee' }}
              />
            ))}
          </div>
          {otpErr && <p className="mt-1.5 text-[12.5px]" style={{ color: RED }}>{otpErr}</p>}
          <p className="mt-4 text-center text-[13px] text-body">
            {cooldown > 0 ? (
              <>আবার পাঠান {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}</>
            ) : (
              <button className="font-semibold" style={{ color: RED }} onClick={resend}>আবার কোড পাঠান</button>
            )}
          </p>
          <button
            onClick={() => verifyStep()}
            disabled={loginMutation.isLoading}
            className="mt-3.5 h-12 w-full rounded-lg text-[15px] font-semibold text-white transition disabled:opacity-60"
            style={{ background: RED }}
          >
            {loginMutation.isLoading ? 'যাচাই হচ্ছে…' : 'ভেরিফাই করুন'}
          </button>
        </div>
      )}

      {/* STEP 3 — name + password */}
      {step === 3 && (
        <div>
          <div className="mb-5 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: '#e6f5ef', color: '#1d9e75' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            নম্বর ভেরিফাইড
          </div>
          <h1 className="mb-1 text-[20px] font-bold text-charcoal">পাসওয়ার্ড সেট করুন</h1>
          <p className="mb-5 text-[13.5px] text-body">শেষ ধাপ — নাম ও একটি পাসওয়ার্ড দিন।</p>
          <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">আপনার নাম</label>
          <input
            type="text"
            autoComplete="name"
            placeholder="আপনার নাম"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameErr(false); }}
            className={inputBase}
            style={focusVars}
          />
          {nameErr && <p className="mt-1.5 text-[12.5px]" style={{ color: RED }}>নাম লিখুন।</p>}
          <label className="mb-1.5 mt-4 block text-[13px] font-semibold text-charcoal">পাসওয়ার্ড</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="কমপক্ষে ৬ অক্ষর"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwErr(false); }}
              className={`${inputBase} pr-11`}
              style={focusVars}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-body" aria-label="পাসওয়ার্ড দেখান">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#e3e1de' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pwPct}%`, background: pwCol }} />
            </div>
            <span className="min-w-[52px] text-right text-[12px] text-body">{pwTxt}</span>
          </div>
          {pwErr && <p className="mt-1.5 text-[12.5px]" style={{ color: RED }}>কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।</p>}
          {otpErr && <p className="mt-1.5 text-[12.5px]" style={{ color: RED }}>{otpErr}</p>}
          <button
            onClick={finish}
            disabled={loginMutation.isLoading}
            className="mt-5 h-12 w-full rounded-lg text-[15px] font-semibold text-white transition disabled:opacity-60"
            style={{ background: RED }}
          >
            {loginMutation.isLoading ? 'তৈরি হচ্ছে…' : 'রেজিস্ট্রেশন সম্পন্ন করুন'}
          </button>
        </div>
      )}

      {/* STEP 4 — done */}
      {step === 4 && (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full" style={{ background: '#e6f5ef', color: '#1d9e75' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 className="mb-1.5 text-[20px] font-bold text-charcoal">IndoBangla-তে স্বাগতম</h1>
          <p className="mb-6 text-[13.5px] text-body">আপনার অ্যাকাউন্ট তৈরি হয়েছে। এখন বই খুঁজুন।</p>
          <button
            onClick={() => { closeModal(); if (typeof window !== 'undefined') window.location.href = '/'; }}
            className="h-12 w-full rounded-lg text-[15px] font-semibold text-white"
            style={{ background: RED }}
          >
            বই দেখুন
          </button>
        </div>
      )}
    </div>
  );
}

export default function OtpLoginView() {
  const { openModal } = useModalAction();
  return (
    <div className="flex h-screen w-screen flex-col justify-center bg-light px-5 py-6 sm:p-8 md:h-auto md:max-w-md md:rounded-xl">
      <div className="text-center">
        <div className="font-serif text-[26px] font-bold leading-none">
          <span style={{ color: RED }}>Indo</span>
          <span className="text-charcoal">Bangla</span>
        </div>
        <div className="mt-1.5 text-[8.5px] uppercase tracking-[2.4px]" style={{ color: RED }}>widen your outlook on life</div>
      </div>
      <div className="mt-6">
        <IndoOtpRegister />
      </div>
      <div className="mt-7 text-center text-[13.5px] text-body">
        আগে থেকে অ্যাকাউন্ট আছে?{' '}
        <button
          onClick={() => openModal('LOGIN_VIEW')}
          className="font-semibold underline transition-colors hover:no-underline"
          style={{ color: RED }}
        >
          লগইন
        </button>
      </div>
    </div>
  );
}
