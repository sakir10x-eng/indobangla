import { useQuery } from 'react-query';
import client from './client';
import { API_ENDPOINTS } from './client/api-endpoints';
import type { CustomPagesData } from '@/types';

// TODO: For later implementation
export function useCustomPagesData() {
  const { data, isLoading, error } = useQuery<CustomPagesData, Error>(
    [API_ENDPOINTS.CUSTOM_PAGE],
    () => client.customPage.get(),
  );

  return {
    customPagesData: data,
    isLoading,
    error,
  };
}
