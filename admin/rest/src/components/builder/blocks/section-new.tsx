import React from 'react';
import { ComponentConfig, DropZone, FieldLabel } from '@measured/puck';
import { Attachment } from '@/types';
import TooltipLabel from '@/components/ui/tooltip-label';
import Uploader from '@/components/common/uploader';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  borderBottomWidthOptions,
  borderLeftWidthOptions,
  borderRightWidthOptions,
  borderStyleOptions,
  borderTopWidthOptions,
  borderWidthOptions,
  objectAlignmentOptions,
  paddingBottomOptions,
  paddingLeftOptions,
  paddingRightOptions,
  paddingTopOptions,
  radiusOptions,
} from '@/components/builder/blocks/options';
import { checkIfValidJson, hexToRgb } from '@/components/builder/utils/helper';
import { Switch } from '@headlessui/react';
import BackgroundGenerator from '@/components/builder/control/background';
import { isString } from 'lodash';

export type SectionBlockProps = {
  display: boolean;
  width?: string;
  padding?: {
    paddingLeft?: string;
    paddingRight?: string;
    paddingTop?: string;
    paddingBottom?: string;
  };
  border?: {
    borderWidth?: string;
    borderLeftWidth?: string;
    borderRightWidth?: string;
    borderTopWidth?: string;
    borderBottomWidth?: string;
    borderStyle?: string;
    colors: {
      color: string;
      colorDark: string;
    };
  };
  // background?: {
  //   bgImage?: Attachment;
  //   bgColor: {
  //     color: string;
  //     colorDark: string;
  //     bgOpacity: string;
  //   };
  //   bgOverlay: { color: string; colorDark: string };
  //   bgOverlayOpacity?: string;
  // };
  background: string;
  height?: string;
  radius?: string;
  objectAlign?: string;
  contentAlign: 'start' | 'middle' | 'end' | 'none';
  widgetTitle: string;
};

export const Section: ComponentConfig<SectionBlockProps> = {
  fields: {
    display: {
      type: 'custom',
      label: 'Hide section?',
      render: ({ field, id, name, onChange, value }) => {
        return (
          <div className="flex items-center gap-2">
            <TooltipLabel label={field?.label} htmlFor={id} className="mb-0" />
            <Switch
              id={id}
              name={name}
              checked={value}
              onChange={(e) => onChange(e)}
              className={`${
                value ? 'bg-gray-1000' : 'bg-gray-300'
              } relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none`}
            >
              <span
                className={`${
                  value ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-light transition-transform`}
              />
            </Switch>
          </div>
        );
      },
    },
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    width: {
      label: 'Width',
      type: 'text',
    },
    height: {
      label: 'Min Height',
      type: 'text',
    },
    radius: {
      type: 'select',
      label: 'Radius',
      options: radiusOptions,
    },
    objectAlign: {
      type: 'select',
      label: 'Object Alignment',
      options: objectAlignmentOptions,
    },
    contentAlign: {
      type: 'radio',
      label: 'Content Alignment',
      options: [
        { label: 'Start', value: 'start' },
        { label: 'Middle', value: 'middle' },
        { label: 'End', value: 'end' },
        { label: 'None', value: 'none' },
      ],
    },
    padding: {
      type: 'object',
      label: 'Padding',
      objectFields: {
        paddingLeft: {
          label: 'Padding Left',
          type: 'select',
          options: paddingLeftOptions,
        },
        paddingRight: {
          label: 'Padding Right',
          type: 'select',
          options: paddingRightOptions,
        },
        paddingTop: {
          label: 'Padding Top',
          type: 'select',
          options: paddingTopOptions,
        },
        paddingBottom: {
          label: 'Padding Bottom',
          type: 'select',
          options: paddingBottomOptions,
        },
      },
    },
    border: {
      type: 'object',
      label: 'Border',
      objectFields: {
        borderWidth: {
          label: 'Border Width',
          type: 'select',
          options: borderWidthOptions,
        },
        borderLeftWidth: {
          label: 'Border Left Width',
          type: 'select',
          options: borderLeftWidthOptions,
        },
        borderRightWidth: {
          label: 'Border Right Width',
          type: 'select',
          options: borderRightWidthOptions,
        },
        borderTopWidth: {
          label: 'Border Top Width',
          type: 'select',
          options: borderTopWidthOptions,
        },
        borderBottomWidth: {
          label: 'Border Bottom Width',
          type: 'select',
          options: borderBottomWidthOptions,
        },
        borderStyle: {
          label: 'Border Style',
          type: 'select',
          options: borderStyleOptions,
        },
        colors: {
          label: 'Colors',
          type: 'object',
          objectFields: {
            color: {
              label: 'Light',
              type: 'custom',
              render: ({ field, id, name, onChange, value }) => (
                <FieldLabel label={field?.label ?? ''}>
                  <input
                    id={id}
                    name={name}
                    type="color"
                    onChange={(e) => onChange(e?.target?.value)}
                    value={value}
                  />
                </FieldLabel>
              ),
            },
            colorDark: {
              label: 'Dark',
              type: 'custom',
              render: ({ field, id, name, onChange, value }) => (
                <FieldLabel label={field?.label ?? ''}>
                  <input
                    id={id}
                    name={name}
                    type="color"
                    onChange={(e) => onChange(e?.target?.value)}
                    value={value}
                  />
                </FieldLabel>
              ),
            },
          },
        },
      },
    },

    // background: {
    //   type: 'object',
    //   label: 'Background',
    //   objectFields: {
    //     bgColor: {
    //       label: 'Colors',
    //       type: 'object',
    //       objectFields: {
    //         color: {
    //           label: 'Light',
    //           type: 'custom',
    //           render: ({ field, id, name, onChange, value }) => (
    //             <FieldLabel label={field?.label ?? ''}>
    //               <input
    //                 id={id}
    //                 name={name}
    //                 type="color"
    //                 onChange={(e) => onChange(e?.target?.value)}
    //                 value={value}
    //               />
    //             </FieldLabel>
    //           ),
    //         },
    //         colorDark: {
    //           label: 'Dark',
    //           type: 'custom',
    //           render: ({ field, id, name, onChange, value }) => (
    //             <FieldLabel label={field?.label ?? ''}>
    //               <input
    //                 id={id}
    //                 name={name}
    //                 type="color"
    //                 onChange={(e) => onChange(e?.target?.value)}
    //                 value={value}
    //               />
    //             </FieldLabel>
    //           ),
    //         },
    //         bgOpacity: {
    //           label: 'Background Opacity',
    //           type: 'select',
    //           options: [
    //             { label: '0', value: '0' },
    //             { label: '10', value: '0.10' },
    //             { label: '20', value: '0.20' },
    //             { label: '30', value: '0.30' },
    //             { label: '40', value: '0.40' },
    //             { label: '50', value: '0.50' },
    //             { label: '60', value: '0.60' },
    //             { label: '70', value: '0.70' },
    //             { label: '80', value: '0.80' },
    //             { label: '90', value: '0.90' },
    //             { label: '100', value: '100' },
    //           ],
    //         },
    //       },
    //     },
    //     bgImage: {
    //       label: 'Background Image',
    //       type: 'custom',
    //       render: ({ field, id, onChange, value }) => (
    //         <>
    //           <TooltipLabel label={field?.label} />
    //           <Uploader
    //             onChange={(attachment: Attachment) => onChange(attachment)}
    //             value={value}
    //             name={id}
    //           />
    //         </>
    //       ),
    //     },
    //     bgOverlay: {
    //       label: 'Colors',
    //       type: 'object',
    //       objectFields: {
    //         color: {
    //           label: 'Light',
    //           type: 'custom',
    //           render: ({ field, id, name, onChange, value }) => (
    //             <FieldLabel label={field?.label ?? ''}>
    //               <input
    //                 id={id}
    //                 name={name}
    //                 type="color"
    //                 onChange={(e) => onChange(e?.target?.value)}
    //                 value={value}
    //               />
    //             </FieldLabel>
    //           ),
    //         },
    //         colorDark: {
    //           label: 'Dark',
    //           type: 'custom',
    //           render: ({ field, id, name, onChange, value }) => (
    //             <FieldLabel label={field?.label ?? ''}>
    //               <input
    //                 id={id}
    //                 name={name}
    //                 type="color"
    //                 onChange={(e) => onChange(e?.target?.value)}
    //                 value={value}
    //               />
    //             </FieldLabel>
    //           ),
    //         },
    //       },
    //     },
    //     bgOverlayOpacity: {
    //       label: 'Overlay Opacity',
    //       type: 'select',
    //       options: [
    //         { label: 'opacity-0', value: 'opacity-0' },
    //         { label: 'opacity-10', value: 'opacity-10' },
    //         { label: 'opacity-20', value: 'opacity-20' },
    //         { label: 'opacity-30', value: 'opacity-30' },
    //         { label: 'opacity-40', value: 'opacity-40' },
    //         { label: 'opacity-50', value: 'opacity-50' },
    //         { label: 'opacity-60', value: 'opacity-60' },
    //         { label: 'opacity-70', value: 'opacity-70' },
    //         { label: 'opacity-80', value: 'opacity-80' },
    //         { label: 'opacity-90', value: 'opacity-90' },
    //         { label: 'opacity-100', value: 'opacity-100' },
    //       ],
    //     },
    //   },
    // },
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
  },
  defaultProps: {
    display: false,
    background: '',
    objectAlign: 'text-left',
    contentAlign: 'none',
    width: '100%',
    height: 'auto',
    radius: 'rounded-none',
    // background: {
    //   bgColor: { color: '#ffffff', colorDark: '#242629', bgOpacity: '0' },
    //   bgImage: { original: '', thumbnail: '' },
    //   bgOverlay: { color: '#242629', colorDark: '#ffffff' },
    //   bgOverlayOpacity: 'opacity-0',
    // },
    border: {
      colors: {
        color: '#e8e8e8',
        colorDark: '#47494b',
      },
      borderWidth: '',
      borderLeftWidth: '',
      borderRightWidth: '',
      borderBottomWidth: '',
      borderTopWidth: '',
      borderStyle: 'border-solid',
    },
    padding: {
      paddingLeft: '',
      paddingRight: '',
      paddingBottom: '',
      paddingTop: '',
    },
    widgetTitle: 'Section',
  },
  render: ({
    width,
    height,
    radius,
    objectAlign,
    background,
    padding,
    border,
    contentAlign,
  }) => {
    const backgroundControl = background
      ? isString(background) && checkIfValidJson(background)
        ? JSON.parse(background)
        : background
      : '';
    const styleProperties = {
      '--gray-100': hexToRgb(border?.colors?.color ?? '#e8e8e8'),
      '--tw-bg-opacity': 1,
      '--gray-800': hexToRgb(border?.colors?.colorDark ?? '#47494b'),
      '--item-background-color': hexToRgb(
        backgroundControl?.lightColor ?? '#ffffff',
      ),
      '--item-background-dark-color': hexToRgb(
        backgroundControl?.darkColor ?? '#ffffff',
      ),
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
      '--item-background-position': backgroundControl?.backgroundPosition ?? '',
      '--item-background-repeat': backgroundControl?.backgroundRepeat ?? '',
      '--item-background-size': backgroundControl?.backgroundSize ?? '',
      // '--gray-950': hexToRgb(background?.bgColor?.colorDark ?? '#ffffff'),
    } as React.CSSProperties;
    const overlayStyleProperties = {
      // '--gray-50': hexToRgb(background?.bgOverlay?.colorDark ?? '#ffffff'),
      // '--gray-950': hexToRgb(background?.bgOverlay?.color ?? '#ffffff'),
    } as React.CSSProperties;

    return (
      <div
        className={cn(
          'relative flex flex-col min-h-[70px] border-gray-100 dark:border-gray-800 item-background',
          padding?.paddingLeft,
          padding?.paddingRight,
          padding?.paddingTop,
          padding?.paddingBottom,
          radius,
          border?.borderStyle,
          objectAlign,
          border?.borderWidth,
          border?.borderLeftWidth,
          border?.borderRightWidth,
          border?.borderTopWidth,
          border?.borderBottomWidth,
          contentAlign === 'middle' ? 'items-center justify-center' : '',
          contentAlign === 'start' ? 'items-start justify-center' : '',
          contentAlign === 'end' ? 'items-end justify-center' : '',
        )}
        style={{
          minHeight: height,
          width: width,
          ...styleProperties,
        }}
      >
        {backgroundControl?.image && backgroundControl?.image?.original ? (
          <div
            className={cn(
              'absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none',
              radius,
            )}
            // style={{ ...overlayStyleProperties }}
          >
            <Image
              src={backgroundControl?.image?.original}
              alt={backgroundControl?.image?.original}
              fill
              className="object-cover"
            />
            {/* <div
              className={cn(
                'absolute top-0 left-0 z-0 w-full h-full dark:bg-gray-50 bg-gray-950',
                background?.bgOverlayOpacity,
              )}
              // style={{ backgroundColor: background?.bgOverlay?.color }}
            /> */}
          </div>
        ) : (
          ''
        )}
        <div className="relative z-10 w-full">
          <DropZone zone="item" />
        </div>
      </div>
    );
  },
};
