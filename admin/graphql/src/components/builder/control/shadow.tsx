import CustomColorPicker from '@/components/builder/control/color-picker';
import { handleColorInputOnChange } from '@/components/builder/utils/helper';
import { PencilIcon } from '@/components/icons/pencil-icon';
import Input from '@/components/ui/input';
import Range from '@/components/ui/range';
import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { Popover, Transition } from '@headlessui/react';
import React, { ChangeEvent, Fragment, useEffect, useState } from 'react';

type ShadowValues = {
  horizontalOffset: number;
  verticalOffset: number;
  blurRadius: number;
  spreadRadius: number;
  shadowColor: string;
  shadowOpacity: number;
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const parseBoxShadow = (boxShadow: string): ShadowValues => {
  const parts = boxShadow.match(
    /(-?\d+px) (-?\d+px) (-?\d+px) (-?\d+px) rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/,
  );
  if (!parts) throw new Error('Invalid box-shadow format');

  const [
    ,
    horizontalOffset,
    verticalOffset,
    blurRadius,
    spreadRadius,
    r,
    g,
    b,
    opacity,
  ] = parts;

  return {
    horizontalOffset: parseInt(horizontalOffset, 10),
    verticalOffset: parseInt(verticalOffset, 10),
    blurRadius: parseInt(blurRadius, 10),
    spreadRadius: parseInt(spreadRadius, 10),
    shadowColor: rgbToHex(parseInt(r, 10), parseInt(g, 10), parseInt(b, 10)),
    shadowOpacity: parseFloat(opacity),
  };
};

function BoxShadowGenerator({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [shadowValues, setShadowValues] = useState<ShadowValues>({
    horizontalOffset: 0,
    verticalOffset: 0,
    blurRadius: 10,
    spreadRadius: 0,
    shadowColor: '#000000',
    shadowOpacity: 1,
  });

  useEffect(() => {
    try {
      const parsedValues = parseBoxShadow(value);
      setShadowValues(parsedValues);
    } catch (error) {
      console.error('Error parsing box-shadow value:', error);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setShadowValues((prevValues) => {
      const updatedValues = {
        ...prevValues,
        [name]: type === 'range' ? Number(value) : value,
      };

      const boxShadow = `${updatedValues.horizontalOffset}px ${
        updatedValues.verticalOffset
      }px ${updatedValues.blurRadius}px ${
        updatedValues.spreadRadius
      }px rgba(${parseInt(
        updatedValues.shadowColor.slice(1, 3),
        16,
      )}, ${parseInt(updatedValues.shadowColor.slice(3, 5), 16)}, ${parseInt(
        updatedValues.shadowColor.slice(5, 7),
        16,
      )}, ${updatedValues.shadowOpacity})`;

      onChange(boxShadow);
      return updatedValues;
    });
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
    <Popover className="relative">
      {({ open }) => (
        <>
          <div className="flex justify-between gap-2 items-center">
            <span>{label}</span>
            <Popover.Button
              className={cn(
                'inline-flex rounded-sm p-1.5 border bg-gray-50 cursor-pointer focus-visible:ring-0',
                open
                  ? 'bg-gray-100 border-gray-200'
                  : 'bg-gray-50 border-gray-100',
              )}
            >
              <PencilIcon height="1em" width="1em" className="m-auto" />
            </Popover.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-full min-w-[17.5rem] -translate-x-1/2 transform">
              <div className="rounded-lg shadow-lg ring-1 bg-white p-4 ring-black/5 space-y-3">
                <div>
                  <TooltipLabel label="Horizontal Offset:" />
                  <div className="flex justify-between items-center flex-wrap">
                    <Range
                      name="horizontalOffset"
                      min="-50"
                      max="50"
                      value={shadowValues?.horizontalOffset}
                      onChange={handleInputChange}
                      className="shrink-0 w-3/4 pr-1 [&>label]:hidden"
                    />
                    <Input
                      name="horizontalOffset"
                      type="number"
                      placeholder="Value"
                      value={shadowValues?.horizontalOffset}
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
                  <TooltipLabel label="Vertical Offset:" />
                  <div className="flex justify-between items-center flex-wrap">
                    <Range
                      name="verticalOffset"
                      min="-50"
                      max="50"
                      value={shadowValues?.verticalOffset}
                      onChange={handleInputChange}
                      className="shrink-0 w-3/4 pr-1 [&>label]:hidden"
                    />
                    <Input
                      name="verticalOffset"
                      type="number"
                      placeholder="Value"
                      value={shadowValues?.verticalOffset}
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
                  <TooltipLabel label="Blur Radius:" />
                  <div className="flex justify-between items-center flex-wrap">
                    <Range
                      name="blurRadius"
                      min="0"
                      max="100"
                      value={shadowValues?.blurRadius}
                      onChange={handleInputChange}
                      label="Blur Radius:"
                      className="shrink-0 w-3/4 pr-1 [&>label]:hidden"
                    />
                    <Input
                      name="blurRadius"
                      type="number"
                      placeholder="Value"
                      value={shadowValues?.blurRadius}
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
                  <TooltipLabel label="Spread Radius:" />
                  <div className="flex justify-between items-center flex-wrap">
                    <Range
                      name="spreadRadius"
                      min="-50"
                      max="50"
                      value={shadowValues?.spreadRadius}
                      onChange={handleInputChange}
                      label="Spread Radius:"
                      className="shrink-0 w-3/4 pr-1 [&>label]:hidden"
                    />
                    <Input
                      name="spreadRadius"
                      type="number"
                      placeholder="Value"
                      value={shadowValues?.spreadRadius}
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
                  <TooltipLabel label="Shadow Opacity:" />
                  <div className="flex justify-between items-center flex-wrap">
                    <Range
                      name="shadowOpacity"
                      min="0"
                      max="1"
                      step="0.01"
                      value={shadowValues?.shadowOpacity}
                      onChange={handleInputChange}
                      className="shrink-0 w-3/4 pr-1 [&>label]:hidden"
                    />
                    <Input
                      name="shadowOpacity"
                      type="number"
                      placeholder="Value"
                      value={shadowValues?.shadowOpacity}
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
                  <CustomColorPicker
                    color={shadowValues?.shadowColor}
                    label="Color:"
                    onChange={(color) =>
                      handleColorInputChange('shadowColor', color)
                    }
                  />
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

export default BoxShadowGenerator;
