import BackgroundGenerator from '@/components/builder/control/background';
import BordersGenerator from '@/components/builder/control/borders';
import CustomColorPicker from '@/components/builder/control/color-picker';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import SelectControl from '@/components/builder/control/select';
import BoxShadowGenerator from '@/components/builder/control/shadow';
import SlideControl from '@/components/builder/control/slider';
import { checkIfValidJson } from '@/components/builder/utils/helper';
import { CardProps } from '@/components/builder/utils/types';
import { cn } from '@/lib/cn';
import { ComponentConfig } from '@measured/puck';
import { isString } from 'lodash';

export const Card: ComponentConfig<CardProps> = {
  label: 'Card',
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
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
    corner: {
      label: 'Corner',
      type: 'custom',
      render: ({ field, onChange, value }) => (
        <CustomColorPicker
          color={value}
          onChange={(color) => onChange(color)}
          label={field?.label}
        />
      ),
    },
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
    shadow: {
      type: 'object',
      label: 'Shadow',
      objectFields: {
        normal: {
          type: 'custom',
          label: 'Normal',
          render: ({ onChange, value, field }) => (
            <BoxShadowGenerator
              onChange={onChange}
              value={value}
              label={field?.label ?? ''}
            />
          ),
        },
        hover: {
          type: 'custom',
          label: 'Hover',
          render: ({ onChange, value, field }) => (
            <BoxShadowGenerator
              onChange={onChange}
              value={value}
              label={field?.label ?? ''}
            />
          ),
        },
      },
    },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: ({ onChange, value, field }) => {
        return (
          <DimensionsGenerator
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
    border: {
      type: 'object',
      label: 'Border',
      objectFields: {
        width: {
          type: 'custom',
          label: 'Width',
          render: ({ onChange, value, field }) => {
            return (
              <BordersGenerator
                onChange={onChange}
                value={value}
                label={field?.label ?? ''}
              />
            );
          },
        },
        style: {
          type: 'custom',
          label: 'Style',
          render: ({ field, onChange, value }) => {
            return (
              <SelectControl
                onChange={onChange}
                value={value}
                label={field?.label ?? ''}
                items={[
                  {
                    label: 'None',
                    value: 'none',
                  },
                  {
                    label: 'Solid',
                    value: 'solid',
                  },
                  {
                    label: 'Double',
                    value: 'double',
                  },
                  {
                    label: 'Dotted',
                    value: 'dotted',
                  },
                  {
                    label: 'Dashed',
                    value: 'dashed',
                  },
                  {
                    label: 'Groove',
                    value: 'groove',
                  },
                ]}
              />
            );
          },
        },
        color: {
          label: 'Light',
          type: 'custom',
          render: ({ field, onChange, value }) => (
            <CustomColorPicker
              color={value}
              onChange={(color) => onChange(color)}
              label={field?.label}
            />
          ),
        },
      },
    },
  },
  defaultProps: {
    widgetTitle: 'Card',
    padding:
      '{"desktop":{"top":"2","right":"2","bottom":"2","left":"2","unit":"rem"},"tablet":{"top":"1.7","right":"1.7","bottom":"1.7","left":"1.7","unit":"rem"},"mobile":{"top":"1.2","right":"1.2","bottom":"1.2","left":"1.1","unit":"rem"}}',
    radius:
      '{"desktop":{"value":0.6,"unit":"rem"},"tablet":{"value":0.6,"unit":"rem"},"mobile":{"value":0.6,"unit":"rem"}}',
    background: '{"backgroundType":"color","color":"rgba(255, 255, 255, 1)"}',
    shadow: {
      normal: '0 0 #0000',
      hover: '0 16px 32px 0px rgba(30, 25, 29, 0.1)',
    },
    corner: 'rgba(53, 196, 215, 1)',
    border: {
      width:
        '{"desktop":{"top":"0","right":"0","bottom":"0","left":"0","unit":"px"},"tablet":{"top":"0","right":"0","bottom":"0","left":"0","unit":"px"},"mobile":{"top":"0","right":"0","bottom":"0","left":"0","unit":"px"}}',
      style: '{"desktop":"none","mobile":"none","tablet":"none"}',
      color: 'rgba(25, 27, 30, 1)',
    },
  },
  render: ({
    shadow,
    background,
    padding,
    radius,
    corner,
    border,
    puck: { renderDropZone },
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

    const radiusControl = radius
      ? isString(radius) && checkIfValidJson(radius)
        ? JSON.parse(radius)
        : radius
      : '';

    const borderControl = border
      ? isString(border) && checkIfValidJson(border)
        ? JSON.parse(border)
        : border
      : '';

    const borderStyle = borderControl?.style
      ? isString(borderControl?.style) && checkIfValidJson(borderControl?.style)
        ? JSON.parse(borderControl?.style)
        : borderControl?.style
      : '';

    const borderWidth = borderControl?.width
      ? isString(borderControl?.width) && checkIfValidJson(borderControl?.width)
        ? JSON.parse(borderControl?.width)
        : borderControl?.width
      : '';

    const containerStyleProperties = {
      '--card-shadow-normal': shadow?.normal,
      '--card-shadow-hover': shadow?.hover,

      '--radius-desktop': `${radiusControl?.desktop?.value}${radiusControl?.desktop?.unit}`,
      '--radius-tablet': `${radiusControl?.tablet?.value}${radiusControl?.tablet?.unit}`,
      '--radius-mobile': `${radiusControl?.mobile?.value}${radiusControl?.mobile?.unit}`,

      '--desktop-space-left': `${paddingControl?.desktop?.left}${paddingControl?.desktop?.unit}`,
      '--desktop-space-bottom': `${paddingControl?.desktop?.bottom}${paddingControl?.desktop?.unit}`,
      '--desktop-space-top': `${paddingControl?.desktop?.top}${paddingControl?.desktop?.unit}`,
      '--desktop-space-right': `${paddingControl?.desktop?.right}${paddingControl?.desktop?.unit}`,

      '--tablet-space-left': `${paddingControl?.tablet?.left}${paddingControl?.tablet?.unit}`,
      '--tablet-space-bottom': `${paddingControl?.tablet?.bottom}${paddingControl?.tablet?.unit}`,
      '--tablet-space-top': `${paddingControl?.tablet?.top}${paddingControl?.tablet?.unit}`,
      '--tablet-space-right': `${paddingControl?.tablet?.right}${paddingControl?.tablet?.unit}`,

      '--mobile-space-left': `${paddingControl?.mobile?.left}${paddingControl?.mobile?.unit}`,
      '--mobile-space-bottom': `${paddingControl?.mobile?.bottom}${paddingControl?.mobile?.unit}`,
      '--mobile-space-top': `${paddingControl?.mobile?.top}${paddingControl?.mobile?.unit}`,
      '--mobile-space-right': `${paddingControl?.mobile?.right}${paddingControl?.mobile?.unit}`,

      '--item-background-color':
        backgroundControl?.color ?? 'rgba(255, 255, 255, 1)',

      // '--item-background-image': `linear-gradient(${backgroundControl?.gradient?.angle}deg, ${backgroundControl?.gradient?.color1} ${backgroundControl?.gradient?.locations[0]}%, ${backgroundControl?.gradient?.color2} ${backgroundControl?.gradient?.locations[1]}%)`,
      '--item-background-image': `linear-gradient(${
        backgroundControl?.gradient?.angle ?? 0
      }deg, ${
        backgroundControl?.gradient?.color1 ?? 'rgba(255, 255, 255, 0)'
      } ${backgroundControl?.gradient?.locations[0] ?? 0}%, ${
        backgroundControl?.gradient?.color2 ?? 'rgba(255, 255, 255, 0)'
      } ${backgroundControl?.gradient?.locations[1] ?? 100}%)`,
      '--item-corner-color': corner ?? '#dc2626',

      '--border-style-desktop': borderStyle?.desktop ?? 'none',
      '--border-style-tablet': borderStyle?.tablet ?? 'none',
      '--border-style-mobile': borderStyle?.mobile ?? 'none',

      '--item-border-color': borderControl?.color ?? 'rgba(25, 27, 30, 1)',

      '--desktop-border-left': `${borderWidth?.desktop?.left}${borderWidth?.desktop?.unit}`,
      '--desktop-border-bottom': `${borderWidth?.desktop?.bottom}${borderWidth?.desktop?.unit}`,
      '--desktop-border-top': `${borderWidth?.desktop?.top}${borderWidth?.desktop?.unit}`,
      '--desktop-border-right': `${borderWidth?.desktop?.right}${borderWidth?.desktop?.unit}`,

      '--tablet-border-left': `${borderWidth?.tablet?.left}${borderWidth?.tablet?.unit}`,
      '--tablet-border-bottom': `${borderWidth?.tablet?.bottom}${borderWidth?.tablet?.unit}`,
      '--tablet-border-top': `${borderWidth?.tablet?.top}${borderWidth?.tablet?.unit}`,
      '--tablet-border-right': `${borderWidth?.tablet?.right}${borderWidth?.tablet?.unit}`,

      '--mobile-border-left': `${borderWidth?.mobile?.left}${borderWidth?.mobile?.unit}`,
      '--mobile-border-bottom': `${borderWidth?.mobile?.bottom}${borderWidth?.mobile?.unit}`,
      '--mobile-border-top': `${borderWidth?.mobile?.top}${borderWidth?.mobile?.unit}`,
      '--mobile-border-right': `${borderWidth?.mobile?.right}${borderWidth?.mobile?.unit}`,
    } as React.CSSProperties;
    return (
      <div
        className={cn(
          'group relative overflow-hidden transition-shadow duration-300 before:absolute before:left-0 before:top-0 before:h-16 before:w-16 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full item-before card-box-shadow item-background item-padding item-radius item-border',
        )}
        style={{ ...containerStyleProperties }}
      >
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
        {renderDropZone({
          zone: 'card',
          allow: [
            'Icon',
            'Thumbnail',
            'VerticalSpace',
            'Text',
            'Heading',
            'ButtonGroup',
            'Grid',
            'TextEditor',
          ],
        })}
      </div>
    );
  },
};
