<?php

namespace Marvel\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Marvel\Database\Models\Settings;
use Marvel\Exceptions\MarvelException;

/**
 * IndoBangla AI product ingestion.
 *
 * Multi-provider (OpenRouter / Anthropic / OpenAI) LLM helper that extracts
 * structured book product data from an image, a product URL, or raw text.
 * The provider, API key and model are configured by the super-admin in the
 * admin "AI Settings" pane and stored in settings.options.ai_settings.
 */
class AiExtractController extends CoreController
{
    /** Return the (masked) AI settings for the admin panel. */
    public function getSettings(Request $request)
    {
        $ai = $this->getAiSettings();
        $settings = Settings::first();
        $options  = $settings ? $settings->options : [];
        $rules    = $options['field_rules'] ?? [];
        return [
            'provider' => $ai['provider'] ?? 'openrouter',
            'model'      => $ai['model'] ?? '',
            'free_model' => $ai['free_model'] ?? '',
            'enabled'  => (bool) ($ai['enabled'] ?? false),
            'has_key'  => !empty($ai['api_key']),
            'key_hint' => !empty($ai['api_key']) ? '****' . substr($ai['api_key'], -4) : '',
            'field_rules' => [
                'sku'  => (bool) ($rules['sku'] ?? false),
                'unit' => array_key_exists('unit', $rules) ? (bool) $rules['unit'] : true,
            ],
        ];
    }

    /** Persist AI settings (super-admin only). */
    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'provider' => 'required|in:openrouter,anthropic,openai',
            'model'      => 'nullable|string',
            'free_model' => 'nullable|string',
            'api_key'  => 'nullable|string',
            // Separate from api_key: this one authenticates the r.jina.ai page reader, not the LLM.
            'jina_key' => 'nullable|string',
            'enabled'  => 'nullable|boolean',
            'field_rules'      => 'nullable|array',
            'field_rules.sku'  => 'nullable|boolean',
            'field_rules.unit' => 'nullable|boolean',
        ]);

        $settings = Settings::first();
        $options  = $settings->options;
        $current  = $options['ai_settings'] ?? [];

        $options['ai_settings'] = [
            'provider' => $data['provider'],
            'model'      => $data['model'] ?? ($current['model'] ?? ''),
            // Free/text model tried first for text extraction; falls back to `model`.
            'free_model' => array_key_exists('free_model', $data) ? (string) $data['free_model'] : ($current['free_model'] ?? ''),
            // keep existing key if the field is left blank on update
            'api_key'  => !empty($data['api_key']) ? $data['api_key'] : ($current['api_key'] ?? ''),
            'jina_key' => !empty($data['jina_key']) ? $data['jina_key'] : ($current['jina_key'] ?? ''),
            'enabled'  => array_key_exists('enabled', $data) ? (bool) $data['enabled'] : ($current['enabled'] ?? false),
        ];

        if (array_key_exists('field_rules', $data) && is_array($data['field_rules'])) {
            $options['field_rules'] = [
                'sku'  => (bool) ($data['field_rules']['sku'] ?? false),
                'unit' => array_key_exists('unit', $data['field_rules']) ? (bool) $data['field_rules']['unit'] : true,
            ];
        }

        $settings->update(['options' => $options]);

        return $this->getSettings($request);
    }

    /**
     * #9 — Generate a product description using the admin's configured AI
     * provider (OpenRouter / Anthropic / OpenAI key + model from AI Settings).
     * Falls back to the platform's default generator if AI Settings is empty.
     */
    public function generateDescription(Request $request)
    {
        $request->validate(['prompt' => 'required|string']);
        $ai = $this->getAiSettings();
        if (empty($ai['api_key']) || empty($ai['enabled'])) {
            // No AI Settings configured — use the platform default (env key).
            return \Marvel\Facades\Ai::generateDescription($request);
        }
        $system = 'You are an expert e-commerce copywriter for a Bangladeshi book store (IndoBangla). '
            . 'Write a clear, engaging product description in 2–4 short paragraphs. '
            . 'Match the language of the prompt (Bangla or English). '
            . 'Return ONLY the description text — no preamble, no markdown headings, no quotes.';
        $text = $this->callLLM($ai, $system, (string) $request->input('prompt'), null);
        return ['status' => 'success', 'result' => trim($text)];
    }

    /** Extract one product from image_url / product_url / text. */
    public function extractProduct(Request $request)
    {
        $request->validate([
            'image_url'   => 'nullable|string',
            'product_url' => 'nullable|string',
            'text'        => 'nullable|string',
            'printed_country' => 'nullable|string',
        ]);

        if (!$request->image_url && !$request->product_url && !$request->text) {
            throw new MarvelException('Please provide an image URL, a product URL, or some text.');
        }

        $product = $this->runExtraction(
            $request->image_url,
            $request->product_url,
            $request->text,
            $request->input('printed_country')
        );

        return ['status' => 'success', 'product' => $product];
    }

    /**
     * Batch extract. Accepts { items: [ {image_url|product_url|text}, ... ] }.
     * Returns a result per item so the UI can review before creating products.
     */
    public function batchExtract(Request $request)
    {
        $items = $request->input('items', []);
        if (!is_array($items) || count($items) === 0) {
            throw new MarvelException('Provide an "items" array (max 25).');
        }
        $items = array_slice($items, 0, 25);
        // Admin picks the printed country once for the whole batch (drives Indian markup).
        $country = $request->input('printed_country');

        $results = [];
        foreach ($items as $i => $item) {
            try {
                $product = $this->runExtraction(
                    $item['image_url'] ?? null,
                    $item['product_url'] ?? null,
                    $item['text'] ?? null,
                    $item['printed_country'] ?? $country
                );
                $results[] = ['index' => $i, 'status' => 'success', 'product' => $product];
            } catch (\Throwable $e) {
                $results[] = ['index' => $i, 'status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return ['status' => 'success', 'results' => $results];
    }

    /**
     * Admin: prove the saved AI credentials actually work. POST ai/test
     *
     * Makes a real (tiny) call rather than validating the key's shape — a key can
     * be well-formed and still be revoked, out of credit, or wrong for the model.
     * Failures come back as status:error with the provider's own message, not as
     * an exception: for a test button the failure IS the result the admin needs.
     */
    public function testConnection(Request $request)
    {
        $ai = $this->getAiSettings();
        $provider = $ai['provider'] ?? 'openrouter';
        $model    = $ai['model'] ?? '';

        if (empty($ai['api_key'])) {
            return ['status' => 'error', 'provider' => $provider, 'model' => $model,
                    'message' => 'No API key saved yet. Enter one above and press Save first.'];
        }

        $t0 = microtime(true);
        try {
            $reply = $this->callLLM(
                $ai,
                'You are a connection test. Reply with exactly: OK',
                'Reply with exactly: OK',
                null
            );
        } catch (\Throwable $e) {
            return [
                'status'   => 'error',
                'provider' => $provider,
                'model'    => $model,
                'ms'       => (int) round((microtime(true) - $t0) * 1000),
                'message'  => $e->getMessage(),
            ];
        }

        $reply = trim((string) $reply);
        if ($reply === '') {
            // A 200 with no text means the model answered but returned nothing usable —
            // usually the wrong model id for the provider. Don't call that a success.
            return ['status' => 'error', 'provider' => $provider, 'model' => $model,
                    'ms' => (int) round((microtime(true) - $t0) * 1000),
                    'message' => 'The provider replied but returned no text. Check the model name.'];
        }

        return [
            'status'   => 'success',
            'provider' => $provider,
            'model'    => $model ?: '(provider default)',
            'ms'       => (int) round((microtime(true) - $t0) * 1000),
            'reply'    => \Illuminate\Support\Str::limit($reply, 80),
            'enabled'  => (bool) ($ai['enabled'] ?? false),
        ];
    }

    /**
     * Admin: model suggestions for the settings form. GET ai/models?provider=
     *
     * OpenRouter publishes its catalogue — ids, live prices and modalities — at a
     * public endpoint, so that list is fetched rather than hardcoded: prices move
     * and a hardcoded table would quietly rot. Anthropic's list is curated because
     * OpenRouter spells their ids differently ("claude-sonnet-4.6" vs the real
     * "claude-sonnet-4-6"), so deriving them would hand the admin a 404.
     */
    public function listModels(Request $request)
    {
        $provider = (string) $request->query('provider', '') ?: ($this->getAiSettings()['provider'] ?? 'openrouter');

        if ($provider === 'anthropic') {
            return ['status' => 'success', 'provider' => $provider, 'source' => 'curated',
                    'models' => $this->anthropicModels()];
        }

        $catalogue = $this->openrouterCatalogue();
        if (!$catalogue) {
            return ['status' => 'success', 'provider' => $provider, 'source' => 'unavailable',
                    'models' => [], 'message' => "Couldn't reach OpenRouter's model list. Type the model name by hand."];
        }

        if ($provider === 'openai') {
            // Sourced from OpenRouter's catalogue for the live price, with their
            // "openai/" prefix removed to get OpenAI's own id.
            $models = [];
            foreach ($catalogue as $m) {
                if (!str_starts_with($m['id'], 'openai/')) {
                    continue;
                }
                // ":free" / ":thinking" are OpenRouter routing suffixes, not part of
                // OpenAI's id — "gpt-oss-20b:free" would 404 against OpenAI directly.
                if (str_contains($m['id'], ':')) {
                    continue;
                }
                $m['id'] = substr($m['id'], strlen('openai/'));
                $models[] = $m;
            }
            return ['status' => 'success', 'provider' => $provider, 'source' => 'openrouter-catalogue',
                    'models' => array_values($models)];
        }

        return ['status' => 'success', 'provider' => 'openrouter', 'source' => 'live',
                'models' => $catalogue];
    }

    /**
     * OpenRouter's public model list (no key required), normalised and priced per
     * 1M tokens. Cached 6h — but never when empty: an empty list cached here would
     * leave the picker dead long after OpenRouter came back.
     */
    private function openrouterCatalogue(): array
    {
        $cached = \Illuminate\Support\Facades\Cache::get('openrouter:models');
        if (is_array($cached) && $cached) {
            return $cached;
        }
        try {
            $res = Http::timeout(20)->get('https://openrouter.ai/api/v1/models');
            if (!$res->successful()) {
                return [];
            }
            $models = [];
            foreach ($res->json('data') ?? [] as $m) {
                $id = (string) ($m['id'] ?? '');
                if ($id === '') {
                    continue;
                }
                $in  = (float) ($m['pricing']['prompt'] ?? 0) * 1000000;
                $out = (float) ($m['pricing']['completion'] ?? 0) * 1000000;
                // OpenRouter prices its router pseudo-models (auto, fusion, …) at a
                // -1 sentinel meaning "depends where it routes". Sorted by price they
                // would head the list at -$1,000,000 — drop them rather than show that.
                if ($in < 0 || $out < 0) {
                    continue;
                }
                $models[] = [
                    'id'      => $id,
                    'name'    => (string) ($m['name'] ?? $id),
                    'in'      => round($in, 3),
                    'out'     => round($out, 3),
                    'free'    => $in <= 0 && $out <= 0,
                    'context' => (int) ($m['context_length'] ?? 0),
                    // Book covers are extracted from images, so a model that can't
                    // see is not a candidate however cheap it is.
                    'vision'  => in_array('image', (array) ($m['architecture']['input_modalities'] ?? []), true),
                ];
            }
            if (!$models) {
                return [];
            }
            usort($models, fn ($a, $b) => [$a['in'], $a['id']] <=> [$b['in'], $b['id']]);
            \Illuminate\Support\Facades\Cache::put('openrouter:models', $models, 21600);
            return $models;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Anthropic's own model ids. Curated, not derived: their public list is not
     * open, and OpenRouter's aliases don't match the real ids. Prices are $ per 1M.
     */
    private function anthropicModels(): array
    {
        return [
            ['id' => 'claude-haiku-4-5',  'name' => 'Claude Haiku 4.5 — cheapest, fine for clean pages', 'in' => 1.0,  'out' => 5.0,  'free' => false, 'context' => 200000,  'vision' => true],
            ['id' => 'claude-sonnet-5',   'name' => 'Claude Sonnet 5 — best value for messy scans',      'in' => 3.0,  'out' => 15.0, 'free' => false, 'context' => 1000000, 'vision' => true],
            ['id' => 'claude-sonnet-4-6', 'name' => 'Claude Sonnet 4.6',                                 'in' => 3.0,  'out' => 15.0, 'free' => false, 'context' => 1000000, 'vision' => true],
            ['id' => 'claude-opus-4-8',   'name' => 'Claude Opus 4.8 — most capable',                    'in' => 5.0,  'out' => 25.0, 'free' => false, 'context' => 1000000, 'vision' => true],
        ];
    }

    // ---------------------------------------------------------------------

    /** True if this free model 429'd recently — skip it for a while to avoid wasted calls. */
    private function freeModelThrottled(string $model): bool
    {
        return (bool) \Illuminate\Support\Facades\Cache::get('ai:free_throttled:' . md5($model));
    }

    /** Remember a free model is exhausted so the rest of the batch goes straight to paid. */
    private function markFreeModelThrottled(string $model): void
    {
        \Illuminate\Support\Facades\Cache::put('ai:free_throttled:' . md5($model), 1, 600); // 10 min
    }

    private function getAiSettings(): array
    {
        $settings = Settings::first();
        $options  = $settings ? $settings->options : [];
        return $options['ai_settings'] ?? [];
    }

    private function runExtraction(?string $imageUrl, ?string $productUrl, ?string $text, ?string $country = null): array
    {
        $ai = $this->getAiSettings();
        if (empty($ai['api_key']) || empty($ai['enabled'])) {
            throw new MarvelException('AI is not configured. Set provider, API key and model in Admin → AI Settings.');
        }

        $userText = "Extract the book product details from the information below.";
        if ($productUrl) {
            $userText .= "\n\nSource product page URL: {$productUrl}";
            // Prefer the AnandaPub structured book API when the URL is theirs.
            $anand = $this->fetchAnandapub($productUrl);
            if ($anand) {
                $userText .= "\n\nStructured book data from the source API (JSON). "
                    . "Map fields: title/bengali_title->name, description->description, isbn->isbn13, "
                    . "language->language, pages->page_number, dimensions->height/width/length, "
                    . "genre/category_id->categories, keywords->tags, image->image_url, "
                    . "bookproducts.list_price->price, bookproducts.selling_price->sale_price, "
                    . "bookproducts.product_type_name->print_type, bookauthor.authorname->authors:\n"
                    . Str::limit($anand, 14000);
            } else {
                $plain = $this->fetchPageText($productUrl);
                if ($plain) {
                    $userText .= "\n\nPage text content:\n" . Str::limit($plain, 14000);
                }
            }
        }
        if ($text) {
            $userText .= "\n\nAdditional details:\n" . $text;
        }
        if ($imageUrl) {
            $userText .= "\n\nA cover/photo image of the book is attached; read any visible title, author, price and ISBN from it.";
        }

        $system = $this->systemPrompt();

        // Hybrid model routing to keep cost down (owner's design):
        //  - reading a COVER IMAGE needs vision → use the paid model only.
        //  - TEXT / URL extraction → try the free model first (£0), and only fall back to
        //    the paid model if free is throttled (OpenRouter's free pool 429s a lot) or
        //    returns unusable JSON. When free works, the extraction is free.
        $paid = $ai['model'] ?? '';
        $free = $ai['free_model'] ?? '';
        $hasImage = !empty($imageUrl);

        $plan = [];
        if (!$hasImage && $free !== '' && !$this->freeModelThrottled($free)) {
            $plan[] = ['model' => $free, 'free' => true];
        }
        if ($paid !== '') {
            $plan[] = ['model' => $paid, 'free' => false];
        }
        if (!$plan) {
            // Nothing configured beyond the provider default — let callLLM use it.
            $plan[] = ['model' => '', 'free' => false];
        }

        $data = null;
        $lastRaw = '';
        $lastErr = '';
        $usedModel = '';
        foreach ($plan as $step) {
            $usedModel = $step['model'];
            // The free tier fails often, so give it 2 shots; the paid model 2 as well.
            for ($try = 1; $try <= 2; $try++) {
                try {
                    $lastRaw = $this->callLLM($ai, $system, $userText, $imageUrl, $step['model'] ?: null);
                } catch (\Throwable $e) {
                    $lastErr = $e->getMessage();
                    // A 429 on the free model means the shared pool is exhausted — mark it
                    // throttled so the rest of this batch skips straight to paid.
                    if ($step['free'] && stripos($lastErr, '429') !== false) {
                        $this->markFreeModelThrottled($step['model']);
                    }
                    break; // provider error — don't hammer the same model, move on in the plan
                }
                $data = $this->parseJson($lastRaw);
                if (is_array($data)) {
                    break 2;
                }
            }
        }
        if (!is_array($data)) {
            $hint = $lastErr !== ''
                ? ('the provider returned an error: ' . Str::limit($lastErr, 140))
                : (trim($lastRaw) === '' ? 'the model returned an empty response' : 'the model did not return valid JSON');
            $modelName = $usedModel ?: ($paid ?: '(provider default)');
            throw new MarvelException(
                "AI extraction failed — {$hint} (model: {$modelName}). "
                . 'Try again, or set a stronger paid model in Settings -> AI.'
            );
        }
        // Always echo back the cover image the user supplied if the model didn't find one.
        if ($imageUrl && empty($data['image_url'])) {
            $data['image_url'] = $imageUrl;
        }

        // A generic product page exposes its REAL cover via the og:image meta tag. The
        // model only ever sees stripped page text (no <meta>), so it guesses a logo/404
        // URL. Trust the page's own og:image over the model for non-AnandaPub pages.
        if ($productUrl && empty($anand)) {
            $og = $this->fetchOgImage($productUrl);
            if ($og) {
                $data['image_url'] = $og;
            }
        }

        // AnandaPub's own API is authoritative — the model reliably romanises the Bangla
        // title, guesses a dead cover URL, and even invents prices. When we have their
        // JSON, take name / cover / price / author / description / ISBN straight from it
        // and let the model keep only the softer fields (categories, tags, slug source).
        if (!empty($anand)) {
            $data = $this->applyAnandapub($data, $anand);
        }

        return $this->resolveEntities($data, $productUrl, $country);
    }

    /**
     * Turn the raw AI fields into ready-to-save form values:
     * detect group (Books), resolve/create author, publisher & categories,
     * add "Indian Books" for Indian titles, build an English slug, apply the
     * Indian pricing rules, and default status=publish / quantity=1.
     */
    private function resolveEntities(array $d, ?string $sourceUrl, ?string $country = null): array
    {
        // printed_country override: the admin's up-front choice wins over the model's guess.
        // It decides the Indian markup (MRP×2 / ×1.75) and the "Indian Books" category.
        if ($country !== null && trim($country) !== '') {
            $d['printed_country'] = $country;
        }
        $indian = (bool) ($d['is_indian'] ?? false)
            || stripos((string) ($d['printed_country'] ?? ''), 'india') !== false
            || ($sourceUrl && stripos($sourceUrl, 'anandapub') !== false);
        $d['is_indian'] = $indian;

        // --- Group: this is a bookstore, everything imports into "Books" (type 8)
        $type = \Marvel\Database\Models\Type::find(8);
        if ($type) {
            $d['type'] = ['id' => $type->id, 'name' => $type->name, 'slug' => $type->slug];
        }

        // --- Author (single) with fuzzy de-dup
        $authorName = is_array($d['authors'] ?? null) ? ($d['authors'][0] ?? null) : ($d['authors'] ?? null);
        if ($authorName) {
            $a = $this->findOrCreateAuthor($authorName);
            if ($a) {
                $d['author'] = ['id' => $a->id, 'name' => $a->name, 'slug' => $a->slug];
            }
        }

        // --- Manufacturer / publisher
        if (!empty($d['publisher'])) {
            $m = $this->findOrCreateManufacturer($d['publisher']);
            if ($m) {
                $d['manufacturer'] = ['id' => $m->id, 'name' => $m->name, 'slug' => $m->slug];
            }
        }

        // --- Categories (3-4), + always "Indian Books" for Indian titles
        $catNames = array_slice(array_values(array_filter((array) ($d['categories'] ?? []))), 0, 4);
        if ($indian) {
            array_unshift($catNames, 'Indian Books');
        }
        $catNames = array_values(array_unique($catNames));
        $cats = [];
        foreach ($catNames as $cn) {
            $c = $this->findOrCreateCategory($cn);
            if ($c) {
                $cats[] = ['id' => $c->id, 'name' => $c->name, 'slug' => $c->slug];
            }
        }
        if ($cats) {
            $d['categories'] = $cats;
        }

        // --- English slug (editable on the form)
        $slugSource = !empty($d['slug']) ? $d['slug'] : ($d['name'] ?? '');
        $slug = Str::slug($slugSource);
        if (!$slug) {
            $slug = 'book-' . substr(md5((string) ($d['name'] ?? microtime())), 0, 8);
        }
        $d['slug'] = $slug;

        // --- Pricing: Indian books -> MRP*2, sale = round-up-to-5 of MRP*1.75
        // The MRP is the HIGHER of the two source prices, whichever field it arrived in —
        // sources (and the model) inconsistently put the list price in `price` vs
        // `sale_price`, and keying off `price` alone let a swapped pair invert the boxes.
        $pIn = is_numeric($d['price'] ?? null) ? (float) $d['price'] : null;
        $sIn = is_numeric($d['sale_price'] ?? null) ? (float) $d['sale_price'] : null;
        $mrp = max($pIn ?? 0, $sIn ?? 0) ?: null;
        // Source's actual (discounted) selling price = the LOWER of the two, for the
        // pre-order desk which prices up from what the buyer really pays, not the MRP.
        $amazonSale = ($pIn && $sIn) ? min($pIn, $sIn) : ($sIn ?: $pIn);
        $d['source_price'] = ($amazonSale && $amazonSale > 0) ? $amazonSale : $mrp;
        $d['source_currency'] = $indian ? 'INR' : 'USD';
        if ($mrp && empty($d['mrp'])) {
            $d['mrp'] = $mrp;
        }

        if ($indian && $mrp) {
            $d['price'] = (int) round($mrp * 2);
            $d['sale_price'] = (int) (ceil(($mrp * 1.75) / 5) * 5);
        }

        // --- Defaults
        $d['status'] = 'publish';
        if (empty($d['quantity'])) {
            $d['quantity'] = 1;
        }

        return $d;
    }

    private function normalizeName(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $s);
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    private function findOrCreateAuthor(string $name)
    {
        $name = trim($name);
        if ($name === '') return null;
        $norm = $this->normalizeName($name);

        // scan existing authors for an exact-normalized or very-similar match
        foreach (\Marvel\Database\Models\Author::select('id', 'name', 'slug')->get() as $a) {
            $an = $this->normalizeName((string) $a->name);
            if ($an === $norm) return $a;
            if ($an && $norm) {
                similar_text($an, $norm, $pct);
                if ($pct >= 88) return $a;
                if (str_contains($an, $norm) || str_contains($norm, $an)) return $a;
            }
        }
        return \Marvel\Database\Models\Author::create([
            'name'     => $name,
            'slug'     => $this->uniqueSlug('authors', $name),
            'language' => DEFAULT_LANGUAGE ?? 'en',
            'is_approved' => true,
        ]);
    }

    private function findOrCreateManufacturer(string $name)
    {
        $name = trim($name);
        if ($name === '') return null;
        $norm = $this->normalizeName($name);
        $existing = \Marvel\Database\Models\Manufacturer::select('id', 'name', 'slug')->get()
            ->first(fn ($m) => $this->normalizeName((string) $m->name) === $norm);
        if ($existing) return $existing;
        return \Marvel\Database\Models\Manufacturer::create([
            'name'     => $name,
            'slug'     => $this->uniqueSlug('manufacturers', $name),
            'language' => DEFAULT_LANGUAGE ?? 'en',
            'type_id'  => 8,
            'is_approved' => true,
        ]);
    }

    private function findOrCreateCategory(string $name)
    {
        $name = trim($name);
        if ($name === '') return null;
        $norm = $this->normalizeName($name);
        $existing = \Marvel\Database\Models\Category::where('type_id', 8)->select('id', 'name', 'slug')->get()
            ->first(fn ($c) => $this->normalizeName((string) $c->name) === $norm);
        if ($existing) return $existing;
        return \Marvel\Database\Models\Category::create([
            'name'     => $name,
            'slug'     => $this->uniqueSlug('categories', $name),
            'language' => DEFAULT_LANGUAGE ?? 'en',
            'type_id'  => 8,
        ]);
    }

    private function uniqueSlug(string $table, string $name): string
    {
        $base = Str::slug($name) ?: 'item-' . substr(md5($name), 0, 6);
        $slug = $base;
        $i = 1;
        while (\Illuminate\Support\Facades\DB::table($table)->where('slug', $slug)->exists()) {
            $slug = $base . '-' . (++$i);
        }
        return $slug;
    }

    /**
     * AnandaPub book API. Accepts an anandapub URL like
     * `anandapub.in/book-details/1010` (or any string containing the book id)
     * and returns the raw JSON from apis.anandapub.in/bookdetails.
     */
    private function fetchAnandapub(?string $url): ?string
    {
        if (!$url || stripos($url, 'anandapub') === false) {
            return null;
        }
        if (!preg_match('#book-?details/(\d+)#i', $url, $m) && !preg_match('#(\d{2,})#', $url, $m)) {
            return null;
        }
        $bookid = $m[1];
        try {
            $resp = Http::asMultipart()->timeout(30)->post(
                'https://apis.anandapub.in/bookdetails',
                ['company' => '1', 'bookid' => (string) $bookid]
            );
            if ($resp->successful() && $resp->json('status') === true) {
                return $resp->body();
            }
        } catch (\Throwable $e) {
            // fall through to generic scrape
        }
        return null;
    }

    /**
     * Overlay the authoritative AnandaPub fields onto the model's output.
     * The model is good at the fuzzy stuff (categories, tags) and bad at the exact
     * stuff (Bangla title, real cover URL, real price), so the API wins on the latter.
     */
    private function applyAnandapub(array $d, string $json): array
    {
        $api = json_decode($json, true);
        $bd  = $api['bookdetails'] ?? null;
        if (!is_array($bd)) {
            return $d;
        }

        // Name: keep the book's own Bangla title when it has one; the romanised
        // `title` is only a fallback. This is the "Bangla book stays Bangla" rule.
        $bengali = trim((string) ($bd['bengali_title'] ?? ''));
        $english = trim((string) ($bd['title'] ?? ''));
        if ($bengali !== '') {
            $d['name'] = $bengali;
            $d['language'] = $d['language'] ?: 'Bengali';
        } elseif ($english !== '') {
            $d['name'] = $english;
        }

        // Cover: the API's own URL, never the model's guessed one (which 404s).
        if (!empty($bd['image'])) {
            $d['image_url'] = $bd['image'];
        }

        // Author: prefer the Bangla author name for a Bangla book.
        $authors = [];
        foreach ((array) ($bd['bookauthor'] ?? []) as $au) {
            $name = ($bengali !== '' && !empty($au['bengali_author_name']))
                ? $au['bengali_author_name']
                : ($au['authorname'] ?? null);
            if ($name) {
                $authors[] = trim($name);
            }
        }
        if ($authors) {
            $d['authors'] = $authors;
        }

        // Price: the printed MRP. list_price / selling_price arrive per edition; take the
        // first edition that has a real number. resolveEntities turns MRP into ×2 / ×1.75.
        foreach ((array) ($bd['bookproducts'] ?? []) as $bp) {
            $list = is_numeric($bp['list_price'] ?? null) ? (float) $bp['list_price'] : null;
            $sell = is_numeric($bp['selling_price'] ?? null) ? (float) $bp['selling_price'] : null;
            if ($list || $sell) {
                $d['price'] = $list ?: $sell;         // MRP base
                $d['sale_price'] = $sell ?: $list;    // what they actually charge
                if (!empty($bp['product_type_name'])) {
                    $d['print_type'] = $d['print_type'] ?: $bp['product_type_name'];
                }
                break;
            }
        }

        // Description: the API ships HTML — clean it but keep the paragraph breaks.
        if (!empty($bd['description'])) {
            $desc = $this->cleanHtmlText((string) $bd['description']);
            if ($desc !== '') {
                $d['description'] = $desc;
            }
        }

        // ISBN straight from the source.
        foreach (['isbn', 'isbn13'] as $k) {
            if (!empty($bd[$k]) && empty($d['isbn13'])) {
                $d['isbn13'] = (string) $bd[$k];
            }
        }

        return $d;
    }

    /**
     * Fetch readable text from a product page. Uses the Jina AI reader
     * (r.jina.ai) which executes JavaScript, so SPA / JS-rendered pages work;
     * falls back to a plain HTTP GET + strip_tags if the reader is unavailable.
     */
    private function fetchPageText(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        // 1) JS-aware reader. The keyless free tier is shared-IP rate-limited, so a
        //    throttled call comes back slow, 429, or too-thin. Retry a couple of times
        //    before giving up — when it isn't throttled it answers in well under a second,
        //    so a retry recovers most transient throttles. A Jina key removes the limit.
        try {
            $reader = 'https://r.jina.ai/' . $url;
            $headers = ['Accept' => 'text/plain'];
            $jinaKey = $this->getAiSettings()['jina_key'] ?? null;
            if (!empty($jinaKey)) {
                $headers['Authorization'] = 'Bearer ' . $jinaKey;
            }
            for ($attempt = 1; $attempt <= 4; $attempt++) {
                try {
                    $resp = Http::withHeaders($headers)->timeout(40)->get($reader);
                    if ($resp->successful()) {
                        $text = trim($resp->body());
                        // A JS-heavy SPA (e.g. anandapub.in) served through a THROTTLED
                        // reader comes back as a ~700-char bare shell: it passes a naive
                        // >200 check but has zero book content, so the crawl finds no
                        // links and an extract returns all-null — the reported "AI fetch
                        // not working". Demand a substantial page on the early tries and
                        // retry the throttle; only on the last try accept a thin body so
                        // a genuinely short page still returns something.
                        $enough = $attempt >= 3 ? 200 : 1500;
                        if (strlen($text) > $enough) {
                            return $text;
                        }
                    }
                } catch (\Throwable $inner) {
                    // this attempt failed — fall through to the backoff below
                }
                if ($attempt < 4) {
                    usleep(900000 * $attempt); // 0.9s, 1.8s, 2.7s
                }
            }
        } catch (\Throwable $e) {
            // ignore, fall through
        }
        // 2) plain fetch fallback
        try {
            $html = Http::timeout(25)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; IndoBanglaBot/1.0)',
            ])->get($url)->body();
            return trim(preg_replace('/\s+/', ' ', strip_tags($html)));
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Download an image URL to our own public storage and return an
     * attachment-shaped object the product form can drop into the cover field.
     * This makes remote covers (from any site) persist and render on our domain.
     */
    public function fetchImage(Request $request)
    {
        $request->validate(['image_url' => 'required|string']);
        return ['status' => 'success', 'image' => $this->storeImageFromUrl($request->image_url)];
    }

    /** Download an image URL to our public storage; returns an attachment-shaped array. */
    /**
     * Pull the real cover from a product page's og:image / twitter:image meta tag.
     * The book stores (boierhaat, rokomari, etc.) all set og:image to the actual cover;
     * returns null if none found or if it's obviously a logo/placeholder.
     */
    private function fetchOgImage(?string $url): ?string
    {
        if (!$url || !preg_match('#^https?://#i', $url)) {
            return null;
        }
        try {
            $html = Http::timeout(20)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; IndoBanglaBot/1.0)',
            ])->get($url)->body();
        } catch (\Throwable $e) {
            return null;
        }
        if (!$html) {
            return null;
        }
        $patterns = [
            '#<meta[^>]+property=["\']og:image(?::url)?["\'][^>]+content=["\']([^"\']+)["\']#i',
            '#<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image(?::url)?["\']#i',
            '#<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']#i',
        ];
        foreach ($patterns as $re) {
            if (preg_match($re, $html, $m) && !empty($m[1])) {
                $img = html_entity_decode(trim($m[1]));
                // Skip a site logo/placeholder set as og:image (some themes do this).
                if ($img !== '' && !preg_match('#(logo|placeholder|no[-_]?image|default[-_]?(cover|image))#i', $img)) {
                    return $img;
                }
            }
        }
        return null;
    }

    private function storeImageFromUrl(string $url): array
    {
        $resp = Http::timeout(45)->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (compatible; IndoBanglaBot/1.0)',
        ])->get($url);
        if ($resp->failed()) {
            throw new MarvelException('Could not download the image (HTTP ' . $resp->status() . ').');
        }
        $body = $resp->body();
        $ctype = strtolower($resp->header('Content-Type') ?? '');
        $ext = 'jpg';
        foreach (['png' => 'png', 'webp' => 'webp', 'gif' => 'gif', 'jpeg' => 'jpg', 'jpg' => 'jpg'] as $needle => $e) {
            if (str_contains($ctype, $needle)) {
                $ext = $e;
                break;
            }
        }
        if (!str_starts_with($ctype, 'image/') && strlen($body) < 500) {
            throw new MarvelException('The URL did not return an image.');
        }
        $name = 'ai-imports/' . bin2hex(random_bytes(8)) . '.' . $ext;
        \Illuminate\Support\Facades\Storage::disk('public')->put($name, $body);
        $publicUrl = rtrim(config('app.url'), '/') . '/storage/' . $name;
        return [
            'id'        => null,
            'thumbnail' => $publicUrl,
            'original'  => $publicUrl,
            'file_name' => basename($name),
        ];
    }

    /**
     * Crawl a listing page (e.g. anandapub.in/book-list) and return the product
     * page URLs found on it (JS-rendered via the reader), capped at `limit`.
     */
    public function listCrawl(Request $request)
    {
        $request->validate(['list_url' => 'required|string', 'limit' => 'nullable|integer']);
        $limit = min((int) ($request->limit ?? 20), 50);
        $text = $this->fetchPageText($request->list_url) ?? '';

        $urls = []; // readerFailed-aware crawl
        if (preg_match_all('#https?://[^\s)"\'\]]*book-?details/\d+#i', $text, $m)) {
            $urls = $m[0];
        }
        if (preg_match_all('#book-?details/(\d+)#i', $text, $m2)) {
            foreach ($m2[1] as $id) {
                $urls[] = 'https://anandapub.in/book-details/' . $id;
            }
        }
        // AnandaPub lists embed the book id inside cover image refs: book_{id}_{ts}
        if (preg_match_all('#book_(\d+)_\d+#i', $text, $mi)) {
            foreach ($mi[1] as $id) {
                $urls[] = 'https://anandapub.in/book-details/' . $id;
            }
        }
        // generic product links as a fallback
        if (empty($urls) && preg_match_all('#https?://[^\s)"\'\]]*/products?/[a-z0-9\-]+#i', $text, $m3)) {
            $urls = $m3[0];
        }

        $urls = array_values(array_unique(array_map(fn ($u) => rtrim($u, '/.,'), $urls)));
        $urls = array_slice($urls, 0, $limit);

        // A list page that renders its books with JavaScript reads as ~nothing without the
        // JS-aware reader. When the reader is throttled we get the bare shell and find zero
        // links — say so plainly and point at the fix, instead of a silent empty success
        // that looks like the page simply had no books.
        if (empty($urls)) {
            $thin = strlen(trim($text)) < 400;
            $hasKey = !empty($this->getAiSettings()['jina_key'] ?? null);
            $msg = $thin
                ? ('Could not read that page — the page reader was rate-limited or the page '
                    . 'needs JavaScript. ' . ($hasKey
                        ? 'Try again in a moment.'
                        : 'Add a free Jina API key in Settings \u{2192} AI to fix this, or paste the book URLs directly below.'))
                : 'Read the page, but found no book links on it. Check the URL, or paste the book URLs directly below.';
            $msg = str_replace('\u{2192}', '->', $msg);
            return ['status' => 'success', 'count' => 0, 'urls' => [], 'message' => $msg];
        }

        return ['status' => 'success', 'count' => count($urls), 'urls' => $urls];
    }

    /**
     * Create a product from an (already extracted + enriched) product object,
     * into the IndoBangla Store shop, published. Used by AI batch upload.
     */
    /**
     * The author id to save. Prefer an explicit id from extraction, but if the admin
     * edited the writer's name in the preview (clearing the id), find-or-create by name.
     */
    private function resolveAuthorId(array $p): ?int
    {
        if (!empty($p['author']['id'])) {
            return (int) $p['author']['id'];
        }
        $name = $p['author']['name']
            ?? (is_array($p['authors'] ?? null) ? ($p['authors'][0] ?? null) : ($p['authors'] ?? null));
        if ($name !== null && trim((string) $name) !== '') {
            $a = $this->findOrCreateAuthor((string) $name);
            return $a ? (int) $a->id : null;
        }
        return null;
    }

    /**
     * The manufacturer/publisher id to save. Prefer an explicit id from extraction,
     * but if the admin picked/typed a publisher in the preview (clearing the id),
     * find-or-create by name — same contract as {@see resolveAuthorId}.
     */
    private function resolvePublisherId(array $p): ?int
    {
        if (!empty($p['manufacturer']['id'])) {
            return (int) $p['manufacturer']['id'];
        }
        $name = $p['manufacturer']['name'] ?? ($p['publisher'] ?? null);
        if ($name !== null && trim((string) $name) !== '') {
            $m = $this->findOrCreateManufacturer((string) $name);
            return $m ? (int) $m->id : null;
        }
        return null;
    }

    /**
     * Turn source HTML (anandapub descriptions are HTML) into clean text that KEEPS
     * paragraph breaks — the old collapse-all-whitespace flattened a multi-paragraph
     * synopsis into one wall of text.
     */
    private function cleanHtmlText(string $html): string
    {
        // Block boundaries become newlines so paragraphs survive strip_tags.
        $html = preg_replace('#<br\s*/?>#i', "\n", $html);
        $html = preg_replace('#</(p|div|li|h[1-6]|tr|blockquote)\s*>#i', "\n\n", $html);
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace(["\r\n", "\r", "\xC2\xA0"], ["\n", "\n", ' '], $text);
        // Collapse spaces/tabs but NOT newlines, then trim each line and blank runs.
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $lines = array_map('trim', explode("\n", $text));
        $text = preg_replace("/\n{3,}/", "\n\n", implode("\n", $lines));
        return trim($text);
    }

    public function createProduct(Request $request)
    {
        $p = $request->input('product', []);
        if (empty($p['name'])) {
            throw new MarvelException('Product name is missing.');
        }
        // The batch page lets the admin route each book to a vendor shop. Only fall
        // back to the app-wide resolver when they left the choice alone.
        $shop = null;
        if (!empty($p['shop_id'])) {
            $shop = \Marvel\Database\Models\Shop::find((int) $p['shop_id']);
            if (!$shop) {
                throw new MarvelException('The selected shop no longer exists.');
            }
        }
        if (!$shop) {
            $shopId = \Marvel\Http\Controllers\IntegrationController::resolveMainShopId();
            $shop = $shopId ? \Marvel\Database\Models\Shop::find($shopId) : null;
        }
        if (!$shop) {
            throw new MarvelException('IndoBangla Store shop not found.');
        }

        $image = null;
        if (!empty($p['image_url'])) {
            try {
                $image = $this->storeImageFromUrl($p['image_url']);
            } catch (\Throwable $e) {
                // publish without cover rather than fail the whole row
            }
        }

        $price = is_numeric($p['price'] ?? null) ? (float) $p['price'] : 0;
        $product = \Marvel\Database\Models\Product::create([
            'name'            => $p['name'],
            'slug'            => $this->uniqueSlug('products', $p['slug'] ?? $p['name']),
            'type_id'         => 8,
            'shop_id'         => $shop->id,
            'language'        => DEFAULT_LANGUAGE ?? 'en',
            'description'     => $p['description'] ?? null,
            'product_type'    => 'simple',
            // The preview lets the admin publish a row as a draft instead of live.
            'status'          => (($p['status'] ?? '') === 'draft') ? 'draft' : 'publish',
            'price'           => $price,
            'max_price'       => $price,
            'min_price'       => $price,
            'sale_price'      => is_numeric($p['sale_price'] ?? null) ? (float) $p['sale_price'] : null,
            'quantity'        => max(0, (int) ($p['quantity'] ?? 1)),
            'unit'            => $p['unit'] ?? '1 pc',
            'sku'             => $p['sku'] ?? null,
            // Setting stock to 0 in the preview means out of stock — don't force it in.
            'in_stock'        => max(0, (int) ($p['quantity'] ?? 1)) > 0,
            'is_taxable'      => false,
            'author_id'       => $this->resolveAuthorId($p),
            'manufacturer_id' => $this->resolvePublisherId($p),
            'image'           => $image,
        ]);

        if (!empty($p['categories']) && is_array($p['categories'])) {
            $ids = [];
            foreach ($p['categories'] as $c) {
                if (is_array($c) && !empty($c['id'])) {
                    $ids[] = (int) $c['id'];
                    continue;
                }
                // A string or {name} with no id = an admin-added category → find or create it.
                $name = is_array($c) ? ($c['name'] ?? null) : $c;
                if ($name !== null && trim((string) $name) !== '') {
                    $cat = $this->findOrCreateCategory((string) $name);
                    if ($cat) {
                        $ids[] = (int) $cat->id;
                    }
                }
            }
            $ids = array_values(array_unique(array_filter($ids)));
            if ($ids) {
                $product->categories()->attach($ids);
            }
        }

        $bm = [];
        foreach (['isbn10', 'isbn13', 'language', 'print_type', 'printed_country', 'condition', 'reading_level', 'edition', 'item_weight', 'page_number', 'height', 'width', 'length'] as $k) {
            if (!empty($p[$k])) {
                $bm[$k] = $p[$k];
            }
        }
        if ($bm) {
            $product->setMeta('book_meta', $bm);
            $product->saveMeta();
        }

        return ['status' => 'success', 'id' => $product->id, 'slug' => $product->slug, 'name' => $product->name];
    }

    /**
     * Tell the batch review table which of the extracted books we already sell.
     *
     * This exists because nothing else stops a re-import: createProduct() calls
     * uniqueSlug(), which quietly mints `my-book-2`, so importing the same page
     * twice *succeeds* twice. Matches, strongest first:
     *
     *   isbn — ISBN10/13 out of book_meta, punctuation-insensitive. Definitive.
     *   slug — the exact slug createProduct would mint, plus its -2/-3 variants.
     *   name — normalised title, exact or >= 90% similar. Advisory only: the same
     *          title is very often a different edition, so it is reported as
     *          "probable" and never as a certainty.
     *
     * Soft-deleted products are ignored — a trashed book is not a duplicate the
     * admin can act on. (uniqueSlug does count them, so a base slug can still be
     * taken by a trashed row without showing up here.)
     */
    public function duplicateCheck(Request $request)
    {
        $items = $request->input('products', []);
        if (!is_array($items) || !$items) {
            return ['status' => 'success', 'results' => []];
        }
        $items = array_slice($items, 0, 25);

        // Both indexes are built once for the whole batch. findOrCreateAuthor's
        // per-row full-table scan is exactly the cost being avoided here.
        $catalogue = $this->catalogueIndex();
        $isbnIndex = $this->isbnIndex();

        $results = [];
        foreach ($items as $i => $p) {
            $index = (is_array($p) && isset($p['index'])) ? (int) $p['index'] : (int) $i;
            if (!is_array($p) || empty($p['name'])) {
                $results[] = ['index' => $index, 'duplicate' => false, 'probable' => false, 'matches' => []];
                continue;
            }

            $found = []; // product id => ['reason','detail','score']

            // --- ISBN: the only identifier that survives a retitle.
            foreach (['isbn13', 'isbn10'] as $k) {
                $n = $this->normalizeIsbn($p[$k] ?? null);
                if (!$n || empty($isbnIndex[$n])) {
                    continue;
                }
                foreach ($isbnIndex[$n] as $pid) {
                    if (!isset($found[$pid])) {
                        $found[$pid] = ['reason' => 'isbn', 'detail' => strtoupper($k) . ' ' . $n, 'score' => 100];
                    }
                }
            }

            // --- Slug: what createProduct would land on, and what it landed on before.
            // The suffix is capped at two digits because that is uniqueSlug's real
            // range (-2, -3, …). Allowing \d+ would make base "anandamela" swallow
            // "anandamela-1433" — a different year, not a re-import.
            $base = Str::slug($p['slug'] ?? $p['name']);
            if ($base !== '') {
                $re = '/^' . preg_quote($base, '/') . '(-\d{1,2})?$/';
                foreach ($catalogue['bySlug'] as $slug => $c) {
                    if (!isset($found[$c['id']]) && preg_match($re, $slug)) {
                        $found[$c['id']] = ['reason' => 'slug', 'detail' => $slug, 'score' => 100];
                    }
                }
            }

            // --- Title, exact then fuzzy.
            $norm     = $this->normalizeTitle((string) $p['name']);
            $authorId = isset($p['author']['id']) ? (int) $p['author']['id'] : null;
            if ($norm !== '') {
                foreach ($catalogue['byNorm'][$norm] ?? [] as $c) {
                    if (!isset($found[$c['id']])) {
                        $found[$c['id']] = ['reason' => 'name', 'detail' => 'same title', 'score' => 100];
                    }
                }
                $digits = $this->titleDigits($norm);
                foreach ($this->fuzzyCandidates($catalogue, $norm, $authorId) as $c) {
                    if (isset($found[$c['id']])) {
                        continue;
                    }
                    // "আনন্দমেলা পূজাবার্ষিকী ১৪৩৩" vs "… ১৪৩০" scores 99% — the year is a
                    // few bytes in a long title — but they are different books. Same for
                    // "সমগ্র ১" vs "সমগ্র ২". When both titles carry numbers and the
                    // numbers disagree, that is a distinction, not a typo.
                    $cd = $this->titleDigits($c['norm']);
                    if ($digits && $cd && $digits !== $cd) {
                        continue;
                    }
                    similar_text($c['norm'], $norm, $pct);
                    if ($pct >= 90) {
                        $found[$c['id']] = [
                            'reason' => 'name',
                            'detail' => 'title ' . round($pct) . '% similar',
                            'score'  => (int) round($pct),
                        ];
                    }
                }
            }

            $rank    = ['isbn' => 0, 'slug' => 1, 'name' => 2];
            $matches = [];
            foreach ($found as $pid => $m) {
                $c = $catalogue['byId'][$pid] ?? null;
                if (!$c) {
                    continue;
                }
                $matches[] = [
                    'id'         => $c['id'],
                    'name'       => $c['name'],
                    'slug'       => $c['slug'],
                    'author'     => $c['author'],
                    'quantity'   => $c['quantity'],
                    'price'      => $c['price'],
                    'sale_price' => $c['sale_price'],
                    'reason'     => $m['reason'],
                    'detail'     => $m['detail'],
                    'score'      => $m['score'],
                ];
            }
            usort($matches, fn ($a, $b) => [$rank[$a['reason']], -$a['score']] <=> [$rank[$b['reason']], -$b['score']]);
            $matches = array_slice($matches, 0, 5);

            $reasons = array_column($matches, 'reason');
            $results[] = [
                'index'     => $index,
                // isbn/slug are facts; a title match alone is only a suspicion.
                'duplicate' => (bool) array_intersect(['isbn', 'slug'], $reasons),
                'probable'  => !array_intersect(['isbn', 'slug'], $reasons) && in_array('name', $reasons, true),
                'matches'   => $matches,
            ];
        }

        return ['status' => 'success', 'results' => $results];
    }

    /**
     * Refresh an existing book from a batch row instead of creating a second one.
     *
     * Deliberately narrow: only the three fields an import can meaningfully
     * refresh, and only the ones the admin ticked — so re-running an import can
     * never quietly rewrite a listing someone curated by hand.
     */
    public function updateExisting(Request $request)
    {
        $id     = (int) $request->input('product_id');
        $fields = (array) $request->input('fields', []);
        $p      = (array) $request->input('product', []);

        $product = \Marvel\Database\Models\Product::find($id);
        if (!$product) {
            throw new MarvelException('That product no longer exists.');
        }

        $applied = [];
        if (in_array('quantity', $fields, true) && is_numeric($p['quantity'] ?? null)) {
            $qty                = max(0, (int) $p['quantity']);
            $product->quantity  = $qty;
            $product->in_stock  = $qty > 0;
            $applied[]          = 'quantity';
        }
        if (in_array('price', $fields, true) && is_numeric($p['price'] ?? null)) {
            $price               = (float) $p['price'];
            $product->price      = $price;
            $product->max_price  = $price;
            $product->min_price  = $price;
            // Only touch sale_price when the row actually carries one. Nulling it
            // because the extractor found none would silently end a live sale.
            if (is_numeric($p['sale_price'] ?? null)) {
                $product->sale_price = (float) $p['sale_price'];
            }
            $applied[] = 'price';
        }
        if (in_array('description', $fields, true) && !empty($p['description'])) {
            $product->description = $p['description'];
            $applied[]            = 'description';
        }

        if (!$applied) {
            throw new MarvelException('Nothing to update — pick at least one field the row has a value for.');
        }
        $product->save();

        return [
            'status'  => 'success',
            'id'      => $product->id,
            'slug'    => $product->slug,
            'name'    => $product->name,
            'updated' => $applied,
        ];
    }

    /**
     * Every live product, indexed the three ways duplicateCheck looks things up.
     * Raw DB on purpose: the Product model appends a `book` attribute that would
     * fire a getMeta() per row.
     */
    private function catalogueIndex(): array
    {
        $rows = \Illuminate\Support\Facades\DB::table('products')
            ->leftJoin('authors', 'authors.id', '=', 'products.author_id')
            ->whereNull('products.deleted_at')
            ->select(
                'products.id',
                'products.name',
                'products.slug',
                'products.quantity',
                'products.price',
                'products.sale_price',
                'products.author_id',
                'authors.name as author_name'
            )
            ->get();

        $bySlug = [];
        $byNorm = [];
        $byId   = [];
        $all    = [];
        foreach ($rows as $r) {
            $item = [
                'id'         => (int) $r->id,
                'name'       => (string) $r->name,
                'slug'       => (string) $r->slug,
                'quantity'   => (int) $r->quantity,
                'price'      => $r->price,
                'sale_price' => $r->sale_price,
                'author_id'  => $r->author_id ? (int) $r->author_id : null,
                'author'     => $r->author_name,
                'norm'       => $this->normalizeTitle((string) $r->name),
            ];
            $bySlug[$item['slug']]   = $item;
            $byNorm[$item['norm']][] = $item;
            $byId[$item['id']]       = $item;
            $all[]                   = $item;
        }

        return ['bySlug' => $bySlug, 'byNorm' => $byNorm, 'byId' => $byId, 'all' => $all];
    }

    /**
     * normalised ISBN => [product ids]. ISBN lives only in the book_meta blob,
     * so there is no column to query — this reads the meta rows once per batch.
     */
    private function isbnIndex(): array
    {
        $rows = \Illuminate\Support\Facades\DB::table('products_meta')
            ->join('products', 'products.id', '=', 'products_meta.product_id')
            ->whereNull('products.deleted_at')
            ->where('products_meta.key', 'book_meta')
            ->select('products_meta.product_id', 'products_meta.value')
            ->get();

        $index = [];
        foreach ($rows as $r) {
            $meta = $this->decodeMetaValue($r->value);
            if (!is_array($meta)) {
                continue;
            }
            foreach (['isbn10', 'isbn13'] as $k) {
                $n = $this->normalizeIsbn($meta[$k] ?? null);
                if ($n) {
                    $index[$n][] = (int) $r->product_id;
                }
            }
        }
        return $index;
    }

    /**
     * kodeine/laravel-meta chooses its own encoding per value type, so read the
     * stored blob back tolerantly rather than betting on one format.
     */
    private function decodeMetaValue($value): ?array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || $value === '') {
            return null;
        }
        $json = json_decode($value, true);
        if (is_array($json)) {
            return $json;
        }
        $un = @unserialize($value);
        return is_array($un) ? $un : null;
    }

    /**
     * Title normaliser for duplicate matching.
     *
     * NOT normalizeName(): that keeps only \p{L}\p{N}, and a Bengali vowel sign
     * is a Mark (\p{M}), not a Letter — so it turns "কাকা" and "কেকে" both into
     * "ক ক". On a mostly-Bengali catalogue that collapses unrelated titles onto
     * one key and reports them as duplicates of each other. Keep the marks.
     */
    private function normalizeTitle(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = preg_replace('/[^\p{L}\p{N}\p{M}]+/u', ' ', $s);
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    /**
     * The numbers in a title, in order — Bengali digits included (\p{N} covers
     * ১২৩). Volume and year numbers are what separates otherwise-identical
     * titles, so they are compared exactly rather than fuzzily.
     */
    private function titleDigits(string $norm): string
    {
        preg_match_all('/\p{N}+/u', $norm, $m);
        return implode(',', $m[0] ?? []);
    }

    /**
     * ISBNs are written by hand and by three different extractors, so compare
     * digits only: "978-93-5040-502-4" and "9789350405024" are one book.
     */
    private function normalizeIsbn($v): ?string
    {
        if (!is_scalar($v)) {
            return null;
        }
        $s = strtoupper(preg_replace('/[^0-9Xx]/', '', (string) $v));
        return (strlen($s) === 10 || strlen($s) === 13) ? $s : null;
    }

    /**
     * Keep similar_text() off the whole catalogue: compare against the author's
     * own shelf when we resolved one, otherwise only against titles that already
     * start the same way.
     */
    private function fuzzyCandidates(array $catalogue, string $norm, ?int $authorId): array
    {
        if ($authorId) {
            return array_values(array_filter($catalogue['all'], fn ($c) => $c['author_id'] === $authorId));
        }
        $prefix = mb_substr($norm, 0, 3);
        if (mb_strlen($prefix) < 3) {
            return [];
        }
        return array_values(array_filter($catalogue['all'], fn ($c) => mb_substr($c['norm'], 0, 3) === $prefix));
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are a precise data-extraction assistant for an online bookstore (currency BDT/Bangladeshi Taka).
From the provided image, page text and/or notes, extract the book's details.
Respond with ONLY a single minified JSON object (no markdown, no commentary) using EXACTLY these keys
(use null or [] when unknown, never invent ISBNs or prices):
{
  "name": string,                 // the book's title in ITS OWN script — if the book is in Bangla, the name MUST stay in Bangla (do NOT romanize or translate it). Romanize only in `slug`.
  "slug": string,                 // English/romanized url slug of the title (transliterate Bangla to Latin), lowercase words separated by hyphens
  "is_indian": boolean,           // true if this is an Indian book / Indian publisher / printed in India
  "description": string,          // REQUIRED: the COMPLETE product description / synopsis from the page — copy ALL of it, every paragraph, verbatim; do NOT shorten, summarise or truncate. Only if the page genuinely has no description, write a short factual summary from the title, author and category. Never leave this empty.
  "price": number|null,           // regular price in BDT
  "sale_price": number|null,      // discounted price in BDT if any
  "quantity": number|null,
  "sku": string|null,
  "unit": string|null,            // e.g. "1 pc"
  "isbn10": string|null,
  "isbn13": string|null,
  "language": string|null,
  "print_type": string|null,      // hardcover / paperback
  "printed_country": string|null,
  "condition": string|null,       // New / Used
  "reading_level": string|null,
  "edition": string|null,
  "item_weight": string|null,
  "page_number": number|null,
  "height": string|null,
  "width": string|null,
  "length": string|null,
  "authors": string[],
  "publisher": string|null,
  "categories": string[],
  "tags": string[],
  "image_url": string|null        // best cover image URL if found
}
PROMPT;
    }

    private function callLLM(array $ai, string $system, string $userText, ?string $imageUrl, ?string $modelOverride = null): string
    {
        $provider = $ai['provider'] ?? 'openrouter';
        $key      = $ai['api_key'];
        $model    = ($modelOverride !== null && $modelOverride !== '') ? $modelOverride : ($ai['model'] ?? '');

        if ($provider === 'anthropic') {
            $content = [['type' => 'text', 'text' => $userText]];
            if ($imageUrl) {
                $content[] = ['type' => 'image', 'source' => ['type' => 'url', 'url' => $imageUrl]];
            }
            $resp = Http::withHeaders([
                'x-api-key'         => $key,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->timeout(90)->post('https://api.anthropic.com/v1/messages', [
                'model'      => $model ?: 'claude-sonnet-4-5',
                'max_tokens' => 6000,
                'system'     => $system,
                'messages'   => [['role' => 'user', 'content' => $content]],
            ]);
            if ($resp->failed()) {
                throw new MarvelException('Anthropic error: ' . $resp->status() . ' ' . Str::limit($resp->body(), 300));
            }
            return (string) $resp->json('content.0.text', '');
        }

        // openai + openrouter share the OpenAI-compatible chat/completions schema
        $base = $provider === 'openai'
            ? 'https://api.openai.com/v1'
            : 'https://openrouter.ai/api/v1';

        $userContent = [['type' => 'text', 'text' => $userText]];
        if ($imageUrl) {
            $userContent[] = ['type' => 'image_url', 'image_url' => ['url' => $imageUrl]];
        }

        $headers = [];
        if ($provider === 'openrouter') {
            $headers['HTTP-Referer'] = 'https://indobangla.tech';
            $headers['X-Title']      = 'IndoBangla';
        }

        $resp = Http::withToken($key)->withHeaders($headers)->timeout(90)->post($base . '/chat/completions', [
            'model'    => $model ?: ($provider === 'openai' ? 'gpt-4o' : 'openai/gpt-4o'),
            // Without this the model uses its own (sometimes small) default and truncates
            // the JSON mid-object — the main cause of 'could not be parsed' on cheap models.
            'max_tokens' => 6000,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $userContent],
            ],
        ]);
        if ($resp->failed()) {
            $name = $provider === 'openai' ? 'OpenAI' : 'OpenRouter';
            throw new MarvelException($name . ' error: ' . $resp->status() . ' ' . Str::limit($resp->body(), 300));
        }
        return (string) $resp->json('choices.0.message.content', '');
    }

    private function parseJson(string $raw)
    {
        $raw = trim($raw);
        // strip ```json fences
        $raw = preg_replace('/^```(?:json)?/i', '', $raw);
        $raw = preg_replace('/```$/', '', trim($raw));
        $raw = trim($raw);
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        // fall back: grab the outermost {...}
        $start = strpos($raw, '{');
        $end   = strrpos($raw, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $slice = substr($raw, $start, $end - $start + 1);
            $decoded = json_decode($slice, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }
        return null;
    }
}
