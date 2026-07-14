import { cn } from '@/lib/utils';
import { ComponentConfig } from '@measured/puck';
import React, { ReactNode } from 'react';
import AlignmentGenerator from '@/components/builder/control/choose';
import CustomColorPicker from '@/components/builder/control/color-picker';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import SlideControl from '@/components/builder/control/slider';
import { checkIfValidJson } from '@/components/builder/utils/helper';
import { isString } from 'lodash';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from 'lucide-react';

type _HeadingProps = {
  children: ReactNode;
  rank?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
  style: React.CSSProperties;
};

export type HeadingProps = {
  align: string;
  objectAlignment: string;
  text?: string;
  level?: _HeadingProps['rank'];
  padding: string;
  size: string;
  lineHeight: string;
  color: string;
  maxWidth: string;
  widgetTitle: string;
  fontWeight: string;
};

const levelOptions = [
  { label: 'h1', value: 'h1' },
  { label: 'h2', value: 'h2' },
  { label: 'h3', value: 'h3' },
  { label: 'h4', value: 'h4' },
  { label: 'h5', value: 'h5' },
  { label: 'h6', value: 'h6' },
];

const fontWeightOptions = [
  { label: 'Thin', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
];

export const HeadingTag = ({
  children,
  rank,
  className,
  style,
}: _HeadingProps) => {
  const Tag = rank ? (`${rank}` as keyof JSX.IntrinsicElements) : 'span';

  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
};

export const Heading: ComponentConfig<HeadingProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    text: { type: 'text', label: 'Heading' },
    size: {
      type: 'custom',
      label: 'Size',
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
    lineHeight: {
      label: 'Line Height',
      type: 'custom',
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
    level: {
      type: 'select',
      options: levelOptions,
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
    objectAlignment:
      '{"desktop":"0 auto 0 0","tablet":"0 auto 0 0","mobile":"0 auto 0 0"}',
    text: 'Heading',
    level: 'h1',
    padding:
      '{"desktop": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"tablet": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"mobile": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"}}',
    size: '{"desktop":{"value":24,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":16,"unit":"px"}}',
    fontWeight: '400',
    lineHeight:
      '{"desktop":{"value":1,"unit":"em"},"tablet":{"value":1,"unit":"em"},"mobile":{"value":1,"unit":"em"}}',
    maxWidth:
      '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
    color: '#191b1e',
    widgetTitle: 'Heading',
  },
  render: ({
    align,
    objectAlignment,
    text,
    padding,
    level,
    size,
    lineHeight,
    maxWidth,
    color,
    fontWeight,
    // border,
  }) => {
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

    const lineHeightControl = lineHeight
      ? isString(lineHeight) && checkIfValidJson(lineHeight)
        ? JSON.parse(lineHeight)
        : lineHeight
      : '';

    const maxWidthControl = maxWidth
      ? isString(maxWidth) && checkIfValidJson(maxWidth)
        ? JSON.parse(maxWidth)
        : maxWidth
      : '';

    const alignControl = align
      ? isString(align) && checkIfValidJson(align)
        ? JSON.parse(align)
        : align
      : '';

    const objectAlignControl = objectAlignment
      ? isString(objectAlignment) && checkIfValidJson(objectAlignment)
        ? JSON.parse(objectAlignment)
        : objectAlignment
      : '';

    const styleProperties = {
      '--leading-desktop': `${lineHeightControl?.desktop?.value}${lineHeightControl?.desktop?.unit}`,
      '--leading-tablet': `${lineHeightControl?.tablet?.value}${lineHeightControl?.tablet?.unit}`,
      '--leading-mobile': `${lineHeightControl?.mobile?.value}${lineHeightControl?.mobile?.unit}`,

      '--size-desktop': `${sizeControl?.desktop?.value}${sizeControl?.desktop?.unit}`,
      '--size-tablet': `${sizeControl?.tablet?.value}${sizeControl?.tablet?.unit}`,
      '--size-mobile': `${sizeControl?.mobile?.value}${sizeControl?.mobile?.unit}`,

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

      '--max-width-desktop': `${maxWidthControl?.desktop?.value}${maxWidthControl?.desktop?.unit}`,
      '--max-width-tablet': `${maxWidthControl?.tablet?.value}${maxWidthControl?.tablet?.unit}`,
      '--max-width-mobile': `${maxWidthControl?.mobile?.value}${maxWidthControl?.mobile?.unit}`,

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
      <HeadingTag
        style={{ ...styleProperties }}
        className={cn(
          'item-object-alignment item-text-color relative item-size item-padding item-fontWeight item-align item-lineHeight item-max-width',
          align,
        )}
        rank={level as any}
      >
        <span
          className={cn(align)}
          style={{
            display: 'block',
            width: '100%',
          }}
        >
          {text}
        </span>
      </HeadingTag>
    );
  },
};
