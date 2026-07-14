import { cva, type VariantProps } from 'class-variance-authority';
import { type Attachment } from '@/types';
import { type buttonVariants } from '@/components/ui/button';

export type CardProps = {
  widgetTitle: string;
  radius: string;
  shadow: {
    normal: string;
    hover: string;
  };
  padding: string;
  background: string;
  corner: string;
  border: {
    width: string;
    style: string;
    color: string;
  };
};

export type BackgroundControl = {
  color?: string;
  gradient?: {
    angle: number;
    color1: string;
    color2: string;
    locations: number[];
  };
  backgroundType?: string;
  image?: {
    original: string;
  };
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
};

export type PaddingControl = {
  desktop?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    unit: string;
  };
  tablet?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    unit: string;
  };
  mobile?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    unit: string;
  };
};

export type SizeControl = {
  desktop?: { value: number; unit: string };
  tablet?: { value: number; unit: string };
  mobile?: { value: number; unit: string };
};

export type LineHeightControl = {
  desktop?: { value: number; unit: string };
  tablet?: { value: number; unit: string };
  mobile?: { value: number; unit: string };
};

export type WidthControl = {
  desktop?: { value: number; unit: string };
  tablet?: { value: number; unit: string };
  mobile?: { value: number; unit: string };
};

export type HeightControl = {
  desktop?: { value: number; unit: string };
  tablet?: { value: number; unit: string };
  mobile?: { value: number; unit: string };
};

export type RadiusControl = {
  desktop?: { value: number; unit: string };
  tablet?: { value: number; unit: string };
  mobile?: { value: number; unit: string };
};

export type AlignControl = {
  desktop?: string;
  tablet?: string;
  mobile?: string;
};

export interface DimensionControl {
  desktop?: Desktop;
  tablet?: Tablet;
  mobile?: Mobile;
}

export interface Desktop {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: string;
}

export interface Tablet {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: string;
}

export interface Mobile {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: string;
}
export interface BorderControl {
  style?: string;
  width?: string;
  color?: string;
}
