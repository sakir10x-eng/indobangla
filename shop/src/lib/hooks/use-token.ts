import Cookies from 'js-cookie';
import { AUTH_TOKEN_KEY, EMAIL_VERIFIED } from '@/lib/constants';
export function useToken() {
  return {
    setToken(token: string) {
      // 7 days, not 1. The Sanctum token itself never expires, so a one-day cookie was the only
      // thing logging shoppers out — and every one of them came back through an OTP, which costs
      // real money per SMS. Seven days keeps a returning customer signed in for the whole week.
      Cookies.set(AUTH_TOKEN_KEY, token, { expires: 7, sameSite: 'lax' });
    },
    getToken() {
      return Cookies.get(AUTH_TOKEN_KEY);
    },
    removeToken() {
      Cookies.remove(AUTH_TOKEN_KEY);
    },
    hasToken() {
      const token = Cookies.get(AUTH_TOKEN_KEY);
      if (!token) return false;
      return true;
    },
    setEmailVerified(emailVerified: boolean | null) {
      Cookies.set(EMAIL_VERIFIED, JSON.stringify({ emailVerified }));
    },
    getEmailVerified() {
      const emailVerified = Cookies.get(EMAIL_VERIFIED);
      return emailVerified ? JSON.parse(emailVerified) : true;
    },
  };
}
