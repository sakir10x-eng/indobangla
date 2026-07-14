import { ComponentConfig } from '@measured/puck';
import cn from 'classnames';
import React from 'react';
import BackgroundGenerator from '@/components/builder/control/background';
import BordersGenerator from '@/components/builder/control/borders';
import AlignmentGenerator from '@/components/builder/control/choose';
import CustomColorPicker from '@/components/builder/control/color-picker';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import SelectControl from '@/components/builder/control/select';
import SlideControl from '@/components/builder/control/slider';
import { checkIfValidJson } from '@/components/builder/utils/helper';
import { isString } from 'lodash';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from 'lucide-react';
import Link from 'next/link';

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
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    buttons: {
      type: 'array',
      label: 'Buttons',
      getItemSummary: (item) => item.label || 'Button',
      defaultItemProps: {
        label: 'Button Text',
        href: '#',
        radius:
          '{"desktop":{"value":0.625,"unit":"rem"},"tablet":{"value":0.625,"unit":"rem"},"mobile":{"value":0.625,"unit":"rem"}}',
        fontSize:
          '{"desktop":{"value":1,"unit":"rem"},"tablet":{"value":1,"unit":"rem"},"mobile":{"value":1,"unit":"rem"}}',
        border: {
          width:
            '{"desktop":{"top":"1","right":"1","bottom":"1","left":"1","unit":"px"},"tablet":{"top":"1","right":"1","bottom":"1","left":"1","unit":"px"},"mobile":{"top":"1","right":"1","bottom":"1","left":"1","unit":"px"}}',
          style: '{"desktop":"solid","mobile":"solid","tablet":"solid"}',
          color: 'rgba(25, 27, 30, 1)',
        },
        padding:
          '{"desktop": {"top": "1.19","right": "2","bottom": "1.19","left": "2","unit": "rem"},"tablet": {"top": "0.95","right": "2","bottom": "0.95","left": "2","unit": "rem"},"mobile": {"top": "0.7","right": "1.25","bottom": "0.7","left": "1.25","unit": "rem"}}',
        background:
          '{"backgroundType":"color","color":"rgba(53, 196, 215, 0)"}',
        color: 'rgba(25, 27, 30, 1)',
      },
      arrayFields: {
        label: { type: 'text', label: 'Label' },
        href: { type: 'text', label: 'Href' },
        fontSize: {
          type: 'custom',
          label: 'Size',
          render: ({ field, onChange, value }) => {
            return (
              <div className="border-t border-t-[#dcdcdc] mt-4 pt-4">
                <SlideControl
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
                  }}
                />
              </div>
            );
          },
        },
        radius: {
          type: 'custom',
          label: 'Radius',
          render: ({ field, onChange, value }) => {
            return (
              <div className="border-t border-t-[#dcdcdc] mt-4 pt-4">
                <SlideControl
                  onChange={onChange}
                  value={value}
                  label={field?.label ?? ''}
                />
              </div>
            );
          },
        },
        padding: {
          type: 'custom',
          label: 'Padding',
          render: ({ onChange, value, field }) => {
            return (
              <div className="pt-4">
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
              </div>
            );
          },
        },
        color: {
          label: 'Color',
          type: 'custom',
          render: ({ field, onChange, value }) => (
            <CustomColorPicker
              color={value}
              onChange={(color) => onChange(color)}
              label={field?.label}
            />
          ),
        },
        background: {
          type: 'custom',
          label: 'Background',
          render: ({ onChange, value, field }) => (
            <div className="border-t border-t-[#dcdcdc] mt-4 pt-4">
              <BackgroundGenerator
                onChange={onChange}
                value={value}
                label={field?.label ?? ''}
              />
            </div>
          ),
        },
        border: {
          type: 'object',
          label: 'Border',
          objectFields: {
            width: {
              type: 'custom',
              label: 'Width',
              render: ({ onChange, value, field }) => {
                return (
                  <BordersGenerator
                    onChange={onChange}
                    value={value}
                    label={field?.label ?? ''}
                  />
                );
              },
            },
            style: {
              type: 'custom',
              label: 'Style',
              render: ({ field, onChange, value }) => {
                return (
                  <SelectControl
                    onChange={onChange}
                    value={value}
                    label={field?.label ?? ''}
                    items={[
                      {
                        label: 'None',
                        value: 'none',
                      },
                      {
                        label: 'Solid',
                        value: 'solid',
                      },
                      {
                        label: 'Double',
                        value: 'double',
                      },
                      {
                        label: 'Dotted',
                        value: 'dotted',
                      },
                      {
                        label: 'Dashed',
                        value: 'dashed',
                      },
                      {
                        label: 'Groove',
                        value: 'groove',
                      },
                    ]}
                  />
                );
              },
            },
            color: {
              label: 'Color',
              type: 'custom',
              render: ({ field, onChange, value }) => (
                <CustomColorPicker
                  color={value}
                  onChange={(color) => onChange(color)}
                  label={field?.label}
                />
              ),
            },
          },
        },
      },
    },
    align: {
      type: 'custom',
      label: 'Align',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            chooses={[
              {
                key: 'flex-start',
                title: 'Left',
                value: <AlignLeftIcon />,
              },
              {
                key: 'center',
                title: 'Center',
                value: <AlignCenterIcon />,
              },
              {
                key: 'flex-end',
                title: 'Right',
                value: <AlignRightIcon />,
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
                max: 100,
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
                max: 100,
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
    buttons: [
      {
        label: 'Button Text',
        href: '#',
        radius:
          '{"desktop":{"value":0.625,"unit":"rem"},"tablet":{"value":0.625,"unit":"rem"},"mobile":{"value":0.625,"unit":"rem"}}',
        fontSize:
          '{"desktop":{"value":1,"unit":"rem"},"tablet":{"value":1,"unit":"rem"},"mobile":{"value":1,"unit":"rem"}}',
        border: {
          width:
            '{"desktop":{"top":"0","right":"0","bottom":"0","left":"0","unit":"px"},"tablet":{"top":"0","right":"0","bottom":"0","left":"0","unit":"px"},"mobile":{"top":"0","right":"0","bottom":"0","left":"0","unit":"px"}}',
          style: '{"desktop":"none","mobile":"none","tablet":"none"}',
          color: 'rgba(25, 27, 30, 1)',
        },
        padding:
          '{"desktop": {"top": "1.25","right": "2","bottom": "1.25","left": "2","unit": "rem"},"tablet": {"top": "1","right": "2","bottom": "1","left": "2","unit": "rem"},"mobile": {"top": "0.75","right": "1.25","bottom": "0.75","left": "1.25","unit": "rem"}}',
        background:
          '{"backgroundType":"color","color":"rgba(53, 196, 215, 1)"}',
        color: 'rgba(255, 255, 255, 1)',
      },
    ],
    columnGap:
      '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":20,"unit":"px"}}',
    rowGap:
      '{"desktop":{"value":20,"unit":"px"},"tablet":{"value":20,"unit":"px"},"mobile":{"value":20,"unit":"px"}}',
    widgetTitle: 'Button group',
    align: '{"desktop":"center","tablet":"center","mobile":"center"}',
  },
  render: ({ align, buttons, columnGap, rowGap }) => {
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

    const alignControl = align
      ? isString(align) && checkIfValidJson(align)
        ? JSON.parse(align)
        : align
      : '';

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
          'flex flex-wrap items-center grid-row-gap grid-column-gap item-justify-content',
        )}
        style={{ ...styleProperties }}
      >
        {buttons.map((button, i) => {
          const sizeControl = button?.fontSize
            ? isString(button?.fontSize) && checkIfValidJson(button?.fontSize)
              ? JSON.parse(button?.fontSize)
              : button?.fontSize
            : '';

          const radiusControl = button?.radius
            ? isString(button?.radius) && checkIfValidJson(button?.radius)
              ? JSON.parse(button?.radius)
              : button?.radius
            : '';

          const paddingControl = button?.padding
            ? isString(button?.padding) && checkIfValidJson(button?.padding)
              ? JSON.parse(button?.padding)
              : button?.padding
            : '';

          const backgroundControl = button?.background
            ? isString(button?.background) &&
              checkIfValidJson(button?.background)
              ? JSON.parse(button?.background)
              : button?.background
            : '';

          const borderControl = button?.border
            ? isString(button?.border) && checkIfValidJson(button?.border)
              ? JSON.parse(button?.border)
              : button?.border
            : '';

          const borderStyle = borderControl?.style
            ? isString(borderControl?.style) &&
              checkIfValidJson(borderControl?.style)
              ? JSON.parse(borderControl?.style)
              : borderControl?.style
            : '';

          const borderWidth = borderControl?.width
            ? isString(borderControl?.width) &&
              checkIfValidJson(borderControl?.width)
              ? JSON.parse(borderControl?.width)
              : borderControl?.width
            : '';

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
              backgroundControl?.color ?? 'rgba(255, 255, 255, 1)',

            // '--item-background-image': `linear-gradient(${backgroundControl?.gradient?.angle}deg, ${backgroundControl?.gradient?.color1} ${backgroundControl?.gradient?.locations[0]}%, ${backgroundControl?.gradient?.color2} ${backgroundControl?.gradient?.locations[1]}%)`,
            '--item-background-image': `linear-gradient(${
              backgroundControl?.gradient?.angle ?? 0
            }deg, ${
              backgroundControl?.gradient?.color1 ?? 'rgba(255, 255, 255, 0)'
            } ${backgroundControl?.gradient?.locations[0] ?? 0}%, ${
              backgroundControl?.gradient?.color2 ?? 'rgba(255, 255, 255, 0)'
            } ${backgroundControl?.gradient?.locations[1] ?? 100}%)`,

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
                'font-medium item-size item-radius item-padding item-text-color item-background relative item-border',
              )}
              style={{ ...buttonStyleProperties }}
            >
              {backgroundControl?.backgroundType === 'image' ? (
                <span
                  className="absolute top-0 left-0 block w-full h-full"
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
