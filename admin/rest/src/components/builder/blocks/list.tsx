import { ComponentConfig } from '@measured/puck';
import React from 'react';
import { cn } from '@/lib/utils';
import {
  fontSizeOptions,
  lineHeightOptions,
  maxWidthOptions,
  objectAlignmentOptions,
  paddingBottomOptions,
  paddingLeftOptions,
  paddingRightOptions,
  paddingTopOptions,
} from '@/components/builder/blocks/options';
import CustomColorPicker from '../control/color-picker';

export type ListProps = {
  listOrder: 'unordered' | 'ordered';
  objectAlignment?: string;
  listItems: { label: string }[];
  padding?: {
    paddingLeft?: string;
    paddingRight?: string;
    paddingTop?: string;
    paddingBottom?: string;
  };
  color: string;
  size?: string;
  lineHeight?: string;
  maxWidth?: string;
  gap?: string;
  widgetTitle: string;
};

export const List: ComponentConfig<ListProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    listItems: {
      type: 'array',
      label: 'List Items',
      getItemSummary: (item) => item?.label || 'List Item',
      arrayFields: {
        label: { type: 'text', label: 'Label' },
      },
    },
    gap: {
      label: 'Gap Space',
      type: 'select',
      options: [
        { label: '4px', value: 'space-y-1' },
        { label: '6px', value: 'space-y-1.5' },
        { label: '8px', value: 'space-y-2' },
        { label: '12px', value: 'space-y-3' },
        { label: '16px', value: 'space-y-4' },
        { label: '4px : 6px', value: 'space-y-1 md:space-y-1.5' },
        { label: '4px : 8px', value: 'space-y-1 md:space-y-2' },
        {
          label: '2px : 4px : 6px',
          value: 'space-y-0.5 md:space-y-1 lg:space-y-2',
        },
        {
          label: '4px : 8px : 12px',
          value: 'space-y-1 md:space-y-2 lg:space-y-3',
        },
        {
          label: '8px : 12px : 16px',
          value: 'space-y-2 md:space-y-3 lg:space-y-4',
        },
      ],
    },
    size: {
      label: 'Font Size',
      type: 'select',
      options: fontSizeOptions,
    },
    lineHeight: {
      label: 'Line Height',
      type: 'select',
      options: lineHeightOptions,
    },
    listOrder: {
      type: 'radio',
      label: 'List Order',
      options: [
        { label: 'Unordered', value: 'unordered' },
        { label: 'Ordered', value: 'ordered' },
      ],
    },
    objectAlignment: {
      label: 'Object Alignment',
      type: 'select',
      options: objectAlignmentOptions,
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
      // render: ({ field, id, name, onChange, value }) => (
      //   <FieldLabel label={field?.label ?? ''}>
      //     <input
      //       id={id}
      //       name={name}
      //       type="color"
      //       onChange={(e) => onChange(e?.target?.value)}
      //       value={value}
      //     />
      //   </FieldLabel>
      // ),
    },
    maxWidth: {
      label: 'Max Width',
      type: 'select',
      options: maxWidthOptions,
    },
    padding: {
      type: 'object',
      label: 'Padding',
      objectFields: {
        paddingLeft: {
          label: 'Padding Left',
          type: 'select',
          options: paddingLeftOptions,
        },
        paddingRight: {
          label: 'Padding Right',
          type: 'select',
          options: paddingRightOptions,
        },
        paddingTop: {
          label: 'Padding Top',
          type: 'select',
          options: paddingTopOptions,
        },
        paddingBottom: {
          label: 'Padding Bottom',
          type: 'select',
          options: paddingBottomOptions,
        },
      },
    },
  },
  defaultProps: {
    listOrder: 'unordered',
    listItems: [
      {
        label: 'List item',
      },
    ],
    maxWidth: 'max-w-none',
    objectAlignment: '',
    gap: '',
    padding: {
      paddingLeft: '',
      paddingRight: '',
      paddingBottom: '',
      paddingTop: '',
    },
    size: 'text-base',
    lineHeight: '',
    color: '#191b1e',
    widgetTitle: 'Text',
  },
  render: ({
    listOrder,
    listItems,
    objectAlignment,
    size,
    gap,
    lineHeight,
    color,
    padding,
    maxWidth,
  }) => {
    const styleProperties = {
      '--color-text': color ?? 'rgba(25, 27, 30, 1)',
    } as React.CSSProperties;
    return listOrder === 'unordered' ? (
      <ul
        className={cn(
          'item-text-color list-disc list-inside',
          objectAlignment,
          gap,
          size,
          lineHeight,
          maxWidth,
          padding?.paddingLeft,
          padding?.paddingRight,
          padding?.paddingTop,
          padding?.paddingBottom,
        )}
        style={{ ...styleProperties }}
      >
        {listItems?.map((item, i) =>
          item?.label ? <li key={i}>{item?.label}</li> : '',
        )}
      </ul>
    ) : (
      <ol
        className={cn(
          'item-text-color list-decimal list-inside',
          objectAlignment,
          size,
          gap,
          lineHeight,
          maxWidth,
          padding?.paddingLeft,
          padding?.paddingRight,
          padding?.paddingTop,
          padding?.paddingBottom,
        )}
        style={{ ...styleProperties }}
      >
        {listItems?.map((item, i) =>
          item?.label ? <li key={i}>{item?.label}</li> : '',
        )}
      </ol>
    );
  },
};
