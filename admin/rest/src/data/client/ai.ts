import { HttpClient } from '@/data/client/http-client';

export interface AiSettings {
  provider: 'openrouter' | 'anthropic' | 'openai';
  model: string;
  free_model?: string;
  enabled: boolean;
  has_key: boolean;
  key_hint?: string;
}

export interface AiSettingsInput {
  provider: string;
  model?: string;
  free_model?: string;
  api_key?: string;
  jina_key?: string;
  enabled?: boolean;
}

export interface AiExtractInput {
  image_url?: string;
  product_url?: string;
  text?: string;
}

export interface AiTestResult {
  status: 'success' | 'error';
  provider: string;
  model: string;
  ms?: number;
  reply?: string;
  enabled?: boolean;
  message?: string;
}

/** A model the admin can pick. `in`/`out` are US$ per 1M tokens. */
export interface AiModel {
  id: string;
  name: string;
  in: number;
  out: number;
  free: boolean;
  context: number;
  /** Book covers are read from images — a model without this can't do the batch flow. */
  vision: boolean;
}

export interface AiModelList {
  status: string;
  provider: string;
  /** live = fetched from OpenRouter just now; curated = our own verified list. */
  source: 'live' | 'curated' | 'openrouter-catalogue' | 'unavailable';
  models: AiModel[];
  message?: string;
}

/** A book we already sell that an extracted row appears to be. */
export interface DuplicateMatch {
  id: number;
  name: string;
  slug: string;
  author?: string | null;
  quantity: number;
  price?: number | string | null;
  sale_price?: number | string | null;
  /** isbn/slug are definitive; name is a suspicion — the same title is often another edition. */
  reason: 'isbn' | 'slug' | 'name';
  detail: string;
  score: number;
}

export interface DuplicateResult {
  index: number;
  duplicate: boolean;
  probable: boolean;
  matches: DuplicateMatch[];
}

export type UpdatableField = 'quantity' | 'price' | 'description';

export interface UpdateProductInput {
  product_id: number;
  fields: UpdatableField[];
  product: any;
}

export const aiClient = {
  getSettings: () => HttpClient.get<AiSettings>('ai/settings'),
  updateSettings: (data: AiSettingsInput) =>
    HttpClient.put<AiSettings>('ai/settings', data),
  extract: (data: AiExtractInput) =>
    HttpClient.post<any>('ai/product-extract', data),
  batch: (items: AiExtractInput[], printed_country?: string) =>
    HttpClient.post<any>('ai/product-batch', {
      items,
      ...(printed_country ? { printed_country } : {}),
    }),
  fetchImage: (image_url: string) =>
    HttpClient.post<any>('ai/fetch-image', { image_url }),
  listCrawl: (list_url: string, limit: number) =>
    HttpClient.post<any>('ai/list-crawl', { list_url, limit }),
  createProduct: (product: any) =>
    HttpClient.post<any>('ai/create-product', { product }),
  duplicateCheck: (products: any[]) =>
    HttpClient.post<any>('ai/duplicate-check', { products }),
  test: () => HttpClient.post<AiTestResult>('ai/test', {}),
  models: (provider: string) =>
    HttpClient.get<AiModelList>('ai/models', { provider }),
  updateProduct: (vars: UpdateProductInput) =>
    HttpClient.post<any>('ai/update-product', vars),
};
