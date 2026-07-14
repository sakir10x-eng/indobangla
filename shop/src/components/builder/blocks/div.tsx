import React from 'react';
import { DropZone, type ComponentConfig } from '@measured/puck';
import { cn } from '@/lib/cn';
import Image from 'next/image';
import { type Attachment } from '@/types';

export type DivBlockProps = {
  width?: string;
  padding?: {
    paddingLeft?: string;
    paddingRight?: string;
    paddingTop?: string;
    paddingBottom?: string;
  };
  background?: {
    bgImage?: Attachment;
    bgColor?: string;
    bgOverlay?: string;
    bgOverlayOpacity?: string;
  };
  height?: string;
  radius?: string;
  ojectAlight: 'left' | 'center' | 'right';
};

export const DivBlock: ComponentConfig<DivBlockProps> = {
  render: ({ width, height, radius, background, padding }) => {
    return (
      <div
        className={cn(
          'relative',
          `pl-${padding?.paddingLeft} pr-${padding?.paddingRight} pt-${padding?.paddingTop} pb-${padding?.paddingBottom}`,
        )}
        style={{
          height: height,
          width: width,
          borderRadius: radius,
          backgroundColor: background?.bgColor,
        }}
      >
        {background?.bgImage?.original ? (
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden"
            style={{ borderRadius: radius }}
          >
            <Image
              src={background?.bgImage?.original}
              alt="background image"
              fill
              className="object-cover"
            />
            <div
              className={cn(
                'absolute left-0 top-0 z-0 h-full w-full',
                background?.bgOverlayOpacity,
              )}
              style={{ backgroundColor: background?.bgOverlay }}
            />
          </div>
        ) : (
          ''
        )}
        <DropZone zone={`item`} />
      </div>
    );
  },
};
