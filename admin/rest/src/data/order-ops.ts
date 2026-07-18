import { useMutation, useQueryClient } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
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

/**
 * Desk lifecycle actions on one order: void / unvoid / archive / unarchive / unlock.
 * Unlike ops, these change what list an order belongs to, so refetch the board on
 * settle — a voided/archived order has to leave the working view (and land under its
 * own tab) instead of lingering optimistically.
 */
export const useOrderLifecycleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (input: {
      order_id: any;
      action: 'void' | 'unvoid' | 'archive' | 'unarchive' | 'unlock';
      reason?: string;
    }) => HttpClient.post<any>('order-lifecycle', input),
    {
      onError: (e: any) =>
        toast.error(e?.response?.data?.message || 'Could not update — try again'),
      onSettled: () => queryClient.invalidateQueries(API_ENDPOINTS.ORDERS),
    },
  );
};
