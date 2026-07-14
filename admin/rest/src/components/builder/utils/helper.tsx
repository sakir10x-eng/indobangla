import { ChangeEvent } from 'react';

export const hexToRgb = (hex: string) => {
  hex = hex?.replace(/^#/, '');
  let r = parseInt(hex?.substring(0, 2), 16);
  let g = parseInt(hex?.substring(2, 4), 16);
  let b = parseInt(hex?.substring(4, 6), 16);
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
