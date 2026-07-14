import { useBackToTop } from '@/components/ui/back-to-top/back-to-top-context';
import { Slot } from '@/utils/slot';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  offset?: number;
}

const BackToTopButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, offset = 100, ...props }, ref) => {
    const [showGoTop, setShowGoTop] = useState(false);

    const handleVisibleButton = () => {
      setShowGoTop(window?.scrollY > offset);
    };

    const handleScrollUp = () => {
      window.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
      window.addEventListener('scroll', handleVisibleButton);
    }, []);

    const { refs, strategy, x, y } = useBackToTop();

    const buttonClassName = twMerge(
      classNames(
        'transition duration-300 transform',
        className,
        showGoTop ? 'opacity-100' : 'opacity-0',
      ),
    );

    return (
      <div
        ref={refs.setFloating}
        style={{
          position: strategy,
          top: y ?? '',
          left: x ?? '',
          zIndex: 1,
        }}
      >
        {asChild ? (
          <Slot {...props}>
            {React.cloneElement(props.children as React.ReactElement, {
              className: buttonClassName,
              onClick: handleScrollUp,
              ref,
            })}
          </Slot>
        ) : (
          <button
            className={buttonClassName}
            ref={ref}
            {...props}
            onClick={handleScrollUp}
          />
        )}
      </div>
    );
  },
);

BackToTopButton.displayName = 'BackToTopButton';

export { BackToTopButton };
