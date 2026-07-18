import { useModalAction } from '@/components/ui/modal/modal.context';
import { RadioGroup } from '@headlessui/react';
import { useAtom, WritableAtom } from 'jotai';
import { useEffect } from 'react';
import AddressCard from '@/components/address/address-card';
import { AddressHeader } from '@/components/address/address-header';
import { useTranslation } from 'next-i18next';
import type { Address } from '@/types';

interface AddressesProps {
  addresses: Address[] | undefined | null;
  label: string;
  atom: WritableAtom<Address | null, any, Address>;
  className?: string;
  userId: string;
  count: number;
  type: string;
  hideHeader?: boolean;
}

export const AddressGrid: React.FC<AddressesProps> = ({
  addresses,
  label,
  atom,
  className,
  userId,
  count,
  type,
  hideHeader,
}) => {
  const { t } = useTranslation('common');
  const [selectedAddress, setAddress] = useAtom(atom);
  const { openModal } = useModalAction();

  useEffect(() => {
    if (addresses?.length) {
      if (selectedAddress?.id) {
        const index = addresses.findIndex((a) => a.id === selectedAddress.id);
        setAddress(addresses[index]);
      } else {
        setAddress(addresses?.[0]);
      }
    }
  }, [addresses, addresses?.length, selectedAddress?.id, setAddress]);

  function onAdd() {
    openModal('ADD_OR_UPDATE_ADDRESS', { customerId: userId, type });
  }
  function onEdit(address: any) {
    openModal('ADD_OR_UPDATE_ADDRESS', { customerId: userId, address });
  }
  function onDelete(address: any) {
    openModal('DELETE_ADDRESS', { customerId: userId, addressId: address?.id });
  }

  const gridCols = hideHeader
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
    : 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3';

  return (
    <div className={className}>
      {hideHeader ? (
        <label className="mb-1.5 block text-xs font-semibold text-[#6E6C6D]">
          {label}
        </label>
      ) : (
        <AddressHeader onAdd={onAdd} count={count} label={label} />
      )}
      {!addresses?.length ? (
        <div className="grid grid-cols-1 gap-4">
          <span className="relative rounded border border-border-200 bg-gray-100 px-5 py-6 text-center text-base">
            {t('text-no-address')}
          </span>
        </div>
      ) : (
        <RadioGroup value={selectedAddress} onChange={setAddress}>
          <RadioGroup.Label className="sr-only">{label}</RadioGroup.Label>
          <div className={gridCols}>
            {addresses?.map((address) => (
              <RadioGroup.Option value={address} key={address?.id}>
                {({ checked }: { checked: boolean }) => (
                  <AddressCard
                    checked={checked}
                    onDelete={() => onDelete(address)}
                    onEdit={() => onEdit(address)}
                    address={address}
                  />
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      )}
      {hideHeader && (
        <button
          onClick={onAdd}
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-border-base text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/5"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          নতুন ঠিকানা যোগ করুন
        </button>
      )}
    </div>
  );
};
export default AddressGrid;
