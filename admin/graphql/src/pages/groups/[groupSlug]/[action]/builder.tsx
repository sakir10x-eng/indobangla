import GroupsBuilder from '@/components/group/builder';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const Builder = () => {
  return <GroupsBuilder />;
};

// Builder.Layout = Layout;

Builder.authenticate = {
  permissions: adminOnly,
};

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});

export default Builder;
