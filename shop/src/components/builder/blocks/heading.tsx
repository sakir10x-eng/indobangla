import { cn } from '@/lib/cn';
import { type ComponentConfig } from '@measured/puck';
import { type ReactNode } from 'react';
import { hexToRgb, parseControl } from '@/components/builder/utils/helper';
import {
  type AlignControl,
  type LineHeightControl,
  type SizeControl,
  type PaddingControl,
  type WidthControl,
} from '@/components/builder/utils/types';

type _HeadingProps = {
  children: ReactNode;
  rank?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
  style: React.CSSProperties;
};

export type HeadingProps = {
  align: string;
  objectAlignment: string;
  text?: string;
  level?: _HeadingProps['rank'];
  padding: string;
  size: string;
  lineHeight: string;
  color: string;
  maxWidth: string;
  fontWeight: string;
};

export const HeadingTag = ({
  children,
  rank,
  className,
  style,
}: _HeadingProps) => {
  const Tag = rank ? (`${rank}` as keyof JSX.IntrinsicElements) : 'span';

  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
};

export const Heading: ComponentConfig<HeadingProps> = {
  render: ({
    align,
    objectAlignment,
    text,
    padding,
    level,
    size,
    lineHeight,
    maxWidth,
    color,
    fontWeight,
  }) => {
    const alignControl = parseControl<AlignControl>(align, {});
    const sizeControl = parseControl<SizeControl>(size, {});
    const maxWidthControl = parseControl<WidthControl>(maxWidth, {});
    const paddingControl = parseControl<PaddingControl>(padding, {});
    const lineHeightControl = parseControl<LineHeightControl>(lineHeight, {});
    const objectAlignControl = parseControl<AlignControl>(objectAlignment, {});
    const styleProperties = {
      '--leading-desktop': `${lineHeightControl?.desktop?.value}${lineHeightControl?.desktop?.unit}`,
      '--leading-tablet': `${lineHeightControl?.tablet?.value}${lineHeightControl?.tablet?.unit}`,
      '--leading-mobile': `${lineHeightControl?.mobile?.value}${lineHeightControl?.mobile?.unit}`,

      '--size-desktop': `${sizeControl?.desktop?.value}${sizeControl?.desktop?.unit}`,
      '--size-tablet': `${sizeControl?.tablet?.value}${sizeControl?.tablet?.unit}`,
      '--size-mobile': `${sizeControl?.mobile?.value}${sizeControl?.mobile?.unit}`,

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

      '--max-width-desktop': `${maxWidthControl?.desktop?.value}${maxWidthControl?.desktop?.unit}`,
      '--max-width-tablet': `${maxWidthControl?.tablet?.value}${maxWidthControl?.tablet?.unit}`,
      '--max-width-mobile': `${maxWidthControl?.mobile?.value}${maxWidthControl?.mobile?.unit}`,

      '--align-desktop': alignControl?.desktop ?? 'left',
      '--align-tablet': alignControl?.tablet ?? 'left',
      '--align-mobile': alignControl?.mobile ?? 'left',

      '--font-weight': fontWeight ?? '400',
      '--color-text': color ?? 'rgba(25, 27, 30, 1)',

      '--object-align-desktop': objectAlignControl?.desktop ?? '',
      '--object-align-tablet': objectAlignControl?.tablet ?? '',
      '--object-align-mobile': objectAlignControl?.mobile ?? '',
    } as React.CSSProperties;
    return (
      <HeadingTag
        style={{ ...styleProperties }}
        className={cn(
          'item-object-alignment item-text-color item-size item-padding item-align item-lineHeight item-max-width relative item-fontWeight',
          align,
        )}
        rank={level}
      >
        <span
          className={cn(align)}
          style={{
            display: 'block',
            width: '100%',
          }}
        >
          {text}
        </span>
      </HeadingTag>
    );
  },
};
