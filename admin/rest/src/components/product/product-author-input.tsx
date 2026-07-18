import SelectInput from '@/components/ui/select-input';
import Label from '@/components/ui/label';
import AddOptionLink from '@/components/product/add-option-link';
import { Control } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { useAuthorsQuery } from '@/data/author';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface Props {
  control: Control<any>;
}

// Async author picker: authors are searched server-side (there are thousands),
// so we never load the whole list into the dropdown. Typing filters via the API
// (debounced); the currently selected author still renders because the form
// holds the full author object as the field value.
const ProductAuthorInput = ({ control }: Props) => {
  const { locale } = useRouter();
  const { t } = useTranslation();

  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // debounce keystrokes before hitting the API
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(inputValue.trim()), 300);
    return () => clearTimeout(id);
  }, [inputValue]);

  const { authors, loading } = useAuthorsQuery({
    limit: 30,
    is_approved: true,
    language: locale,
    ...(searchTerm ? { name: searchTerm } : {}),
  });

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <Label>{t('common:text-authors')}</Label>
        <AddOptionLink href="/authors/create" />
      </div>
      <SelectInput
        name="author"
        control={control}
        getOptionLabel={(option: any) => option.name}
        getOptionValue={(option: any) => option.id}
        options={authors}
        isLoading={loading}
        isClearable={true}
        // let the API do the filtering; don't also filter client-side
        filterOption={() => true}
        onInputChange={(value: string, meta: any) => {
          if (meta?.action === 'input-change') setInputValue(value);
        }}
        placeholder={t('form:input-placeholder-search-name')}
        noOptionsMessage={() =>
          searchTerm ? 'No author found' : 'Type an author name to search…'
        }
      />
    </div>
  );
};

export default ProductAuthorInput;
