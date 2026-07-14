import Pagination from '@/components/ui/pagination';
import { Table, AlignType } from '@/components/ui/table';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import TitleWithSort from '@/components/ui/title-with-sort';
import { Switch } from '@headlessui/react';
import { Attachment, SortOrder } from '@/types';
import { useUpdateAuthorMutationInList } from '@/data/author';
import { Author, MappedPaginatorInfo } from '@/types';
import { Routes } from '@/config/routes';
import LanguageSwitcher from '@/components/ui/lang-action/action';
import { useIsRTL } from '@/utils/locals';
import Avatar from '@/components/common/avatar';
import { NoDataFound } from '@/components/icons/no-data-found';

type IProps = {
  is_approved: boolean;
  record: Author;
};

const AuthorUpdateCell = ({ is_approved, record }: IProps) => {
  const router = useRouter();
  const { mutate: updateAuthor, isLoading: updating } =
    useUpdateAuthorMutationInList();

  function handleOnClick() {
    updateAuthor({
      language: router?.locale,
      id: record?.id,
      name: record?.name,
      is_approved: !is_approved,
    });
  }

  return (
    <Switch
      checked={is_approved}
      onChange={handleOnClick}
      className={`${
        is_approved ? 'bg-accent' : 'bg-gray-300'
      } relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none`}
      dir="ltr"
    >
      <span className="sr-only">Enable</span>
      <span
        className={`${
          is_approved ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-light transition-transform`}
      />
    </Switch>
  );
};

export { AuthorUpdateCell };
