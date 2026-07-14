import { Config, DefaultRootProps, Render, Data } from '@measured/puck';
import { Card } from '@/components/builder/components/card';
import {
  Section,
  SectionBlockProps,
} from '@/components/builder/blocks/section';
import {
  Thumbnail,
  ThumbnailProps,
} from '@/components/builder/blocks/thumbnail';
import { Text, TextProps } from '@/components/builder/blocks/text';
import {
  VerticalSpace,
  VerticalSpaceProps,
} from '@/components/builder/blocks/vertical-space';
import { Grid, GridProps } from '@/components/builder/blocks/grid';
import {
  ButtonGroup,
  ButtonGroupProps,
} from '@/components/builder/blocks/button';
import { Heading, HeadingProps } from '@/components/builder/blocks/heading';
import {
  Separator,
  SeparatorProps,
} from '@/components/builder/blocks/separator';
import { IconBlockProps, IconBlocks } from '@/components/builder/blocks/icon';
import { Flex, FlexProps } from '@/components/builder/blocks/flex';
import {
  TextEditor,
  TextEditorProps,
} from '@/components/builder/blocks/text-editor';
import { ReactNode } from 'react';
import { CardProps } from '@/components/builder/utils/types';

export type RootProps = {
  children: ReactNode;
  title: string;
} & DefaultRootProps;

export type Props = {
  Card: CardProps;
  Heading: HeadingProps;
  Text: TextProps;
  Separator: SeparatorProps;
  Grid: GridProps;
  Thumbnail: ThumbnailProps;
  ButtonGroup: ButtonGroupProps;
  VerticalSpace: VerticalSpaceProps;
  Section: SectionBlockProps;
  Icon: IconBlockProps;
  Flex: FlexProps;
  TextEditor: TextEditorProps;
};

export type CustomPageBuilderConfig = Config<Props, RootProps, 'layout'>;

export const CustomPageConfig: CustomPageBuilderConfig = {
  components: {
    Card,
    Section,
    Thumbnail,
    Text,
    VerticalSpace,
    Grid,
    ButtonGroup,
    Heading,
    Separator,
    Icon: IconBlocks,
    Flex,
    TextEditor,
  },
};

export default function CustomRender({
  data,
}: {
  data: Partial<Data<Props, RootProps>>;
}) {
  return (
    <Render
      config={CustomPageConfig as Config}
      data={{
        content: data?.content,
        zones: data?.zones,
        root: data?.root,
      }}
    />
  );
}
