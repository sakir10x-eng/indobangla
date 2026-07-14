import React from 'react';
import { ComponentConfig } from '@measured/puck';
import SlideControl from '@/components/builder/control/slider';
import { isString } from 'lodash';
import BackgroundGenerator from '@/components/builder/control/background';
import { checkIfValidJson } from '@/components/builder/utils/helper';

export type SeparatorProps = {
  width: string;
  height: string;
  background: string;
  widgetTitle: string;
};

export const Separator: ComponentConfig<SeparatorProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    width: {
      type: 'custom',
      label: 'Width',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 1600,
                step: 1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 1,
              },
              vw: {
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
    height: {
      type: 'custom',
      label: 'Height',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 50,
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
    background: {
      type: 'custom',
      label: 'Background Color',
      render: ({ onChange, value, field }) => (
        <BackgroundGenerator
          onChange={onChange}
          value={value}
          label={field?.label ?? ''}
          isBgImage={false}
          isGradient={false}
        />
      ),
    },
  },
  defaultProps: {
    width:
      '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
    height:
      '{"desktop":{"value":10,"unit":"px"},"tablet":{"value":10,"unit":"px"},"mobile":{"value":10,"unit":"px"}}',
    background: '{"backgroundType":"color","color":"rgba(175, 175, 175, 1)"}',
    widgetTitle: 'Separator',
  },
  render: ({ width, height, background }) => {
    const widthControl = width
      ? isString(width) && checkIfValidJson(width)
        ? JSON.parse(width)
        : width
      : '';

    const heightControl = height
      ? isString(height) && checkIfValidJson(height)
        ? JSON.parse(height)
        : height
      : '';

    const backgroundControl = background
      ? isString(background) && checkIfValidJson(background)
        ? JSON.parse(background)
        : background
      : '';

    const styleProperties = {
      '--width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,

      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,
      '--item-background-color':
        backgroundControl?.color ?? 'rgba(175, 175, 175, 1)',
    } as React.CSSProperties;
    return (
      <div
        className={'block item-width item-minHeight item-background'}
        style={{ ...styleProperties }}
      />
    );
  },
};
