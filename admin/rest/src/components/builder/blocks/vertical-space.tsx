import { ComponentConfig } from '@measured/puck';
import React from 'react';
import SlideControl from '@/components/builder/control/slider';
import { isString } from 'lodash';
import { checkIfValidJson } from '@/components/builder/utils/helper';

export type VerticalSpaceProps = {
  size: string;
  widgetTitle: string;
};

export const VerticalSpace: ComponentConfig<VerticalSpaceProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    size: {
      type: 'custom',
      label: 'Size',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 300,
                step: 1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 1,
              },
              rem: {
                min: 0,
                max: 10,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 10,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
  },
  defaultProps: {
    size: '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":12,"unit":"px"},"mobile":{"value":8,"unit":"px"}}',
    widgetTitle: 'Vertical Space',
  },
  render: ({ size }) => {
    const heightControl = size
      ? isString(size) && checkIfValidJson(size)
        ? JSON.parse(size)
        : size
      : '';

    const styleProperties = {
      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,
    } as React.CSSProperties;
    return <div className="item-minHeight" style={{ ...styleProperties }} />;
  },
};
