import { BaseItem } from '@/contexts/builder';
import {
  AttachmentInput,
  FlashSale,
  Product,
  Type,
  TypeSettingsInput,
} from '@/types';
import { UniqueIdentifier } from '@dnd-kit/core';
import { Data } from '@measured/puck';
import {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayRemove,
  UseFormRegister,
} from 'react-hook-form';
import { SetterOrUpdater } from 'recoil';

type BannerInput = {
  title: string;
  description: string;
  image: AttachmentInput;
};

export type FormValues = {
  name: string;
  slug?: string | null;
  icon?: any;
  promotional_sliders: AttachmentInput[];
  banners: BannerInput[];
  settings: TypeSettingsInput;
};

export interface RearrangeFormPartProps
  extends React.HTMLAttributes<HTMLDivElement> {
  groupItems: BaseItem[];
  setGroupsItems: SetterOrUpdater<BaseItem[]>;
  data: Partial<Data>;
}

export interface FormProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  control: Control<FormValues, any>;
}

export interface CommonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    FormProps {
  initialValues?: Type | null;
  isSlugEditable: boolean;
  isSlugDisable: boolean;
  setIsSlugDisable: React.Dispatch<React.SetStateAction<boolean>>;
  slugAutoSuggest: string;
}

export interface ElegantFormPartProps
  extends React.HTMLAttributes<HTMLDivElement>,
    FormProps,
    Pick<CommonProps, 'initialValues'> {
  flashSalesEnable: boolean | undefined;
  flashSale: FlashSale[];
  loadingFlashSales: boolean;
  categoryEnable: boolean | undefined;
  trendingProductsEnable: boolean | undefined;
  trendingProductsBannerData: Partial<Data>;
  groupName: string;
  setTrendingProductsBannerData: SetterOrUpdater<Partial<Data>>;
  addSectionOnClickHandler: () => void;
  featuredBrandsEnable: boolean | undefined;
  latestProductsEnable: boolean | undefined;
  latestProductsBannerData: Partial<Data>;
  setLatestProductsBannerData: SetterOrUpdater<Partial<Data>>;
  setData: (
    valOrUpdater: Partial<Data> | ((currVal: Partial<Data>) => Partial<Data>),
  ) => void;
  layoutType: string | undefined;
  data: Partial<Data>;
}

export interface CompactFormPartProps
  extends React.HTMLAttributes<HTMLDivElement>,
    FormProps {
  bestSellingEnable: boolean | undefined;
  popularProductsEnable: boolean | undefined;
  categoryEnable: boolean | undefined;
  handpickedProductsEnable: boolean | undefined;
  type: string;
  setCategory: (value: React.SetStateAction<string>) => void;
  setType: (value: React.SetStateAction<string>) => void;
  products: Product[];
  loadingProduct: boolean;
  newArrivalEnable: boolean | undefined;
  authorsEnable: boolean | undefined;
  manufacturesEnable: boolean | undefined;
}

export interface BannerFormPartProps
  extends React.HTMLAttributes<HTMLDivElement>,
    FormProps {
  layoutType: string | undefined;
  fields: FieldArrayWithId<FormValues, 'banners', 'id'>[];
  remove: UseFieldArrayRemove;
}

export interface BuilderFormPartsProps {
  groupName: string;
  data: Partial<Data>;
  layoutType: string | undefined;
  setGroupItemsHandler: (
    dynamicKeys: UniqueIdentifier[],
    groupItems: any,
  ) => void;
  dynamicKeys: UniqueIdentifier[];
  groupItems: BaseItem[];
  setGroupsItems: (
    valOrUpdater: BaseItem[] | ((currVal: BaseItem[]) => BaseItem[]),
  ) => void;
  setData: (
    valOrUpdater: Partial<Data> | ((currVal: Partial<Data>) => Partial<Data>),
  ) => void;
}