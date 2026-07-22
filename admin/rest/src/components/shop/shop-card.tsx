import Image from 'next/image';
import Link from '@/components/ui/link';
import Avatar from '@/components/common/avatar';
import Badge from '@/components/ui/badge/badge';
import { Shop, UserAddress } from '@/types';
import classNames from 'classnames';
import { formatAddress } from '@/utils/format-address';
import { useFormatPhoneNumber } from '@/utils/format-phone-number';
import { MapPinIcon } from '@/components/icons/map-pin';
import { isNumber } from 'lodash';
import ShopAvatar from '@/components/shop/shop-avatar';
import { PhoneOutlineIcon } from '@/components/icons/phone';
import { useTranslation } from 'next-i18next';

type ShopCardProps = {
  shop: Shop;
};

// shown instead of a blank cell / the old hard-coded `???`
const EMPTY_VALUE = '—';

// keep the class names literal so tailwind can pick them up
const STAT_GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const CARD_CLASS =
  'flex h-full flex-col overflow-hidden rounded-lg border border-border-100 bg-light shadow-sm transition-shadow duration-200 hover:shadow-box';

// the api hands some of these back as decimal strings, so coerce instead of
// bailing out on `isNumber` (which used to leave the cell completely blank)
function toDisplayNumber(info?: number | string | null) {
  if (info === null || info === undefined || info === '') return EMPTY_VALUE;
  const value = Number(info);
  return Number.isNaN(value) ? EMPTY_VALUE : value;
}

export const ListItem = ({
  title,
  info,
}: {
  title: string;
  info?: number | string | null;
}) => {
  return (
    <>
      <p className="text-sm font-semibold text-muted-black">
        {toDisplayNumber(info)}
      </p>
      {title ? <p className="mt-1 text-xs text-[#666]">{title}</p> : null}
    </>
  );
};

const ShopCard: React.FC<ShopCardProps> = ({ shop }) => {
  const { t } = useTranslation();

  const phoneNumber = useFormatPhoneNumber({
    customer_contact: shop?.settings?.contact ?? '',
  });

  const address = formatAddress(shop?.address as UserAddress);
  const ownerName = shop?.owner?.name;

  // The shop listing endpoint returns products/orders counts, `me` returns the
  // balance relation. Render whichever of them is actually present.
  const stats: {
    key: string;
    title: string;
    info?: number | string | null;
  }[] = [];

  if (isNumber(shop?.products_count)) {
    stats.push({
      key: 'products',
      title: t('common:text-products'),
      info: shop?.products_count,
    });
  }

  if (isNumber(shop?.orders_count)) {
    stats.push({
      key: 'orders',
      title: t('common:text-orders'),
      info: shop?.orders_count,
    });
  }

  if (shop?.balance) {
    stats.push(
      {
        key: 'commission',
        title: t('common:text-title-commission'),
        info: shop?.balance?.admin_commission_rate ?? 0,
      },
      {
        key: 'sale',
        title: t('common:text-title-sale'),
        info: shop?.balance?.total_earnings ?? 0,
      },
      {
        key: 'balance',
        title: t('common:text-title-balance'),
        info: shop?.balance?.current_balance ?? 0,
      },
      {
        key: 'withdraw',
        title: t('common:text-title-withdraw'),
        info: shop?.balance?.withdrawn_amount ?? 0,
      },
    );
  }

  const visibleStats = stats.slice(0, 4);

  const content = (
    <>
      <div className="relative h-24 w-full shrink-0 overflow-hidden bg-gray-100">
        <Image
          alt={shop?.name ?? ''}
          src={shop?.cover_image?.original ?? '/topographic.svg'}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <Badge
          textKey={
            shop?.is_active ? 'common:text-active' : 'common:text-inactive'
          }
          color={
            shop?.is_active
              ? 'bg-accent text-light'
              : 'bg-status-failed text-light'
          }
          className="absolute top-2.5 z-10 px-2 py-1 text-[10px] end-2.5"
        />
      </div>

      <div className="relative z-10 -mt-[4.25rem] flex flex-1 flex-col px-5">
        <div className="flex items-end gap-3">
          <ShopAvatar
            is_active={shop?.is_active}
            name={shop?.name}
            logo={shop?.logo}
          />
          <h3 className="min-w-0 flex-1 truncate pb-2 text-base font-semibold leading-tight text-muted-black">
            {shop?.name ?? EMPTY_VALUE}
          </h3>
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs leading-none">
            <MapPinIcon className="shrink-0 text-[#666666]" />
            <p className="truncate text-base-dark">{address || EMPTY_VALUE}</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs leading-none">
            <PhoneOutlineIcon className="shrink-0 text-[#666666]" />
            <p className="truncate text-base-dark">
              {phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        </div>

        {ownerName ? (
          <div className="mt-4 flex items-center gap-2 border-t border-border-100 pt-3">
            <Avatar
              name={ownerName}
              src={shop?.owner?.profile?.avatar?.thumbnail}
              size="sm"
            />
            <p className="min-w-0 truncate text-xs font-medium text-base-dark">
              {ownerName}
            </p>
          </div>
        ) : null}

        {visibleStats.length ? (
          <ul
            className={classNames(
              'mt-auto grid divide-x divide-[#E7E7E7] pb-6 pt-5 text-center',
              STAT_GRID[visibleStats.length] ?? 'grid-cols-4',
            )}
          >
            {visibleStats.map((stat) => (
              <li key={stat.key}>
                <ListItem title={stat.title} info={stat.info} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="pb-6" />
        )}
      </div>
    </>
  );

  // a shop without a slug would link to `/undefined`
  if (!shop?.slug) {
    return <div className={CARD_CLASS}>{content}</div>;
  }

  return (
    <Link href={`/${shop?.slug}`} className={CARD_CLASS}>
      {content}
    </Link>
  );
};

export default ShopCard;
