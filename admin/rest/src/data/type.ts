import { Routes } from '@/config/routes';
import { typeClient } from '@/data/client/type';
import { GetParams, Type, TypeQueryOptions } from '@/types';
import { useTranslation } from 'next-i18next';
import Router, { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from './client/api-endpoints';

export const useCreateTypeMutation = () => {
  const { t } = useTranslation();
  const { locale } = useRouter();
  const queryClient = useQueryClient();
  return useMutation(typeClient.create, {
    onSuccess: () => {
      Router.push(Routes.type.list, undefined, {
        locale,
      });
      toast.success(t('common:successfully-created'));
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.TYPES);
    },
  });
};

export const useDeleteTypeMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation(typeClient.delete, {
    onSuccess: () => {
      toast.success(t('common:successfully-deleted'));
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.TYPES);
    },
  });
};

export const useUpdateTypeMutation = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale } = router;
  const queryClient = useQueryClient();
  return useMutation(typeClient.update, {
    onSuccess: async (data) => {
      const generateRedirectUrl = router.query.shop
        ? `/${router.query.shop}${Routes.type.list}`
        : Routes.type.list;
      await router.push(
        `${generateRedirectUrl}/${data?.slug}/edit`,
        undefined,
        {
          locale,
        },
      );
      toast.success(t('common:successfully-updated'));
    },
    // onSuccess: () => {
    //   toast.success(t('common:successfully-updated'));
    // },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(API_ENDPOINTS.TYPES);
    },
  });
};

export const useTypeQuery = ({ slug, language }: GetParams) => {
  return useQuery<Type, Error>([API_ENDPOINTS.TYPES, { slug, language }], () =>
    typeClient.get({ slug, language }),
  );
};

export const useTypesQuery = (options?: Partial<TypeQueryOptions>) => {
  const { data, isLoading, error } = useQuery<Type[], Error>(
    [API_ENDPOINTS.TYPES, options],
    ({ queryKey, pageParam }) =>
      typeClient.all(Object.assign({}, queryKey[1], pageParam)),
    {
      keepPreviousData: true,
    },
  );

  return {
    types: data ?? [],
    loading: isLoading,
    error,
  };
};
