import Input from '@/components/ui/input';
import Range from '@/components/ui/range';
import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { usePuck } from '@measured/puck';
import { isEmpty, isString } from 'lodash';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { checkIfValidJson } from '@/components/builder/utils/helper';

const unitOptions = ['px'];
const devices = ['Desktop', 'Tablet', 'Mobile'];

interface Borders {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: string;
}

interface BordersGeneratorProps {
  value: string;
  onChange: (responsive: string) => void;
  label: string;
}

const BordersGenerator: React.FC<BordersGeneratorProps> = ({
  value,
  onChange,
  label,
}) => {
  const {
    dispatch,
    appState: { ui },
  } = usePuck();
  const [activeDevice, setActiveDevice] = useState<string>('Desktop');
  const parsedValue =
    isString(value) && !isEmpty(value) && checkIfValidJson(value)
      ? JSON.parse(value)
      : {};

  const initialDimensions = (device: keyof typeof parsedValue): Borders => {
    return {
      ...(parsedValue[device] || {}),
      top: parsedValue[device]?.top || '0',
      right: parsedValue[device]?.right || '0',
      bottom: parsedValue[device]?.bottom || '0',
      left: parsedValue[device]?.left || '0',
      unit: parsedValue[device]?.unit || 'px',
    };
  };

  const [desktopDimensions, setDesktopDimensions] = useState<Borders>(
    initialDimensions('desktop'),
  );
  const [tabletDimensions, setTabletDimensions] = useState<Borders>(
    initialDimensions('tablet'),
  );
  const [mobileDimensions, setMobileDimensions] = useState<Borders>(
    initialDimensions('mobile'),
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Update dimensions when parsedValue changes
    setDesktopDimensions(initialDimensions('desktop'));
    setTabletDimensions(initialDimensions('tablet'));
    setMobileDimensions(initialDimensions('mobile'));
  }, []); // Depend on parsedValue

  const validateInput = (value: string): string => {
    const numberValue = parseFloat(value);
    return isNaN(numberValue) || value.trim() === ''
      ? 'Please enter a valid number'
      : '';
  };

  const handleValueChange = (side: keyof Borders, value: string) => {
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

    const newDimensions: Borders = {
      ...currentDimensions,
      [side]: value, // Update only the specific side
    };

    if (activeDevice === 'Desktop') {
      setDesktopDimensions(newDimensions);
    } else if (activeDevice === 'Tablet') {
      setTabletDimensions(newDimensions);
    } else {
      setMobileDimensions(newDimensions);
    }

    handleGenerate(newDimensions); // Pass the correct dimensions for generating output
  };

  const handleUnitChange = (unit: string) => {
    const currentDimensions =
      activeDevice === 'Desktop'
        ? desktopDimensions
        : activeDevice === 'Tablet'
          ? tabletDimensions
          : mobileDimensions;

    const newDimensions: Borders = {
      ...currentDimensions,
      unit, // Update only the unit
    };

    handleGenerate(newDimensions); // Pass the correct dimensions for generating output

    if (activeDevice === 'Desktop') {
      setDesktopDimensions(newDimensions);
    } else if (activeDevice === 'Tablet') {
      setTabletDimensions(newDimensions);
    } else {
      setMobileDimensions(newDimensions);
    }
  };

  const handleGenerate = (newDimensions: Borders) => {
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
      {/* Device Control */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <TooltipLabel label={label} className="mb-0" />
          <div className="flex items-center justify-end gap-1 text-base text-gray-1000">
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
          {unitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {['left', 'top', 'right', 'bottom'].map((side) => (
          <div key={side}>
            <TooltipLabel
              label={`${side?.charAt(0)?.toUpperCase() + side?.slice(1)}`}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Range
                name={side}
                value={
                  activeDevice === 'Desktop'
                    ? desktopDimensions[side as keyof Borders]
                    : activeDevice === 'Tablet'
                      ? tabletDimensions[side as keyof Borders]
                      : mobileDimensions[side as keyof Borders]
                }
                onChange={(e) =>
                  handleValueChange(side as keyof Borders, e.target.value)
                }
                className="shrink-0 w-3/4 [&>label]:hidden"
                max="20"
              />
              <Input
                name={side}
                type="number"
                placeholder="Value"
                value={
                  activeDevice === 'Desktop'
                    ? desktopDimensions[side as keyof Borders]
                    : activeDevice === 'Tablet'
                      ? tabletDimensions[side as keyof Borders]
                      : mobileDimensions[side as keyof Borders]
                }
                onChange={(e) =>
                  handleValueChange(side as keyof Borders, e.target.value)
                }
                variant="outline"
                dimension="small"
                className="shrink-0 w-1/5 [&>label]:hidden"
                inputClassName="p-0 px-2"
                disabled
              />
            </div>
            {errors[side] && (
              <span style={{ color: 'red' }}>{errors[side]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BordersGenerator;
