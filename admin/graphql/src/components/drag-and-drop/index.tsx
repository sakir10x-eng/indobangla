import {
  DragHandle,
  SortableItem,
} from '@/components/drag-and-drop/sortable-item';
import { SortableOverlay } from '@/components/drag-and-drop/sortable-overlay';
import { cn } from '@/lib/utils';
import type { Active, UniqueIdentifier } from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';

interface BaseItem {
  id: UniqueIdentifier;
}

interface Props<T extends BaseItem> {
  items: T[];
  onChange(items: T[]): void;
  renderItem(item: T): ReactNode;
  title?: string;
}

export function SortableList<T extends BaseItem>({
  items,
  onChange,
  renderItem,
  title = 'Rearrange Page Sections',
}: Props<T>) {
  const [active, setActive] = useState<Active | null>(null);
  const [visible, setVisible] = useState(true);
  const activeItem = useMemo(
    () => items?.find((item) => item.id === active?.id),
    [active, items],
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // const toggleVisible = () => {
  //   setVisible((v) => !v);
  // };

  return (
    <>
      <div className="relative flex items-center justify-between gap-4 px-5 py-4 rounded-t-md md:py-6 md:px-8 bg-gray-50">
        <span className="font-semibold">{title}</span>{' '}
        {/* <div
          className="flex items-center text-base font-semibold cursor-pointer whitespace-nowrap text-accent shrink-0 md:ms-5"
          // onClick={toggleVisible}
        >
          {visible ? (
            <ArrowUp className="ms-2" />
          ) : (
            <ArrowDown className="ms-2" />
          )}
        </div> */}
      </div>
      <div
        className={cn({
          'visible h-auto p-5 md:p-8': visible,
          'invisible h-0': !visible,
        })}
      >
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => {
            setActive(active);
          }}
          onDragEnd={({ active, over }) => {
            if (over && active.id !== over?.id) {
              const activeIndex = items.findIndex(({ id }) => id === active.id);
              const overIndex = items.findIndex(({ id }) => id === over.id);
              onChange(arrayMove(items, activeIndex, overIndex));
            }
            setActive(null);
          }}
          onDragCancel={() => {
            setActive(null);
          }}
        >
          <SortableContext items={items}>
            <ul className="space-y-3 SortableList" role="application">
              {items?.map((item) => (
                <React.Fragment key={item.id}>
                  {renderItem(item)}
                </React.Fragment>
              ))}
            </ul>
          </SortableContext>
          <SortableOverlay>
            {activeItem ? renderItem(activeItem) : null}
          </SortableOverlay>
        </DndContext>
      </div>
    </>
  );
}

SortableList.Item = SortableItem;
SortableList.DragHandle = DragHandle;
