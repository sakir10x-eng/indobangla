import { Routes } from '@/config/routes';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
import type { SearchParamOptions } from '@/types';
import axios from 'axios';
import Cookies from 'js-cookie';
import Router from 'next/router';

const Axios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REST_API_ENDPOINT,
  timeout: 5000000,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Change request data/error here
Axios.interceptors.request.use((config) => {
  const token = Cookies.get(AUTH_TOKEN_KEY);
  //@ts-ignore
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token ? token : ''}`,
  };
  return config;
});

/**
 * Pages that cannot show anything useful without a session. A 401 anywhere else must leave
 * the reader exactly where they are.
 */
const AUTH_ONLY_PREFIXES = [
  '/orders',
  '/profile',
  '/wishlists',
  '/checkout',
  '/cards',
  '/downloads',
  '/ebooks',
  '/messages',
  '/refunds',
  '/reports',
  '/questions',
  '/change-password',
  '/notification',
  '/reseller',
  '/resell',
];

// Change response data/error here
Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      (error.response && error.response.status === 401) ||
      (error.response && error.response.status === 403) ||
      (error.response &&
        error.response.data.message === 'INDOBANGLA_ERROR.NOT_AUTHORIZED')
    ) {
      Cookies.remove(AUTH_TOKEN_KEY);
      // Clearing the dead session is right. NAVIGATING is not.
      //
      // This used to `Router.replace(Routes.home)` for every 401/403 from ANY request —
      // including background ones a reader never asked for, like the wishlist heart on a
      // product card or purchase-check on the book page. So once a logged-in reader's token
      // went stale (admin sessions now expire after 3 days) they were yanked off whatever
      // page they were reading, and on the home page the replace also reset their scroll
      // position back to the banner while they were part-way down.
      //
      // Only move someone off a page that genuinely cannot render without a session; a
      // public page just carries on as a logged-out visitor.
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const needsAuth = AUTH_ONLY_PREFIXES.some(
          (p) => path === p || path.startsWith(`${p}/`),
        );
        if (needsAuth && path !== Routes.home) {
          Router.replace(Routes.home);
        }
      }
    }
    return Promise.reject(error);
  },
);

export class HttpClient {
  static async get<T>(url: string, params?: unknown) {
    const response = await Axios.get<T>(url, { params });
    return response.data;
  }

  static async post<T>(url: string, data: unknown, options?: any) {
    const response = await Axios.post<T>(url, data, options);
    return response.data;
  }

  /**
   * Fetch binary through the authenticated client. Used by the e-book reader: page images are
   * entitlement-checked, so they can't be loaded with a plain <img src> (no Authorization header
   * there) — and going through axios also means no page URL that could simply be copied out.
   */
  static async getBlob(url: string, params?: unknown): Promise<Blob> {
    const response = await Axios.get(url, { params, responseType: 'blob' });
    return response.data as Blob;
  }

  static async put<T>(url: string, data: unknown) {
    const response = await Axios.put<T>(url, data);
    return response.data;
  }

  static async delete<T>(url: string) {
    const response = await Axios.delete<T>(url);
    return response.data;
  }

  static formatSearchParams(params: Partial<SearchParamOptions>) {
    return Object.entries(params)
      .filter(([, value]) => Boolean(value))
      .map(([k, v]) =>
        [
          'type',
          'categories',
          'tags',
          'author',
          'manufacturer',
          'shops',
        ].includes(k)
          ? `${k}.slug:${v}`
          : `${k}:${v}`,
      )
      .join(';');
  }
}
