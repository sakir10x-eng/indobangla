import { type ComponentConfig } from '@measured/puck';
import Link from 'next/link';
import React from 'react';
import {
  type AlignControl,
  type BackgroundControl,
  type BorderControl,
  type DimensionControl,
  type SizeControl,
} from '@/components/builder/utils/types';
import { cn } from '@/lib/cn';
import { parseControl } from '../utils/helper';

export type ButtonGroupProps = {
  align: string;
  columnGap: string;
  rowGap: string;
  buttons: {
    label: string;
    href?: string;
    fontSize: string;
    radius: string;
    padding: string;
    border: {
      width: string;
      style: string;
      color: string;
    };
    background: string;
    color: string;
  }[];
  widgetTitle: string;
};

export const ButtonGroup: ComponentConfig<ButtonGroupProps> = {
  render: ({ align, buttons, columnGap, rowGap }) => {
    const alignControl = parseControl<AlignControl>(align, {});
    const columnGapControl = parseControl<SizeControl>(columnGap, {});
    const rowGapControl = parseControl<SizeControl>(rowGap, {});

    const styleProperties = {
      '--flex-column-gap-desktop': `${columnGapControl?.desktop?.value}${columnGapControl?.desktop?.unit}`,
      '--flex-column-gap-tablet': `${columnGapControl?.tablet?.value}${columnGapControl?.tablet?.unit}`,
      '--flex-column-gap-mobile': `${columnGapControl?.mobile?.value}${columnGapControl?.mobile?.unit}`,

      '--flex-row-gap-desktop': `${rowGapControl?.desktop?.value}${rowGapControl?.desktop?.unit}`,
      '--flex-row-gap-tablet': `${rowGapControl?.tablet?.value}${rowGapControl?.tablet?.unit}`,
      '--flex-row-gap-mobile': `${rowGapControl?.mobile?.value}${rowGapControl?.mobile?.unit}`,

      '--flex-justify-content-desktop': alignControl?.desktop ?? 'center',
      '--flex-justify-content-tablet': alignControl?.tablet ?? 'center',
      '--flex-justify-content-mobile': alignControl?.mobile ?? 'center',
    } as React.CSSProperties;

    return (
      <div
        className={cn(
          'grid-row-gap grid-column-gap item-justify-content flex flex-wrap items-center',
        )}
        style={{ ...styleProperties }}
      >
        {buttons.map((button, i) => {
          const sizeControl = parseControl<SizeControl>(button?.fontSize, {});
          const radiusControl = parseControl<SizeControl>(button?.radius, {});
          const paddingControl = parseControl<DimensionControl>(
            button?.padding,
            {},
          );
          const backgroundControl = parseControl<BackgroundControl>(
            button?.background,
            {},
          );
          const borderControl = parseControl<BorderControl>(button?.border, {});
          const borderStyle = parseControl<AlignControl>(
            borderControl?.style,
            {},
          );
          const borderWidth = parseControl<DimensionControl>(
            borderControl?.width,
            {},
          );
          const buttonStyleProperties = {
            '--size-desktop': `${sizeControl?.desktop?.value}${sizeControl?.desktop?.unit}`,
            '--size-tablet': `${sizeControl?.tablet?.value}${sizeControl?.tablet?.unit}`,
            '--size-mobile': `${sizeControl?.mobile?.value}${sizeControl?.mobile?.unit}`,

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

            '--color-text': button?.color ?? 'rgba(25, 27, 30, 1)',

            '--item-background-color':
              backgroundControl?.color ?? 'rgba(255, 255, 255, 0)',

            // "--item-background-image": `linear-gradient(${backgroundControl?.gradient?.angle}deg, ${backgroundControl?.gradient?.color1} ${backgroundControl?.gradient?.locations[0]}%, ${backgroundControl?.gradient?.color2} ${backgroundControl?.gradient?.locations[1]}%)`,
            '--item-background-image': `linear-gradient(${backgroundControl?.gradient?.angle ?? 0}deg, ${backgroundControl?.gradient?.color1 ?? 'rgba(255, 255, 255, 0)'} ${backgroundControl?.gradient?.locations[0] ?? 0}%, ${backgroundControl?.gradient?.color2 ?? 'rgba(255, 255, 255, 0)'} ${backgroundControl?.gradient?.locations[1] ?? 100}%)`,

            '--border-style-desktop': borderStyle?.desktop ?? 'none',
            '--border-style-tablet': borderStyle?.tablet ?? 'none',
            '--border-style-mobile': borderStyle?.mobile ?? 'none',

            '--item-border-color':
              borderControl?.color ?? 'rgba(25, 27, 30, 1)',

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
          } as React.CSSProperties;

          return button?.label ? (
            <Link
              key={i}
              href={button.href ? button.href : '#'}
              className={cn(
                'item-size item-radius item-padding item-text-color item-background item-border relative font-medium',
              )}
              style={{ ...buttonStyleProperties }}
            >
              {backgroundControl?.backgroundType === 'image' ? (
                <span
                  className="absolute left-0 top-0 block h-full w-full"
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
              <span className="relative z-10">{button?.label}</span>
            </Link>
          ) : (
            ''
          );
        })}
      </div>
    );
  },
};
