<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Marvel\Database\Models\Product;
use Marvel\Database\Models\Type;
use Marvel\Database\Models\Shop;
use Marvel\Database\Models\Settings;

/**
 * Creates (or updates) the "আনন্দমেলা পূজাবার্ষিকী ১৪৩৩" Puja annual and switches it
 * onto its bespoke, single-product landing template.
 *
 * Idempotent — safe to run repeatedly. Keyed on the product slug, so re-running only
 * refreshes the fields below and never duplicates the product.
 *
 *   php artisan db:seed --class="Database\Seeders\AnandamelaLandingSeeder"
 *
 * The cover image + interior gallery are copyrighted scans and are NOT seeded here —
 * upload them from the admin product editor. The landing page falls back gracefully
 * (a placeholder cover, and the gallery section is hidden) until they are added.
 */
class AnandamelaLandingSeeder extends Seeder
{
    /** Stable identity for the product. */
    private const SLUG = 'anandamela-1433';
    /** Landing template id — must match TEMPLATES in the admin editor and the shop branch. */
    private const TEMPLATE = 'anandamela';

    public function run(): void
    {
        // A product needs a type; prefer a "Books" type, else fall back to the first one.
        $type = Type::query()
            ->orderByRaw("CASE WHEN slug = 'books' THEN 0 WHEN slug = 'book' THEN 1 ELSE 2 END")
            ->first();

        if (!$type) {
            $this->command?->error('No product Type found — create at least one type first. Aborting.');
            return;
        }

        // Attach to the first shop so it appears in the catalogue (shop_id is nullable but
        // the storefront expects one). Null is tolerated if no shop exists yet.
        $shopId = optional(Shop::query()->orderBy('id')->first())->id;

        $product = Product::updateOrCreate(
            ['slug' => self::SLUG],
            [
                'name'         => 'আনন্দমেলা পূজাবার্ষিকী ১৪৩৩',
                'type_id'      => $type->id,
                'shop_id'      => $shopId,
                'price'        => 450,
                'sale_price'   => null,
                'quantity'     => 50,
                'in_stock'     => true,
                'status'       => 'publish',
                'product_type' => 'simple',
                'unit'         => 'কপি',
                'sku'          => 'ANANDAMELA-1433',
                'description'  => '<p>আনন্দমেলা পূজাবার্ষিকী ১৪৩৩ — অরিজিনাল কলকাতা সংস্করণ। ৬টি উপন্যাস, ৯টি গল্প, ৪টি কমিক্স আর নানা বিভাগ নিয়ে সংগ্রহে রাখার মতো একটি সংখ্যা। প্রচ্ছদ: কৃণাল বর্মণ।</p>',
            ]
        );

        // Book specification meta (drives the generic spec table; harmless for the bespoke design).
        $product->setMeta('book_meta', [
            'language'    => 'বাংলা',
            'edition'     => 'পূজাবার্ষিকী ১৪৩৩',
            'page_number' => '৫৭৬',
            'print_type'  => 'পেপারব্যাক',
            'publisher'   => 'আনন্দ পাবলিশার্স',
        ]);
        $product->save();

        // Flip on the bespoke landing template for this product. The read path
        // (IntegrationController::normalizeLanding) fills in every other key, so storing
        // just the two meaningful flags here is enough.
        $settings = Settings::first();
        if ($settings) {
            $options = $settings->options ?? [];
            $map = is_array($options['landing_pages'] ?? null) ? $options['landing_pages'] : [];
            $map[(string) $product->id] = array_merge(
                is_array($map[(string) $product->id] ?? null) ? $map[(string) $product->id] : [],
                ['enabled' => true, 'template' => self::TEMPLATE]
            );
            $options['landing_pages'] = $map;
            $settings->update(['options' => $options]);
        } else {
            $this->command?->warn('No Settings row found — landing template not enabled. Run the app installer first.');
        }

        $this->command?->info("Anandamela 1433 ready (product #{$product->id}). Landing: /landing/" . self::SLUG);
        $this->command?->info('→ Upload the cover image + interior gallery from the admin product editor to finish.');
    }
}
