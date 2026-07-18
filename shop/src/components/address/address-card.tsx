import { formatAddress } from '@/lib/format-address';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';

interface AddressProps {
  address: any;
  checked: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  userId?: any;
}
const AddressCard: React.FC<AddressProps> = ({ checked, address, onEdit }) => {
  const { t } = useTranslation();
  const editLabel = t('text-edit');
  return (
    <div
      className={classNames(
        'relative flex h-full cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-colors',
        checked
          ? 'border-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent))]'
          : 'border-[#E4E1DC] bg-light hover:border-[#CFCBC4]'
      )}
    >
      {/* radio dot */}
      <span
        className={classNames(
          'mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          checked ? 'border-accent' : 'border-[#CFCBC4]'
        )}
      >
        <span
          className={classNames(
            'h-2 w-2 rounded-full bg-accent transition-transform',
            checked ? 'scale-100' : 'scale-0'
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold capitalize text-heading">
          {address?.title}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[#6E6C6D]">
          {formatAddress(address?.address)}
        </p>
      </div>

      {onEdit && (
        <button
          type="button"
          className="shrink-0 rounded px-1.5 py-0.5 text-[12.5px] font-semibold text-accent underline underline-offset-2 hover:bg-accent/5"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          {editLabel === 'text-edit' ? 'বদলান' : editLabel}
        </button>
      )}
    </div>
  );
};

export default AddressCard;
