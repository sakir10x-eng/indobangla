import AlignmentGenerator from '@/components/builder/control/choose';
import SelectControl from '@/components/builder/control/select';
import SlideControl from '@/components/builder/control/slider';
import { checkIfValidJson } from '@/components/builder/utils/helper';
import Uploader from '@/components/common/uploader';
import TooltipLabel from '@/components/ui/tooltip-label';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types';
import { ComponentConfig } from '@measured/puck';
import { isString } from 'lodash';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
} from 'lucide-react';
import Image from 'next/image';
import placeholderImage from '@/assets/placeholders/product.svg';

export type ThumbnailProps = {
  objectAlignment: string;
  image?: Attachment;
  width: string;
  height: string;
  widgetTitle: string;
  horizontalOrientation: string;
  verticalOrientation: string;
  directionX: string;
  directionY: string;
  position: string;
};

export const Thumbnail: ComponentConfig<ThumbnailProps> = {
  fields: {
    widgetTitle: {
      label: 'Widget title',
      type: 'text',
    },
    image: {
      label: 'Image',
      type: 'custom',
      render: ({ field, id, onChange, value }) => (
        <>
          <TooltipLabel label={field?.label} />
          <Uploader
            onChange={(attachment: Attachment) => onChange(attachment)}
            value={value}
            name={id}
          />
        </>
      ),
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
      label: 'Height',
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
    position: {
      type: 'custom',
      label: 'Style',
      render: ({ field, onChange, value }) => {
        return (
          <SelectControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            items={[
              { label: 'Relative', value: 'relative' },
              { label: 'Absolute', value: 'absolute' },
            ]}
          />
        );
      },
    },
    horizontalOrientation: {
      type: 'custom',
      label: 'Horizontal Orientation',
      render: ({ field, onChange, value }) => (
        <AlignmentGenerator
          onChange={onChange}
          value={value}
          label={field?.label ?? ''}
          chooses={[
            {
              key: 'left',
              value: <ArrowLeftToLine />,
              title: 'Left',
            },
            {
              key: 'right',
              value: <ArrowRightToLine />,
              title: 'Right',
            },
          ]}
        />
      ),
    },
    directionX: {
      type: 'custom',
      label: 'Offset',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            isValidation={false}
            unitRanges={{
              px: {
                min: -1000,
                max: 1000,
                step: 1,
              },
              '%': {
                min: -200,
                max: 200,
                step: 1,
              },
              vw: {
                min: -200,
                max: 200,
                step: 1,
              },
              vh: {
                min: -200,
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
        );
      },
    },
    verticalOrientation: {
      type: 'custom',
      label: 'Vertical Orientation',
      render: ({ field, onChange, value }) => (
        <AlignmentGenerator
          onChange={onChange}
          value={value}
          label={field?.label ?? ''}
          chooses={[
            {
              key: 'top',
              value: <ArrowUpToLine />,
              title: 'Top',
            },
            {
              key: 'bottom',
              value: <ArrowDownToLine />,
              title: 'Bottom',
            },
          ]}
        />
      ),
    },
    directionY: {
      type: 'custom',
      label: 'Offset',
      render: ({ field, onChange, value }) => {
        return (
          <SlideControl
            onChange={onChange}
            value={value}
            label={field?.label ?? ''}
            isValidation={false}
            unitRanges={{
              px: {
                min: -1000,
                max: 1000,
                step: 1,
              },
              '%': {
                min: -200,
                max: 200,
                step: 1,
              },
              vw: {
                min: -200,
                max: 200,
                step: 1,
              },
              vh: {
                min: -200,
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
        );
      },
    },
  },
  defaultProps: {
    objectAlignment:
      '{"desktop":"flex-start","tablet":"flex-start","mobile":"flex-start"}',
    image: { original: '', thumbnail: '' },
    width:
      '{"desktop":{"value":100,"unit":"px"},"tablet":{"value":100,"unit":"px"},"mobile":{"value":100,"unit":"px"}}',
    height:
      '{"desktop":{"value":100,"unit":"px"},"tablet":{"value":100,"unit":"px"},"mobile":{"value":100,"unit":"px"}}',
    widgetTitle: 'Thumbnail',
    horizontalOrientation: '{"desktop":"left","tablet":"left","mobile":"left"}',
    verticalOrientation: '{"desktop":"top","tablet":"top","mobile":"top"}',
    directionX:
      '{"desktop":{"value":0,"unit":"px"},"tablet":{"value":0,"unit":"px"},"mobile":{"value":0,"unit":"px"}}',
    directionY:
      '{"desktop":{"value":0,"unit":"px"},"tablet":{"value":0,"unit":"px"},"mobile":{"value":0,"unit":"px"}}',
    position: '{"desktop":"relative","tablet":"relative","mobile":"relative"}',
  },
  render: ({
    objectAlignment,
    image,
    width,
    height,
    horizontalOrientation,
    verticalOrientation,
    directionX,
    directionY,
    position,
  }) => {
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
    const objectAlignControl = objectAlignment
      ? isString(objectAlignment) && checkIfValidJson(objectAlignment)
        ? JSON.parse(objectAlignment)
        : objectAlignment
      : '';
    const positionControl = position
      ? isString(position) && checkIfValidJson(position)
        ? JSON.parse(position)
        : position
      : '';
    const xOrientationControl = horizontalOrientation
      ? isString(horizontalOrientation) &&
        checkIfValidJson(horizontalOrientation)
        ? JSON.parse(horizontalOrientation)
        : horizontalOrientation
      : '';
    const xDirectionControl = directionX
      ? isString(directionX) && checkIfValidJson(directionX)
        ? JSON.parse(directionX)
        : directionX
      : '';
    const yOrientationControl = verticalOrientation
      ? isString(verticalOrientation) && checkIfValidJson(verticalOrientation)
        ? JSON.parse(verticalOrientation)
        : verticalOrientation
      : '';
    const yDirectionControl = directionY
      ? isString(directionY) && checkIfValidJson(directionY)
        ? JSON.parse(directionY)
        : directionY
      : '';
    const styleProperties = {
      '--width-desktop': `${widthControl?.desktop?.value}${widthControl?.desktop?.unit}`,
      '--width-tablet': `${widthControl?.tablet?.value}${widthControl?.tablet?.unit}`,
      '--width-mobile': `${widthControl?.mobile?.value}${widthControl?.mobile?.unit}`,

      '--minHeight-desktop': `${heightControl?.desktop?.value}${heightControl?.desktop?.unit}`,
      '--minHeight-tablet': `${heightControl?.tablet?.value}${heightControl?.tablet?.unit}`,
      '--minHeight-mobile': `${heightControl?.mobile?.value}${heightControl?.mobile?.unit}`,
    } as React.CSSProperties;

    const stylePositionProperties = {
      '--position-desktop': positionControl?.desktop ?? 'relative',
      '--position-tablet': positionControl?.tablet ?? 'relative',
      '--position-mobile': positionControl?.mobile ?? 'relative',

      '--offset-left-desktop':
        xOrientationControl?.desktop === 'left'
          ? `${xDirectionControl?.desktop?.value}${xDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-left-tablet':
        xOrientationControl?.tablet === 'left'
          ? `${xDirectionControl?.tablet?.value}${xDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-left-mobile':
        xOrientationControl?.mobile === 'left'
          ? `${xDirectionControl?.mobile?.value}${xDirectionControl?.mobile?.unit}`
          : 'auto',

      '--offset-right-desktop':
        xOrientationControl?.desktop === 'right'
          ? `${xDirectionControl?.desktop?.value}${xDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-right-tablet':
        xOrientationControl?.tablet === 'right'
          ? `${xDirectionControl?.tablet?.value}${xDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-right-mobile':
        xOrientationControl?.mobile === 'right'
          ? `${xDirectionControl?.mobile?.value}${xDirectionControl?.mobile?.unit}`
          : 'auto',

      '--offset-top-desktop':
        yOrientationControl?.desktop === 'top'
          ? `${yDirectionControl?.desktop?.value}${yDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-top-tablet':
        yOrientationControl?.tablet === 'top'
          ? `${yDirectionControl?.tablet?.value}${yDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-top-mobile':
        yOrientationControl?.mobile === 'top'
          ? `${yDirectionControl?.mobile?.value}${yDirectionControl?.mobile?.unit}`
          : 'auto',

      '--offset-bottom-desktop':
        yOrientationControl?.desktop === 'bottom'
          ? `${yDirectionControl?.desktop?.value}${yDirectionControl?.desktop?.unit}`
          : 'auto',
      '--offset-bottom-tablet':
        yOrientationControl?.tablet === 'bottom'
          ? `${yDirectionControl?.tablet?.value}${yDirectionControl?.tablet?.unit}`
          : 'auto',
      '--offset-bottom-mobile':
        yOrientationControl?.mobile === 'bottom'
          ? `${yDirectionControl?.mobile?.value}${yDirectionControl?.mobile?.unit}`
          : 'auto',
    } as React.CSSProperties;

    const styleAlignProperties = {
      '--object-justify-align-desktop':
        objectAlignControl?.desktop ?? 'flex-start',
      '--object-justify-align-tablet':
        objectAlignControl?.tablet ?? 'flex-start',
      '--object-justify-align-mobile':
        objectAlignControl?.mobile ?? 'flex-start',
    } as React.CSSProperties;

    return (
      <div
        className="min-h-[35px] flex item-object-justify-alignment"
        style={{ ...styleAlignProperties }}
      >
        {image && image?.original ? (
          <div
            className={cn('item-position')}
            style={{ ...stylePositionProperties }}
          >
            <div
              className="relative pointer-events-none item-width item-minHeight"
              style={{
                ...styleProperties,
              }}
            >
              <Image
                className="item-width item-minHeight"
                src={image?.original}
                alt={image?.original}
                height={1200}
                width={1200}
              />
            </div>
          </div>
        ) : (
          <div
            className={cn('item-position')}
            style={{ ...stylePositionProperties }}
          >
            <div
              className="relative pointer-events-none item-width item-minHeight border rounded-lg"
              style={{
                ...styleProperties,
              }}
            >
              <Image
                className="item-width item-minHeight"
                src={placeholderImage}
                alt={'placeholder'}
                height={1200}
                width={1200}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
};
