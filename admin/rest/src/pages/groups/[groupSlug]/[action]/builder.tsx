import AccessDeniedPage from '@/components/common/access-denied';
import GroupsBuilder from '@/components/group/builder';
import { Config } from '@/config';
import { Routes } from '@/config/routes';
import {
  adminOnly,
  allowedRoles,
  getAuthCredentials,
  hasAccess,
  isAuthenticated,
} from '@/utils/auth-utils';
import { SUPER_ADMIN } from '@/utils/constants';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const Builder = ({ userPermissions }: { userPermissions: string[] }) => {
  if (userPermissions?.includes(SUPER_ADMIN)) {
    return <GroupsBuilder />;
  }
  return <AccessDeniedPage />;
};

// Builder.Layout = Layout;

Builder.authenticate = {
  permissions: adminOnly,
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { locale } = ctx;
  const { token, permissions } = getAuthCredentials(ctx);
  const generateRedirectUrl =
    locale !== Config.defaultLanguage
      ? `/${locale}${Routes.login}`
      : Routes.login;

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
  if (locale) {
    return {
      props: {
        ...(await serverSideTranslations(locale, ['form', 'common'])),
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

export default Builder;
