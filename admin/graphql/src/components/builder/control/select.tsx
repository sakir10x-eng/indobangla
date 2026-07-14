import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { usePuck } from '@measured/puck';
import { isArray, isEmpty, isString } from 'lodash';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import React, { useState } from 'react';
import { checkIfValidJson } from '@/components/builder/utils/helper';

const selectValues = [
  {
    value: 'left',
    label: 'Left',
  },
  {
    value: 'center',
    label: 'Center',
  },
  {
    value: 'right',
    label: 'Right',
  },
];

interface SelectControlProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  items?: typeof selectValues;
}

const SelectControl = ({
  value,
  onChange,
  label,
  items = selectValues,
}: SelectControlProps) => {
  const [activeDevice, setActiveDevice] = useState<string>('desktop');
  const parsedValue =
    isString(value) && !isEmpty(value) && checkIfValidJson(value)
      ? JSON.parse(value)
      : {};
  const {
    dispatch,
    appState: { ui },
  } = usePuck();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newAlignment = event.target.value;

    // Create a new value object with updated alignment for the active device
    const updatedValue = {
      ...parsedValue,
      [activeDevice]: newAlignment, // Dynamically update the alignment for the active device
    };

    onChange(JSON.stringify(updatedValue)); // Call the onChange prop to notify the parent with the updated value
  };

  // Device button handlers
  const handleDeviceClick = (device: string, width: number) => {
    dispatch({
      type: 'setUi',
      ui: {
        viewports: {
          current: {
            width,
            height: 'auto',
          },
          controlsVisible: true,
          options: {
            ...ui?.viewports?.options,
          },
        },
      },
    });
    setActiveDevice(device);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TooltipLabel label={label} className="mb-0" />
          <div className="flex items-center justify-end gap-1 text-base text-gray-1000">
            <button
              onClick={() => handleDeviceClick('desktop', 1280)}
              className={cn(
                'cursor-pointer transition-colors hover:text-accent-600',
                activeDevice === 'desktop' ? 'text-accent-500' : '',
              )}
            >
              <Monitor height="1em" width="1em" />
            </button>
            <button
              onClick={() => handleDeviceClick('tablet', 770)}
              className={cn(
                'cursor-pointer transition-colors hover:text-accent-600',
                activeDevice === 'tablet' ? 'text-accent-500' : '',
              )}
            >
              <Tablet height="1em" width="1em" />
            </button>
            <button
              onClick={() => handleDeviceClick('mobile', 400)}
              className={cn(
                'cursor-pointer transition-colors hover:text-accent-600',
                activeDevice === 'mobile' ? 'text-accent-500' : '',
              )}
            >
              <Smartphone height="1em" width="1em" />
            </button>
          </div>
        </div>
      </div>
      {!isEmpty(items) && isArray(items) ? (
        <select
          value={parsedValue[activeDevice] || ''}
          onChange={handleChange}
          className="w-full"
        >
          <option value="" disabled>
            {label}
          </option>
          {items?.map((item, index) => (
            <option key={index} value={item?.value}>
              {item?.label}
            </option>
          ))}
        </select>
      ) : (
        ''
      )}
    </div>
  );
};

export default SelectControl;
