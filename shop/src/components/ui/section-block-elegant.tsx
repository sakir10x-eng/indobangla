import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/cn';

type SectionProps = {
  className?: any;
  title?: string;
  description?: string;
  extraElement?: React.ReactNode;
  children?: React.ReactNode;
};

/**
 * UI component for a section block
 * @param {string} title - The title of the section
 * @param {string} description - The description of the section
 * @param {ReactNode} extraElement - The extra element will render after title & description
 * @param {ReactNode} children - The href of the external page for this section
 */

const SectionBlockElegant: React.FC<SectionProps> = ({
  className,
  title,
  description,
  extraElement,
  children,
}) => {
  const { t } = useTranslation('common');
  return (
    <div
      className={cn(
        'flex w-full flex-col py-16 md:py-20 xl:py-[100px] 3xl:py-[120px] px-5 lg:px-7 xl:px-10 gap-12 lg:gap-16',
        className,
      )}
    >
      <div className="flex text-center flex-col gap-2.5 items-center justify-between max-w-2xl mx-auto">
        {title && (
          <h3 className="text-2xl font-semibold lg:text-3xl 3xl:text-4xl text-heading">
            {t(title)}
          </h3>
        )}
        {description ? (
          <p
            className="text-sm lg:text-base line-clamp-2 text-heading react-editor-description"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : null}
        {extraElement}
      </div>
      {children}
    </div>
  );
};

export default SectionBlockElegant;
