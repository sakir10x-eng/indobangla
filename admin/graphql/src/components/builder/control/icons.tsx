import { useModalAction } from '@/components/ui/modal/modal.context';
import TooltipLabel from '@/components/ui/tooltip-label';
import * as LucideIcons from 'lucide-react';
import React, { FC } from 'react';
import { useTranslation } from 'next-i18next';
import IconRender from '@/components/builder/utils/icon-render';
import { icons } from 'lucide-react';

interface IconSelectorProps {
  onChange: (value: string) => void;
  value: string;
  label?: string;
}

const IconSelector: FC<IconSelectorProps> = ({
  onChange,
  value,
  label = 'Select an Icon:',
}) => {
  const { t } = useTranslation();
  const { openModal } = useModalAction();
  const onClickRemoveHandler = () => {
    onChange('');
  };
  const onIconSelect = () => {
    openModal('ICON_SELECTOR', { onChange, value });
  };

  return (
    <>
      <TooltipLabel label={label} />
      <div className="relative overflow-hidden cursor-pointer">
        <div
          className="border border-solid border-[#1f2124] bg-[#1f2124] text-3xl"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#717171 25%,transparent 0,transparent 75%,#717171 0,#717171),linear-gradient(45deg,#717171 25%,transparent 0,transparent 75%,#717171 0,#717171)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0,calc(16px / 2) calc(16px / 2)',
          }}
        >
          {value ? (
            <div
              className="absolute top-2 right-2 z-10 cursor-pointer"
              onClick={() => {
                if (window.confirm(t('form:remove-item-confirmation'))) {
                  onClickRemoveHandler();
                }
              }}
            >
              <LucideIcons.Trash
                className="text-white text-lg"
                height="1em"
                width="1em"
              />
            </div>
          ) : (
            ''
          )}
          <div
            onClick={onIconSelect}
            className="absolute top-0 left-0 h-full w-full flex text-4xl"
          >
            {!value ? (
              <LucideIcons.PlusCircleIcon
                height="1em"
                width="1em"
                className="text-white m-auto"
              />
            ) : (
              <IconRender
                className="text-white m-auto"
                name={value as keyof typeof icons}
              />
            )}
          </div>
          <div className="h-full pb-[48%]" />
        </div>
      </div>
    </>
  );
};

export default IconSelector;
