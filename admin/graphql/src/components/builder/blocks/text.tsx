import { ComponentConfig, FieldLabel } from '@measured/puck';
import React from 'react';
import { cn } from '@/lib/utils';
import SlideControl from '@/components/builder/control/slider';
import { isString } from 'lodash';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import AlignmentGenerator from '@/components/builder/control/choose';
import CustomColorPicker from '@/components/builder/control/color-picker';
import { checkIfValidJson } from '@/components/builder/utils/helper';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from 'lucide-react';

export type TextProps = {
  align: string;
  text?: string;
  objectAlignment: string;
  padding: string;
  color: string;
  size: string;
  lineHeight: string;
  maxWidth: string;
  widgetTitle: string;
  fontWeight: string;
};

const fontWeightOptions = [
  { label: 'Thin', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
];

export const Text: ComponentConfig<TextProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    text: { type: 'textarea', label: 'Text' },
    size: {
      type: 'custom',
      label: 'Font Size',
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
    lineHeight: {
      label: 'Line Height',
      type: 'custom',
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
    fontWeight: {
      label: 'Font Weight',
      type: 'select',
      options: fontWeightOptions,
    },
    maxWidth: {
      label: 'Max Width',
      type: 'custom',
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
            }}
          />
        );
      },
    },
    objectAlignment: {
      type: 'custom',
      label: 'Object Alignment',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            chooses={[
              {
                key: '0 auto 0 0',
                title: 'Left',
                value: <AlignLeftIcon />,
              },
              {
                key: '0 auto',
                title: 'Center',
                value: <AlignCenterIcon />,
              },
              {
                key: '0 0 0 auto',
                title: 'Right',
                value: <AlignRightIcon />,
              },
            ]}
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
    align: '{"desktop":"left","tablet":"left","mobile":"left"}',
    text: 'Text',
    objectAlignment:
      '{"desktop":"0 auto 0 0","tablet":"0 auto 0 0","mobile":"0 auto 0 0"}',
    padding:
      '{"desktop": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"tablet": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"mobile": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"}}',
    size: '{"desktop":{"value":16,"unit":"px"},"tablet":{"value":14,"unit":"px"},"mobile":{"value":14,"unit":"px"}}',
    lineHeight:
      '{"desktop":{"value":1,"unit":"em"},"tablet":{"value":1,"unit":"em"},"mobile":{"value":1,"unit":"em"}}',
    fontWeight: '400',
    maxWidth:
      '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
    color: '#191b1e',
    widgetTitle: 'Text',
  },
  render: ({
    align,
    objectAlignment,
    text,
    size,
    lineHeight,
    color,
    padding,
    maxWidth,
    fontWeight,
  }) => {
    const sizeControl = size
      ? isString(size) && checkIfValidJson(size)
        ? JSON.parse(size)
        : size
      : '';
    const lineHeightControl = lineHeight
      ? isString(lineHeight) && checkIfValidJson(lineHeight)
        ? JSON.parse(lineHeight)
        : lineHeight
      : '';
    const paddingControl = padding
      ? isString(padding) && checkIfValidJson(padding)
        ? JSON.parse(padding)
        : padding
      : '';
    const alignControl = align
      ? isString(align) && checkIfValidJson(align)
        ? JSON.parse(align)
        : align
      : '';
    const maxWidthControl = maxWidth
      ? isString(maxWidth) && checkIfValidJson(maxWidth)
        ? JSON.parse(maxWidth)
        : maxWidth
      : '';

    const objectAlignControl = objectAlignment
      ? isString(objectAlignment) && checkIfValidJson(objectAlignment)
        ? JSON.parse(objectAlignment)
        : objectAlignment
      : '';

    const styleProperties = {
      '--size-desktop': `${sizeControl?.desktop?.value}${sizeControl?.desktop?.unit}`,
      '--size-tablet': `${sizeControl?.tablet?.value}${sizeControl?.tablet?.unit}`,
      '--size-mobile': `${sizeControl?.mobile?.value}${sizeControl?.mobile?.unit}`,

      '--leading-desktop': `${lineHeightControl?.desktop?.value}${lineHeightControl?.desktop?.unit}`,
      '--leading-tablet': `${lineHeightControl?.tablet?.value}${lineHeightControl?.tablet?.unit}`,
      '--leading-mobile': `${lineHeightControl?.mobile?.value}${lineHeightControl?.mobile?.unit}`,

      '--max-width-desktop': `${maxWidthControl?.desktop?.value}${maxWidthControl?.desktop?.unit}`,
      '--max-width-tablet': `${maxWidthControl?.tablet?.value}${maxWidthControl?.tablet?.unit}`,
      '--max-width-mobile': `${maxWidthControl?.mobile?.value}${maxWidthControl?.mobile?.unit}`,

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

      '--align-desktop': alignControl?.desktop ?? 'left',
      '--align-tablet': alignControl?.tablet ?? 'left',
      '--align-mobile': alignControl?.mobile ?? 'left',

      '--font-weight': fontWeight ?? '400',

      '--color-text': color ?? 'rgba(25, 27, 30, 1)',

      '--object-align-desktop': objectAlignControl?.desktop ?? '',
      '--object-align-tablet': objectAlignControl?.tablet ?? '',
      '--object-align-mobile': objectAlignControl?.mobile ?? '',
    } as React.CSSProperties;
    return (
      <p
        className={cn(
          'item-size item-padding item-align item-object-alignment item-text-color item-fontWeight item-max-width item-lineHeight',
          objectAlignment,
        )}
        style={{ ...styleProperties }}
      >
        {text}
      </p>
    );
  },
};
