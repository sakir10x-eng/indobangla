import { CloseIcon } from '@/components/icons/close-icon';
import { NoDataFound } from '@/components/icons/no-data-found';
import { SearchIcon } from '@/components/icons/search-icon';
import Input from '@/components/ui/input';
import {
  useModalAction,
  useModalState,
} from '@/components/ui/modal/modal.context';
import { cn } from '@/lib/utils';
import { isArray, isEmpty } from 'lodash';
import React, { useState } from 'react';
import { icons as Lucide } from 'lucide-react';
import IconRender from '@/components/builder/utils/icon-render';

const formatIconName = (iconName: string) => {
  if (!iconName) {
    return '';
  }
  return iconName
    ?.replace(/([a-z])([A-Z])/g, '$1 $2')
    ?.replace(/([A-Z])/g, '$1')
    ?.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
};

type IconName = keyof typeof Lucide;

interface ModalData {
  onChange: (value: string) => void;
  value: string;
}

const IconPicker: React.FC = () => {
  const [selectedIcon, setSelectedIcon] = useState<IconName | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const icons = Object.keys(Lucide).filter((value, index, self) => {
    return self?.indexOf(value) === index;
  }) as IconName[];
  const { closeModal } = useModalAction();
  const { data } = useModalState();
  const { onChange, value } = data as ModalData;

  const handleIconClick = (icon: IconName) => {
    setSelectedIcon(icon);
    onChange(icon);
    closeModal();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event?.target?.value);
  };

  const filteredIcons = icons?.filter(
    (icon) => icon?.toLowerCase()?.includes(searchTerm?.toLowerCase()),
  );

  return (
    <div className="m-auto w-full rounded-md bg-light p-4 pb-6 md:rounded-xl">
      <div className="py-3 pt-1 border-b border-gray-100 mb-10">
        <h2 className="font-bold uppercase leading-none">Icon Library</h2>
        <button
          onClick={closeModal}
          aria-label="Close panel"
          className={cn(
            'absolute top-4 z-[60] inline-block outline-none focus:outline-none ltr:right-4 rtl:left-4',
          )}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-10 relative">
        <button className="absolute top-1/2 -translate-y-1/2 p-2 text-body outline-none start-1 focus:outline-none active:outline-none">
          <SearchIcon className="h-5 w-5" />
        </button>
        <Input
          name="icon"
          type="text"
          placeholder="Search icons..."
          value={searchTerm}
          onChange={handleSearchChange}
          variant="outline"
          className="shrink-0 [&>label]:hidden"
          inputClassName="ps-10 pe-4 rounded-md"
        />
        {!!searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute top-1/2 -translate-y-1/2 p-2 text-body outline-none end-1 focus:outline-none active:outline-none"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <h2 className="text-base font-medium mb-8">
        All Icons {filteredIcons?.length}
      </h2>
      {isArray(filteredIcons) ? (
        <div className="h-96 overflow-y-auto">
          {!isEmpty(filteredIcons) ? (
            <div className="grid grid-cols-12 gap-4">
              {filteredIcons?.map((item, index) => {
                const iconName = filteredIcons[index];
                if (!iconName) {
                  return (
                    <div key={index} className="text-red-500 text-xs">
                      Invalid Icon
                    </div>
                  );
                }
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex flex-col items-center transition-colors duration-300 justify-center cursor-pointer border border-gray-50 rounded-5 p-3',
                      selectedIcon === iconName || value === iconName
                        ? 'bg-gray-100'
                        : '',
                    )}
                    onClick={() => handleIconClick(iconName)}
                    title={formatIconName(iconName)}
                  >
                    <IconRender className="text-4xl" name={iconName} />
                    <span className="text-xs px-5 pt-2 max-w-full whitespace-nowrap text-ellipsis overflow-hidden">
                      {formatIconName(iconName)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-7">
              <NoDataFound className="w-52" />
              <div className="mb-1 pt-6 text-base font-semibold text-heading">
                No data found
              </div>
              <p className="text-[13px]">Sorry we couldn’t found any data</p>
            </div>
          )}
        </div>
      ) : (
        ''
      )}
    </div>
  );
};

export default IconPicker;
