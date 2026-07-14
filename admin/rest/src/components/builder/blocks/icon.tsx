import BackgroundGenerator from '@/components/builder/control/background';
import AlignmentGenerator from '@/components/builder/control/choose';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import IconSelector from '@/components/builder/control/icons';
import SlideControl from '@/components/builder/control/slider';
import { checkIfValidJson, hexToRgb } from '@/components/builder/utils/helper';
import IconRender from '@/components/builder/utils/icon-render';
import CustomColorPicker from '@/components/builder/control/color-picker';
import ErrorMessage from '@/components/ui/error-message';
import { ComponentConfig, FieldLabel } from '@measured/puck';
import { isString } from 'lodash';
import { icons } from 'lucide-react';
import React from 'react';

export type IconBlockProps = {
  widgetTitle: string;
  icon: string;
  size: string;
  // height: string;
  // width: string;
  color: string;
  background: string;
  padding: string;
  radius: string;
  align: string;
};

export const IconBlocks: ComponentConfig<IconBlockProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    icon: {
      type: 'custom',
      label: 'Icon',
      render: ({ field, onChange, value }) => {
        return (
          <IconSelector
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
          />
        );
      },
    },
    color: {
      label: 'Color',
      type: 'custom',
      render: ({ field, onChange, value }) => (
        <CustomColorPicker
          color={value}
          onChange={(color) => onChange(color)}
          label={field?.label}
        />
      ),
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
                max: 200,
                step: 1,
              },
              rem: {
                min: 0,
                max: 20,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 20,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
    // height: {
    //   type: 'custom',
    //   label: 'Height',
    //   render: ({ field, onChange, value }) => {
    //     return (
    //       <SlideControl
    //         onChange={onChange}
    //         value={value}
    //         label={field?.label ?? ''}
    //       />
    //     );
    //   },
    // },
    // width: {
    //   type: 'custom',
    //   label: 'Width',
    //   render: ({ field, onChange, value }) => {
    //     return (
    //       <SlideControl
    //         onChange={onChange}
    //         value={value}
    //         label={field?.label ?? ''}
    //       />
    //     );
    //   },
    // },
    radius: {
      type: 'custom',
      label: 'Radius',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
          />
        );
      },
    },
    background: {
      type: 'custom',
      label: 'Background',
      render: ({ onChange, value, field }) => (
        <BackgroundGenerator
          onChange={onChange}
          value={value}
          label={field?.label ?? ''}
        />
      ),
    },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: ({ onChange, value, field }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 200,
                step: 1,
              },
              rem: {
                min: 0,
                max: 20,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 20,
                step: 0.1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
    align: {
      type: 'custom',
      label: 'Align',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
          />
        );
      },
    },
  },
  defaultProps: {
    widgetTitle: 'Icon',
    icon: 'Star',
    size: '{"desktop":{"value":4,"unit":"rem"},"tablet":{"value":3,"unit":"rem"},"mobile":{"value":2,"unit":"rem"}}',
    color: 'rgba(25, 27, 30, 1)',
    background: '{"backgroundType":"color","color":"rgba(255, 255, 255, 0)"}',
    padding:
      '{"desktop":{"value":0,"unit":"px"},"tablet":{"value":0,"unit":"px"},"mobile":{"value":0,"unit":"px"}}',
    radius:
      '{"desktop":{"value":0,"unit":"px"},"tablet":{"value":0,"unit":"px"},"mobile":{"value":0,"unit":"px"}}',
    align: '{"desktop":"center","tablet":"center","mobile":"center"}',
    // height:
    //   '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
    // width:
    //   '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
  },
  render: ({
    icon,
    size,
    color,
    background,
    padding,
    radius,
    align,
    // height,
    // width,
  }) => {
    const backgroundControl = background
      ? isString(background) && checkIfValidJson(background)
        ? JSON.parse(background)
        : background
      : '';

    const paddingControl = padding
      ? isString(padding) && checkIfValidJson(padding)
        ? JSON.parse(padding)
        : padding
      : '';

    const sizeControl = size
      ? isString(size) && checkIfValidJson(size)
        ? JSON.parse(size)
        : size
      : '';

    const radiusControl = radius
      ? isString(radius) && checkIfValidJson(radius)
        ? JSON.parse(radius)
        : radius
      : '';

    const alignControl = align
      ? isString(align) && checkIfValidJson(align)
        ? JSON.parse(align)
        : align
      : '';

    // const heightControl = height
    //   ? isString(height) && checkIfValidJson(height)
    //     ? JSON.parse(height)
    //     : height
    //   : '';

    // const widthControl = width
    //   ? isString(width) && checkIfValidJson(width)
    //     ? JSON.parse(width)
    //     : width
    //   : '';

    if (!icon) {
      return (
        <ErrorMessage
          className="max-w-full min-w-full mt-0"
          message="Please Select Icon First"
        />
      );
    }

    const styleProperties = {
      '--size-desktop': `${sizeControl?.desktop?.value}${sizeControl?.desktop?.unit}`,
      '--size-tablet': `${sizeControl?.tablet?.value}${sizeControl?.tablet?.unit}`,
      '--size-mobile': `${sizeControl?.mobile?.value}${sizeControl?.mobile?.unit}`,

      '--padding-desktop': `${paddingControl?.desktop?.value}${paddingControl?.desktop?.unit}`,
      '--padding-tablet': `${paddingControl?.tablet?.value}${paddingControl?.tablet?.unit}`,
      '--padding-mobile': `${paddingControl?.mobile?.value}${paddingControl?.mobile?.unit}`,

      // '--height-desktop':
      //   `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}` ??
      //   '100%',
      // '--height-tablet':
      //   `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}` ??
      //   '100%',
      // '--height-mobile':
      //   `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}` ??
      //   '100%',

      // '--width-desktop':
      //   `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}` ??
      //   '100%',
      // '--width-tablet':
      //   `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}` ?? '100%',
      // '--width-mobile':
      //   `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}` ?? '100%',

      '--radius-desktop': `${radiusControl?.desktop?.value}${radiusControl?.desktop?.unit}`,
      '--radius-tablet': `${radiusControl?.tablet?.value}${radiusControl?.tablet?.unit}`,
      '--radius-mobile': `${radiusControl?.mobile?.value}${radiusControl?.mobile?.unit}`,

      '--color-text': color ?? 'rgba(25, 27, 30, 1)',
      // '--desktop-space-left':
      //   `${paddingControl?.desktop?.left}${paddingControl?.desktop?.unit}` ??
      //   '0px',
      // '--desktop-space-bottom':
      //   `${paddingControl?.desktop?.bottom}${paddingControl?.desktop?.unit}` ??
      //   '0px',
      // '--desktop-space-top':
      //   `${paddingControl?.desktop?.top}${paddingControl?.desktop?.unit}` ??
      //   '0px',
      // '--desktop-space-right':
      //   `${paddingControl?.desktop?.right}${paddingControl?.desktop?.unit}` ??
      //   '0px',

      // '--tablet-space-left':
      //   `${paddingControl?.tablet?.left}${paddingControl?.tablet?.unit}` ??
      //   '0px',
      // '--tablet-space-bottom':
      //   `${paddingControl?.tablet?.bottom}${paddingControl?.tablet?.unit}` ??
      //   '0px',
      // '--tablet-space-top':
      //   `${paddingControl?.tablet?.top}${paddingControl?.tablet?.unit}` ??
      //   '0px',
      // '--tablet-space-right':
      //   `${paddingControl?.tablet?.right}${paddingControl?.tablet?.unit}` ??
      //   '0px',

      // '--mobile-space-left':
      //   `${paddingControl?.mobile?.left}${paddingControl?.mobile?.unit}` ??
      //   '0px',
      // '--mobile-space-bottom':
      //   `${paddingControl?.mobile?.bottom}${paddingControl?.mobile?.unit}` ??
      //   '0px',
      // '--mobile-space-top':
      //   `${paddingControl?.mobile?.top}${paddingControl?.mobile?.unit}` ??
      //   '0px',
      // '--mobile-space-right':
      //   `${paddingControl?.mobile?.right}${paddingControl?.mobile?.unit}` ??
      //   '0px',
      '--item-background-color':
        backgroundControl?.color ?? 'rgba(255, 255, 255, 0)',

      '--item-background-image': `linear-gradient(${
        backgroundControl?.gradient?.angle ?? 0
      }deg, ${backgroundControl?.gradient?.color1 ?? 'rgba(255,255,255,0)'} ${
        backgroundControl?.gradient?.locations[0] ?? 0
      }%, ${backgroundControl?.gradient?.color2 ?? 'rgba(255,255,255,0)'} ${
        backgroundControl?.gradient?.locations[1] ?? 100
      }%)`,
      '--align-desktop': alignControl?.desktop ?? 'left',
      '--align-tablet': alignControl?.tablet ?? 'left',
      '--align-mobile': alignControl?.mobile ?? 'left',
    } as React.CSSProperties;
    return (
      <div style={{ ...styleProperties }} className="item-align">
        <span className="relative inline-flex overflow-hidden item-size item-text-color item-background item-ratio-padding item-radius">
          {backgroundControl?.backgroundType === 'image' ? (
            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                backgroundImage: `url(${backgroundControl?.image?.original})`,
                backgroundPosition: backgroundControl?.backgroundPosition,
                backgroundRepeat: backgroundControl?.backgroundRepeat,
                backgroundSize: backgroundControl?.backgroundSize,
              }}
            />
          ) : (
            ''
          )}
          <IconRender
            className="relative z-10 text-current"
            name={icon as keyof typeof icons}
          />
        </span>
      </div>
    );
  },
};
