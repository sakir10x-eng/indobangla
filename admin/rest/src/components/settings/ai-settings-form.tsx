import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import {
  useAiSettingsQuery,
  useUpdateAiSettingsMutation,
} from '@/data/ai';

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

export default function AiSettingsForm() {
  const { settings, loading } = useAiSettingsQuery();
  const { mutate: update, isLoading: saving } = useUpdateAiSettingsMutation();

  const { register, handleSubmit, watch, reset } = useForm<FormValues>({
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
            className="mb-5"
          />

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
