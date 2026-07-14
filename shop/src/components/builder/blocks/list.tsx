import { type ComponentConfig } from '@measured/puck';
import React from 'react';
import { cn } from '@/lib/cn';
import { hexToRgb } from '../utils/helper';

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
      '--gray-1000': hexToRgb(color ?? '#191b1e'),
    } as React.CSSProperties;
    return listOrder === 'unordered' ? (
      <ul
        className={cn(
          'list-inside list-disc text-gray-1000',
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
          'list-inside list-decimal text-gray-1000',
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
