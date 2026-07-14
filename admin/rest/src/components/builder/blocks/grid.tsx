import React from 'react';
import { ComponentConfig, DropZone } from '@measured/puck';
import { cn } from '@/lib/utils';
import SlideControl from '@/components/builder/control/slider';
import { isString } from 'lodash';
import { checkIfValidJson } from '@/components/builder/utils/helper';

export type GridProps = {
  gridColumns: string;
  columnGap: string;
  rowGap: string;
  columns: {
    span: string;
  }[];
  widgetTitle: string;
};

export const Grid: ComponentConfig<GridProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    columns: {
      type: 'array',
      getItemSummary: (col, id = -1) => `Column ${id + 1}, span`,
      defaultItemProps: {
        span: '{"desktop":{"value":1,"unit":"px"},"tablet":{"value":1,"unit":"px"},"mobile":{"value":1,"unit":"px"}}',
      },
      arrayFields: {
        span: {
          label: 'Span (1-6)',
          type: 'custom',
          render: ({ field, onChange, value }) => {
            return (
              <SlideControl
                onChange={onChange}
                value={value}
                label={field?.label ?? ''}
                isShowUnit={false}
                unitRanges={{ px: { min: 1, max: 6, step: 1 } }}
              />
            );
          },
        },
      },
    },
    gridColumns: {
      label: 'Grid Columns',
      type: 'custom',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            isShowUnit={false}
            unitRanges={{ px: { min: 1, max: 6, step: 1 } }}
          />
        );
      },
    },
    columnGap: {
      type: 'custom',
      label: 'Colum Gap',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 100,
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
    rowGap: {
      type: 'custom',
      label: 'Row Gap',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 100,
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
  },
  defaultProps: {
    columns: [
      {
        span: '{"desktop":{"value":1,"unit":"px"},"tablet":{"value":1,"unit":"px"},"mobile":{"value":1,"unit":"px"}}',
      },
      {
        span: '{"desktop":{"value":1,"unit":"px"},"tablet":{"value":1,"unit":"px"},"mobile":{"value":1,"unit":"px"}}',
      },
    ],
    gridColumns:
      '{"desktop":{"value":2,"unit":"px"},"tablet":{"value":2,"unit":"px"},"mobile":{"value":2,"unit":"px"}}',
    columnGap:
      '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":20,"unit":"px"}}',
    rowGap:
      '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":20,"unit":"px"}}',
    widgetTitle: 'Grid',
  },
  render: ({ columns, gridColumns, columnGap, rowGap }) => {
    const gridColumnControl = gridColumns
      ? isString(gridColumns) && checkIfValidJson(gridColumns)
        ? JSON.parse(gridColumns)
        : gridColumns
      : '';

    const columnGapControl = columnGap
      ? isString(columnGap) && checkIfValidJson(columnGap)
        ? JSON.parse(columnGap)
        : columnGap
      : '';

    const rowGapControl = rowGap
      ? isString(rowGap) && checkIfValidJson(rowGap)
        ? JSON.parse(rowGap)
        : rowGap
      : '';

    const styleProperties = {
      '--grid-column-desktop': `${gridColumnControl?.desktop?.value}`,
      '--grid-column-tablet': `${gridColumnControl?.tablet?.value}`,
      '--grid-column-mobile': `${gridColumnControl?.mobile?.value}`,
      '--flex-column-gap-desktop': `${columnGapControl?.desktop?.value}${columnGapControl?.desktop?.unit}`,
      '--flex-column-gap-tablet': `${columnGapControl?.tablet?.value}${columnGapControl?.tablet?.unit}`,
      '--flex-column-gap-mobile': `${columnGapControl?.mobile?.value}${columnGapControl?.mobile?.unit}`,

      '--flex-row-gap-desktop': `${rowGapControl?.desktop?.value}${rowGapControl?.desktop?.unit}`,
      '--flex-row-gap-tablet': `${rowGapControl?.tablet?.value}${rowGapControl?.tablet?.unit}`,
      '--flex-row-gap-mobile': `${rowGapControl?.mobile?.value}${rowGapControl?.mobile?.unit}`,
    } as React.CSSProperties;
    return (
      <div
        className="grid grid-columns grid-row-gap grid-column-gap"
        style={{ ...styleProperties }}
      >
        {columns?.map(({ span }, idx) => {
          const spanControl = span
            ? isString(span) && checkIfValidJson(span)
              ? JSON.parse(span)
              : span
            : '';
          const colStyleProperties = {
            '--grid-col-span-desktop': spanControl?.desktop?.value ?? 2,
            '--grid-col-span-tablet': spanControl?.tablet?.value ?? 2,
            '--grid-col-span-mobile': spanControl?.mobile?.value ?? 2,
          } as React.CSSProperties;
          return (
            <div
              key={idx}
              className={cn('flex flex-col item-col-span')}
              style={{ ...colStyleProperties }}
            >
              <DropZone zone={`column-${idx}`} />
            </div>
          );
        })}
      </div>
    );
  },
};
