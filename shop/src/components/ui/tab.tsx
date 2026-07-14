import { cn } from '@/lib/cn';
import {
  Tab as HeadlessTab,
  type TabListProps,
  type TabGroupProps,
  TabPanelsProps,
  TabPanelProps,
  TabProps,
} from '@headlessui/react';

export const TabGroup = (props: TabGroupProps<'div'>) => {
  return <HeadlessTab.Group {...props} />;
};

export const TabList = ({ className, ...props }: TabListProps<'div'>) => {
  return (
    <HeadlessTab.List
      className={cn('border-b flex gap-x-6', className)}
      {...props}
    />
  );
};

export const TabPanels = ({ className, ...props }: TabPanelsProps<'div'>) => {
  return <HeadlessTab.Panels className={className} {...props} />;
};

export const TabPanel = ({ className, ...props }: TabPanelProps<'div'>) => {
  return <HeadlessTab.Panel className={className} {...props} />;
};

export const Tab = ({ className, ...props }: TabProps<'div'>) => {
  return (
    <HeadlessTab
      className={cn(
        "text-base font-medium text-body pb-4 data-[headlessui-state='selected']:text-heading border-b-[3px] border-transparent data-[headlessui-state='selected']:border-dark -mb-px focus:outline-none",
        className,
      )}
      {...props}
    />
  );
};
