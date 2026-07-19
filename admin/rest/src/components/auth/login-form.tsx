import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import { useTranslation } from 'next-i18next';
import * as yup from 'yup';
import Link from '@/components/ui/link';
import Form from '@/components/ui/forms/form';
import { Routes } from '@/config/routes';
import { useLogin } from '@/data/user';
import { userClient } from '@/data/client/user';
import type { LoginInput } from '@/types';
import { useState } from 'react';
import Alert from '@/components/ui/alert';
import Router from 'next/router';
import {
  allowedRoles,
  hasAccess,
  setAuthCredentials,
} from '@/utils/auth-utils';

const loginFormSchema = yup.object().shape({
  email: yup
    .string()
    .email('form:error-email-format')
    .required('form:error-email-required'),
  password: yup.string().required('form:error-password-required'),
});

type Step = 'password' | 'choose' | 'enroll' | 'otp';
type Choice = { index: number; label: string };

const LoginForm = () => {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: login, isLoading } = useLogin();

  // Admin 2FA state — a login can pause on the OTP steps before a token is issued.
  const [step, setStep] = useState<Step>('password');
  const [ticket, setTicket] = useState('');
  const [choices, setChoices] = useState<Choice[]>([]);
  const [destination, setDestination] = useState('');
  const [otpChannel, setOtpChannel] = useState<'sms' | 'email'>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  function finishLogin(data: any) {
    if (data?.token && hasAccess(allowedRoles, data?.permissions)) {
      setAuthCredentials(
        data.token,
        data.permissions,
        data.role,
        data.managed_sections,
        data.admin_role_id,
      );
      Router.push(Routes.dashboard);
      return true;
    }
    return false;
  }

  function onSubmit({ email, password }: LoginInput) {
    setErrorMessage(null);
    login(
      { email, password },
      {
        onSuccess: (data: any) => {
          // Admin accounts pause here until an SMS OTP is cleared.
          if (data?.otp_required) {
            setTicket(data.ticket);
            if (data.choices?.length) {
              setChoices(data.choices);
              setStep('choose');
            } else {
              setStep('enroll');
            }
            return;
          }
          if (data?.token) {
            if (!finishLogin(data)) {
              setErrorMessage('form:error-enough-permission');
            }
          } else {
            setErrorMessage('form:error-credential-wrong');
          }
        },
        onError: () => {},
      },
    );
  }

  async function sendCode(opts: { phone?: string; index?: number; channel?: 'sms' | 'email' }) {
    setBusy(true);
    setErrorMessage(null);
    try {
      const r: any = await userClient.adminOtpRequest({ ticket, ...opts });
      if (r?.success) {
        setDestination(r.destination || '');
        setOtpChannel(r.channel === 'email' ? 'email' : 'sms');
        setStep('otp');
      } else {
        setErrorMessage(r?.message || 'OTP পাঠানো যায়নি।');
      }
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'OTP পাঠানো যায়নি।');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!code.trim()) {
      setErrorMessage('OTP কোড দিন।');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const data: any = await userClient.adminOtpVerify({ ticket, code: code.trim() });
      if (!finishLogin(data)) {
        setErrorMessage('form:error-enough-permission');
      }
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'OTP যাচাই করা যায়নি।');
    } finally {
      setBusy(false);
    }
  }

  function resetToPassword() {
    setStep('password');
    setTicket('');
    setChoices([]);
    setCode('');
    setPhone('');
    setDestination('');
    setErrorMessage(null);
  }

  return (
    <>
      {step === 'password' && (
        <Form<LoginInput> validationSchema={loginFormSchema} onSubmit={onSubmit}>
          {({ register, formState: { errors } }) => (
            <>
              <Input
                label={t('form:input-label-email')}
                {...register('email')}
                type="email"
                variant="outline"
                className="mb-4"
                error={t(errors?.email?.message!)}
              />
              <PasswordInput
                label={t('form:input-label-password')}
                forgotPassHelpText={t('form:input-forgot-password-label')}
                {...register('password')}
                error={t(errors?.password?.message!)}
                variant="outline"
                className="mb-4"
                forgotPageLink={Routes.forgotPassword}
              />
              <Button className="w-full" loading={isLoading} disabled={isLoading}>
                {t('form:button-label-login')}
              </Button>

              <div className="relative mt-8 mb-6 flex flex-col items-center justify-center text-sm text-heading sm:mt-11 sm:mb-8">
                <hr className="w-full" />
                <span className="absolute -top-2.5 bg-light px-2 -ms-4 start-2/4">
                  {t('common:text-or')}
                </span>
              </div>

              <div className="text-center text-sm text-body sm:text-base">
                {t('form:text-no-account')}{' '}
                <Link
                  href={Routes.register}
                  className="font-semibold text-accent underline transition-colors duration-200 ms-1 hover:text-accent-hover hover:no-underline focus:text-accent-700 focus:no-underline focus:outline-none"
                >
                  {t('form:link-register-shop-owner')}
                </Link>
              </div>
            </>
          )}
        </Form>
      )}

      {step === 'choose' && (
        <div>
          <p className="mb-1 text-base font-semibold text-heading">দুই-ধাপ যাচাই</p>
          <p className="mb-4 text-sm text-body">কোন নম্বরে OTP কোড পাঠাব?</p>
          <div className="space-y-2">
            {choices.map((c) => (
              <button
                key={c.index}
                type="button"
                disabled={busy}
                onClick={() => sendCode({ index: c.index })}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-heading transition hover:border-accent hover:bg-accent/5 disabled:opacity-60"
              >
                <span>📱 {c.label}</span>
                <span className="text-xs font-semibold text-accent">কোড পাঠান →</span>
              </button>
            ))}
            {/* Email is free where SMS is not — the code goes to the admin's own address. */}
            <button
              type="button"
              disabled={busy}
              onClick={() => sendCode({ channel: 'email' })}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-heading transition hover:border-accent hover:bg-accent/5 disabled:opacity-60"
            >
              <span>📧 আমার ইমেইলে কোড পাঠান</span>
              <span className="text-xs font-semibold text-accent">কোড পাঠান →</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep('enroll')}
            className="mt-4 w-full text-center text-sm text-body underline hover:text-accent"
          >
            অন্য নম্বরে পাঠাতে চাই
          </button>
          <button
            type="button"
            onClick={resetToPassword}
            className="mt-2 w-full text-center text-sm text-body underline hover:text-accent"
          >
            ← ফিরে যান
          </button>
        </div>
      )}

      {step === 'enroll' && (
        <div>
          <p className="mb-1 text-base font-semibold text-heading">দুই-ধাপ যাচাই</p>
          <p className="mb-5 text-sm text-body">
            যে মোবাইল নম্বরে OTP কোড পেতে চান সেটি দিন। এই নম্বরে একটি কোড পাঠানো হবে।
          </p>
          <Input
            label="মোবাইল নম্বর"
            name="enroll-phone"
            type="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            variant="outline"
            className="mb-4"
            value={phone}
            onChange={(e: any) => setPhone(e.target.value)}
          />
          <Button
            className="w-full"
            loading={busy}
            disabled={busy || !phone.trim()}
            onClick={() => sendCode({ phone: phone.trim() })}
          >
            কোড পাঠান
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => sendCode({ channel: 'email' })}
            className="mt-3 w-full text-center text-sm font-medium text-accent underline hover:opacity-80 disabled:opacity-60"
          >
            📧 এর বদলে আমার ইমেইলে কোড পাঠান
          </button>
          <button
            type="button"
            onClick={() => (choices.length ? setStep('choose') : resetToPassword())}
            className="mt-4 w-full text-center text-sm text-body underline hover:text-accent"
          >
            ← ফিরে যান
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div>
          <p className="mb-1 text-base font-semibold text-heading">OTP যাচাই</p>
          <p className="mb-5 text-sm text-body">
            {destination ? (
              <>
                <span className="font-semibold text-heading">{destination}</span>{' '}
                {otpChannel === 'email' ? 'ইমেইলে' : 'নম্বরে'} পাঠানো কোডটি লিখুন।
              </>
            ) : otpChannel === 'email' ? (
              'আপনার ইমেইলে পাঠানো কোডটি লিখুন।'
            ) : (
              'আপনার মোবাইলে পাঠানো কোডটি লিখুন।'
            )}
          </p>
          <Input
            label="OTP কোড"
            name="otp-code"
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="কোড"
            variant="outline"
            className="mb-4"
            value={code}
            onChange={(e: any) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <Button
            className="w-full"
            loading={busy}
            disabled={busy || !code.trim()}
            onClick={verifyCode}
          >
            যাচাই করে লগইন
          </Button>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => (choices.length ? setStep('choose') : setStep('enroll'))}
              className="text-body underline hover:text-accent"
            >
              ← নম্বর বদলান
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => sendCode({})}
              className="font-semibold text-accent underline hover:text-accent-hover disabled:opacity-50"
            >
              কোড আবার পাঠান
            </button>
          </div>
        </div>
      )}

      {errorMessage ? (
        <Alert
          message={t(errorMessage)}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
    </>
  );
};

export default LoginForm;
