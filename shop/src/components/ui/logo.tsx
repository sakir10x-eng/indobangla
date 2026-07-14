import { Image } from '@/components/ui/image';
import cn from 'classnames';
import Link from '@/components/ui/link';
import { logoPlaceholder } from '@/lib/placeholders';
import { useSettings } from '@/framework/settings';

const Logo: React.FC<
  React.AnchorHTMLAttributes<{}> & { variant?: 'light' | 'dark' }
> = ({ className, variant = 'light', ...props }) => {
  const {
    settings: { logo, elegantLogo, siteTitle },
  }: any = useSettings();

  return (
    <Link href="/" className={cn('inline-flex', className)} {...props}>
      <span className="relative h-[2.125rem] w-32 overflow-hidden md:w-[8.625rem]">
        <Image
          src={
            variant === 'dark'
              ? (elegantLogo?.original ?? logo?.original ?? logoPlaceholder)
              : (logo?.original ?? logoPlaceholder)
          }
          alt={siteTitle || 'IndoBangla Logo'}
          fill
          sizes="(max-width: 768px) 100vw"
          loading="eager"
          className="object-contain"
        />
      </span>
    </Link>
  );
};

export default Logo;
