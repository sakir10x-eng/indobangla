import { Image } from '@/components/ui/image';
import { Routes } from '@/config/routes';
import { avatarPlaceholder } from '@/lib/placeholders';
import cn from 'classnames';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

interface ManufacturerProps {
  item: any;
  className?: string;
}

const BrandCard: React.FC<ManufacturerProps> = ({ item, className }) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <button
      className={cn(
        'relative flex cursor-pointer w-full mx-auto items-center justify-center rounded border border-gray-200 bg-white p-5',
        className,
      )}
      title={item?.name}
      onClick={() => router.push(Routes.manufacturer(item?.slug))}
    >
      <span
        className={cn(
          'relative flex size-full aspect-square max-w-[175px] shrink-0 items-center justify-center overflow-hidden bg-light',
        )}
      >
        <Image
          src={item?.image?.original! ?? avatarPlaceholder}
          alt={item?.name!}
          fill
          sizes="(max-width: 768px) 100vw"
          className="object-cover"
        />
      </span>
    </button>
  );
};

export default BrandCard;
