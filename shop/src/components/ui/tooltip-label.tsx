import { twMerge } from 'tailwind-merge';
import { InfoIcon } from 'lucide-react';
import Label from './forms/label';
import { Tooltip } from './tooltip';

interface Props {
  className?: string;
  htmlFor?: string;
  label?: string;
  toolTipText?: string;
  required?: boolean;
}

const TooltipLabel = ({
  className,
  required,
  label,
  toolTipText,
  htmlFor,
}: Props) => {
  return (
    <Label className={twMerge(className)} htmlFor={htmlFor}>
      {label}
      {required ? <span className="ml-0.5 text-red-500">*</span> : ''}
      {toolTipText ? (
        <Tooltip content={toolTipText}>
          <span className="ltr:ml-1 rtl:mr-1 text-base-dark/40 shrink-0">
            <InfoIcon className="w-3.5 h-3.5" />
          </span>
        </Tooltip>
      ) : (
        ''
      )}
    </Label>
  );
};

export default TooltipLabel;
