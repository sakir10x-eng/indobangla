import React from 'react';
import { type ComponentConfig } from '@measured/puck';
import { type Attachment } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { parseControl } from '@/components/builder/utils/helper';
import {
  type AlignControl,
  type SizeControl,
} from '@/components/builder/utils/types';

import placeholderImage from '@/assets/placeholders/product.svg';

export type ThumbnailProps = {
  objectAlignment: string;
  image?: Attachment;
  width: string;
  height: string;
  widgetTitle: string;
  horizontalOrientation: string;
  verticalOrientation: string;
  directionX: string;
  directionY: string;
  position: string;
};

export const Thumbnail: ComponentConfig<ThumbnailProps> = {
  render: ({
    objectAlignment,
    image,
    width,
    height,
    horizontalOrientation,
    verticalOrientation,
    directionX,
    directionY,
    position,
  }) => {
    const widthControl = parseControl<SizeControl>(width, {});
    const heightControl = parseControl<SizeControl>(height, {});
    const objectAlignControl = parseControl<AlignControl>(objectAlignment, {});
    const positionControl = parseControl<AlignControl>(position, {});
    const xOrientationControl = parseControl<AlignControl>(
      horizontalOrientation,
      {},
    );
    const xDirectionControl = parseControl<SizeControl>(directionX, {});
    const yOrientationControl = parseControl<AlignControl>(
      verticalOrientation,
      {},
    );
    const yDirectionControl = parseControl<SizeControl>(directionY, {});
    const styleProperties = {
      '--width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,

      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,
    } as React.CSSProperties;

    const stylePositionProperties = {
      '--position-desktop': positionControl?.desktop ?? 'relative',
      '--position-tablet': positionControl?.tablet ?? 'relative',
      '--position-mobile': positionControl?.mobile ?? 'relative',

      '--offset-left-desktop':
        xOrientationControl?.desktop === 'left'
          ? `${xDirectionControl?.desktop?.value}${xDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-left-tablet':
        xOrientationControl?.tablet === 'left'
          ? `${xDirectionControl?.tablet?.value}${xDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-left-mobile':
        xOrientationControl?.mobile === 'left'
          ? `${xDirectionControl?.mobile?.value}${xDirectionControl?.mobile?.unit}`
          : 'auto',

      '--offset-right-desktop':
        xOrientationControl?.desktop === 'right'
          ? `${xDirectionControl?.desktop?.value}${xDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-right-tablet':
        xOrientationControl?.tablet === 'right'
          ? `${xDirectionControl?.tablet?.value}${xDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-right-mobile':
        xOrientationControl?.mobile === 'right'
          ? `${xDirectionControl?.mobile?.value}${xDirectionControl?.mobile?.unit}`
          : 'auto',

      '--offset-top-desktop':
        yOrientationControl?.desktop === 'top'
          ? `${yDirectionControl?.desktop?.value}${yDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-top-tablet':
        yOrientationControl?.tablet === 'top'
          ? `${yDirectionControl?.tablet?.value}${yDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-top-mobile':
        yOrientationControl?.mobile === 'top'
          ? `${yDirectionControl?.mobile?.value}${yDirectionControl?.mobile?.unit}`
          : 'auto',

      '--offset-bottom-desktop':
        yOrientationControl?.desktop === 'bottom'
          ? `${yDirectionControl?.desktop?.value}${yDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-bottom-tablet':
        yOrientationControl?.tablet === 'bottom'
          ? `${yDirectionControl?.tablet?.value}${yDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-bottom-mobile':
        yOrientationControl?.mobile === 'bottom'
          ? `${yDirectionControl?.mobile?.value}${yDirectionControl?.mobile?.unit}`
          : 'auto',
    } as React.CSSProperties;

    const styleAlignProperties = {
      '--object-justify-align-desktop':
        objectAlignControl?.desktop ?? 'flex-start',
      '--object-justify-align-tablet':
        objectAlignControl?.tablet ?? 'flex-start',
      '--object-justify-align-mobile':
        objectAlignControl?.mobile ?? 'flex-start',
    } as React.CSSProperties;
    return (
      <div
        className="item-object-justify-alignment relative flex"
        style={{ ...styleAlignProperties }}
      >
        {image?.original ? (
          <div
            className={cn('item-position')}
            style={{ ...stylePositionProperties }}
          >
            <div
              className="item-width item-minHeight pointer-events-none relative"
              style={{
                ...styleProperties,
              }}
            >
              <Image
                className="item-width item-minHeight"
                src={image?.original}
                alt={image?.original}
                height={1200}
                width={1200}
              />
            </div>
          </div>
        ) : (
          <div
            className={cn('item-position')}
            style={{ ...stylePositionProperties }}
          >
            <div
              className="item-width item-minHeight pointer-events-none relative border rounded-lg"
              style={{
                ...styleProperties,
              }}
            >
              <Image
                className="item-width item-minHeight"
                src={placeholderImage}
                alt="placeholder"
                height={1200}
                width={1200}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
};
