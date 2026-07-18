import React from 'react';
import TextArea from '@/components/ui/forms/text-area';
import { orderNoteAtom } from '@/store/checkout';
import { useAtom } from 'jotai';
import cn from 'classnames';

function OrderNote({
  count,
  label,
  className,
  hideHeader,
}: {
  count?: number;
  label?: string;
  className?: string;
  hideHeader?: boolean;
}) {
  const [note, setNote] = useAtom(orderNoteAtom);

  const textarea = (
    <TextArea
      //@ts-ignore
      value={note}
      name="orderNote"
      onChange={(e) => setNote(e.target.value)}
      variant="outline"
      inputClassName="!rounded-[10px]"
      placeholder="যেমন: বিকেলে ফোন দিন"
    />
  );

  if (hideHeader) {
    return <div className={className}>{textarea}</div>;
  }

  return (
    <div className={cn('bg-light p-5 shadow-700 md:p-8', className)}>
      <div className="mb-5 flex items-center justify-between md:mb-8">
        <div className="flex items-center space-x-3 rtl:space-x-reverse md:space-x-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-base text-light lg:text-xl">
            {count}
          </span>
          <p className="text-lg capitalize text-heading lg:text-xl">{label}</p>
        </div>
      </div>
      <div className="block">{textarea}</div>
    </div>
  );
}

export default OrderNote;
