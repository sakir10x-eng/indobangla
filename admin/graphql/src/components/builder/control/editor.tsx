import ValidationError from '@/components/ui/form-validation-error';
import Label from '@/components/ui/label';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill';
import { twMerge } from 'tailwind-merge';
import 'react-quill/dist/quill.snow.css';

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
          [
            { list: 'bullet' },
            { list: 'ordered' },
          ]
        ],
      },
    }),
    [],
  );

  const formats = [
    'bold',
    'italic',
    'underline',
    'list',
  ];

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
      <ReactQuill
        modules={modules}
        formats={formats}
        value={value}
        theme="snow"
        placeholder={title ? title : placeholder}
        className={twMerge(
          classNames(
            'relative mb-5 rounded border border-border-base',
            editorClassName,
            disabled
              ? 'select-none bg-[#EEF1F4] cursor-not-allowed disabled-editor'
              : '',
          ),
        )}
        onChange={onChange}
        // @ts-ignore
        ref={quillRef}
        readOnly={disabled}
        {...rest}
      />

      {error ? <ValidationError message={t(error)} /> : ''}
    </div>
  );
};

export default RichTextEditor;
