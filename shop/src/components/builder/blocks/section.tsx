import { parseControl } from '@/components/builder/utils/helper';
import {
  type AlignControl,
  type BackgroundControl,
  type BorderControl,
  type DimensionControl,
  type HeightControl,
  type PaddingControl,
  type RadiusControl,
  type WidthControl,
} from '@/components/builder/utils/types';
import { cn } from '@/lib/cn';
import { type ComponentConfig } from '@measured/puck';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const bgPixelImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAGklEQVQIW2NkYGD4D8SMQAwGcAY2AbBKDBUAVuYCBQPd34sAAAAASUVORK5CYII';

export type SectionBlockProps = {
  width: string;
  padding: string;
  height: string;
  border: {
    width: string;
    style: string;
    color: string;
  };
  background: string;
  backgroundOverlay: string;
  bgPixelEffect?: 'yes' | 'no';
  radius: string;
  objectAlignment: string;
  justifyItems: string;
  display: boolean;
  link?: string;
};

export const Section: ComponentConfig<SectionBlockProps> = {
  render: ({
    width,
    height,
    radius,
    objectAlignment,
    background,
    backgroundOverlay,
    bgPixelEffect,
    padding,
    border,
    justifyItems,
    link,
    puck: { renderDropZone },
  }) => {
    const objectAlignControl = parseControl<AlignControl>(objectAlignment, {});
    const justifyItemsControl = parseControl<AlignControl>(justifyItems, {});
    const widthControl = parseControl<WidthControl>(width, {});
    const heightControl = parseControl<HeightControl>(height, {});
    const backgroundControl = parseControl<BackgroundControl>(background, {});
    const backgroundOverlayControl = parseControl<BackgroundControl>(
      backgroundOverlay,
      {},
    );
    const paddingControl = parseControl<PaddingControl>(padding, {});
    const radiusControl = parseControl<RadiusControl>(radius, {});
    const borderControl = parseControl<BorderControl>(border, {});
    const borderStyle = parseControl<AlignControl>(borderControl?.style, {});
    const borderWidth = parseControl<DimensionControl>(
      borderControl?.width,
      {},
    );

    const styleProperties = {
      '--radius-desktop': `${radiusControl?.desktop?.value}${radiusControl?.desktop?.unit}`,
      '--radius-tablet': `${radiusControl?.tablet?.value}${radiusControl?.tablet?.unit}`,
      '--radius-mobile': `${radiusControl?.mobile?.value}${radiusControl?.mobile?.unit}`,
      '--width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,
      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,

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

      '--object-align-desktop': objectAlignControl?.desktop ?? '',
      '--object-align-tablet': objectAlignControl?.tablet ?? '',
      '--object-align-mobile': objectAlignControl?.mobile ?? '',

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

      '--flex-justify-content-desktop':
        justifyItemsControl?.desktop ?? 'initial',
      '--flex-justify-content-tablet': justifyItemsControl?.tablet ?? 'initial',
      '--flex-justify-content-mobile': justifyItemsControl?.mobile ?? 'initial',
    } as React.CSSProperties;

    const overlayStyleProperties = {
      '--item-background-overlay-color':
        backgroundOverlayControl?.color ?? 'rgba(0, 0, 0, 0)',
    } as React.CSSProperties;

    return (
      <div
        className={cn(
          'item-border overflow-hidden item-padding item-radius item-width item-minHeight item-background item-border item-object-alignment item-content-align relative flex flex-col',
        )}
        style={{
          ...styleProperties,
        }}
      >
        {link && (
          <Link className="absolute inset-0 h-full w-full z-[2]" href={link} />
        )}
        {backgroundControl?.backgroundType === 'image' ? (
          backgroundControl?.image?.original ? (
            <Image
              src={backgroundControl?.image?.original}
              alt="background banner image"
              fill
              style={{
                objectPosition: backgroundControl?.backgroundPosition,
                objectFit:
                  backgroundControl?.backgroundSize as React.CSSProperties['objectFit'],
              }}
            />
          ) : (
            <div
              className="item-radius absolute left-0 top-0 h-full w-full"
              style={{
                backgroundImage: `url(${backgroundControl?.image?.original})`,
                backgroundPosition: backgroundControl?.backgroundPosition,
                backgroundRepeat: backgroundControl?.backgroundRepeat,
                backgroundSize: backgroundControl?.backgroundSize,
              }}
            />
          )
        ) : (
          ''
        )}
        <div
          className="item-overlay-background item-radius pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden"
          style={{ ...overlayStyleProperties }}
        >
          {bgPixelEffect === 'yes' ? (
            <div
              className="absolute left-0 top-0 z-10 h-full w-full"
              style={{ backgroundImage: `url("${bgPixelImage}")` }}
            />
          ) : (
            ''
          )}
        </div>

        <div className="relative z-10 w-full">
          {renderDropZone({
            zone: `item`,
          })}
        </div>
      </div>
    );
  },
};
