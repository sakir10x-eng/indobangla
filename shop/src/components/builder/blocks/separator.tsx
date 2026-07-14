import React from 'react';
import { type ComponentConfig } from '@measured/puck';
import {
  type BackgroundControl,
  type HeightControl,
  type WidthControl,
} from '@/components/builder/utils/types';
import { parseControl } from '@/components/builder/utils/helper';

export type SeparatorProps = {
  width: string;
  height: string;
  background: string;
};

export const Separator: ComponentConfig<SeparatorProps> = {
  render: ({ width, height, background }) => {
    const widthControl = parseControl<WidthControl>(width, {});
    const heightControl = parseControl<HeightControl>(height, {});
    const backgroundControl = parseControl<BackgroundControl>(background, {});
    const styleProperties = {
      '--width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,

      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,
      '--item-background-color':
        backgroundControl?.color ?? 'rgba(175, 175, 175, 0)',
    } as React.CSSProperties;
    return (
      <div
        className={'item-width item-minHeight item-background block'}
        style={{ ...styleProperties }}
      />
    );
  },
};
