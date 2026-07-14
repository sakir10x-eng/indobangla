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
            'model'    => $ai['model'] ?? '',
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
            'model'    => 'nullable|string',
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
            'model'    => $data['model'] ?? ($current['model'] ?? ''),
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
        ]);

        if (!$request->image_url && !$request->product_url && !$request->text) {
            throw new MarvelException('Please provide an image URL, a product URL, or some text.');
        }

        $product = $this->runExtraction(
            $request->image_url,
            $request->product_url,
            $request->text
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

        $results = [];
        foreach ($items as $i => $item) {
            try {
                $product = $this->runExtraction(
                    $item['image_url'] ?? null,
                    $item['product_url'] ?? null,
                    $item['text'] ?? null
                );
                $results[] = ['index' => $i, 'status' => 'success', 'product' => $product];
            } catch (\Throwable $e) {
                $results[] = ['index' => $i, 'status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return ['status' => 'success', 'results' => $results];
    }

    // ---------------------------------------------------------------------

    private function getAiSettings(): array
    {
        $settings = Settings::first();
        $options  = $settings ? $settings->options : [];
        return $options['ai_settings'] ?? [];
    }

    private function runExtraction(?string $imageUrl, ?string $productUrl, ?string $text): array
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
        $raw    = $this->callLLM($ai, $system, $userText, $imageUrl);

        $data = $this->parseJson($raw);
        if (!is_array($data)) {
            throw new MarvelException('The AI response could not be parsed. Try again or refine the input.');
        }
        // Always echo back the cover image the user supplied if the model didn't find one.
        if ($imageUrl && empty($data['image_url'])) {
            $data['image_url'] = $imageUrl;
        }

        return $this->resolveEntities($data, $productUrl);
    }

    /**
     * Turn the raw AI fields into ready-to-save form values:
     * detect group (Books), resolve/create author, publisher & categories,
     * add "Indian Books" for Indian titles, build an English slug, apply the
     * Indian pricing rules, and default status=publish / quantity=1.
     */
    private function resolveEntities(array $d, ?string $sourceUrl): array
    {
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
        $mrp = is_numeric($d['price'] ?? null) ? (float) $d['price'] : null;

        // Keep what the source page actually listed, before we mark it up. The pre-order desk
        // prices from the Amazon figure itself (× rate + weight charge), so handing it the
        // already-converted number would mark the book up twice.
        $d['source_price'] = $mrp;
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
     * Fetch readable text from a product page. Uses the Jina AI reader
     * (r.jina.ai) which executes JavaScript, so SPA / JS-rendered pages work;
     * falls back to a plain HTTP GET + strip_tags if the reader is unavailable.
     */
    private function fetchPageText(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        // 1) JS-aware reader. A Jina key is optional — without it the reader still works but
        //    is rate-limited, which is what makes Amazon fetches fail intermittently.
        try {
            $reader = 'https://r.jina.ai/' . $url;
            $headers = ['Accept' => 'text/plain'];
            $jinaKey = $this->getAiSettings()['jina_key'] ?? null;
            if (!empty($jinaKey)) {
                $headers['Authorization'] = 'Bearer ' . $jinaKey;
            }
            $resp = Http::withHeaders($headers)->timeout(45)->get($reader);
            if ($resp->successful()) {
                $text = trim($resp->body());
                if (strlen($text) > 200) {
                    return $text;
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

        $urls = [];
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

        return ['status' => 'success', 'count' => count($urls), 'urls' => $urls];
    }

    /**
     * Create a product from an (already extracted + enriched) product object,
     * into the IndoBangla Store shop, published. Used by AI batch upload.
     */
    public function createProduct(Request $request)
    {
        $p = $request->input('product', []);
        if (empty($p['name'])) {
            throw new MarvelException('Product name is missing.');
        }
        // Same resolver the rest of the app uses — settings first, catalogue-holder as fallback.
        $shopId = \Marvel\Http\Controllers\IntegrationController::resolveMainShopId();
        $shop = $shopId ? \Marvel\Database\Models\Shop::find($shopId) : null;
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
            'status'          => 'publish',
            'price'           => $price,
            'max_price'       => $price,
            'min_price'       => $price,
            'sale_price'      => is_numeric($p['sale_price'] ?? null) ? (float) $p['sale_price'] : null,
            'quantity'        => (int) ($p['quantity'] ?? 1),
            'unit'            => $p['unit'] ?? '1 pc',
            'sku'             => $p['sku'] ?? null,
            'in_stock'        => true,
            'is_taxable'      => false,
            'author_id'       => $p['author']['id'] ?? null,
            'manufacturer_id' => $p['manufacturer']['id'] ?? null,
            'image'           => $image,
        ]);

        if (!empty($p['categories']) && is_array($p['categories'])) {
            $ids = array_values(array_filter(array_map(fn ($c) => is_array($c) ? ($c['id'] ?? null) : $c, $p['categories'])));
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

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are a precise data-extraction assistant for an online bookstore (currency BDT/Bangladeshi Taka).
From the provided image, page text and/or notes, extract the book's details.
Respond with ONLY a single minified JSON object (no markdown, no commentary) using EXACTLY these keys
(use null or [] when unknown, never invent ISBNs or prices):
{
  "name": string,
  "slug": string,                 // English/romanized url slug of the title (transliterate Bangla to Latin), lowercase words separated by hyphens
  "is_indian": boolean,           // true if this is an Indian book / Indian publisher / printed in India
  "description": string,          // 2-4 sentence summary
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

    private function callLLM(array $ai, string $system, string $userText, ?string $imageUrl): string
    {
        $provider = $ai['provider'] ?? 'openrouter';
        $key      = $ai['api_key'];
        $model    = $ai['model'] ?? '';

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
                'max_tokens' => 2000,
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
