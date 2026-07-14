import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/input';
import Range from '@/components/ui/range';
import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { usePuck } from '@measured/puck';
import { isArray, isEmpty, isString } from 'lodash';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { checkIfValidJson } from '@/components/builder/utils/helper';

const rangesValue = {
  px: { min: 0, max: 200, step: 1 },
  em: { min: 0, max: 10, step: 0.1 },
  rem: { min: 0, max: 10, step: 0.1 },
  '%': { min: 0, max: 10, step: 1 },
};

interface Dimensions {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: string;
}

interface DimensionsGeneratorProps {
  value: string;
  onChange: (responsive: string) => void;
  label: string;
  unitRanges?: {
    [key: string]: {
      min: number;
      max: number;
      step: number;
    };
  };
}

const DimensionsGenerator: React.FC<DimensionsGeneratorProps> = ({
  value,
  onChange,
  label,
  unitRanges = rangesValue,
}) => {
  const unitOptions = Object.keys(unitRanges);
  const {
    dispatch,
    appState: { ui },
  } = usePuck();
  const [activeDevice, setActiveDevice] = useState<string>('Desktop');

  const parsedValue =
    isString(value) && !isEmpty(value) && checkIfValidJson(value)
      ? JSON.parse(value)
      : {};

  const initialDimensions = (device: keyof typeof parsedValue): Dimensions => {
    return {
      ...(parsedValue[device] || {}),
      top: parsedValue[device]?.top || '0',
      right: parsedValue[device]?.right || '0',
      bottom: parsedValue[device]?.bottom || '0',
      left: parsedValue[device]?.left || '0',
      unit: parsedValue[device]?.unit || 'px',
    };
  };

  const [desktopDimensions, setDesktopDimensions] = useState<Dimensions>(
    initialDimensions('desktop'),
  );
  const [tabletDimensions, setTabletDimensions] = useState<Dimensions>(
    initialDimensions('tablet'),
  );
  const [mobileDimensions, setMobileDimensions] = useState<Dimensions>(
    initialDimensions('mobile'),
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setDesktopDimensions(initialDimensions('desktop'));
    setTabletDimensions(initialDimensions('tablet'));
    setMobileDimensions(initialDimensions('mobile'));
  }, []);

  const validateInput = (value: string): string => {
    const numberValue = parseFloat(value);
    return isNaN(numberValue) || value.trim() === ''
      ? 'Please enter a valid number'
      : '';
  };

  const handleValueChange = (side: keyof Dimensions, value: string) => {
    const error = validateInput(value);
    if (error) {
      setErrors((prev) => ({ ...prev, [side]: error }));
      return;
    }
    setErrors((prev) => ({ ...prev, [side]: '' }));

    const currentDimensions =
      activeDevice === 'Desktop'
        ? desktopDimensions
        : activeDevice === 'Tablet'
          ? tabletDimensions
          : mobileDimensions;

    const newDimensions: Dimensions = {
      ...currentDimensions,
      [side]: value,
    };

    handleGenerate(newDimensions);

    if (activeDevice === 'Desktop') {
      setDesktopDimensions(newDimensions);
    } else if (activeDevice === 'Tablet') {
      setTabletDimensions(newDimensions);
    } else {
      setMobileDimensions(newDimensions);
    }
  };

  const handleUnitChange = (unit: string) => {
    const currentDimensions =
      activeDevice === 'Desktop'
        ? desktopDimensions
        : activeDevice === 'Tablet'
          ? tabletDimensions
          : mobileDimensions;

    const newDimensions: Dimensions = {
      ...currentDimensions,
      unit,
    };

    handleGenerate(newDimensions);

    if (activeDevice === 'Desktop') {
      setDesktopDimensions(newDimensions);
    } else if (activeDevice === 'Tablet') {
      setTabletDimensions(newDimensions);
    } else {
      setMobileDimensions(newDimensions);
    }
  };

  const handleGenerate = (newDimensions: Dimensions) => {
    // const generatedStyles = {
    //   desktop: {
    //     ...desktopDimensions,
    //     unit: desktopDimensions?.unit,
    //   },
    //   tablet: {
    //     ...tabletDimensions,
    //     unit: tabletDimensions?.unit,
    //   },
    //   mobile: {
    //     ...mobileDimensions,
    //     unit: mobileDimensions?.unit,
    //   },
    // };

    const generatedStyles = {
      ...parsedValue,
      ...(activeDevice === 'Desktop' && {
        desktop: newDimensions,
      }),
      ...(activeDevice === 'Tablet' && {
        tablet: newDimensions,
      }),
      ...(activeDevice === 'Mobile' && {
        mobile: newDimensions,
      }),
    };
    const generatedStylesString = JSON.stringify(generatedStyles);
    onChange(generatedStylesString);
  };

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
      {/* Device Control */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TooltipLabel label={label} className="mb-0" />
          <div className="flex items-center text-base justify-end gap-1 text-gray-1000">
            <button
              onClick={() => handleDeviceClick('Desktop', 1280)}
              className={cn(
                'cursor-pointer transition-colors hover:text-accent-600',
                activeDevice === 'Desktop' ? 'text-accent-500' : '',
              )}
            >
              <Monitor height="1em" width="1em" />
            </button>
            <button
              onClick={() => handleDeviceClick('Tablet', 770)}
              className={cn(
                'cursor-pointer transition-colors hover:text-accent-600',
                activeDevice === 'Tablet' ? 'text-accent-500' : '',
              )}
            >
              <Tablet height="1em" width="1em" />
            </button>
            <button
              onClick={() => handleDeviceClick('Mobile', 400)}
              className={cn(
                'cursor-pointer transition-colors hover:text-accent-600',
                activeDevice === 'Mobile' ? 'text-accent-500' : '',
              )}
            >
              <Smartphone height="1em" width="1em" />
            </button>
          </div>
        </div>
        {!isEmpty(unitOptions) && isArray(unitOptions) ? (
          <select
            value={
              activeDevice === 'Desktop'
                ? desktopDimensions?.unit
                : activeDevice === 'Tablet'
                  ? tabletDimensions?.unit
                  : mobileDimensions?.unit
            }
            onChange={(e) => handleUnitChange(e.target.value)}
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

      <div className="space-y-3">
        {['top', 'right', 'bottom', 'left'].map((side) => {
          const unit =
            activeDevice === 'Desktop'
              ? desktopDimensions.unit
              : activeDevice === 'Tablet'
                ? tabletDimensions.unit
                : mobileDimensions.unit;

          const { min, max, step } =
            unitRanges[unit as keyof typeof unitRanges];

          return (
            <div key={side}>
              <TooltipLabel
                label={`${side?.charAt(0)?.toUpperCase() + side?.slice(1)}`}
              />
              <div className="flex justify-between items-center gap-x-2 flex-wrap">
                <Range
                  name={side}
                  value={
                    activeDevice === 'Desktop'
                      ? desktopDimensions[side as keyof Dimensions]
                      : activeDevice === 'Tablet'
                        ? tabletDimensions[side as keyof Dimensions]
                        : mobileDimensions[side as keyof Dimensions]
                  }
                  min={min}
                  max={max}
                  step={step}
                  onChange={(e) =>
                    handleValueChange(side as keyof Dimensions, e.target.value)
                  }
                  className="shrink-0 w-3/4 [&>label]:hidden"
                />
                <Input
                  name={side}
                  type="number"
                  placeholder="Value"
                  value={
                    activeDevice === 'Desktop'
                      ? desktopDimensions[side as keyof Dimensions]
                      : activeDevice === 'Tablet'
                        ? tabletDimensions[side as keyof Dimensions]
                        : mobileDimensions[side as keyof Dimensions]
                  }
                  onChange={(e) =>
                    handleValueChange(side as keyof Dimensions, e.target.value)
                  }
                  variant="outline"
                  dimension="small"
                  className="shrink-0 w-1/5 [&>label]:hidden"
                  inputClassName="p-0 px-2"
                  min={min}
                  max={max}
                  step={step}
                  error={errors[side]}
                  disabled
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DimensionsGenerator;
