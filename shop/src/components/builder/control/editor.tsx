import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import { useMemo, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import Label from '@/components/ui/forms/label';

export type RichTextEditorProps = {
  title?: string;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  value: string;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  title,
  placeholder,
  className,
  editorClassName,
  required,
  disabled,
  error,
  onChange,
  value,
  ...rest
}) => {
  const { t } = useTranslation();
  const quillRef = useRef();

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ['bold', 'italic', 'underline'],
          [{ list: 'bullet' }, { list: 'ordered' }],
        ],
      },
    }),
    [],
  );

  const formats = ['bold', 'italic', 'underline', 'list'];

  return (
    <div className={twMerge(classNames('react-quill-description', className))}>
      {title ? (
        <Label>
          {title}
          {required ? <span className="ml-0.5 text-red-500">*</span> : ''}
        </Label>
      ) : (
        ''
      )}
    </div>
  );
};

export default RichTextEditor;
