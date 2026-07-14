import Input from '@/components/ui/input';
import Range from '@/components/ui/range';
import React, { useState, useEffect } from 'react';
import { usePuck } from '@measured/puck';
import TooltipLabel from '@/components/ui/tooltip-label';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isArray, isEmpty, isString } from 'lodash';
import { checkIfValidJson } from '@/components/builder/utils/helper';

interface SizeSettings {
  value: number;
  unit: string;
}

interface ResponsiveSize {
  desktop: SizeSettings;
  tablet: SizeSettings;
  mobile: SizeSettings;
}

// Define breakpoints
type DeviceType = 'desktop' | 'tablet' | 'mobile';

const defaultsize: ResponsiveSize = {
  desktop: { value: 16, unit: 'px' },
  tablet: { value: 14, unit: 'px' },
  mobile: { value: 12, unit: 'px' },
};

// Define ranges for different units
const rangesValue = {
  px: { min: 0, max: 200, step: 1 },
  em: { min: 0, max: 10, step: 0.1 },
  rem: { min: 0, max: 10, step: 0.1 },
  '%': { min: 0, max: 100, step: 1 },
};

const SlideControl = ({
  onChange,
  value,
  label = 'Size',
  unitRanges = rangesValue,
  isShowUnit = true,
  maxRange,
  isValidation = true,
}: {
  onChange: (value: string) => void;
  value: string;
  label?: string;
  isShowUnit?: boolean;
  maxRange?: number;
  unitRanges?: {
    [key: string]: {
      min: number;
      max: number;
      step: number;
    };
  };
  isValidation?: boolean;
}) => {
  const unitOptions = Object.keys(unitRanges);
  const {
    dispatch,
    appState: { ui },
  } = usePuck();
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');
  const [size, setSize] = useState<ResponsiveSize>(defaultsize);
  const [errors, setErrors] = useState<string | null>(null);

  useEffect(() => {
    if (value && isString(value) && checkIfValidJson(value)) {
      try {
        const parsedValue: ResponsiveSize = JSON.parse(value);
        setSize(parsedValue);
      } catch (error) {
        console.error('Invalid JSON format for size value:', error);
      }
    }
  }, [value]);

  const validateInput = (name: string, value: string | number) => {
    if (name === 'value') {
      const numericValue = Number(value);
      return numericValue < 0 || isNaN(numericValue)
        ? `${name} must be a positive number`
        : null;
    }
    return null;
  };

  const updateSize = (updatedSettings: Partial<SizeSettings>) => {
    const newSize = {
      ...size,
      [activeDevice]: {
        ...size[activeDevice],
        ...updatedSettings,
      },
    };
    onChange(JSON.stringify(newSize));
    setSize(newSize);
  };

  // Handle changes for input and range
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === 'unit') {
      updateSize({ unit: value as string }); // Directly update the unit
    } else if (name === 'value') {
      const numericValue = Number(value);
      if (isValidation) {
        const error = validateInput(name, numericValue);
        if (error) {
          setErrors(error);
        } else {
          updateSize({ value: numericValue });
          setErrors(null);
        }
      } else {
        updateSize({ value: numericValue });
      }
    }
  };

  // Handle device changes and set default unit
  const handleDeviceChange = (device: DeviceType) => {
    setActiveDevice(device);
    // Set default unit to 'px' when switching devices
    if (!size[device].unit) {
      updateSize({ unit: 'px' });
    }
  };

  // Device button handlers
  const handleDeviceClick = (device: DeviceType, width: number) => {
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
    handleDeviceChange(device);
  };

  // Get dynamic range limits based on the selected unit
  const { min, max, step } = unitRanges[size[activeDevice].unit];
  return (
    <div>
      <div>
        <div className="flex items-center justify-between mb-4 gap-2">
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
          {!isEmpty(unitOptions) && isArray(unitOptions) && isShowUnit ? (
            <select
              name="unit"
              value={size[activeDevice]?.unit}
              onChange={handleChange}
            >
              {unitOptions?.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          ) : (
            ''
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <Range
            name="value"
            min={min}
            max={maxRange ? maxRange : max}
            step={step}
            value={size[activeDevice]?.value}
            onChange={handleChange}
            className="shrink-0 w-3/4 [&>label]:hidden"
          />
          <Input
            type="number"
            name="value"
            min={min}
            max={maxRange ? maxRange : max}
            step={step}
            value={size[activeDevice]?.value}
            onChange={handleChange}
            variant="outline"
            dimension="small"
            className="shrink-0 w-1/5 [&>label]:hidden"
            inputClassName="p-0 px-2"
            disabled
          />
        </div>
      </div>

      {/* Error Display */}
      {errors && <div style={{ color: 'red' }}>{errors}</div>}
    </div>
  );
};

export default SlideControl;
