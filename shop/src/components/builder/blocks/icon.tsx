import { hexToRgb, parseControl } from '@/components/builder/utils/helper';
import IconRender from '@/components/builder/utils/icon-render';
import {
  type AlignControl,
  type BackgroundControl,
  type PaddingControl,
  type RadiusControl,
  type SizeControl,
} from '@/components/builder/utils/types';
import Alert from '@/components/ui/alert';
import { type ComponentConfig } from '@measured/puck';
import { type icons } from 'lucide-react';
import React from 'react';

export type IconBlockProps = {
  widgetTitle: string;
  icon: string;
  size: string;
  color: string;
  background: string;
  padding: string;
  radius: string;
  align: string;
};

export const IconBlocks: ComponentConfig<IconBlockProps> = {
  render: ({ icon, size, color, background, padding, radius, align }) => {
    const backgroundControl = parseControl<BackgroundControl>(background, {});
    const paddingControl = parseControl<SizeControl>(padding, {});
    const sizeControl = parseControl<SizeControl>(size, {});
    const radiusControl = parseControl<RadiusControl>(radius, {});
    const alignControl = parseControl<AlignControl>(align, {});

    if (!icon) {
      return <Alert message="Icon not set properly!" variant="warning" />;
    }

    const styleProperties = {
      '--size-desktop': `${sizeControl?.desktop?.value}${sizeControl?.desktop?.unit}`,
      '--size-tablet': `${sizeControl?.tablet?.value}${sizeControl?.tablet?.unit}`,
      '--size-mobile': `${sizeControl?.mobile?.value}${sizeControl?.mobile?.unit}`,

      '--radius-desktop': `${radiusControl?.desktop?.value}${radiusControl?.desktop?.unit}`,
      '--radius-tablet': `${radiusControl?.tablet?.value}${radiusControl?.tablet?.unit}`,
      '--radius-mobile': `${radiusControl?.mobile?.value}${radiusControl?.mobile?.unit}`,

      '--color-text': color ?? 'rgba(25, 27, 30, 1)',

      '--padding-desktop': `${paddingControl?.desktop?.value}${paddingControl?.desktop?.unit}`,
      '--padding-tablet': `${paddingControl?.tablet?.value}${paddingControl?.tablet?.unit}`,
      '--padding-mobile': `${paddingControl?.mobile?.value}${paddingControl?.mobile?.unit}`,

      // "--desktop-space-left":
      //   `${paddingControl?.desktop?.left}${paddingControl?.desktop?.unit}` ??
      //   "0px",
      // "--desktop-space-bottom":
      //   `${paddingControl?.desktop?.bottom}${paddingControl?.desktop?.unit}` ??
      //   "0px",
      // "--desktop-space-top":
      //   `${paddingControl?.desktop?.top}${paddingControl?.desktop?.unit}` ??
      //   "0px",
      // "--desktop-space-right":
      //   `${paddingControl?.desktop?.right}${paddingControl?.desktop?.unit}` ??
      //   "0px",

      // "--tablet-space-left":
      //   `${paddingControl?.tablet?.left}${paddingControl?.tablet?.unit}` ??
      //   "0px",
      // "--tablet-space-bottom":
      //   `${paddingControl?.tablet?.bottom}${paddingControl?.tablet?.unit}` ??
      //   "0px",
      // "--tablet-space-top":
      //   `${paddingControl?.tablet?.top}${paddingControl?.tablet?.unit}` ??
      //   "0px",
      // "--tablet-space-right":
      //   `${paddingControl?.tablet?.right}${paddingControl?.tablet?.unit}` ??
      //   "0px",

      // "--mobile-space-left":
      //   `${paddingControl?.mobile?.left}${paddingControl?.mobile?.unit}` ??
      //   "0px",
      // "--mobile-space-bottom":
      //   `${paddingControl?.mobile?.bottom}${paddingControl?.mobile?.unit}` ??
      //   "0px",
      // "--mobile-space-top":
      //   `${paddingControl?.mobile?.top}${paddingControl?.mobile?.unit}` ??
      //   "0px",
      // "--mobile-space-right":
      //   `${paddingControl?.mobile?.right}${paddingControl?.mobile?.unit}` ??
      //   "0px",

      '--item-background-color':
        backgroundControl?.color ?? 'rgba(255, 255, 255, 0)',
      '--item-background-image': `linear-gradient(${backgroundControl?.gradient?.angle ?? 0}deg, ${backgroundControl?.gradient?.color1 ?? 'rgba(255, 255, 255, 0)'} ${backgroundControl?.gradient?.locations[0] ?? 0}%, ${backgroundControl?.gradient?.color2 ?? 'rgba(255, 255, 255, 0)'} ${backgroundControl?.gradient?.locations[1] ?? 100}%)`,

      '--align-desktop': alignControl?.desktop ?? 'left',
      '--align-tablet': alignControl?.tablet ?? 'left',
      '--align-mobile': alignControl?.mobile ?? 'left',
    } as React.CSSProperties;
    return (
      <div style={{ ...styleProperties }} className="item-align">
        <span className="item-size item-text-color item-background item-radius item-ratio-padding relative inline-flex overflow-hidden">
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
          <IconRender name={icon as keyof typeof icons} />
        </span>
      </div>
    );
  },
};
