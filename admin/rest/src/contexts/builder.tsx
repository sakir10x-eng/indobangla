import { UniqueIdentifier } from '@dnd-kit/core';
import { Data } from '@measured/puck';
import { isEmpty } from 'lodash';
import { atom } from 'recoil';

export interface BaseItem {
  id: UniqueIdentifier;
}

// Utility function to load from localStorage dynamically
const loadFromLocalStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem(key);
    return savedState ? JSON.parse(savedState) : null;
  }
  return null;
};

// Utility function to save to localStorage dynamically
const saveToLocalStorage = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Function to create dynamic Recoil atom based on router query key
const homeBuilder = (key: string) => {
  return atom({
    key: `homeBuilderData-${key}`, // Use the dynamic key based on router query
    default: loadFromLocalStorage(`home_builder_data-${key}`) ?? {}, // Load data from localStorage
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`home_builder_data-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const homeSortingItems = (key: string) => {
  return atom({
    key: `homeSortingItems-${key}`, // Dynamic key for home items
    default: loadFromLocalStorage(`home_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`home_sorting_items-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const becomeSellerBuilder = (key: string) => {
  return atom({
    key: `becomeSellerBuilderData-${key}`, // Dynamic key for sell your gear items
    default: loadFromLocalStorage(`sell_your_gear_builder_data-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`sell_your_gear_builder_data-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const becomeSellerSortingItems = (key: string) => {
  return atom({
    key: `becomeSellerSortingItems-${key}`, // Dynamic key for sell your gear items
    default: loadFromLocalStorage(`sell_your_gear_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`sell_your_gear_sorting_items-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const groupsBuilder = (key: string) => {
  return atom<Partial<Data>>({
    key: `groupsBuilderData-${key}`,
    default: loadFromLocalStorage(`groups_builder_data-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`groups_builder_data-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const groupsSortingItems = (key: string) => {
  return atom<BaseItem[]>({
    key: `groupsSortingItems-${key}`,
    default: loadFromLocalStorage(`groups_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`groups_sorting_items-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const termsAndConditionsBuilder = (key: string) => {
  return atom({
    key: `termsAndConditionsBuilderData-${key}`, // Dynamic key for terms and conditions items
    default:
      loadFromLocalStorage(`terms_and_conditions_builder_data-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(
            `terms_and_conditions_builder_data-${key}`,
            newValue,
          ); // Save to localStorage
        });
      },
    ],
  });
};

const termsAndConditionsSortingItems = (key: string) => {
  return atom({
    key: `termsAndConditionsSortingItems-${key}`, // Dynamic key for terms and conditions items
    default:
      loadFromLocalStorage(`terms_and_conditions_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(
            `terms_and_conditions_sorting_items-${key}`,
            newValue,
          ); // Save to localStorage
        });
      },
    ],
  });
};

const privacyPolityBuilder = (key: string) => {
  return atom({
    key: `privacyPolityBuilderData-${key}`, // Dynamic key for terms and conditions items
    default: loadFromLocalStorage(`privacy_polity_builder_data-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`privacy_polity_builder_data-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const privacyPolitySortingItems = (key: string) => {
  return atom({
    key: `privacyPolitySortingItems-${key}`, // Dynamic key for terms and conditions items
    default: loadFromLocalStorage(`privacy_polity_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`privacy_polity_sorting_items-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const categorySortingItems = (key: string) => {
  return atom({
    key: `categorySortingItems-${key}`, // Dynamic key for sell your gear items
    default: loadFromLocalStorage(`category_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`category_sorting_items-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const aboutUsBuilder = (key: string) => {
  return atom({
    key: `aboutUsBuilderData-${key}`, // Dynamic key for sell your gear items
    default: loadFromLocalStorage(`about_us_builder_data-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`about_us_builder_data-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const aboutUsSortingItems = (key: string) => {
  return atom({
    key: `aboutUsSortingItems-${key}`, // Dynamic key for sell your gear items
    default: loadFromLocalStorage(`about_us_sorting_items-${key}`) ?? [],
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`about_us_sorting_items-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const sectionBannerBuilder = (key: string) => {
  return atom<Partial<Data>>({
    key: `sectionBannerBuilder-${key}`,
    default: loadFromLocalStorage(`section_banner_builder_data-${key}`) ?? {},
    effects_UNSTABLE: [
      ({ onSet }) => {
        onSet((newValue) => {
          saveToLocalStorage(`section_banner_builder_data-${key}`, newValue); // Save to localStorage
        });
      },
    ],
  });
};

const mergeBuilderData = (
  data: Partial<Data>,
  value: Partial<Data>,
  unique: boolean = false,
  query?: string | string[] | undefined,
): Partial<Data> => {
  const updatedContent = [...(data?.content ?? []), ...(value?.content ?? [])];

  let uniqueContent = unique
    ? Array.from(
        new Map(updatedContent.map((item) => [item?.props?.id, item])).values(),
      )
    : updatedContent;

  if (isEmpty(value?.content)) {
    uniqueContent = uniqueContent?.filter((item) => item?.props?.id !== query);
  }

  if (value?.content?.find((item) => item?.props?.id !== query)) {
    uniqueContent = uniqueContent?.filter((item) => item?.props?.id !== query);
  }

  return {
    root: { ...data?.root, ...value?.root },
    zones: { ...data?.zones, ...value?.zones },
    content: uniqueContent,
  };
};

const modifiedSortingItems = ({ items }: { items: UniqueIdentifier[] }) => {
  return items?.map((item) => ({ id: item }));
};

export {
  homeBuilder,
  homeSortingItems,
  mergeBuilderData,
  modifiedSortingItems,
  termsAndConditionsSortingItems,
  termsAndConditionsBuilder,
  categorySortingItems,
  privacyPolityBuilder,
  privacyPolitySortingItems,
  aboutUsBuilder,
  aboutUsSortingItems,
  becomeSellerBuilder,
  becomeSellerSortingItems,
  groupsBuilder,
  groupsSortingItems,
  sectionBannerBuilder,
};
