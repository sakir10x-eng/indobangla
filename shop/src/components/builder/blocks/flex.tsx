import { type ComponentConfig } from '@measured/puck';
import { parseControl } from '@/components/builder/utils/helper';
import {
  type SizeControl,
  type AlignControl,
  type BackgroundControl,
  type PaddingControl,
} from '@/components/builder/utils/types';

export type FlexProps = {
  widgetTitle: string;
  width: string;
  minHeight: string;
  direction: string;
  contentDirection: string;
  alignItems: string;
  columnGap: string;
  rowGap: string;
  radius: string;
  padding: string;
  background: string;
};

export const Flex: ComponentConfig<FlexProps> = {
  render: ({
    direction,
    width,
    minHeight,
    contentDirection,
    alignItems,
    columnGap,
    rowGap,
    radius,
    padding,
    background,
    puck: { renderDropZone },
  }) => {
    const directionControl = parseControl<AlignControl>(direction, {});
    const alignItemsControl = parseControl<AlignControl>(alignItems, {});
    const widthControl = parseControl<SizeControl>(width, {});
    const minHeightControl = parseControl<SizeControl>(minHeight, {});
    const contentDirectionControl = parseControl<AlignControl>(
      contentDirection,
      {},
    );
    const columnGapControl = parseControl<SizeControl>(columnGap, {});
    const rowGapControl = parseControl<SizeControl>(rowGap, {});
    const radiusControl = parseControl<SizeControl>(radius, {});
    const backgroundControl = parseControl<BackgroundControl>(background, {});
    const paddingControl = parseControl<PaddingControl>(padding, {});

    const styleProperties = {
      '--content-width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--content-width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--content-width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,

      '--content-min-height-desktop': `${minHeightControl?.desktop?.value}${minHeightControl?.desktop?.unit}`,
      '--content-min-height-tablet': `${minHeightControl?.tablet?.value}${minHeightControl?.tablet?.unit}`,
      '--content-min-height-mobile': `${minHeightControl?.mobile?.value}${minHeightControl?.mobile?.unit}`,

      '--flex-direction-desktop': directionControl?.desktop ?? 'column',
      '--flex-direction-tablet': directionControl?.tablet ?? 'column',
      '--flex-direction-mobile': directionControl?.mobile ?? 'column',

      '--flex-justify-content-desktop':
        contentDirectionControl?.desktop ?? 'initial',
      '--flex-justify-content-tablet':
        contentDirectionControl?.tablet ?? 'initial',
      '--flex-justify-content-mobile':
        contentDirectionControl?.mobile ?? 'initial',

      '--flex-align-items-desktop': alignItemsControl?.desktop ?? 'initial',
      '--flex-align-items-tablet': alignItemsControl?.tablet ?? 'initial',
      '--flex-align-items-mobile': alignItemsControl?.mobile ?? 'initial',

      '--flex-column-gap-desktop': `${columnGapControl?.desktop?.value}${columnGapControl?.desktop?.unit}`,
      '--flex-column-gap-tablet': `${columnGapControl?.tablet?.value}${columnGapControl?.tablet?.unit}`,
      '--flex-column-gap-mobile': `${columnGapControl?.mobile?.value}${columnGapControl?.mobile?.unit}`,

      '--flex-row-gap-desktop': `${rowGapControl?.desktop?.value}${rowGapControl?.desktop?.unit}`,
      '--flex-row-gap-tablet': `${rowGapControl?.tablet?.value}${rowGapControl?.tablet?.unit}`,
      '--flex-row-gap-mobile': `${rowGapControl?.mobile?.value}${rowGapControl?.mobile?.unit}`,

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
        backgroundControl?.color ?? 'rgba(255, 255, 255, 0)',

      // "--item-background-image": backgroundControl?.gradient
      //   ? `linear-gradient(${backgroundControl?.gradient?.angle}deg, ${backgroundControl?.gradient?.color1} ${backgroundControl?.gradient?.locations[0]}%, ${backgroundControl?.gradient?.color2} ${backgroundControl?.gradient?.locations[1]}%)`
      //   : "",
      '--item-background-image': `linear-gradient(${backgroundControl?.gradient?.angle ?? 0}deg, ${backgroundControl?.gradient?.color1 ?? 'rgba(255, 255, 255, 0)'} ${backgroundControl?.gradient?.locations[0] ?? 0}%, ${backgroundControl?.gradient?.color2 ?? 'rgba(255, 255, 255, 0)'} ${backgroundControl?.gradient?.locations[1] ?? 100}%)`,
    } as React.CSSProperties;

    return (
      <div
        className="flex-container item-radius item-padding item-background mx-auto"
        style={{ ...styleProperties }}
      >
        {backgroundControl?.backgroundType === 'image' ? (
          <div
            className="absolute left-0 top-0 h-full w-full"
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
        {renderDropZone({ zone: 'item' })}
      </div>
    );
  },
};
