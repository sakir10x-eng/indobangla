import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  allowedRoles,
  getAuthCredentials,
  hasAccess,
  isAuthenticated,
} from '@/utils/auth-utils';
import { SUPER_ADMIN } from '@/utils/constants';
import AppLayout from '@/components/layouts/app';
import { Routes } from '@/config/routes';
import { Config } from '@/config';

const AdminDashboard = dynamic(() => import('@/components/dashboard/admin'));
const OwnerDashboard = dynamic(() => import('@/components/dashboard/owner'));

export default function Dashboard({
  userPermissions,
}: {
  userPermissions: string[];
}) {
  if (userPermissions?.includes(SUPER_ADMIN)) {
    return <AdminDashboard />;
  }
  return <OwnerDashboard />;
}

Dashboard.Layout = AppLayout;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { locale } = ctx;
  // TODO: Improve it
  const generateRedirectUrl =
    locale !== Config.defaultLanguage
      ? `/${locale}${Routes.login}`
      : Routes.login;
  const { token, permissions } = getAuthCredentials(ctx);
  if (
    !isAuthenticated({ token, permissions }) ||
    !hasAccess(allowedRoles, permissions)
  ) {
    return {
      redirect: {
        destination: generateRedirectUrl,
        permanent: false,
      },
    };
  }
  // Superadmins land on the IndoBangla Command Center (the real dashboard). The
  // command center's own sidebar links back into the rest of the admin.
  if (permissions?.includes(SUPER_ADMIN)) {
    return {
      redirect: {
        destination:
          locale && locale !== Config.defaultLanguage
            ? `/${locale}/command-center`
            : '/command-center',
        permanent: false,
      },
    };
  }
  if (locale) {
    return {
      props: {
        ...(await serverSideTranslations(locale, [
          'common',
          'form',
          'table',
          'widgets',
        ])),
        userPermissions: permissions,
      },
    };
  }
  return {
    props: {
      userPermissions: permissions,
    },
  };
};
