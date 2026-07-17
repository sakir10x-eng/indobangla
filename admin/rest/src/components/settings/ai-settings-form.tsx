import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import {
  useAiSettingsQuery,
  useUpdateAiSettingsMutation,
  useAiTestMutation,
  useAiModelsQuery,
} from '@/data/ai';
import type { AiModel, AiTestResult } from '@/data/client/ai';

type FormValues = {
  provider: 'openrouter' | 'anthropic' | 'openai';
  model: string;
  api_key: string;
  enabled: boolean;
  req_sku: boolean;
  req_unit: boolean;
};

const MODEL_HINTS: Record<string, string> = {
  openrouter: 'e.g. openai/gpt-4o  or  anthropic/claude-sonnet-4.5',
  anthropic: 'e.g. claude-sonnet-4-5  or  claude-opus-4-1',
  openai: 'e.g. gpt-4o  or  gpt-4o-mini',
};

/** $ per 1M tokens, at the precision the number actually deserves. */
const money = (n: number) =>
  n === 0 ? 'free' : n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;

/**
 * A book import is roughly one cover image plus a page of text in, and a small
 * JSON object out — enough to turn $/1M into a number the owner can act on.
 */
const perHundredBooks = (m: AiModel) => {
  const cost = ((1500 * m.in) / 1e6 + (400 * m.out) / 1e6) * 100;
  if (cost === 0) return 'free';
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;
};

export default function AiSettingsForm() {
  const { settings, loading } = useAiSettingsQuery();
  const { mutate: update, isLoading: saving } = useUpdateAiSettingsMutation();

  const { register, handleSubmit, watch, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      provider: 'openrouter',
      model: '',
      api_key: '',
      enabled: false,
      req_sku: false,
      req_unit: true,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        provider: (settings.provider as any) || 'openrouter',
        model: settings.model || '',
        api_key: '',
        enabled: !!settings.enabled,
        req_sku: !!(settings as any)?.field_rules?.sku,
        req_unit: (settings as any)?.field_rules?.unit !== false,
      });
    }
  }, [settings, reset]);

  const provider = watch('provider');
  const currentModel = watch('model');

  const { mutateAsync: runTest, isLoading: testing } = useAiTestMutation();
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const { models, source, loading: modelsLoading } = useAiModelsQuery(provider);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  /**
   * Vision-only: the batch importer reads book covers, so a text-only model is not
   * a cheaper option — it's a broken one. Already cheapest-first from the API.
   */
  const usable = useMemo(() => models.filter((m) => m.vision), [models]);

  /**
   * Matches every whitespace-separated term against the id and name, so "claude
   * haiku" and "haiku claude" both land. Searching shows more rows than browsing
   * does — if you typed a term you're hunting for one specific model.
   */
  const suggestions = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return showAll ? usable : usable.slice(0, 12);
    const hit = usable.filter((m) => {
      const hay = `${m.id} ${m.name}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    return hit.slice(0, 40);
  }, [usable, showAll, query]);

  const searching = query.trim().length > 0;

  async function onTest() {
    setTestResult(null);
    try {
      setTestResult(await runTest());
    } catch (err: any) {
      setTestResult({
        status: 'error',
        provider,
        model: currentModel,
        message:
          err?.response?.data?.message ??
          'Request failed before reaching the provider.',
      });
    }
  }

  function onSubmit(values: FormValues) {
    update({
      provider: values.provider,
      model: values.model,
      // send api_key only when the admin typed a new one
      ...(values.api_key ? { api_key: values.api_key } : {}),
      enabled: values.enabled,
      field_rules: { sku: values.req_sku, unit: values.req_unit },
    } as any);
  }

  if (loading) return <p className="p-5">Loading…</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-wrap pb-8 border-b border-dashed border-border-base my-5 sm:my-8">
        <Description
          title="AI Settings"
          details="Configure the AI provider used for auto-filling book products from an image or a URL. Your API key is stored on your own server and only sent to the provider you choose."
          className="w-full px-0 sm:pe-4 md:pe-5 sm:w-4/12 md:w-1/3"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <div className="mb-5">
            <Label>Provider</Label>
            <select
              className="w-full appearance-none rounded border border-border-base bg-white px-4 h-12 text-sm text-heading focus:border-accent focus:outline-none"
              {...register('provider')}
            >
              <option value="openrouter">OpenRouter (any model)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (ChatGPT)</option>
            </select>
            <p className="mt-2 text-xs text-body">
              Tip: for reading book covers from images, pick a vision-capable
              model (GPT-4o, Claude Sonnet/Opus, or an OpenRouter vision model).
            </p>
          </div>

          <Input
            label="Model"
            {...register('model')}
            placeholder={MODEL_HINTS[provider]}
            className="mb-3"
          />

          {/* Suggestions, not a dropdown — the field stays free text so a model
              released tomorrow can still be typed in today. */}
          <div className="mb-5 rounded border border-border-200 bg-gray-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-body-dark">
                Cheapest models that can read a book cover
                {source === 'live' && (
                  <span className="ms-2 font-normal text-body">
                    · live prices from OpenRouter
                  </span>
                )}
                {source === 'curated' && (
                  <span className="ms-2 font-normal text-body">
                    · Anthropic&apos;s own model names
                  </span>
                )}
              </p>
              {/* Browsing only — while searching, the result count says it instead. */}
              {!searching && usable.length > 12 && (
                <button
                  type="button"
                  onClick={() => setShowAll((s) => !s)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  {showAll ? 'Show fewer' : `Show all ${usable.length}`}
                </button>
              )}
            </div>

            {usable.length > 0 && (
              <div className="relative mb-2">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter would submit the settings form — and while you're
                    // hunting for a model, it should pick the top hit instead.
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (suggestions[0]) {
                        setValue('model', suggestions[0].id, { shouldDirty: true });
                      }
                    }
                    if (e.key === 'Escape') setQuery('');
                  }}
                  placeholder="Search models — try “claude”, “gemini”, “free”, “nano”…"
                  className="h-9 w-full rounded border border-border-base bg-white px-3 pe-16 text-xs text-heading focus:border-accent focus:outline-none"
                />
                {searching && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-body hover:text-heading"
                  >
                    clear
                  </button>
                )}
              </div>
            )}

            {searching && (
              <p className="mb-2 text-[11px] text-body">
                {suggestions.length === 0
                  ? 'No model matches — check the spelling, or type the name into the Model field directly.'
                  : `${suggestions.length}${suggestions.length === 40 ? '+' : ''} of ${usable.length} · press Enter to pick the cheapest match`}
              </p>
            )}

            {/* "we have no list" and "your search matched nothing" are different
                problems — a filtered-to-zero search must not read as an outage. */}
            {modelsLoading ? (
              <p className="text-xs text-body">Loading models…</p>
            ) : usable.length === 0 ? (
              <p className="text-xs text-body">
                Model list unavailable right now — type the model name by hand.
              </p>
            ) : suggestions.length === 0 ? null : (
              <>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-body">
                        <th className="pb-1 pe-2 font-normal">Model</th>
                        <th className="pb-1 pe-2 font-normal">In / Out per 1M</th>
                        <th className="pb-1 pe-2 font-normal">~100 books</th>
                        <th className="pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map((m) => {
                        const picked = m.id === currentModel;
                        return (
                          <tr key={m.id} className="border-t border-border-100">
                            <td className="py-1.5 pe-2">
                              <span
                                className={`font-medium ${picked ? 'text-accent' : 'text-heading'}`}
                              >
                                {m.id}
                              </span>
                              {m.free && (
                                <span className="ms-1.5 rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
                                  FREE
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 pe-2 text-body">
                              {money(m.in)} / {money(m.out)}
                            </td>
                            <td className="py-1.5 pe-2 font-semibold text-heading">
                              {perHundredBooks(m)}
                            </td>
                            <td className="py-1.5 text-end">
                              <button
                                type="button"
                                disabled={picked}
                                onClick={() =>
                                  setValue('model', m.id, { shouldDirty: true })
                                }
                                className="rounded border border-border-base px-2 py-0.5 font-semibold text-body hover:bg-white disabled:border-accent disabled:text-accent"
                              >
                                {picked ? 'selected' : 'use'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-body">
                  “~100 books” estimates 100 imports at roughly a cover image plus a
                  page of text each — a rough guide, not a quote. Text-only models
                  are hidden: they cost less but cannot read a cover.
                </p>
              </>
            )}
          </div>

          <Input
            label={
              settings?.has_key
                ? `API Key (saved: ${settings?.key_hint}) — leave blank to keep`
                : 'API Key'
            }
            type="password"
            autoComplete="new-password"
            {...register('api_key')}
            placeholder={settings?.has_key ? '•••••••••• (unchanged)' : 'Paste your API key'}
            className="mb-5"
          />

          <label className="flex items-center gap-3 mb-2 cursor-pointer">
            <input type="checkbox" {...register('enabled')} className="w-4 h-4" />
            <span className="text-sm text-body-dark font-semibold">
              Enable AI auto-fill
            </span>
          </label>
          <p className="text-xs text-body">
            When enabled, an “AI Auto-fill” panel appears at the top of the
            product form and the AI Batch Upload page becomes usable.
          </p>

          {/* Tests the SAVED settings, not what's typed above — a key or model that
              hasn't been saved yet isn't what the importer would use. */}
          <div className="mt-5 border-t border-border-200 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onTest}
                loading={testing}
                disabled={testing}
              >
                {testing ? 'Testing…' : 'Test connection'}
              </Button>
              <p className="text-xs text-body">
                Sends one tiny real request to the provider using your{' '}
                <b>saved</b> key. Save first if you just changed something.
              </p>
            </div>

            {testResult && (
              <div
                className={`mt-3 rounded border p-3 text-xs ${
                  testResult.status === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {testResult.status === 'success' ? (
                  <>
                    <p className="font-semibold">
                      ✓ Connected — {testResult.provider} / {testResult.model} ·{' '}
                      {testResult.ms}ms
                    </p>
                    <p className="mt-1">Replied: “{testResult.reply}”</p>
                    {!testResult.enabled && (
                      <p className="mt-1 font-semibold text-amber-700">
                        The key works, but “Enable AI auto-fill” is off — the
                        importer still won&apos;t run.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold">✗ Failed</p>
                    <p className="mt-1 break-words">{testResult.message}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap pb-8 border-b border-dashed border-border-base my-5 sm:my-8">
        <Description
          title="Required product fields"
          details="Turn the mandatory (*) validation on or off for these product form fields."
          className="w-full px-0 sm:pe-4 md:pe-5 sm:w-4/12 md:w-1/3"
        />
        <Card className="w-full sm:w-8/12 md:w-2/3">
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input type="checkbox" {...register('req_sku')} className="w-4 h-4" />
            <span className="text-sm text-body-dark font-semibold">
              SKU is required
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('req_unit')} className="w-4 h-4" />
            <span className="text-sm text-body-dark font-semibold">
              Unit is required
            </span>
          </label>
          <p className="mt-3 text-xs text-body">
            Unchecked = optional. (SKU is optional by default.)
          </p>
        </Card>
      </div>

      <div className="text-end mb-4">
        <Button loading={saving} disabled={saving}>
          Save AI Settings
        </Button>
      </div>
    </form>
  );
}
