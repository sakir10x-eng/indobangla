import { useRouter } from 'next/router';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import Link from '@/components/ui/link';
import { useLogout } from '@/framework/user';
import { useSettings } from '@/framework/settings';
import { siteSettings } from '@/config/site';
import { Routes } from '@/config/routes';
import { isStripeAvailable } from '@/lib/is-stripe-available';

/* Icons for the sidebar nav — keyed by route, matching the profile mockup */
const NAV_ICONS: Record<string, string> = {
  [Routes.profile]: '👤',
  [Routes.changePassword]: '🔑',
  [Routes.notifyLogs]: '🔔',
  [Routes.cards]: '💳',
  [Routes.orders]: '📦',
  '/requests': '📝',
  '/resell': '📖',
  '/reseller': '🏪',
  [Routes.messages]: '💬',
  [Routes.downloads]: '⬇️',
  [Routes.wishlists]: '❤️',
  [Routes.questions]: '❓',
  [Routes.refunds]: '💸',
  [Routes.reports]: '📄',
  [Routes.help]: '🆘',
};

/**
 * The account dashboard sidebar menu. Extracted from indo-profile so BOTH the /profile page
 * and every other account page (which render through the _dashboard layout) show the same
 * menu — before this, clicking a menu item left /profile for a page with the old sidebar and
 * the profile menu bar vanished.
 */
export default function ProfileNav() {
  const { t } = useTranslation();
  const { pathname } = useRouter();
  const { settings } = useSettings();
  const { mutate: logout } = useLogout();

  const items = (siteSettings.dashboardSidebarMenu ?? [])
    .slice(0, -1) // drop logout, rendered separately
    .filter((item: any) => {
      if (item?.href === Routes.cards && !isStripeAvailable(settings)) {
        return false;
      }
      if (
        item?.href === Routes.notifyLogs &&
        !Boolean(settings?.enableEmailForDigitalProduct)
      ) {
        return false;
      }
      return true;
    });

  const linkClass = (active: boolean) =>
    classNames(
      'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14.5px] font-medium transition-colors',
      active
        ? 'bg-accent/10 font-bold text-accent'
        : 'text-heading/80 hover:bg-gray-50 hover:text-heading',
    );

  return (
    <nav className="overflow-hidden rounded-2xl border border-border-100 bg-light p-2 shadow-sm">
      {items.map((item: any, idx: number) => {
        const active = pathname === item.href;
        return (
          <div key={idx}>
            {item.href === Routes.messages ? (
              <div className="mx-2.5 my-1.5 h-px bg-border-100" />
            ) : null}
            <Link href={item.href} className={linkClass(active)}>
              <span className="w-[18px] shrink-0 text-center text-base leading-none">
                {NAV_ICONS[item.href] ?? '•'}
              </span>
              {t(item.label)}
            </Link>
          </div>
        );
      })}
      <div className="mx-2.5 my-1.5 h-px bg-border-100" />
      <button
        type="button"
        onClick={() => logout()}
        className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14.5px] font-medium text-body transition-colors hover:bg-gray-50"
      >
        <span className="w-[18px] shrink-0 text-center text-base leading-none">
          ↩️
        </span>
        {t('profile-sidebar-logout')}
      </button>
    </nav>
  );
}

export { NAV_ICONS };
