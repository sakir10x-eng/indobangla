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

type Step = 'password' | 'enroll' | 'otp';

const LoginForm = () => {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: login, isLoading } = useLogin();

  // Admin 2FA state — a login can pause on the OTP step before a token is issued.
  const [step, setStep] = useState<Step>('password');
  const [ticket, setTicket] = useState('');
  const [destination, setDestination] = useState('');
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
            if (data.enroll) {
              setStep('enroll');
            } else {
              setDestination(data.destination || '');
              setStep('otp');
              if (data.sent === false && data.message) setErrorMessage(data.message);
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

  async function sendCode(forPhone?: string) {
    setBusy(true);
    setErrorMessage(null);
    try {
      const r: any = await userClient.adminOtpRequest({
        ticket,
        ...(forPhone ? { phone: forPhone } : {}),
      });
      if (r?.success) {
        setDestination(r.destination || destination);
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

      {step === 'enroll' && (
        <div>
          <p className="mb-1 text-base font-semibold text-heading">দুই-ধাপ যাচাই</p>
          <p className="mb-5 text-sm text-body">
            নিরাপত্তার জন্য আপনার মোবাইল নম্বর যোগ করুন — এই নম্বরে একটি OTP কোড পাঠানো হবে। পরের বার
            থেকে লগইনে এই নম্বরেই কোড আসবে।
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
            onClick={() => sendCode(phone.trim())}
          >
            কোড পাঠান
          </Button>
          <button
            type="button"
            onClick={resetToPassword}
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
                <span className="font-semibold text-heading">{destination}</span> নম্বরে পাঠানো কোডটি
                লিখুন।
              </>
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
              onClick={resetToPassword}
              className="text-body underline hover:text-accent"
            >
              ← ফিরে যান
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => sendCode()}
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
