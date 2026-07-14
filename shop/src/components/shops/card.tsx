import { Routes } from '@/config/routes';
import Image from 'next/image';
import Link from 'next/link';
import { productPlaceholder } from '@/lib/placeholders';
import { useTranslation } from 'next-i18next';
import { Shop } from '@/types';

export default function ShopCard({ shop }: { shop: Shop }) {
  const { t } = useTranslation();
  return (
    <Link
      href={Routes.shop(shop.slug)}
      className="flex flex-col items-center gap-4"
    >
      <div className="relative flex aspect-square max-w-32 lg:max-w-[184px] shrink-0 items-center justify-center overflow-hidden border rounded-full bg-gray-300 w-full">
        <Image
          alt={t('common:text-logo')}
          src={shop?.logo?.thumbnail ?? productPlaceholder}
          fill
          sizes="(max-width: 768px) 100vw"
          className="object-cover"
        />
      </div>
      <span className="text-base lg:text-lg font-semibold text-heading">
        {shop?.name}
      </span>
    </Link>
  );
}
