import Countdown, { CountdownProps } from 'react-countdown';
import { SeparatorIcon } from '@/components/icons/timer-separator';
import { cn } from '@/lib/cn';

type CountdownTimerProps = {
  date: Date;
  title?: string;
  className?: string;
  titleClassName?: string;
  onComplete?: CountdownProps['onComplete'];
  onStart?: CountdownProps['onStart'];
};

// Random component
const CompletionMessage = () => (
  <span className="text-sm">You are good to go!</span>
);

// Renderer callback with condition
const renderer = (
  {
    days,
    hours,
    minutes,
    seconds,
    completed,
  }: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
  },
  // @ts-ignore
  props,
) => {
  if (completed) {
    // Render a completed state
    return <CompletionMessage />;
  } else {
    // Render a countdown
    return (
      <div
        className={cn(
          'flex gap-2 text-lg text-accent [&>p]:rounded [&>p]:bg-accent [&>p]:p-3 [&>p]:text-sm [&>p]:font-semibold [&>p]:text-white [&>span]:self-center',
          props?.className,
        )}
      >
        <p>{days}d</p>
        <span>
          <SeparatorIcon />
        </span>
        <p>{hours}h</p>
        <span>
          <SeparatorIcon />
        </span>
        <p>{minutes}m</p>
        <span>
          <SeparatorIcon />
        </span>
        <p>{seconds}s</p>
      </div>
    );
  }
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  date,
  title,
  titleClassName,
  className,
  onComplete,
  onStart,
}) => {
  return (
    <>
      {title ? (
        <h4
          className={cn(
            'countdown-title text-xl font-semibold text-muted-black',
            titleClassName,
          )}
        >
          {title}
        </h4>
      ) : (
        ''
      )}
      <Countdown
        date={date}
        renderer={(props) => renderer(props, { className })}
        onComplete={onComplete}
        onStart={onStart}
      />
    </>
  );
};

export default CountdownTimer;
