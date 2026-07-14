import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';

/**
 * #8 — Pre-home intro gate. When the admin has enabled the pre-home page and the
 * visitor hasn't seen it yet (localStorage flag), send them to the static intro
 * page first. The intro's "enter shop" button sets the flag and returns home.
 */
export default function PreHomeGate() {
  const { data } = useQuery(['prehome'], () => HttpClient.get<any>('prehome'), {
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (!data?.enabled) return;
    try {
      if (localStorage.getItem('ib_welcomed')) return;
      window.location.replace('/welcome.html');
    } catch {
      /* localStorage blocked — skip the intro rather than loop */
    }
  }, [data]);
  return null;
}
