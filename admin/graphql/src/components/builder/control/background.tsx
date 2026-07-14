import { Brush } from '@/components/builder/icons/brush';
import { Gradient } from '@/components/builder/icons/gradient';
import { ImageIcon } from '@/components/builder/icons/image';
import Uploader from '@/components/common/uploader';
import CustomColorPicker from '@/components/builder/control/color-picker';
import Input from '@/components/ui/input';
import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { Tab } from '@headlessui/react';
import { isEmpty, isString } from 'lodash';
import { ChangeEvent, useState } from 'react';
import {
  checkIfValidJson,
  handleColorInputOnChange,
} from '@/components/builder/utils/helper';
import Range from '@/components/ui/range';
import { usePuck } from '@measured/puck';

type GradientType = {
  color1: string;
  color2: string;
  direction: string;
  angle: number;
  locations: number[];
};

type BackgroundType = 'color' | 'gradient' | 'image';

const parseValue = (value: string) => {
  if (isString(value) && !isEmpty(value) && checkIfValidJson(value)) {
    return JSON.parse(value);
  }
  return {};
};

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
  const { dispatch } = usePuck();
  const parsedValue = parseValue(value);

  const [backgroundType, setBackgroundType] = useState<BackgroundType>(
    parsedValue?.backgroundType || 'color',
  );
  const [color, setColor] = useState<string>(parsedValue?.color || '#ffffff');
  const [gradient, setGradient] = useState<GradientType>(
    parsedValue?.gradient || {
      color1: '#ff0000',
      color2: '#0000ff',
      direction: 'to right',
      angle: 90,
      locations: [0, 100],
    },
  );
  const [image, setImage] = useState<string | null>(parsedValue?.image || null);
  const [backgroundSize, setBackgroundSize] = useState<string>(
    parsedValue?.backgroundSize || 'cover',
  );
  const [backgroundPosition, setBackgroundPosition] = useState<string>(
    parsedValue?.backgroundPosition || 'center',
  );
  const [backgroundRepeat, setBackgroundRepeat] = useState<string>(
    parsedValue?.backgroundRepeat || 'no-repeat',
  );

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    // Set background type
    if (name === 'backgroundType') {
      setBackgroundType(value as BackgroundType);
      return;
    }

    // For background type color
    if (backgroundType === 'color') {
      const backgroundColorData = {
        backgroundType: name === 'backgroundType' ? value : backgroundType,
        color: name === 'color' ? value : color,
      };
      onChange(JSON.stringify({ ...backgroundColorData }));
      if (name === 'color') {
        setColor(backgroundColorData.color);
      }
    }

    // For background type color
    else if (backgroundType === 'gradient') {
      const backgroundGradientData = {
        backgroundType: name === 'backgroundType' ? value : backgroundType,
        gradient: {
          color1: name === 'color1' ? value : gradient.color1,
          color2: name === 'color2' ? value : gradient.color2,
          direction: name === 'direction' ? value : gradient.direction,
          angle: name === 'angle' ? Number(value) : gradient.angle,
          locations:
            name === 'location1' || name === 'location2'
              ? [0, 100]
              : gradient.locations,
        },
      };
      onChange(JSON.stringify({ ...backgroundGradientData }));
      if (name === 'color1') {
        setGradient({
          ...gradient,
          color1: backgroundGradientData.gradient.color1,
        });
      } else if (name === 'color2') {
        setGradient({
          ...gradient,
          color2: backgroundGradientData.gradient.color2,
        });
      } else if (name === 'direction') {
        setGradient({
          ...gradient,
          direction: backgroundGradientData.gradient.direction,
        });
      } else if (name === 'angle') {
        setGradient({
          ...gradient,
          angle: Number(backgroundGradientData.gradient.angle),
        });
      } else if (name === 'location1') {
        setGradient({
          ...gradient,
          locations: [
            Number(backgroundGradientData.gradient.locations[0]),
            gradient.locations[1],
          ],
        });
      } else if (name === 'location2') {
        setGradient({
          ...gradient,
          locations: [
            gradient.locations[0],
            Number(backgroundGradientData.gradient.locations[1]),
          ],
        });
      }
    }

    // For background type image
    else if (backgroundType === 'image') {
      const backgroundImageData = {
        backgroundType: name === 'backgroundType' ? value : backgroundType,
        image: name === 'backgroundImage' ? value : image,
        backgroundSize: name === 'backgroundSize' ? value : backgroundSize,
        backgroundPosition:
          name === 'backgroundPosition' ? value : backgroundPosition,
        backgroundRepeat:
          name === 'backgroundRepeat' ? value : backgroundRepeat,
      };
      onChange(JSON.stringify({ ...backgroundImageData }));
      if (name === 'backgroundSize') {
        setBackgroundSize(backgroundImageData.backgroundSize);
      } else if (name === 'backgroundPosition') {
        setBackgroundPosition(backgroundImageData.backgroundPosition);
      } else if (name === 'backgroundRepeat') {
        setBackgroundRepeat(backgroundImageData.backgroundRepeat);
      }
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
              color={color}
              onChange={(color) => handleColorInputChange('color', color)}
              label="Color"
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
              <div className="flex items-center justify-between">
                <Range
                  name="angle"
                  min={0}
                  max={360}
                  step={1}
                  value={gradient?.angle}
                  onChange={handleInputChange}
                  className="shrink-0 w-3/4 [&>label]:hidden"
                />
                <Input
                  type="number"
                  name="angle"
                  min={0}
                  max={360}
                  step={1}
                  value={gradient?.angle}
                  onChange={handleInputChange}
                  variant="outline"
                  dimension="small"
                  className="shrink-0 w-1/5 [&>label]:hidden"
                  inputClassName="p-0 px-2"
                  disabled
                />
              </div>
            </div>
            <div>
              <TooltipLabel label="Location 1:" className="mb-0" />
              <div className="flex items-center justify-between">
                <Range
                  name="location1"
                  value={gradient?.locations?.[0]}
                  onChange={handleInputChange}
                  min={0}
                  max={100}
                  step={1}
                  className="shrink-0 w-3/4 [&>label]:hidden"
                />
                <Input
                  type="number"
                  name="location1"
                  value={gradient?.locations?.[0]}
                  onChange={handleInputChange}
                  min={0}
                  max={100}
                  step={1}
                  variant="outline"
                  dimension="small"
                  className="shrink-0 w-1/5 [&>label]:hidden"
                  inputClassName="p-0 px-2"
                  disabled
                />
              </div>
            </div>
            <div>
              <TooltipLabel label="Location 2:" className="mb-0" />
              <div className="flex items-center justify-between">
                <Range
                  name="location2"
                  value={gradient?.locations?.[1]}
                  onChange={handleInputChange}
                  min={0}
                  max={100}
                  step={1}
                  className="shrink-0 w-3/4 [&>label]:hidden"
                />
                <Input
                  type="number"
                  name="location2"
                  value={gradient?.locations?.[1]}
                  onChange={handleInputChange}
                  min={0}
                  max={100}
                  step={1}
                  variant="outline"
                  dimension="small"
                  className="shrink-0 w-1/5 [&>label]:hidden"
                  inputClassName="p-0 px-2"
                  disabled
                />
              </div>
            </div>
          </Tab.Panel>
          <Tab.Panel key="image" className="space-y-3">
            <Uploader
              name="backgroundImage"
              value={image}
              onChange={(attachment: string) => {
                setImage(attachment);
                onChange(JSON.stringify({ backgroundType, image: attachment }));
              }}
            />
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
