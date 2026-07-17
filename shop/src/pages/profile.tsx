import Seo from '@/components/seo/seo';
import IndoProfile from '@/components/profile/indo-profile';
import { useUser } from '@/framework/user';
import { getLayout as getSiteLayout } from '@/components/layouts/layout';
export { getStaticProps } from '@/framework/general.ssr';

const ProfilePage = () => {
  const { me }: any = useUser();
  if (!me) return null;
  return (
    <>
      <Seo noindex={true} nofollow={true} />
      <div className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-7 sm:px-5">
        <IndoProfile user={me} />
      </div>
    </>
  );
};

ProfilePage.authenticationRequired = true;

ProfilePage.getLayout = function getLayout(page: React.ReactElement) {
  return getSiteLayout(page);
};
export default ProfilePage;
