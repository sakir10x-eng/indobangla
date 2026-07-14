import { useMutation } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import { toast } from 'react-toastify';

/**
 * Persist operational tracking (call / message / print / courier / notes) into
 * orders.ops_meta. Intentionally does NOT invalidate the orders list — the board
 * applies the change optimistically so the buttons feel instant.
 */
export const useOrderOpsMutation = () => {
  return useMutation(
    (input: { order_id: any; patch: any }) => HttpClient.post<any>('order-ops', input),
    {
      onError: (e: any) =>
        toast.error(e?.response?.data?.message || 'Could not save — try again'),
    },
  );
};

/** Fetch per-customer stats (total / delivered / returned) for tier calculation. */
export const useCustomerStatsMutation = () => {
  return useMutation((customer_ids: any[]) =>
    HttpClient.post<any>('order-customer-stats', { customer_ids }),
  );
};

/** Search all orders by tracking #, customer name/phone, or book title. */
export const useOrderSearchMutation = () => {
  return useMutation((q: string) => HttpClient.get<any>('order-search', { q }));
};
