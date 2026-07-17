import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from './client/http-client';
import { API_ENDPOINTS } from './client/api-endpoints';
import { mapPaginatorData } from '@/utils/data-mappers';
import { PaymentRecheckInput, PaymentRow } from '@/types';

type PaymentsParams = {
  method?: 'all' | 'bkash' | 'bank';
  search?: string;
  page?: number;
  limit?: number;
};

type PaymentsResponse = {
  status: string;
  summary?: { count: number };
  data: PaymentRow[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
};

export const usePaymentsQuery = (params: PaymentsParams) => {
  const { data, isLoading, error, refetch, isFetching } = useQuery<
    PaymentsResponse,
    Error
  >(
    [API_ENDPOINTS.PAYMENTS_LIST, params],
    () => HttpClient.get<PaymentsResponse>(API_ENDPOINTS.PAYMENTS_LIST, params),
    { keepPreviousData: true },
  );

  return {
    payments: data?.data ?? [],
    summary: data?.summary,
    paginatorInfo: mapPaginatorData(data as any),
    loading: isLoading,
    fetching: isFetching,
    error,
    refetch,
  };
};

export const usePaymentRecheckMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (input: PaymentRecheckInput) =>
      HttpClient.post<any>(API_ENDPOINTS.PAYMENT_RECHECK, input),
    {
      onSuccess: (res: any) => {
        if (res?.bkash) {
          toast.success(
            `bKash: ${res.bkash.transactionStatus ?? 'checked'}${
              res.bkash.trxID ? ' · ' + res.bkash.trxID : ''
            }`,
          );
        } else {
          toast.success('Updated');
        }
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message ?? 'Could not re-check the payment',
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries(API_ENDPOINTS.PAYMENTS_LIST);
        queryClient.invalidateQueries(API_ENDPOINTS.ORDERS);
      },
    },
  );
};
