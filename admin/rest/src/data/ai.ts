import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import {
  aiClient,
  AiSettingsInput,
  AiExtractInput,
  UpdateProductInput,
} from '@/data/client/ai';

export const AI_SETTINGS_KEY = 'ai-settings';

export const useAiSettingsQuery = () => {
  const { data, isLoading, error } = useQuery(
    [AI_SETTINGS_KEY],
    () => aiClient.getSettings(),
    { retry: false }
  );
  return { settings: data, loading: isLoading, error };
};

export const useUpdateAiSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation((input: AiSettingsInput) => aiClient.updateSettings(input), {
    onSuccess: () => {
      toast.success('AI settings saved');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.message ||
          'Failed to save AI settings'
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries([AI_SETTINGS_KEY]);
    },
  });
};

export const useExtractProductMutation = () => {
  return useMutation((input: AiExtractInput) => aiClient.extract(input));
};

export const useBatchExtractMutation = () => {
  return useMutation((items: AiExtractInput[]) => aiClient.batch(items));
};

export const useFetchImageMutation = () => {
  return useMutation((imageUrl: string) => aiClient.fetchImage(imageUrl));
};

export const useListCrawlMutation = () => {
  return useMutation((vars: { list_url: string; limit: number }) =>
    aiClient.listCrawl(vars.list_url, vars.limit)
  );
};

export const useAiCreateProductMutation = () => {
  return useMutation((product: any) => aiClient.createProduct(product));
};

export const useAiTestMutation = () => {
  return useMutation(() => aiClient.test());
};

export const useAiModelsQuery = (provider: string) => {
  const { data, isLoading } = useQuery(
    [AI_SETTINGS_KEY, 'models', provider],
    () => aiClient.models(provider),
    // The catalogue barely moves and the API caches it for 6h anyway; refetching
    // it on every focus would just add latency to the settings page.
    { staleTime: 30 * 60 * 1000, retry: false, keepPreviousData: true },
  );
  return { models: data?.models ?? [], source: data?.source, loading: isLoading };
};

export const useDuplicateCheckMutation = () => {
  return useMutation((products: any[]) => aiClient.duplicateCheck(products));
};

export const useAiUpdateProductMutation = () => {
  return useMutation((input: UpdateProductInput) => aiClient.updateProduct(input));
};
