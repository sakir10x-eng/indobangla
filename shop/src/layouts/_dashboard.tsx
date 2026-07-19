import ProfileNav from '@/components/profile/profile-nav';
import GeneralLayout from '@/components/layouts/_general';
import classNames from 'classnames';

type Props = {
  layout?: string;
  className?: string;
};

export default function DashboardLayout({
  children,
  layout,
  className,
}: React.PropsWithChildren<Props>) {
  return (
    <GeneralLayout layout="general">
      <div
        className={classNames(
          '_dashboard mx-auto flex w-full max-w-1920 flex-col items-stretch bg-gray-100 px-5 py-10 lg:flex-row xl:py-14 xl:px-8 2xl:px-14',
          className,
        )}
      >
        {/* Same profile menu as /profile — was DashboardSidebar (the old design), which is
            why navigating from /profile to another account page dropped the profile menu bar. */}
        <div className="hidden shrink-0 ltr:mr-8 rtl:ml-8 lg:block lg:w-80">
          <ProfileNav />
        </div>
        {children}
      </div>
    </GeneralLayout>
  );
}
