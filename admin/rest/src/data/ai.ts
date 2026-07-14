import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { aiClient, AiSettingsInput, AiExtractInput } from '@/data/client/ai';

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
