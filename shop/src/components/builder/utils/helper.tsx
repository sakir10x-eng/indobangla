import { isString } from 'lodash';
import { ChangeEvent } from 'react';

export const hexToRgb = (hex: string) => {
  hex = hex?.replace(/^#/, '');
  const r = parseInt(hex?.substring(0, 2), 16);
  const g = parseInt(hex?.substring(2, 4), 16);
  const b = parseInt(hex?.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
};

export const checkIfValidJson = (json: string) => {
  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    return false;
  }
};

export function parseControl<T>(
  value: string | T | undefined,
  defaultValue: T,
): T {
  if (value) {
    if (isString(value) && checkIfValidJson(value)) {
      return JSON.parse(value) as T; // Safely parse and cast to the expected type
    }
    return value as T; // Return the value casted to T, if it's already of type T
  }
  return defaultValue; // Return the default value if no value is provided
}

interface HandleColorInputOnChangeProps {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const handleColorInputOnChange = ({
  name,
  value,
  onChange,
}: HandleColorInputOnChangeProps) => {
  const event = {
    target: {
      name,
      value,
    },
  } as ChangeEvent<HTMLInputElement>;

  onChange(event);
};
