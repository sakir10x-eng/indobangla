import { cn } from '@/lib/utils';
import { useTranslation } from 'next-i18next';
import { twMerge } from 'tailwind-merge';
interface Props {
  message?: string | undefined;
  className?: string;
}

export const Error = ({ message, className }: Props) => {
  const { t } = useTranslation('common');
  return (
    <p
      className={twMerge(cn('my-2 text-xs text-start text-red-500', className))}
    >
      {t(message!)}
    </p>
  );
};

const ErrorMessage = ({ message, className }: Props) => {
  const { t } = useTranslation('common');
  return (
    <p
      className={twMerge(
        cn(
          'bg-red-400 p-5 mt-16 mx-auto max-w-sm min-w-min text-center text-lg text-light font-semibold rounded',
          className,
        ),
      )}
    >
      {t(message!)}
    </p>
  );
};

export default ErrorMessage;
