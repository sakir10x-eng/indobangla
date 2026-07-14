import { HttpClient } from '@/data/client/http-client';

export interface AiSettings {
  provider: 'openrouter' | 'anthropic' | 'openai';
  model: string;
  enabled: boolean;
  has_key: boolean;
  key_hint?: string;
}

export interface AiSettingsInput {
  provider: string;
  model?: string;
  api_key?: string;
  enabled?: boolean;
}

export interface AiExtractInput {
  image_url?: string;
  product_url?: string;
  text?: string;
}

export const aiClient = {
  getSettings: () => HttpClient.get<AiSettings>('ai/settings'),
  updateSettings: (data: AiSettingsInput) =>
    HttpClient.put<AiSettings>('ai/settings', data),
  extract: (data: AiExtractInput) =>
    HttpClient.post<any>('ai/product-extract', data),
  batch: (items: AiExtractInput[]) =>
    HttpClient.post<any>('ai/product-batch', { items }),
  fetchImage: (image_url: string) =>
    HttpClient.post<any>('ai/fetch-image', { image_url }),
  listCrawl: (list_url: string, limit: number) =>
    HttpClient.post<any>('ai/list-crawl', { list_url, limit }),
  createProduct: (product: any) =>
    HttpClient.post<any>('ai/create-product', { product }),
};
