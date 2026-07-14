import { UniqueIdentifier } from '@dnd-kit/core';

export const commonKeys: UniqueIdentifier[] = ['banners'];

export const commonKeysTitle = {
  banners: 'Banners',
};

export const classicKeys: UniqueIdentifier[] = [
  'banners',
  'promotional_sliders',
];

export const classicKeysTitle = {
  banners: 'Banners',
  promotional_sliders: 'Promotional Sliders',
};

export const compactKeys: UniqueIdentifier[] = [
  'banners',
  'authors',
  'bestSelling',
  'category',
  'handpickedProducts',
  'manufactures',
  'newArrival',
  'popularProducts',
];

export const compactKeysTitle = {
  banners: 'Banners',
  authors: 'Authors',
  bestSelling: 'Best Selling',
  category: 'Category',
  handpickedProducts: 'Handpicked Products',
  manufactures: 'Manufactures',
  newArrival: 'New Arrival',
  popularProducts: 'Popular Products',
};

export const elegantKeys: UniqueIdentifier[] = [
  'flashSales',
  'category',
  'trendingProducts',
  'featuredBrands',
  'latestProducts',
  // 'featuredShops',
];

export const elegantKeysTitle = {
  flashSales: 'Flash Sales',
  category: 'Category',
  trendingProducts: 'Trending Products',
  featuredBrands: 'FeaturedBrands',
  latestProducts: 'Latest Products',
  // featuredShops: 'Featured Shops',
};

export const combinedKeys: UniqueIdentifier[] = Array.from(
  new Set([...commonKeys, ...classicKeys, ...compactKeys, ...elegantKeys]),
);

export const combinedKeysTitle = {
  banners: 'Banners',
  promotional_sliders: 'Promotional Sliders',
  authors: 'Authors',
  bestSelling: 'Best Selling',
  category: 'Category',
  handpickedProducts: 'Handpicked Products',
  manufactures: 'Manufactures',
  newArrival: 'New Arrival',
  popularProducts: 'Popular Products',
  flashSales: 'Flash Sales',
  trendingProducts: 'Trending Products',
  featuredBrands: 'FeaturedBrands',
  latestProducts: 'Latest Products',
  // featuredShops: 'Featured Shops',
};

export const layoutTypes = [
  {
    label: 'Classic',
    value: 'classic',
    img: '/image/layout-classic.png',
  },
  {
    label: 'Compact',
    value: 'compact',
    img: '/image/layout-compact.png',
  },
  {
    label: 'Minimal',
    value: 'minimal',
    img: '/image/layout-minimal.png',
  },
  {
    label: 'Modern',
    value: 'modern',
    img: '/image/layout-modern.png',
  },
  {
    label: 'Standard',
    value: 'standard',
    img: '/image/layout-standard.png',
  },
  {
    label: 'Elegant',
    value: 'elegant',
    img: '/image/layout-elegant.png',
  },
];

export const productCards = [
  {
    label: 'Helium',
    value: 'helium',
    img: '/image/card-helium.png',
  },
  {
    label: 'Neon',
    value: 'neon',
    img: '/image/card-neon.png',
  },
  {
    label: 'Argon',
    value: 'argon',
    img: '/image/card-argon.png',
  },
  {
    label: 'Krypton',
    value: 'krypton',
    img: '/image/card-krypton.png',
  },
  {
    label: 'Xenon',
    value: 'xenon',
    img: '/image/card-xenon.png',
  },
  {
    label: 'Radon',
    value: 'radon',
    img: '/image/card-radon.png',
  },
  {
    label: 'Platinum',
    value: 'platinum',
    img: '/image/card-platinum.png',
  },
];
