import { PlusIcon } from '@/components/icons/plus-icon';
import CartIcon from '@/components/icons/cart';
import { useTranslation } from 'next-i18next';
import cn from 'classnames';
import { PlusIconNew } from '@/components/icons/plus-icon';

type Props = {
  variant?:
    | 'helium'
    | 'neon'
    | 'argon'
    | 'oganesson'
    | 'single'
    | 'big'
    | 'text';
  onClick(event: React.MouseEvent<HTMLButtonElement | MouseEvent>): void;
  disabled?: boolean;
};

const AddToCartBtn: React.FC<Props> = ({ variant, onClick, disabled }) => {
  const { t } = useTranslation('common');

  switch (variant) {
    case 'neon':
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className="group flex h-8 w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-accent bg-accent/10 text-xs font-semibold text-accent transition-all duration-200 hover:bg-accent hover:text-light hover:shadow-md focus:bg-accent focus:text-light focus:outline-0 md:h-9 md:text-sm"
        >
          <span className="flex-1 ltr:pl-2 rtl:pr-2">🛒 {t('text-add')}</span>
          <span className="grid h-8 w-8 place-items-center bg-accent text-light transition-colors duration-200 group-hover:bg-accent-hover ltr:rounded-r-md rtl:rounded-l-md md:h-9 md:w-9">
            <PlusIcon className="h-4 w-4 stroke-2" />
          </span>
        </button>
      );
    case 'argon':
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded border border-border-200 bg-light text-sm text-heading transition-colors hover:border-accent hover:bg-accent hover:text-light focus:border-accent focus:bg-accent focus:text-light focus:outline-0 md:h-9 md:w-9"
        >
          <PlusIcon className="h-5 w-5 stroke-2" />
        </button>
      );
    case 'oganesson':
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm text-light shadow-500 transition-colors hover:border-accent hover:bg-accent hover:text-light focus:border-accent focus:bg-accent focus:text-light focus:outline-0 md:h-10 md:w-10"
        >
          <span className="sr-only">{t('text-plus')}</span>
          <PlusIcon className="h-5 w-5 stroke-2 md:h-6 md:w-6" />
        </button>
      );
    case 'single':
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className="order-5 flex items-center justify-center rounded-full border-2 border-border-100 bg-light px-3 py-2 text-sm font-semibold text-accent transition-colors duration-300 hover:border-accent hover:bg-accent hover:text-light focus:border-accent focus:bg-accent focus:text-light focus:outline-0 sm:order-4 sm:justify-start sm:px-5"
        >
          <CartIcon className="h-4 w-4 ltr:mr-2.5 rtl:ml-2.5" />
          <span>{t('text-cart')}</span>
        </button>
      );
    case 'big':
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-center rounded bg-accent py-4 px-5 text-sm font-light text-light transition-colors duration-300 hover:bg-accent-hover focus:bg-accent-hover focus:outline-0 lg:text-base',
            {
              'cursor-not-allowed border border-border-400 !bg-gray-300 !text-body hover:!bg-gray-300':
                disabled,
            }
          )}
        >
          <span>{t('text-add-cart')}</span>
        </button>
      );
    case 'text':
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'whitespace-nowrap text-sm font-semibold text-accent hover:text-accent-hover hover:underline',
            {
              'text-gray-300 hover:text-gray-300': disabled,
            }
          )}
        >
          <span>{t('text-add-to-cart')}</span>
        </button>
      );
    default:
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          title={disabled ? 'Out Of Stock' : ''}
          className="flex h-7 w-7 items-center justify-center rounded border border-border-200 bg-light text-sm text-accent transition-colors hover:border-accent hover:bg-accent hover:text-light focus:border-accent focus:bg-accent focus:text-light focus:outline-0 md:h-9 md:w-9"
        >
          <span className="sr-only">{t('text-plus')}</span>
          <PlusIcon className="h-5 w-5 stroke-2" />
        </button>
      );
  }
};

export default AddToCartBtn;
