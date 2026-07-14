import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';

/**
 * #1 — Admin-configurable storefront image sizes. Read from the public
 * `image-sizes` endpoint (backed by Settings.options.image_sizes); falls back
 * to the built-in defaults so the UI never depends on the request resolving.
 */
export type ImageSizes = {
  single_max: number; // single-product cover max-width (px)
  fbt_h: number; // frequently-bought cover height (px)
  home_cols: number; // home "All books" desktop columns
  home_card_style: 'mindful' | 'classic'; // home product card design
};

export const IMAGE_SIZE_DEFAULTS: ImageSizes = {
  single_max: 200,
  fbt_h: 128,
  home_cols: 5,
  home_card_style: 'mindful',
};

export function useImageSizes(): ImageSizes {
  const { data } = useQuery(
    ['image-sizes'],
    () => HttpClient.get<Partial<ImageSizes>>('image-sizes'),
    { staleTime: 5 * 60 * 1000, keepPreviousData: true },
  );
  return { ...IMAGE_SIZE_DEFAULTS, ...(data ?? {}) };
}
