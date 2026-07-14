import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';

export const useOrderAdjustMutation = () => {
  const queryClient = useQueryClient();
  return useMutation((input: any) => HttpClient.post('order-adjust', input), {
    onSuccess: () => {
      toast.success('Order updated');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.message ||
          'Failed to update order'
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries([API_ENDPOINTS.ORDERS]);
    },
  });
};
