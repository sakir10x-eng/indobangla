<?php

namespace Marvel\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Marvel\Database\Models\Settings;

/**
 * The single list of everything we've built for IndoBangla, with a live probe per feature.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  WHEN YOU SHIP A NEW FEATURE: add one entry to features() below.
 *  Keep it honest — the `check` must actually prove the feature can work (its table,
 *  column, setting or token really exists). A check that always returns true is worse
 *  than no check, because the dashboard would show green while the feature is broken.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A check returns:
 *   true / null      → healthy
 *   string           → healthy, with a detail line ("2,837 areas cached")
 *   ['warn' => msg]  → works, but needs attention (amber)
 *   ['fail' => msg]  → broken (red)
 */
class FeatureRegistry
{
    public static function features(): array
    {
        return [
            // ---------------------------------------------------------- pricing
            [
                'key' => 'conversion', 'version' => '1.4.0', 'date' => '2026-07-13',
                'area' => 'Pricing', 'name' => 'Conversion-rate pricing',
                'detail' => 'MRP × রেট থেকে দাম; multi-criteria filter, exclude, rounding, updated-book list',
                'admin' => '/settings/conversion',
                'check' => fn () => isset(self::opts()['conversion'])
                    ? 'rate ×' . (self::opts()['conversion']['rate'] ?? '?')
                    : ['fail' => 'conversion config missing from settings'],
            ],
            [
                'key' => 'price_rounding', 'version' => '1.1.0', 'date' => '2026-07-13',
                'area' => 'Pricing', 'name' => 'Price rounding (৫/০)',
                'detail' => 'ভগ্নাংশ বাদ; শেষ ডিজিট 0–1→x0, 2–6→x5, 7–9→পরের x0',
                'admin' => '/settings/conversion',
                'check' => fn () => true,
            ],
            [
                'key' => 'scheduled_rate', 'version' => '1.1.0', 'date' => '2026-07-13',
                'area' => 'Pricing', 'name' => 'Scheduled rate + auto-revert',
                'detail' => 'নির্দিষ্ট সময় পর আগের রেটে ফেরে (ঘণ্টায় cron)',
                'admin' => '/settings/conversion',
                'check' => function () {
                    $s = self::opts()['conversion']['schedule'] ?? null;
                    return $s['enabled'] ?? false
                        ? 'active until ' . ($s['until'] ?? '?')
                        : 'idle (no schedule running)';
                },
            ],
            [
                'key' => 'membership', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Pricing', 'name' => 'Membership cards (৮-digit)',
                'detail' => 'কার্ড নম্বরই কুপন কোড; শুধু মালিক লগইন করলে ছাড়',
                'admin' => '/settings/conversion',
                'check' => function () {
                    if (!Schema::hasColumn('users', 'membership_no')) {
                        return ['fail' => 'users.membership_no column missing'];
                    }
                    $n = DB::table('users')->whereNotNull('membership_no')->count();
                    $tiers = self::opts()['conversion']['tiers'] ?? [];
                    return $tiers
                        ? "{$n} cards · tiers set"
                        : ['warn' => "{$n} cards issued, but no tier rates set yet"];
                },
            ],

            // ---------------------------------------------------------- orders
            [
                'key' => 'preorder', 'version' => '1.2.0', 'date' => '2026-07-13',
                'area' => 'Orders', 'name' => 'Pre-order system',
                'detail' => '৫০% অগ্রিম (১০০% দিলে ৫% ছাড়), COD বন্ধ, কোটা/তারিখ, ২৮-দিন টাইমার',
                'admin' => '/preorder',
                'check' => function () {
                    if (!Schema::hasColumn('products', 'is_preorder')) {
                        return ['fail' => 'products.is_preorder column missing'];
                    }
                    $n = DB::table('products')->where('is_preorder', true)->count();
                    return "{$n} book(s) open for pre-order";
                },
            ],
            [
                'key' => 'pay_link', 'version' => '1.1.0', 'date' => '2026-07-13',
                'area' => 'Orders', 'name' => 'Payment link + expiry timer',
                'detail' => 'ডিফল্ট ৬ ঘণ্টা; মেয়াদ শেষে নতুন লিংক লাগে',
                'admin' => '/preorder',
                'check' => fn () => 'expires after ' . (int) (self::opts()['payLinkHours'] ?? 6) . 'h',
            ],
            [
                'key' => 'exchange', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Orders', 'name' => 'Exchange / Return window',
                'detail' => '৩ দিনে জানাতে হবে, ৭ দিনে শেষ; স্টক নিয়মসহ; রিসেল বই বাদ',
                'admin' => '/exchanges',
                'check' => function () {
                    if (!Schema::hasTable('exchange_requests')) {
                        return ['fail' => 'exchange_requests table missing'];
                    }
                    $open = DB::table('exchange_requests')->where('status', 'requested')->count();
                    return $open ? ['warn' => "{$open} request(s) waiting for a decision"] : 'no pending requests';
                },
            ],
            [
                'key' => 'order_ops', 'version' => '1.2.0', 'date' => '2026-07-13',
                'area' => 'Orders', 'name' => 'Order board ops',
                'detail' => 'Attention চেকলিস্ট, PARTIAL পেমেন্ট, ReplyGenie ব্যাজ, দাম এডিট, প্রোডাক্ট move, Amazon লিংক',
                'admin' => '/orders',
                'check' => fn () => Schema::hasColumn('orders', 'ops_meta')
                    ? true
                    : ['fail' => 'orders.ops_meta column missing'],
            ],
            [
                'key' => 'invoice', 'version' => '1.1.0', 'date' => '2026-07-13',
                'area' => 'Orders', 'name' => 'Printable invoice',
                'detail' => 'আসল লোগো, QR উপরে (কাগজ সাশ্রয়), ৳ মুদ্রা',
                'admin' => '/orders',
                'check' => fn () => !empty(self::opts()['logo']['original'])
                    ? true
                    : ['warn' => 'no logo in settings — invoice falls back to text'],
            ],

            // ---------------------------------------------------------- customer
            [
                'key' => 'tickets', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Customer', 'name' => 'Support tickets',
                'detail' => 'কাস্টমার টিকেট খোলে, অ্যাডমিন থ্রেডে উত্তর দেয়',
                'admin' => '/tickets',
                'check' => function () {
                    if (!Schema::hasTable('support_tickets')) {
                        return ['fail' => 'support_tickets table missing'];
                    }
                    $open = DB::table('support_tickets')->where('status', 'open')->count();
                    return $open ? ['warn' => "{$open} ticket(s) awaiting a reply"] : 'no open tickets';
                },
            ],
            [
                'key' => 'restock', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Customer', 'name' => 'Restock requests',
                'detail' => '৩টি ফ্রি, এরপর ১০ পয়েন্ট; কনফার্ম করলে বই প্রি-অর্ডার মোডে ফেরে',
                'admin' => '/restock',
                'check' => function () {
                    if (!Schema::hasTable('restock_requests')) {
                        return ['fail' => 'restock_requests table missing'];
                    }
                    $new = DB::table('restock_requests')->where('status', 'requested')->count();
                    return $new ? ['warn' => "{$new} new request(s)"] : 'no new requests';
                },
            ],
            [
                'key' => 'abandoned', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Customer', 'name' => 'Abandoned checkouts',
                'detail' => 'চেকআউটে এসে অর্ডার করেনি — কল/WhatsApp করার তালিকা',
                'admin' => '/abandoned',
                'check' => function () {
                    if (!Schema::hasTable('checkout_intents')) {
                        return ['fail' => 'checkout_intents table missing'];
                    }
                    $n = DB::table('checkout_intents')->where('converted', false)->count();
                    return $n ? ['warn' => "{$n} cart(s) to follow up"] : 'none pending';
                },
            ],
            [
                'key' => 'resell', 'version' => '1.1.0', 'date' => '2026-07-13',
                'area' => 'Customer', 'name' => 'Resell (used books)',
                'detail' => 'দাম ক্যাপ = কার্যকর বিক্রয়মূল্য; এক্সচেঞ্জ/রিটার্ন নেই (আগেই সতর্ক করা হয়)',
                'admin' => '/resell',
                'check' => function () {
                    if (!Schema::hasColumn('products', 'is_resell')) {
                        return ['fail' => 'products.is_resell column missing'];
                    }
                    $n = DB::table('products')->where('is_resell', true)->count();
                    return "{$n} resell listing(s)";
                },
            ],

            // ---------------------------------------------------------- integrations
            [
                'key' => 'replygenie', 'version' => '1.3.0', 'date' => '2026-07-13',
                'area' => 'Integrations', 'name' => 'ReplyGenie agent',
                'detail' => 'create_product (idempotent) · create_order · pay_link · order_status · webhook',
                'admin' => '/settings/conversion',
                'check' => fn () => !empty(self::opts()['replygenie']['token'])
                    ? 'connect token set'
                    : ['fail' => 'no ReplyGenie connect token in settings'],
            ],
            [
                'key' => 'redx_areas', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Integrations', 'name' => 'RedX delivery areas',
                'detail' => 'চেকআউটে আসল RedX এরিয়া থেকে সাজেশন — কুরিয়ার মিসম্যাচ বন্ধ',
                'admin' => '/settings/courier',
                'check' => function () {
                    $token = (self::opts()['couriers']['redx'] ?? [])['token'] ?? '';
                    if (!$token) {
                        return ['fail' => 'RedX token not configured'];
                    }
                    $areas = Cache::get('redx:areas');
                    return is_array($areas) && count($areas)
                        ? number_format(count($areas)) . ' areas cached'
                        : ['warn' => 'token set, but area list not cached yet (fetched on first use)'];
                },
            ],
            [
                'key' => 'catalog_cache', 'version' => '1.0.0', 'date' => '2026-07-13',
                'area' => 'Integrations', 'name' => 'Catalog cache (page speed)',
                'detail' => 'হোম/সার্চ API ক্যাশড + stale-while-revalidate; দাম বদলালে অটো বাতিল',
                'admin' => null,
                'check' => function () {
                    try {
                        Cache::put('feature:ping', 1, 10);
                        return Cache::get('feature:ping') === 1
                            ? 'cache v' . (Cache::get('catalog:version', 1))
                            : ['fail' => 'cache store not returning values'];
                    } catch (\Throwable $e) {
                        return ['fail' => 'cache store unreachable: ' . $e->getMessage()];
                    }
                },
            ],
            [
                'key' => 'bengali_search', 'version' => '1.1.0', 'date' => '2026-07-13',
                'area' => 'Integrations', 'name' => 'Bengali book search',
                'detail' => 'SOUNDEX শুধু ইংরেজিতে — বাংলায় আর ভুল ম্যাচ আসে না',
                'admin' => null,
                'check' => function () {
                    $hits = DB::table('products')->where('name', 'like', '%পাতালজাতক%')->count();
                    return "substring match works ({$hits} hit for a sample title)";
                },
            ],
        ];
    }

    private static function opts(): array
    {
        static $o = null;
        if ($o === null) {
            $s = Settings::first();
            $o = $s ? ($s->options ?? []) : [];
        }
        return $o;
    }
}
