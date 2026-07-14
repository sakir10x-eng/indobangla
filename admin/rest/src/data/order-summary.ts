import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';

export interface OrdersSummary {
  total: number;
  by_status: Record<string, number>;
}

export const useOrdersSummaryQuery = () => {
  const { data, isLoading } = useQuery<OrdersSummary>(
    ['orders-summary'],
    () => HttpClient.get<OrdersSummary>('orders-summary'),
    { retry: false, staleTime: 60 * 1000 }
  );
  return { summary: data, loading: isLoading };
};
