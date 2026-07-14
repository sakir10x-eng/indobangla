import { cn } from '@/lib/cn';
import { type ComponentConfig } from '@measured/puck';
import { type SizeControl } from '@/components/builder/utils/types';
import { parseControl } from '@/components/builder/utils/helper';

export type GridProps = {
  gridColumns: string;
  columnGap: string;
  rowGap: string;
  columns: {
    span: string;
  }[];
};

export const Grid: ComponentConfig<GridProps> = {
  render: ({
    puck: { renderDropZone },
    columns,
    gridColumns,
    columnGap,
    rowGap,
  }) => {
    const gridColumnControl = parseControl<SizeControl>(gridColumns, {});

    const columnGapControl = parseControl<SizeControl>(columnGap, {});

    const rowGapControl = parseControl<SizeControl>(rowGap, {});
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
        className="grid-columns grid-row-gap grid-column-gap grid"
        style={{ ...styleProperties }}
      >
        {columns?.map(({ span }, idx) => {
          const spanControl = parseControl<SizeControl>(span, {});
          const colStyleProperties = {
            '--grid-col-span-desktop': spanControl?.desktop?.value ?? 2,
            '--grid-col-span-tablet': spanControl?.tablet?.value ?? 2,
            '--grid-col-span-mobile': spanControl?.mobile?.value ?? 2,
          } as React.CSSProperties;
          return (
            <div
              key={idx}
              className={cn('item-col-span flex h-full flex-col')}
              style={{ ...colStyleProperties }}
            >
              {renderDropZone({
                zone: `column-${idx}`,
              })}
            </div>
          );
        })}
      </div>
    );
  },
};
