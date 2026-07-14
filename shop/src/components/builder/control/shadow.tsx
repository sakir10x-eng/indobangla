import CustomColorPicker from '@/components/builder/control/color-picker';
import { handleColorInputOnChange } from '@/components/builder/utils/helper';
import { PencilIcon } from '@/components/icons/pencil-icon';
import { cn } from '@/lib/cn';
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
        </>
      )}
    </Popover>
  );
}

export default BoxShadowGenerator;
