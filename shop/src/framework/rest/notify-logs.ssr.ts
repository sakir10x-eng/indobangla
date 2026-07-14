import type { NotifyLogsQueryOptions, SettingsQueryOptions } from '@/types';
import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { QueryClient } from 'react-query';
import { dehydrate } from 'react-query/hydration';
import client from './client';
import { API_ENDPOINTS } from './client/api-endpoints';

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const queryClient = new QueryClient();
  try {
    await queryClient.prefetchQuery(
      [API_ENDPOINTS.SETTINGS, { language: locale }],
      ({ queryKey }) => client.settings.all(queryKey[1] as SettingsQueryOptions),
    );
  } catch (e) {
    /* settings prefetch is best-effort during build */
  }
  // NOTE: notify-logs is an authenticated endpoint and always 401s at build
  // time, which fails static generation — it is fetched on the client instead.
  try {
    return {
      props: {
        ...(await serverSideTranslations(locale!, ['common'])),
        dehydratedState: JSON.parse(JSON.stringify(dehydrate(queryClient))),
      },
      revalidate: 60,
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
};
