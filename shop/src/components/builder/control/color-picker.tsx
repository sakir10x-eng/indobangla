import TooltipLabel from '@/components/ui/tooltip-label';
import cn from 'classnames';
import { Popover, Transition } from '@headlessui/react';
import { PencilIcon } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { ColorPicker, useColor } from 'react-color-palette';

interface CustomColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
  label?: string;
  toolTipText?: string;
  note?: string;
  error?: string;
  required?: boolean;
}

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({
  color,
  onChange,
  label,
  toolTipText,
  note,
  error: validation,
  required,
  className,
}) => {
  const [currentColor, setCurrentColor] = useState<string>(color);
  const [error, setError] = useState<string | null>(null);

  // Initialize the color state with the provided color
  const [colorState, setColorState] = useColor(currentColor ?? '#000000');

  useEffect(() => {
    if (color) {
      setCurrentColor(color);
      setColorState({ ...colorState, hex: color });
    }
  }, [color]);

  const handleColorChange = (newColor: any) => {
    setColorState(newColor);
    onChange(newColor.hex);
  };

  const styleProperties = {
    '--item-background-color': currentColor,
  } as React.CSSProperties;

  return (
    <Popover className={cn('relative', className)}>
      {({ open }) => (
        <>
          <div className="flex justify-between gap-2 items-center">
            {label ? (
              <TooltipLabel
                toolTipText={toolTipText}
                label={label}
                required={required}
                className="mb-0"
              />
            ) : (
              ''
            )}
            <Popover.Button
              className={cn(
                'inline-flex item-background border border-gray-200 rounded-sm cursor-pointer focus-visible:ring-0',
                !currentColor &&
                  (open
                    ? 'bg-gray-100 border-gray-200'
                    : 'bg-gray-50 border-gray-100'),
                currentColor && 'h-6 w-14',
                !currentColor && 'p-1.5',
              )}
              style={{ ...styleProperties }}
            >
              {!currentColor ? (
                <PencilIcon height="1em" width="1em" className="m-auto" />
              ) : (
                ''
              )}
            </Popover.Button>
          </div>
          {note && <p className="mt-2 text-xs text-body">{note}</p>}
          {error ??
            (validation && (
              <span className="text-red-500 text-sm">
                {error ?? validation}
              </span>
            ))}
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 mt-3 w-full transform">
              <ColorPicker color={colorState} onChange={handleColorChange} />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default CustomColorPicker;
