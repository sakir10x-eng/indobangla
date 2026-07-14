import { Brush } from '@/components/builder/icons/brush';
import { Gradient } from '@/components/builder/icons/gradient';
import { ImageIcon } from '@/components/builder/icons/image';
import CustomColorPicker from '@/components/builder/control/color-picker';
import { cn } from '@/lib/cn';
import { Tab } from '@headlessui/react';
import { isEmpty, isString } from 'lodash';
import { ChangeEvent, useEffect, useState } from 'react';
import {
  checkIfValidJson,
  handleColorInputOnChange,
} from '@/components/builder/utils/helper';
import TooltipLabel from '@/components/ui/tooltip-label';

type GradientType = {
  color1: string;
  color2: string;
  direction: string;
  angle: number;
  locations: number[];
};

type BackgroundType = 'color' | 'gradient' | 'image';

const BackgroundGenerator = ({
  value,
  onChange,
  label,
  isGradient = true,
  isBgImage = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  isGradient?: boolean;
  isBgImage?: boolean;
}) => {
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('color');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [gradient, setGradient] = useState<GradientType>({
    color1: '#ff0000',
    color2: '#0000ff',
    direction: 'to right',
    angle: 90,
    locations: [0, 100], // Two locations (start and stop)
  });
  const [image, setImage] = useState<string | null>(null);
  const [backgroundSize, setBackgroundSize] = useState<string>('cover');
  const [backgroundPosition, setBackgroundPosition] =
    useState<string>('center');
  const [backgroundRepeat, setBackgroundRepeat] = useState<string>('no-repeat');
  // Update state when value prop changes
  useEffect(() => {
    if (value) {
      const parsedValue =
        isString(value) && !isEmpty(value) && checkIfValidJson(value)
          ? JSON.parse(value)
          : {};
      if (parsedValue?.backgroundType) {
        setBackgroundType(parsedValue?.backgroundType);
      }
      if (parsedValue?.color) {
        setBackgroundColor(parsedValue?.color);
      }
      if (parsedValue?.gradient) {
        setGradient(parsedValue?.gradient);
      }
      if (parsedValue?.image) {
        setImage(parsedValue?.image);
      }
      if (parsedValue?.backgroundSize) {
        setBackgroundSize(parsedValue?.backgroundSize);
      }
      if (parsedValue?.backgroundPosition) {
        setBackgroundPosition(parsedValue?.backgroundPosition);
      }
      if (parsedValue?.backgroundRepeat) {
        setBackgroundRepeat(parsedValue?.backgroundRepeat);
      }
    }
  }, [value]);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    if (name === 'backgroundType') {
      setBackgroundType(value as BackgroundType);
      return;
    }

    if (backgroundType === 'color') {
      if (name === 'color') {
        setBackgroundColor(value);
      }
      onChange(JSON.stringify({ backgroundType, color: backgroundColor }));
    } else if (backgroundType === 'gradient') {
      if (name === 'color1') {
        setGradient({ ...gradient, color1: value });
      } else if (name === 'color2') {
        setGradient({ ...gradient, color2: value });
      } else if (name === 'direction') {
        setGradient({ ...gradient, direction: value });
      } else if (name === 'angle') {
        setGradient({ ...gradient, angle: Number(value) });
      } else if (name === 'location1') {
        const updatedLocations = [...gradient.locations];
        updatedLocations[0] = Number(value);
        setGradient({ ...gradient, locations: updatedLocations });
      } else if (name === 'location2') {
        const updatedLocations = [...gradient.locations];
        updatedLocations[1] = Number(value);
        setGradient({ ...gradient, locations: updatedLocations });
      }
      onChange(JSON.stringify({ backgroundType, gradient }));
    } else if (backgroundType === 'image') {
      if (name === 'backgroundSize') {
        setBackgroundSize(value);
      } else if (name === 'backgroundPosition') {
        setBackgroundPosition(value);
      } else if (name === 'backgroundRepeat') {
        setBackgroundRepeat(value);
      }
      onChange(
        JSON.stringify({
          backgroundType,
          image,
          backgroundSize,
          backgroundPosition,
          backgroundRepeat,
        }),
      );
    }
  };

  const handleColorInputChange = (colorName: string, colorValue: string) => {
    const event = {
      target: {
        name: colorName,
        value: colorValue,
      },
    } as ChangeEvent<HTMLInputElement>;
    handleColorInputOnChange({
      name: colorName,
      value: colorValue,
      onChange: () => handleInputChange(event),
    });
  };

  return (
    <div>
      <Tab.Group
        selectedIndex={
          backgroundType === 'color' ? 0 : backgroundType === 'gradient' ? 1 : 2
        }
        onChange={(index) => {
          const types = ['color', 'gradient', 'image'] as const;
          setBackgroundType(types[index]);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span>{label}</span>
          <Tab.List className="flex">
            <Tab
              className={({ selected }) =>
                cn(
                  'inline-flex rounded-sm p-1.5 border bg-gray-50 cursor-pointer focus-visible:ring-0',
                  selected
                    ? 'bg-gray-100 border-gray-200'
                    : 'bg-gray-50 border-gray-100',
                )
              }
            >
              <Brush />
            </Tab>
            {isGradient ? (
              <Tab
                className={({ selected }) =>
                  cn(
                    'inline-flex rounded-sm p-1.5 border bg-gray-50 cursor-pointer focus-visible:ring-0',
                    selected
                      ? 'bg-gray-100 border-gray-200'
                      : 'bg-gray-50 border-gray-100',
                  )
                }
              >
                <Gradient />
              </Tab>
            ) : (
              ''
            )}

            {isBgImage ? (
              <Tab
                className={({ selected }) =>
                  cn(
                    'inline-flex rounded-sm p-1.5 border bg-gray-50 cursor-pointer focus-visible:ring-0',
                    selected
                      ? 'bg-gray-100 border-gray-200'
                      : 'bg-gray-50 border-gray-100',
                  )
                }
              >
                <ImageIcon />
              </Tab>
            ) : (
              ''
            )}
          </Tab.List>
        </div>
        <Tab.Panels className="mt-2">
          <Tab.Panel key="color" className="space-y-3">
            <CustomColorPicker
              color={backgroundColor}
              onChange={(color) => handleColorInputChange('color', color)}
              label="Light Color"
            />
          </Tab.Panel>
          <Tab.Panel key="gradient" className="space-y-3">
            <CustomColorPicker
              color={gradient?.color1}
              onChange={(color) => handleColorInputChange('color1', color)}
              label="Start Color"
            />
            <CustomColorPicker
              color={gradient.color2}
              onChange={(color) => handleColorInputChange('color2', color)}
              label="Stop Color"
            />
            <div>
              <TooltipLabel label="Angle:" className="mb-0" />
            </div>
            <div>
              <TooltipLabel label="Location 1:" className="mb-0" />
            </div>
            <div>
              <TooltipLabel label="Location 2:" className="mb-0" />
            </div>
          </Tab.Panel>
          <Tab.Panel key="image" className="space-y-3">
            <div className="flex items-center justify-between">
              <TooltipLabel label="Size:" className="mb-0" />
              <select
                name="backgroundSize"
                value={backgroundSize}
                onChange={handleInputChange}
                className="w-1/2 shrink-0"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <TooltipLabel label="Position:" className="mb-0" />
              <select
                name="backgroundPosition"
                value={backgroundPosition}
                onChange={handleInputChange}
                className="w-1/2 shrink-0"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <TooltipLabel label="Repeat:" className="mb-0" />
              <select
                name="backgroundRepeat"
                value={backgroundRepeat}
                onChange={handleInputChange}
                className="w-1/2 shrink-0"
              >
                <option value="no-repeat">No Repeat</option>
                <option value="repeat">Repeat</option>
                <option value="repeat-x">Repeat X</option>
                <option value="repeat-y">Repeat Y</option>
              </select>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default BackgroundGenerator;
