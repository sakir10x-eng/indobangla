import classNames from 'classnames';

interface ScheduleProps {
  schedule: any;
  checked: boolean;
}
const ScheduleCard: React.FC<ScheduleProps> = ({ checked, schedule }) => (
  <div
    className={classNames(
      'relative flex h-full cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-colors',
      checked
        ? 'border-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent))]'
        : 'border-[#E4E1DC] bg-light hover:border-[#CFCBC4]'
    )}
  >
    <span
      className={classNames(
        'mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        checked ? 'border-accent' : 'border-[#CFCBC4]'
      )}
    >
      <span
        className={classNames(
          'h-2 w-2 rounded-full bg-accent transition-transform',
          checked ? 'scale-100' : 'scale-0'
        )}
      />
    </span>
    <div className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-heading">
        {schedule.title}
      </span>
      <span className="mt-0.5 block text-[12.5px] text-[#6E6C6D]">
        {schedule.description}
      </span>
    </div>
  </div>
);

export default ScheduleCard;
