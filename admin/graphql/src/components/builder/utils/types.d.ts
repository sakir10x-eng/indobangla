import { cva, type VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/builder/components/builder-button';
import { Attachment } from '@/types';

export type FairFeesProps = {
  container: {
    color: string;
  };
  title: {
    text: string;
    color: string;
  };
  description: {
    text: string;
    color: string;
  };
  coverPhoto: Attachment | undefined;
  bgPhoto: Attachment | undefined;
  button: {
    text: string;
    link: string;
  };
  fees: {
    text: string;
    items: { title: string }[];
  };
  widgetTitle: string;
};

export type BannerProps = {
  // control: string;
  settings: {
    content: {
      align: string;
      title: string;
      description: string;
    };
    column: {
      align: string;
      items: { title: string; description: string }[];
    };
    button: {
      align: string;
      items: {
        title: string;
        url: string;
        intent: VariantProps<typeof buttonVariants>['intent'];
        variant: VariantProps<typeof buttonVariants>['variant'];
        size: VariantProps<typeof buttonVariants>['size'];
      }[];
    };
    bgPhoto: Attachment | undefined;
    container: {
      bgOverlay: string;
      bgOverlayOpacity: string;
    };
  }[];
  widgetTitle: string;
};

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
