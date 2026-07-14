import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/cn';
import { usePuck } from '@measured/puck';
import { isEmpty, isString } from 'lodash';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { checkIfValidJson } from '@/components/builder/utils/helper';
import { Tooltip } from '@/components/ui/tooltip';

type Alignment = 'left' | 'center' | 'right';
type Device = 'desktop' | 'tablet' | 'mobile';

const chooseControl = [
  {
    key: 'left',
    title: 'Left',
    value: <AlignLeftIcon />,
  },
  {
    key: 'center',
    title: 'Center',
    value: <AlignCenterIcon />,
  },
  {
    key: 'right',
    title: 'Right',
    value: <AlignRightIcon />,
  },
];

const AlignmentGenerator = ({
  onChange,
  value,
  label,
  chooses = chooseControl,
  className,
}: {
  onChange: (alignment: string) => void;
  value: string; // Alignment values for Desktop, Tablet, and Mobile
  label: string;
  chooses?: typeof chooseControl;
  className?: string;
}) => {
  const parsedValue =
    isString(value) && !isEmpty(value) && checkIfValidJson(value)
      ? JSON.parse(value)
      : {};
  const [activeDevice, setActiveDevice] = useState<Device>('desktop'); // Currently selected device
  const [alignment, setAlignment] =
    useState<Record<Device, string>>(parsedValue); // State to store alignment for each device

  const {
    dispatch,
    appState: { ui },
  } = usePuck();

  // When the value prop changes, update the alignment state
  useEffect(() => {
    if (value) {
      setAlignment(parsedValue);
    }
  }, [value]);

  // Change alignment for the current device and trigger onChange callback with updated object
  const handleAlignmentChange = (align: string) => {
    const updatedAlignment = {
      ...alignment,
      [activeDevice]: align,
    };
    setAlignment(updatedAlignment);
    onChange(JSON.stringify(updatedAlignment)); // Send updated alignment object
  };

  // Device button handlers
  const handleDeviceClick = (device: Device, width: number) => {
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
    setActiveDevice(device); // Update currently active device
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <TooltipLabel label={label} className="mb-0" />
        <div className="flex items-center justify-end gap-1 text-base text-gray-1000">
          {/* Device buttons */}
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

      {/* Alignment buttons */}
      <div className="flex w-full overflow-hidden text-xs border border-gray-100 divide-x divide-gray-100 rounded-sm">
        {/* <button
          onClick={() => handleAlignmentChange('left')}
          className={cn(
            'cursor-pointer p-1 transition-colors duration-300',
            alignment[activeDevice] === 'left' ? 'bg-gray-100' : '',
          )}
        >
          <AlignLeftIcon />
        </button>
        <button
          onClick={() => handleAlignmentChange('center')}
          className={cn(
            'cursor-pointer p-1 transition-colors duration-300',
            alignment[activeDevice] === 'center' ? 'bg-gray-100' : '',
          )}
        >
          <AlignCenterIcon />
        </button>
        <button
          onClick={() => handleAlignmentChange('right')}
          className={cn(
            'cursor-pointer p-1 transition-colors duration-300',
            alignment[activeDevice] === 'right' ? 'bg-gray-100' : '',
          )}
        >
          <AlignRightIcon />
        </button> */}
        {chooses?.map((item, index) => {
          return (
            <button
              onClick={() => handleAlignmentChange(item?.key)}
              className={cn(
                'cursor-pointer p-2 transition-colors duration-300 hover:bg-gray-50 flex-1 basis-7 [&>svg]:mx-auto [&>svg]:h-4',
                className,
                alignment[activeDevice] === item?.key ? 'bg-gray-100' : '',
              )}
              key={index}
              title={item?.title}
            >
              <Tooltip showArrow={false} content={item?.title}>
                {item?.value}
              </Tooltip>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AlignmentGenerator;
