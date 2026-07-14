import BackgroundGenerator from '@/components/builder/control/background';
import BordersGenerator from '@/components/builder/control/borders';
import AlignmentGenerator from '@/components/builder/control/choose';
import CustomColorPicker from '@/components/builder/control/color-picker';
import DimensionsGenerator from '@/components/builder/control/dimensions';
import SelectControl from '@/components/builder/control/select';
import SlideControl from '@/components/builder/control/slider';
import { checkIfValidJson, hexToRgb } from '@/components/builder/utils/helper';
import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { Switch } from '@headlessui/react';
import { ComponentConfig, DropZone } from '@measured/puck';
import { isString } from 'lodash';
import {
  AlignCenterIcon,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeftIcon,
  AlignRightIcon,
} from 'lucide-react';
import Link from 'next/link';

const bgPixelImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAGklEQVQIW2NkYGD4D8SMQAwGcAY2AbBKDBUAVuYCBQPd34sAAAAASUVORK5CYII';

export type SectionBlockProps = {
  width: string;
  padding: string;
  height: string;
  border: {
    width: string;
    style: string;
    color: string;
  };
  background: string;
  backgroundOverlay: string;
  bgPixelEffect?: 'yes' | 'no';
  radius: string;
  objectAlignment: string;
  justifyItems: string;
  widgetTitle: string;
  display: boolean;
  link?: string;
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
                value ? 'bg-accent' : 'bg-gray-300'
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
    link: {
      label: 'Link',
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
            }}
          />
        );
      },
    },
    height: {
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
                max: 1200,
                step: 1,
              },
              rem: {
                min: 0,
                max: 100,
                step: 0.1,
              },
              em: {
                min: 0,
                max: 100,
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
    objectAlignment: {
      type: 'custom',
      label: 'Object Alignment',
      render: ({ onChange, value, field }) => {
        return (
          <AlignmentGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            chooses={[
              {
                key: '0 auto 0 0',
                title: 'Left',
                value: <AlignLeftIcon />,
              },
              {
                key: '0 auto',
                title: 'Center',
                value: <AlignCenterIcon />,
              },
              {
                key: '0 0 0 auto',
                title: 'Right',
                value: <AlignRightIcon />,
              },
            ]}
          />
        );
      },
    },
    justifyItems: {
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
            ]}
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
          />
        );
      },
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
    background: {
      type: 'custom',
      label: 'Background',
      render: ({ onChange, value, field }) => {
        return (
          <BackgroundGenerator
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
          />
        );
      },
    },
    backgroundOverlay: {
      type: 'custom',
      label: 'Overlay Background',
      render: ({ onChange, value, field }) => (
        <BackgroundGenerator
          onChange={onChange}
          value={value}
          label={field?.label ?? ''}
          isBgImage={false}
          isGradient={false}
        />
      ),
    },
    bgPixelEffect: {
      type: 'radio',
      label: 'Add Background Pixel Effect',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
    },
  },
  defaultProps: {
    display: false,
    objectAlignment:
      '{"desktop":"0 auto 0 0","tablet":"0 auto 0 0","mobile":"0 auto 0 0"}',
    justifyItems:
      '{"desktop":"flex-start","tablet":"flex-start","mobile":"flex-start"}',
    width:
      '{"desktop":{"value":100,"unit":"%"},"tablet":{"value":100,"unit":"%"},"mobile":{"value":100,"unit":"%"}}',
    height:
      '{"desktop":{"value":70,"unit":"px"},"tablet":{"value":70,"unit":"px"},"mobile":{"value":70,"unit":"px"}}',
    background: '{"backgroundType":"color","color":"rgba(255, 255, 255, 1)"}',
    backgroundOverlay: '{"backgroundType":"color","color":"rgba(0, 0, 0, 0)"}',
    bgPixelEffect: 'no',
    border: {
      width:
        '{"desktop":{"top":"1","right":"1","bottom":"1","left":"1","unit":"px"},"tablet":{"top":"1","right":"1","bottom":"1","left":"1","unit":"px"},"mobile":{"top":"1","right":"1","bottom":"1","left":"1","unit":"px"}}',
      style: '{"desktop":"none","mobile":"none","tablet":"none"}',
      color: 'rgba(25, 27, 30, 1)',
    },
    padding:
      '{"desktop": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"tablet": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"},"mobile": {"top": "0","right": "0","bottom": "0","left": "0","unit": "px"}}',
    radius:
      '{"desktop":{"value":0,"unit":"px"},"tablet":{"value":0,"unit":"px"},"mobile":{"value":0,"unit":"px"}}',
    widgetTitle: 'Section',
    link: '',
  },
  render: ({
    width,
    height,
    radius,
    objectAlignment,
    background,
    backgroundOverlay,
    bgPixelEffect,
    padding,
    border,
    justifyItems,
    link,
  }) => {
    const paddingControl = padding
      ? isString(padding) && checkIfValidJson(padding)
        ? JSON.parse(padding)
        : padding
      : '';
    const radiusControl = radius
      ? isString(radius) && checkIfValidJson(radius)
        ? JSON.parse(radius)
        : radius
      : '';
    const widthControl = width
      ? isString(width) && checkIfValidJson(width)
        ? JSON.parse(width)
        : width
      : '';
    const heightControl = height
      ? isString(height) && checkIfValidJson(height)
        ? JSON.parse(height)
        : height
      : '';
    const backgroundControl = background
      ? isString(background) && checkIfValidJson(background)
        ? JSON.parse(background)
        : background
      : '';
    const backgroundOverlayControl = backgroundOverlay
      ? isString(backgroundOverlay) && checkIfValidJson(backgroundOverlay)
        ? JSON.parse(backgroundOverlay)
        : backgroundOverlay
      : '';

    const objectAlignControl = objectAlignment
      ? isString(objectAlignment) && checkIfValidJson(objectAlignment)
        ? JSON.parse(objectAlignment)
        : objectAlignment
      : '';

    const borderControl = border
      ? isString(border) && checkIfValidJson(border)
        ? JSON.parse(border)
        : border
      : '';

    const borderStyle = borderControl?.style
      ? isString(borderControl?.style) && checkIfValidJson(borderControl?.style)
        ? JSON.parse(borderControl?.style)
        : borderControl?.style
      : '';

    const borderWidth = borderControl?.width
      ? isString(borderControl?.width) && checkIfValidJson(borderControl?.width)
        ? JSON.parse(borderControl?.width)
        : borderControl?.width
      : '';

    const justifyItemsControl = justifyItems
      ? isString(justifyItems) && checkIfValidJson(justifyItems)
        ? JSON.parse(justifyItems)
        : justifyItems
      : '';
    const styleProperties = {
      '--radius-desktop': `${radiusControl?.desktop?.value}${radiusControl?.desktop?.unit}`,
      '--radius-tablet': `${radiusControl?.tablet?.value}${radiusControl?.tablet?.unit}`,
      '--radius-mobile': `${radiusControl?.mobile?.value}${radiusControl?.mobile?.unit}`,
      '--width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,
      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,

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

      '--object-align-desktop': objectAlignControl?.desktop ?? '',
      '--object-align-tablet': objectAlignControl?.tablet ?? '',
      '--object-align-mobile': objectAlignControl?.mobile ?? '',

      '--border-style-desktop': borderStyle?.desktop ?? 'none',
      '--border-style-tablet': borderStyle?.tablet ?? 'none',
      '--border-style-mobile': borderStyle?.mobile ?? 'none',

      '--item-border-color': borderControl?.color ?? 'rgba(25, 27, 30, 1)',

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

      '--flex-justify-content-desktop':
        justifyItemsControl?.desktop ?? 'initial',
      '--flex-justify-content-tablet': justifyItemsControl?.tablet ?? 'initial',
      '--flex-justify-content-mobile': justifyItemsControl?.mobile ?? 'initial',
    } as React.CSSProperties;

    const overlayStyleProperties = {
      '--item-background-overlay-color':
        backgroundOverlayControl?.color ?? 'rgba(0, 0, 0, 0)',
    } as React.CSSProperties;
    return (
      <div
        className={cn(
          'relative flex flex-col item-border item-padding overflow-hidden item-radius item-width item-minHeight item-background item-border item-object-alignment item-content-align',
        )}
        style={{
          ...styleProperties,
        }}
      >
        {link && (
          <Link className="absolute inset-0 h-full w-full z-[2]" href={link} />
        )}
        {backgroundControl?.backgroundType === 'image' ? (
          <div
            className="absolute top-0 left-0 w-full h-full item-radius"
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
        <div
          className="absolute top-0 left-0 z-0 w-full h-full overflow-hidden pointer-events-none item-overlay-background item-radius"
          style={{ ...overlayStyleProperties }}
        >
          {bgPixelEffect === 'yes' ? (
            <div
              className="absolute top-0 left-0 z-10 w-full h-full"
              style={{ backgroundImage: `url("${bgPixelImage}")` }}
            />
          ) : (
            ''
          )}
        </div>
        <div className="relative z-10 w-full h-full">
          <DropZone zone={`item`} />
        </div>
      </div>
    );
  },
};
