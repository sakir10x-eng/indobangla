import { useUpdateManufacturerMutationInList } from '@/data/manufacturer';
import { Manufacturer } from '@/types';
import { Switch } from '@headlessui/react';
import { useRouter } from 'next/router';

type IProps = {
  is_approved: boolean;
  record: Manufacturer;
};

const ManufacturerUpdateCell = ({ is_approved, record }: IProps) => {
  const { locale } = useRouter();
  const { mutate: updateManufacturer } = useUpdateManufacturerMutationInList();

  function handleOnClick() {
    updateManufacturer({
      id: record?.id,
      name: record?.name,
      is_approved: !is_approved,
      type_id: record?.type.id,
      language: locale,
    });
  }

  return (
    <Switch
      checked={is_approved}
      onChange={handleOnClick}
      className={`${
        is_approved ? 'bg-accent' : 'bg-gray-300'
      } relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none`}
      dir="ltr"
    >
      <span className="sr-only">Enable</span>
      <span
        className={`${
          is_approved ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-light`}
      />
    </Switch>
  );
};

export { ManufacturerUpdateCell };
