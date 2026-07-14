import { type ComponentConfig } from '@measured/puck';
import React from 'react';
import { parseControl } from '@/components/builder/utils/helper';
import { type HeightControl } from '@/components/builder/utils/types';

export type VerticalSpaceProps = {
  size: string;
};

export const VerticalSpace: ComponentConfig<VerticalSpaceProps> = {
  render: ({ size }) => {
    const heightControl = parseControl<HeightControl>(size, {});
    const styleProperties = {
      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,
    } as React.CSSProperties;
    return <div className="item-minHeight" style={{ ...styleProperties }} />;
  },
};
