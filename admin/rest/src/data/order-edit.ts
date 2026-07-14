import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';

export const useEditOrderItemsMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post('order-edit-items', input), {
    onSuccess: () => toast.success('Order items updated'),
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to update items'),
    onSettled: () => qc.invalidateQueries([API_ENDPOINTS.ORDERS]),
  });
};

export const useCreateShipmentMutation = () => {
  return useMutation((vars: { provider: string; order_id: any }) =>
    HttpClient.post(`courier-shipment/${vars.provider}`, { order_id: vars.order_id })
  );
};

export const useProductSearchApi = () => {
  return useMutation((q: string) =>
    HttpClient.get<any>('product-search-api', { q, limit: 8 })
  );
};
