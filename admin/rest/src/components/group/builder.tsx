import { CardProps } from '@/components/builder/utils/types';
import { Routes } from '@/config/routes';
import {
  groupsBuilder,
  groupsSortingItems,
  mergeBuilderData,
  modifiedSortingItems,
  sectionBannerBuilder,
} from '@/contexts/builder';
import type { Config, DefaultRootProps } from '@measured/puck';
import { Puck } from '@measured/puck';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';

import {
  ButtonGroup,
  ButtonGroupProps,
} from '@/components/builder/blocks/button';
import { Flex, FlexProps } from '@/components/builder/blocks/flex';
import { Grid, GridProps } from '@/components/builder/blocks/grid';
import { Heading, HeadingProps } from '@/components/builder/blocks/heading';
import { IconBlockProps, IconBlocks } from '@/components/builder/blocks/icon';
import {
  Section,
  SectionBlockProps,
} from '@/components/builder/blocks/section';
import {
  Separator,
  SeparatorProps,
} from '@/components/builder/blocks/separator';
import { Text, TextProps } from '@/components/builder/blocks/text';
import {
  TextEditor,
  TextEditorProps,
} from '@/components/builder/blocks/text-editor';
import {
  Thumbnail,
  ThumbnailProps,
} from '@/components/builder/blocks/thumbnail';
import {
  VerticalSpace,
  VerticalSpaceProps,
} from '@/components/builder/blocks/vertical-space';
import { Card } from '@/components/builder/components/card';
import { isEmpty } from 'lodash';
import { useRecoilState } from 'recoil';

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

export type GroupBuilderConfig = Config<Props, RootProps, 'layout'>;

export const GroupConfig: GroupBuilderConfig = {
  root: {
    defaultProps: {
      title: 'Group Page Builder',
    },
  },
  categories: {
    layout: {
      components: ['Card'],
    },
    other: {
      components: [
        'Heading',
        'Text',
        'Grid',
        'Thumbnail',
        'VerticalSpace',
        'Section',
        'Separator',
        'ButtonGroup',
        'Icon',
        'Flex',
        'TextEditor',
      ],
      title: 'Typography',
      defaultExpanded: true,
    },
  },
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

const GroupsBuilder = () => {
  const router = useRouter();
  const { locale } = router;
  const groupName = Array.isArray(router.query.groupSlug)
    ? router.query.groupSlug[0]
    : (router.query.groupSlug ?? '');
  const groupNameWithLocale = `${groupName}-${router?.query?.layoutType}-${locale}`;

  const sectionName = router?.query?.section;

  // Dynamically create atoms based on router query
  const groupsLocalData = groupsBuilder(groupNameWithLocale);
  const groupsLocalSortData = groupsSortingItems(groupNameWithLocale);

  const [data, setData] = useRecoilState(groupsLocalData);
  const [items, setGroupsItems] = useRecoilState(groupsLocalSortData);

  const bannerLocalData = sectionBannerBuilder(
    `${groupNameWithLocale}-${sectionName}`,
  );

  const [bannerData, setBannerData] = useRecoilState(bannerLocalData);

  const modifiedData: typeof data = {
    ...data,
    content: data?.content?.filter(
      (item) => item?.props?.id === router?.query?.id,
    ),
  };

  const modifiedBannerData: typeof bannerData = {
    ...bannerData,
    content: bannerData?.content?.filter(
      (item) => item?.props?.id === router?.query?.id,
    ),
  };

  const initialData = {};

  return router?.query?.id && !router?.query?.section ? (
    <Puck
      config={GroupConfig as Config}
      data={modifiedData}
      onPublish={(value) => {
        const modifiedData = mergeBuilderData(
          data,
          value,
          true,
          router?.query?.id,
        );
        if (isEmpty(value?.content)) {
          setGroupsItems(
            items?.filter((item) => item?.id !== router?.query?.id),
          );
        } else if (
          value?.content?.find((item) => item?.props?.id !== router?.query?.id)
        ) {
          setGroupsItems([
            ...items?.filter((item) => item?.id !== router?.query?.id),
            ...modifiedSortingItems({
              items: value?.content?.map((item) => item?.props?.id),
            }),
          ]);
        } else {
          setGroupsItems(items);
        }
        setData(modifiedData);
        return router?.query?.action === 'edit'
          ? router.push(`/${Routes.type.edit(groupName, locale!)}`)
          : router.push(`/${Routes.type.translate(groupName, locale!)}`);
      }}
      viewports={[
        {
          width: 400,
          height: 'auto',
          icon: 'Smartphone',
          label: 'Small',
        },
        {
          width: 770,
          height: 'auto',
          icon: 'Tablet',
          label: 'Medium',
        },
        {
          width: 1280,
          height: 'auto',
          icon: 'Monitor',
          label: 'Large',
        },
      ]}
      overrides={{
        headerActions: ({ children }) => {
          return (
            <>
              {/* Render default header actions, such as the default Button */}
              {children}
            </>
          );
        },
      }}
    />
  ) : router?.query?.id && router?.query?.section ? (
    <Puck
      config={GroupConfig as Config}
      data={modifiedBannerData}
      onPublish={(value) => {
        const modifiedData = mergeBuilderData(
          bannerData,
          value,
          true,
          router?.query?.id,
        );

        setBannerData(modifiedData);

        return router?.query?.action === 'edit'
          ? router.push(`/${Routes.type.edit(groupName, locale!)}`)
          : router.push(`/${Routes.type.translate(groupName, locale!)}`);
      }}
      viewports={[
        {
          width: 400,
          height: 'auto',
          icon: 'Smartphone',
          label: 'Small',
        },
        {
          width: 770,
          height: 'auto',
          icon: 'Tablet',
          label: 'Medium',
        },
        {
          width: 1280,
          height: 'auto',
          icon: 'Monitor',
          label: 'Large',
        },
      ]}
      overrides={{
        headerActions: ({ children }) => {
          return (
            <>
              {/* Render default header actions, such as the default Button */}
              {children}
            </>
          );
        },
      }}
    />
  ) : router?.query?.section && !router?.query?.id ? (
    <Puck
      config={GroupConfig as Config}
      data={initialData}
      onPublish={(value) => {
        const modifiedData = mergeBuilderData(bannerData, value);

        setBannerData(modifiedData);

        return router?.query?.action === 'edit'
          ? router.push(`/${Routes.type.edit(groupName, locale!)}`)
          : router.push(`/${Routes.type.translate(groupName, locale!)}`);
      }}
      viewports={[
        {
          width: 400,
          height: 'auto',
          icon: 'Smartphone',
          label: 'Small',
        },
        {
          width: 770,
          height: 'auto',
          icon: 'Tablet',
          label: 'Medium',
        },
        {
          width: 1280,
          height: 'auto',
          icon: 'Monitor',
          label: 'Large',
        },
      ]}
      overrides={{
        headerActions: ({ children }) => {
          return (
            <>
              {/* Render default header actions, such as the default Button */}
              {children}
            </>
          );
        },
      }}
    />
  ) : (
    <Puck
      config={GroupConfig as Config}
      data={initialData}
      onPublish={(value) => {
        const modifiedData = mergeBuilderData(data, value);
        setData(modifiedData);
        setGroupsItems([
          ...items,
          ...modifiedSortingItems({
            items: value?.content?.map((item) => item?.props?.id),
          }),
        ]);
        return router?.query?.action === 'edit'
          ? router.push(`/${Routes.type.edit(groupName, locale!)}`)
          : router.push(`/${Routes.type.translate(groupName, locale!)}`);
      }}
      viewports={[
        {
          width: 400,
          height: 'auto',
          icon: 'Smartphone',
          label: 'Small',
        },
        {
          width: 770,
          height: 'auto',
          icon: 'Tablet',
          label: 'Medium',
        },
        {
          width: 1280,
          height: 'auto',
          icon: 'Monitor',
          label: 'Large',
        },
      ]}
      overrides={{
        headerActions: ({ children }) => {
          return (
            <>
              {/* Render default header actions, such as the default Button */}
              {children}
            </>
          );
        },
      }}
    />
  );
};

export default GroupsBuilder;
