import AlignmentGenerator from '@/components/builder/control/choose';
import SlideControl from '@/components/builder/control/slider';
import { ComponentConfig, DropZone } from '@measured/puck';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import BackgroundGenerator from '@/components/builder/control/background';
import { isString } from 'lodash';
import {
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignVerticalSpaceBetween,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';
import React from 'react';
import { checkIfValidJson, hexToRgb } from '@/components/builder/utils/helper';

export type FlexProps = {
  widgetTitle: string;
  width: string;
  minHeight: string;
  direction: string;
  contentDirection: string;
  alignItems: string;
  columnGap: string;
  rowGap: string;
  radius: string;
  padding: string;
  background: string;
};

export const Flex: ComponentConfig<FlexProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    width: {
      type: 'custom',
      label: 'Width',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 1600,
                step: 1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 1,
              },
              vw: {
                min: 0,
                max: 100,
                step: 1,
              },
              rem: {
                min: 0,
                max: 10,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 10,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
    minHeight: {
      type: 'custom',
      label: 'Min Height',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 1440,
                step: 1,
              },
              vh: {
                min: 0,
                max: 100,
                step: 1,
              },
              rem: {
                min: 0,
                max: 10,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 10,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
    radius: {
      type: 'custom',
      label: 'Radius',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
          />
        );
      },
    },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: ({ onChange, value, field }) => {
        return (
          <DimensionsGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 200,
                step: 1,
              },
              rem: {
                min: 0,
                max: 20,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 20,
                step: 0.1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
    background: {
      type: 'custom',
      label: 'Background',
      render: ({ onChange, value, field }) => (
        <BackgroundGenerator
          onChange={onChange}
          value={value}
          label={field?.label ?? ''}
        />
      ),
    },
    direction: {
      type: 'custom',
      label: 'Direction',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            chooses={[
              {
                key: 'row',
                value: <ArrowRight />,
                title: 'Row Horizontal',
              },
              {
                key: 'column',
                value: <ArrowDown />,
                title: 'Column Vertical',
              },
              {
                key: 'row-reverse',
                value: <ArrowLeft />,
                title: 'Row Reversed',
              },
              {
                key: 'column-reverse',
                value: <ArrowUp />,
                title: 'Column Reversed',
              },
            ]}
          />
        );
      },
    },
    contentDirection: {
      type: 'custom',
      label: 'Justify Content',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            className="choose-rotation"
            chooses={[
              {
                key: 'flex-start',
                value: <AlignHorizontalJustifyStart />,
                title: 'Start',
              },
              {
                key: 'center',
                value: <AlignHorizontalJustifyCenter />,
                title: 'Center',
              },
              {
                key: 'flex-end',
                value: <AlignHorizontalJustifyEnd />,
                title: 'End',
              },
              {
                key: 'space-between',
                value: <AlignHorizontalSpaceBetween />,
                title: 'Space Between',
              },
              {
                key: 'space-around',
                value: <AlignHorizontalSpaceAround />,
                title: 'Space Around',
              },
              {
                key: 'space-evenly',
                value: <AlignHorizontalDistributeCenter />,
                title: 'Space Evenly',
              },
            ]}
          />
        );
      },
    },
    alignItems: {
      type: 'custom',
      label: 'Align Items',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            chooses={[
              {
                key: 'flex-start',
                value: <AlignStartHorizontal />,
                title: 'Start',
              },
              {
                key: 'center',
                value: <AlignCenterHorizontal />,
                title: 'Center',
              },
              {
                key: 'flex-end',
                value: <AlignEndHorizontal />,
                title: 'End',
              },
              {
                key: 'stretch',
                value: <AlignVerticalSpaceBetween />,
                title: 'Stretch',
              },
            ]}
          />
        );
      },
    },
    columnGap: {
      type: 'custom',
      label: 'Colum Gap',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 1600,
                step: 1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 1,
              },
              vw: {
                min: 0,
                max: 100,
                step: 1,
              },
              rem: {
                min: 0,
                max: 10,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 10,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
    rowGap: {
      type: 'custom',
      label: 'Row Gap',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            unitRanges={{
              px: {
                min: 0,
                max: 1600,
                step: 1,
              },
              '%': {
                min: 0,
                max: 100,
                step: 1,
              },
              vw: {
                min: 0,
                max: 100,
                step: 1,
              },
              rem: {
                min: 0,
                max: 10,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 10,
                step: 0.1,
              },
            }}
          />
        );
      },
    },
  },
  defaultProps: {
    widgetTitle: 'Flex',
    width:
      '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
    minHeight:
      '{"desktop":{"value":100,"unit":"px"},"tablet":{"value":100,"unit":"px"},"mobile":{"value":100,"unit":"px"}}',
    direction: '{"desktop":"row","tablet":"row","mobile":"row"}',
    contentDirection:
      '{"desktop":"flex-start","tablet":"flex-start","mobile":"flex-start"}',
    alignItems:
      '{"desktop":"flex-start","tablet":"flex-start","mobile":"flex-start"}',
    columnGap:
      '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":20,"unit":"px"}}',
    rowGap:
      '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":20,"unit":"px"}}',
    radius:
      '{"desktop":{"value":0,"unit":"px"},"tablet":{"value":0,"unit":"px"},"mobile":{"value":0,"unit":"px"}}',
    padding:
      '{"desktop": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"tablet": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"mobile": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"}}',
    background: '{"backgroundType":"color","color":"rgba(255, 255, 255, 1)"}',
  },
  render: ({
    direction,
    width,
    minHeight,
    contentDirection,
    alignItems,
    columnGap,
    rowGap,
    radius,
    padding,
    background,
  }) => {
    const directionControl = direction
      ? isString(direction) && checkIfValidJson(direction)
        ? JSON.parse(direction)
        : direction
      : '';

    const widthControl = width
      ? isString(width) && checkIfValidJson(width)
        ? JSON.parse(width)
        : width
      : '';

    const minHeightControl = minHeight
      ? isString(minHeight) && checkIfValidJson(minHeight)
        ? JSON.parse(minHeight)
        : minHeight
      : '';

    const contentDirectionControl = contentDirection
      ? isString(contentDirection) && checkIfValidJson(contentDirection)
        ? JSON.parse(contentDirection)
        : contentDirection
      : '';

    const alignItemsControl = alignItems
      ? isString(alignItems) && checkIfValidJson(alignItems)
        ? JSON.parse(alignItems)
        : alignItems
      : '';

    const columnGapControl = columnGap
      ? isString(columnGap) && checkIfValidJson(columnGap)
        ? JSON.parse(columnGap)
        : columnGap
      : '';

    const rowGapControl = rowGap
      ? isString(rowGap) && checkIfValidJson(rowGap)
        ? JSON.parse(rowGap)
        : rowGap
      : '';

    const radiusControl = radius
      ? isString(radius) && checkIfValidJson(radius)
        ? JSON.parse(radius)
        : radius
      : '';

    const paddingControl = padding
      ? isString(padding) && checkIfValidJson(padding)
        ? JSON.parse(padding)
        : padding
      : '';

    const backgroundControl = background
      ? isString(background) && checkIfValidJson(background)
        ? JSON.parse(background)
        : background
      : '';

    const styleProperties = {
      '--content-width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--content-width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--content-width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,

      '--content-min-height-desktop': `${minHeightControl?.desktop?.value}${minHeightControl?.desktop?.unit}`,
      '--content-min-height-tablet': `${minHeightControl?.tablet?.value}${minHeightControl?.tablet?.unit}`,
      '--content-min-height-mobile': `${minHeightControl?.mobile?.value}${minHeightControl?.mobile?.unit}`,

      '--flex-direction-desktop': directionControl?.desktop ?? 'column',
      '--flex-direction-tablet': directionControl?.tablet ?? 'column',
      '--flex-direction-mobile': directionControl?.mobile ?? 'column',

      '--flex-justify-content-desktop':
        contentDirectionControl?.desktop ?? 'initial',
      '--flex-justify-content-tablet':
        contentDirectionControl?.tablet ?? 'initial',
      '--flex-justify-content-mobile':
        contentDirectionControl?.mobile ?? 'initial',

      '--flex-align-items-desktop': alignItemsControl?.desktop ?? 'initial',
      '--flex-align-items-tablet': alignItemsControl?.tablet ?? 'initial',
      '--flex-align-items-mobile': alignItemsControl?.mobile ?? 'initial',

      '--flex-column-gap-desktop': `${columnGapControl?.desktop?.value}${columnGapControl?.desktop?.unit}`,
      '--flex-column-gap-tablet': `${columnGapControl?.tablet?.value}${columnGapControl?.tablet?.unit}`,
      '--flex-column-gap-mobile': `${columnGapControl?.mobile?.value}${columnGapControl?.mobile?.unit}`,

      '--flex-row-gap-desktop': `${rowGapControl?.desktop?.value}${rowGapControl?.desktop?.unit}`,
      '--flex-row-gap-tablet': `${rowGapControl?.tablet?.value}${rowGapControl?.tablet?.unit}`,
      '--flex-row-gap-mobile': `${rowGapControl?.mobile?.value}${rowGapControl?.mobile?.unit}`,

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

      '--item-background-color':
        backgroundControl?.color ?? 'rgba(255, 255, 255, 1)',

      // '--item-background-image': backgroundControl?.gradient
      //   ? `linear-gradient(${backgroundControl?.gradient?.angle}deg, ${backgroundControl?.gradient?.color1} ${backgroundControl?.gradient?.locations[0]}%, ${backgroundControl?.gradient?.color2} ${backgroundControl?.gradient?.locations[1]}%)`
      //   : '',
      '--item-background-image': `linear-gradient(${
        backgroundControl?.gradient?.angle ?? 0
      }deg, ${
        backgroundControl?.gradient?.color1 ?? 'rgba(255, 255, 255, 0)'
      } ${backgroundControl?.gradient?.locations[0] ?? 0}%, ${
        backgroundControl?.gradient?.color2 ?? 'rgba(255, 255, 255, 0)'
      } ${backgroundControl?.gradient?.locations[1] ?? 100}%)`,
    } as React.CSSProperties;

    return (
      <div
        className="flex-container [&_>div>div]:min-h-[50px] item-radius item-padding mx-auto wrapper-item-background"
        style={{ ...styleProperties }}
      >
        {backgroundControl?.backgroundType === 'image' ? (
          <div
            className="absolute top-0 left-0 h-full w-full"
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
        <DropZone zone="item" />
      </div>
    );
  },
};
