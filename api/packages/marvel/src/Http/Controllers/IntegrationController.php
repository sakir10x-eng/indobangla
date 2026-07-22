<?php

namespace Marvel\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Marvel\Database\Models\Coupon;
use Marvel\Enums\CouponType;
use Marvel\Enums\OrderStatus;
use Marvel\Enums\Permission;
use Marvel\Support\FeatureRegistry;
use Marvel\Support\FeatureChecks;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Marvel\Database\Models\Order;
use Marvel\Database\Models\Product;
use Karim007\LaravelBkashTokenize\Facade\BkashPaymentTokenize;
use Marvel\Database\Models\Attachment;
use Marvel\Database\Models\Settings;
use Marvel\Database\Models\Shop;
use Marvel\Database\Models\User;
use Marvel\Database\Models\Address;
use Marvel\Database\Models\Author;
use Illuminate\Support\Facades\Hash;
use Marvel\Database\Models\Wallet;
use Marvel\Database\Models\ChallengeRun;
use Marvel\Exceptions\MarvelException;
use Marvel\Traits\WalletsTrait;
use Marvel\Traits\AdminRolesTrait;
use Illuminate\Auth\Access\AuthorizationException;
use Marvel\Database\Models\Profile;
use Spatie\Permission\Models\Role as SpatieRole;
use Marvel\Enums\Role;

/**
 * IndoBangla third-party integrations:
 *  - product search + order create API (for ReplyGenie / external AI bots)
 *  - Bangladesh courier settings + connectivity test (RedX, Steadfast,
 *    Paperfly, Sundarban, Pathao) — tokens entered by the admin in Settings
 *  - bKash / Nagad payment credential storage
 */
class IntegrationController extends CoreController
{
    use WalletsTrait, AdminRolesTrait;

    // ---------------------------------------------------------------- search
    /** Public product search for bots (name / ISBN / sku). */
    public function productSearch(Request $request)
    {
        $q = trim((string) $request->input('q', $request->input('search', '')));
        $limit = min((int) ($request->input('limit', 10)), 30);
        if ($q === '') {
            return ['status' => 'success', 'count' => 0, 'products' => []];
        }
        $products = Product::query()
            ->where('status', 'publish')
            ->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('slug', 'like', "%{$q}%");
            })
            ->limit($limit)
            ->get(['id', 'name', 'slug', 'price', 'sale_price', 'quantity', 'image', 'shop_id']);

        $data = $products->map(function ($p) {
            return [
                'id'         => $p->id,
                'name'       => $p->name,
                'slug'       => $p->slug,
                'price'      => $p->price,
                'sale_price' => $p->sale_price,
                'in_stock'   => (int) $p->quantity > 0,
                'image'      => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'url'        => rtrim(config('shop.shop_url') ?? 'https://indobangla.tech', '/') . '/products/' . $p->slug,
            ];
        });
        return ['status' => 'success', 'count' => $data->count(), 'products' => $data];
    }

    /**
     * Admin product list with derived metrics (sold, wishlist, sell-through,
     * 7/30-day velocity) — powers the redesigned Products page.
     */
    public function productAdminList(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $chip   = (string) $request->input('chip', 'all');
        $sort   = (string) $request->input('sort', 'sold');
        $page   = max(1, (int) $request->input('page', 1));
        $limit  = min(60, max(1, (int) $request->input('limit', 20)));

        $paidStatuses = "'order-completed','order-processing','order-out-for-delivery','order-at-local-facility'";
        $soldSub = "COALESCE((SELECT SUM(op.order_quantity) FROM order_product op JOIN orders o ON o.id=op.order_id WHERE op.product_id=products.id AND o.order_status IN ($paidStatuses)),0)";
        $wishSub = "COALESCE((SELECT COUNT(*) FROM wishlists w WHERE w.product_id=products.id),0)";
        $sold30  = "COALESCE((SELECT SUM(op.order_quantity) FROM order_product op JOIN orders o ON o.id=op.order_id WHERE op.product_id=products.id AND o.created_at >= (NOW() - INTERVAL 30 DAY)),0)";
        $sold7   = "COALESCE((SELECT SUM(op.order_quantity) FROM order_product op JOIN orders o ON o.id=op.order_id WHERE op.product_id=products.id AND o.created_at >= (NOW() - INTERVAL 7 DAY)),0)";

        $q = Product::query()->where('type_id', 8)->with(['author:id,name'])
            ->select('products.*')
            ->selectRaw("$soldSub AS total_sold")
            ->selectRaw("$wishSub AS wishlist_count")
            ->selectRaw("$sold30 AS units_30d")
            ->selectRaw("$sold7 AS units_7d");

        if ($search !== '') {
            $like = '%' . $search . '%';
            $q->where(fn ($w) => $w->where('name', 'like', $like)
                ->orWhere('bangla_name', 'like', $like)
                ->orWhereHas('author', fn ($a) => $a->where('name', 'like', $like)));
        }
        if ($chip === 'out') {
            $q->where('quantity', '<=', 0);
        } elseif ($chip === 'restock') {
            $q->where('quantity', '<=', 10)->where('quantity', '>', 0);
        } elseif ($chip === 'draft') {
            $q->where('status', 'draft');
        }

        switch ($sort) {
            case 'wishlist': $q->orderByDesc('wishlist_count'); break;
            case 'price':    $q->orderByDesc('price'); break;
            case 'stock':    $q->orderBy('quantity'); break;
            case 'newest':   $q->orderByDesc('created_at'); break;
            default:         $q->orderByDesc('total_sold');
        }

        if ($chip === 'bestseller') {
            $q->having('units_30d', '>=', 5);
        }

        $p = $q->paginate($limit, ['*'], 'page', $page);
        $landingMap = $this->landingMap();
        $data = collect($p->items())->map(function ($x) use ($landingMap) {
            $sold  = (int) $x->total_sold;
            $stock = (int) $x->quantity;
            $st    = $sold + $stock;
            $mrp   = (float) $x->price;
            $sale  = (float) $x->sale_price;
            $hasOffer = $sale > 0 && $sale < $mrp;
            $discountPct = $hasOffer ? (int) round(($mrp - $sale) * 100 / max(1, $mrp)) : 0;
            $score = (int) $x->units_7d * 3 + (int) $x->units_30d + (int) $x->wishlist_count * 0.15;
            return [
                'id'          => $x->id,
                'title'       => $x->name,
                'author'      => optional($x->author)->name,
                'slug'        => $x->slug,
                'shop_id'     => (int) $x->shop_id,
                'type'        => $x->product_type ?: 'simple',
                'status'      => $x->status,
                'price'       => $sale > 0 ? $sale : $mrp,
                'mrp'         => $mrp,
                'hasOffer'    => $hasOffer,
                'discountPct' => $discountPct,
                'cover'       => is_array($x->image) ? ($x->image['original'] ?? null) : null,
                'stock'       => $stock,
                'sold'        => $sold,
                'wishlist'    => (int) $x->wishlist_count,
                'sellThrough' => $st ? (int) round($sold * 100 / $st) : 0,
                'units30'     => (int) $x->units_30d,
                'units7'      => (int) $x->units_7d,
                'demand'      => $score >= 60 ? 'high' : ($score >= 20 ? 'medium' : 'low'),
                'bestseller'  => (int) $x->units_30d >= 10,
                'has_landing' => (bool) (($landingMap[(string) $x->id]['enabled'] ?? false)),
                // 'default' when the generic template is used, or the bespoke template id
                // (e.g. 'anandamela') so the admin list can flag single-product designs.
                'landing_template' => (string) (($landingMap[(string) $x->id]['template'] ?? 'default')),
            ];
        });
        return [
            'data'         => $data,
            'current_page' => $p->currentPage(),
            'last_page'    => $p->lastPage(),
            'total'        => $p->total(),
        ];
    }

    // -------------------------------------------------------- readers' club
    /**
     * Reader's Club config — a set of membership tiers plus the rules & regulations text.
     * Each tier: {id, name, main_fee, discount_fee, discount_pct, card_color, validity_years}.
     * Legacy flat fields (fee/discount_pct/coupon_code) are kept, derived from the first tier,
     * so the older single-coupon paid-join flow (clubStart/clubJoin/payConfirm) keeps working.
     */
    protected function clubConfig(): array
    {
        $c = (array) ($this->options()['readers_club'] ?? []);
        $tiers = $this->normalizeClubTiers($c['tiers'] ?? null, $c);
        $first = $tiers[0] ?? null;
        return [
            'enabled'      => (bool) ($c['enabled'] ?? true),
            'rules'        => (string) ($c['rules'] ?? $this->defaultClubRules()),
            'tiers'        => $tiers,
            // legacy (single-coupon) fields — derived from the first tier when present
            'fee'          => $first ? $first['discount_fee'] : (float) ($c['fee'] ?? 300),
            'discount_pct' => $first ? $first['discount_pct'] : (int) ($c['discount_pct'] ?? 15),
            'coupon_code'  => $c['coupon_code'] ?? 'READCLUB',
        ];
    }

    /** Clean + shape a raw tiers array coming from settings or the admin form. */
    protected function normalizeClubTiers($raw, array $legacy = []): array
    {
        $out = [];
        foreach ((array) $raw as $t) {
            if (!is_array($t)) {
                continue;
            }
            $name = trim((string) ($t['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $id = trim((string) ($t['id'] ?? ''));
            if ($id === '') {
                $id = Str::slug($name) ?: 'tier';
            }
            $main = max(0, (float) ($t['main_fee'] ?? 0));
            $disc = max(0, (float) ($t['discount_fee'] ?? $main));
            $out[] = [
                'id'             => $id,
                'name'           => $name,
                'main_fee'       => $main,
                'discount_fee'   => $disc,
                'discount_pct'   => max(0, min(100, (int) round((float) ($t['discount_pct'] ?? 0)))),
                'card_color'     => $this->safeColor($t['card_color'] ?? '#d4af37'),
                'validity_years' => max(1, (int) ($t['validity_years'] ?? 1)),
            ];
        }
        // Back-compat: no tiers configured yet but an old flat fee exists → synthesize one.
        if (!$out && ($legacy['fee'] ?? null) !== null) {
            $out[] = [
                'id'             => 'member',
                'name'           => 'Member',
                'main_fee'       => (float) $legacy['fee'],
                'discount_fee'   => (float) $legacy['fee'],
                'discount_pct'   => (int) ($legacy['discount_pct'] ?? 15),
                'card_color'     => '#d4af37',
                'validity_years' => 1,
            ];
        }
        // de-dupe ids
        $seen = [];
        foreach ($out as &$t) {
            $base = $t['id'];
            $i = 2;
            while (isset($seen[$t['id']])) {
                $t['id'] = $base . '-' . $i++;
            }
            $seen[$t['id']] = true;
        }
        return array_values($out);
    }

    private function safeColor($v): string
    {
        $v = trim((string) $v);
        return preg_match('/^#[0-9a-fA-F]{6}$/', $v) ? $v : '#d4af37';
    }

    /** Legacy: sync the shared READCLUB coupon (used by the pay-to-join flow / clubJoin). */
    protected function syncClubCoupon(array $c): void
    {
        Coupon::updateOrCreate(
            ['code' => $c['coupon_code']],
            [
                'language'            => DEFAULT_LANGUAGE ?? 'en',
                'description'         => "Reader's Club member — {$c['discount_pct']}% off",
                'type'                => 'percentage',
                'amount'              => $c['discount_pct'],
                'minimum_cart_amount' => 0,
                'active_from'         => now(),
                'expire_at'           => now()->addYear(),
                'is_approve'          => true,
            ],
        );
    }

    /** Find a configured tier by id. */
    private function clubTier(?string $id): ?array
    {
        if (!$id) {
            return null;
        }
        foreach ($this->clubConfig()['tiers'] as $t) {
            if ($t['id'] === $id) {
                return $t;
            }
        }
        return null;
    }

    /** Default rules & regulations (Bengali) — admin can edit these on the settings page. */
    private function defaultClubRules(): string
    {
        return implode("\n", [
            '১. রিডার্স ক্লাব কার্ড শুধুমাত্র যে অ্যাকাউন্টের নামে ইস্যু করা হয়েছে সেই সদস্য ব্যবহার করতে পারবেন। কার্ডের ৮ ডিজিটের নম্বর নিজের লগ-ইন করা অ্যাকাউন্ট থেকে ব্যবহার করলেই ছাড় পাওয়া যাবে; অন্য কারো অ্যাকাউন্টে এই কার্ড কাজ করবে না।',
            '২. কার্ড নম্বর হস্তান্তরযোগ্য নয়। এটি অন্য কাউকে শেয়ার করা, বিক্রি করা বা ধার দেওয়া নিষিদ্ধ।',
            '৩. মেম্বারশিপ ফি একবার পরিশোধযোগ্য এবং অফেরতযোগ্য। কার্ডের মেয়াদ ইস্যু করার তারিখ থেকে নির্ধারিত বছর পর্যন্ত কার্যকর থাকবে; মেয়াদ শেষ হলে ছাড় বন্ধ হয়ে যাবে এবং নবায়ন করতে হবে।',
            '৪. এক অর্ডারে একটি কার্ড/কুপনই প্রযোজ্য। ছাড় শুধু নিয়মিত মূল্যের উপর প্রযোজ্য, ইতিমধ্যে ডিসকাউন্ট বা বিশেষ অফারে থাকা পণ্যের সাথে একত্রে নাও চলতে পারে।',
            '৫. কোনো প্রকার জালিয়াতি, অপব্যবহার, ভুয়া অর্ডার, কার্ড শেয়ারিং বা অবৈধ কার্যকলাপ ধরা পড়লে কর্তৃপক্ষ কোনো নোটিশ ছাড়াই কার্ডটি ব্যান বা বাতিল করার অধিকার রাখে; এক্ষেত্রে ফি ফেরত দেওয়া হবে না।',
            '৬. কর্তৃপক্ষ যেকোনো সময়, যেকোনো কারণে, একটি নির্দিষ্ট কার্ড বা সম্পূর্ণ ক্লাব সার্ভিস বাতিল বা স্থগিত করার এবং ছাড়ের হার, ফি বা শর্তাবলী পরিবর্তন করার অধিকার সংরক্ষণ করে।',
            '৭. ক্লাবে যোগ দেওয়ার মাধ্যমে সদস্য এই সমস্ত নিয়ম ও শর্তাবলী মেনে নিতে সম্মত হচ্ছেন বলে গণ্য হবে।',
        ]);
    }

    /** Public: club tiers, benefits, rules. */
    public function clubInfo(Request $request)
    {
        $c = $this->clubConfig();
        return ['status' => 'success', 'club' => $c + [
            'benefits' => [
                "সব বইয়ে সদস্যদের জন্য বিশেষ ছাড়",
                'নতুন বই ও প্রি-অর্ডারে আগে অ্যাক্সেস',
                'প্রতি মাসে বাছাই করা বইয়ের সাজেশন',
            ],
        ]];
    }

    /** Public: start a paid membership for a chosen tier — creates an order + pay link. */
    /**
     * Admin quick-add a customer from the create-order screen when the buyer isn't in the
     * system yet. Name + contact required; email auto-derived from the phone. Idempotent on
     * email so re-adding the same number reuses the existing customer.
     */
    public function adminCreateCustomer(Request $request)
    {
        $name    = trim((string) $request->input('name'));
        $contact = trim((string) $request->input('contact'));
        if ($name === '' || $contact === '') {
            return response()->json(['message' => 'Name and contact are required'], 422);
        }
        $digits = preg_replace('/\D/', '', $contact);
        $email  = $request->input('email') ?: ($digits . '@customer.indobangla.bd');
        $user = User::firstOrCreate(['email' => $email], [
            'name'     => $name,
            'password' => Hash::make(Str::random(14)),
        ]);
        if ($user->name !== $name) {
            $user->name = $name;
            $user->save();
        }
        $user->givePermissionTo(Permission::CUSTOMER);
        \Spatie\Permission\Models\Role::findOrCreate(\Marvel\Enums\Role::CUSTOMER, 'api');
        $user->assignRole(\Marvel\Enums\Role::CUSTOMER);
        $user->profile()->updateOrCreate(['customer_id' => $user->id], ['contact' => $contact]);
        return [
            'id'      => $user->id,
            'name'    => $user->name,
            'email'   => $user->email,
            'profile' => ['contact' => $contact],
        ];
    }

    public function clubStart(Request $request)
    {
        $c = $this->clubConfig();
        if (!$c['enabled']) {
            throw new MarvelException("Reader's Club is currently closed.");
        }
        $tier = $this->clubTier($request->input('tier')) ?? ($c['tiers'][0] ?? null);
        $fee  = $tier ? $tier['discount_fee'] : $c['fee'];
        $shop = $this->mainShop();
        $order = Order::create([
            'customer_name'    => $request->input('name', 'Club Member'),
            'customer_contact' => $request->input('contact', ''),
            'amount'           => $fee,
            'total'            => $fee,
            'paid_total'       => 0,
            'sales_tax'        => 0,
            'delivery_fee'     => 0,
            'discount'         => 0,
            'shop_id'          => $shop?->id,
            'language'         => DEFAULT_LANGUAGE ?? 'en',
            'order_status'     => 'order-pending',
            'payment_status'   => 'payment-pending',
            'payment_gateway'  => 'ONLINE',
        ]);
        $ops = [
            'club_membership' => true,
            'club_tier'       => $tier['id'] ?? null,
            'club_email'      => $request->input('email'),
            'pay_token'       => 'pl_' . Str::random(24),
        ];
        $order->ops_meta = $ops;
        $order->saveQuietly();
        $base = rtrim(config('shop.shop_url') ?? 'https://indobangla.tech', '/');
        return [
            'status'   => 'success',
            'fee'      => $fee,
            'tier'     => $tier['id'] ?? null,
            'pay_link' => $base . '/pay/' . $ops['pay_token'],
        ];
    }

    /** Admin: read/update club tiers, rules & open/closed state. Re-syncs every member card. */
    public function clubSettings(Request $request)
    {
        $synced = 0;
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'enabled'      => 'nullable|boolean',
                'rules'        => 'nullable|string',
                'tiers'        => 'nullable|array',
                // legacy single-coupon fields (still accepted if an old client sends them)
                'fee'          => 'nullable|numeric',
                'discount_pct' => 'nullable|integer',
                'coupon_code'  => 'nullable|string',
            ]);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $cur = $this->clubConfig();
            $rc  = (array) ($options['readers_club'] ?? []);

            $rc['enabled'] = array_key_exists('enabled', $data) ? (bool) $data['enabled'] : $cur['enabled'];
            if (array_key_exists('rules', $data)) {
                $rc['rules'] = (string) $data['rules'];
            }
            if (array_key_exists('tiers', $data)) {
                $rc['tiers'] = $this->normalizeClubTiers($data['tiers']);
            }
            if (array_key_exists('fee', $data)) {
                $rc['fee'] = $data['fee'];
            }
            if (array_key_exists('discount_pct', $data)) {
                $rc['discount_pct'] = $data['discount_pct'];
            }
            if (array_key_exists('coupon_code', $data)) {
                $rc['coupon_code'] = $data['coupon_code'];
            }
            $options['readers_club'] = $rc;
            $settings->update(['options' => $options]);

            // A changed tier %/validity takes effect immediately for every existing member.
            User::whereNotNull('membership_tier')->chunkById(300, function ($users) use (&$synced) {
                foreach ($users as $u) {
                    $this->syncMemberCoupon($u);
                    $synced++;
                }
            });
        }
        return ['status' => 'success', 'club' => $this->clubConfig(), 'synced' => $synced];
    }

    // -------------------------------------------------- order-amount discount tiers
    protected function discountTiers(): array
    {
        $t = $this->options()['order_discount_tiers'] ?? null;
        if ($t === null) {
            // First-run defaults — ONLY before the admin has ever saved tiers. Once the admin
            // saves (even an empty list to switch the feature off, or a single tier to drop the
            // others), that choice is respected instead of these defaults reappearing.
            $t = [['min' => 1990, 'pct' => 5], ['min' => 6000, 'pct' => 7]];
        }
        if (!is_array($t)) {
            $t = [];
        }
        // normalise + sort ascending by min
        $t = array_values(array_filter(array_map(fn ($x) => [
            'min'  => (float) ($x['min'] ?? 0),
            'pct'  => (int) ($x['pct'] ?? 0),
            'code' => 'BULK' . (int) ($x['pct'] ?? 0),
        ], $t), fn ($x) => $x['min'] > 0 && $x['pct'] > 0));
        usort($t, fn ($a, $b) => $a['min'] <=> $b['min']);
        return $t;
    }

    protected function syncTierCoupons(array $tiers): void
    {
        foreach ($tiers as $tier) {
            \Marvel\Database\Models\Coupon::updateOrCreate(
                ['code' => $tier['code']],
                [
                    'language'            => DEFAULT_LANGUAGE ?? 'en',
                    'description'         => "Spend ৳{$tier['min']}+ — {$tier['pct']}% off",
                    'type'                => 'percentage',
                    'amount'              => $tier['pct'],
                    'minimum_cart_amount' => $tier['min'],
                    'active_from'         => now(),
                    'expire_at'           => now()->addYear(),
                    'is_approve'          => true,
                ],
            );
        }
    }

    /** Public: the bulk-purchase discount tiers for the cart progress bar. */
    public function orderDiscountInfo(Request $request)
    {
        return ['status' => 'success', 'tiers' => $this->discountTiers()];
    }

    /** Admin: read/update the discount tiers (super-admin). */
    public function orderDiscountSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate(['tiers' => 'nullable|array']);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['order_discount_tiers'] = collect($data['tiers'] ?? [])
                ->map(fn ($x) => ['min' => (float) ($x['min'] ?? 0), 'pct' => (int) ($x['pct'] ?? 0)])
                ->filter(fn ($x) => $x['min'] > 0 && $x['pct'] > 0)
                ->values()->all();
            $settings->update(['options' => $options]);
            $this->syncTierCoupons($this->discountTiers());
        }
        return ['status' => 'success', 'tiers' => $this->discountTiers()];
    }

    // -------------------------------------------------- next-day dispatch cutoff
    /**
     * The product page counts down to a daily dispatch cutoff ("Order within X hr Y min for
     * next-day dispatch"). The hour was hardcoded to 18:00 in the storefront with no way to
     * change it; it now lives in settings so the admin owns it.
     */
    protected function dispatchCutoffHour(): int
    {
        $h = $this->options()['dispatchCutoffHour'] ?? null;
        return $h === null ? 18 : max(0, min(23, (int) $h));
    }

    /** Admin: read/update the dispatch cutoff hour (super-admin). */
    public function dispatchSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate(['cutoff_hour' => 'required|integer|min:0|max:23']);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['dispatchCutoffHour'] = (int) $data['cutoff_hour'];
            $settings->update(['options' => $options]);
        }
        return ['status' => 'success', 'cutoff_hour' => $this->dispatchCutoffHour()];
    }

    // ------------------------------------------------------- product info reports
    /** Reasons the shop offers; anything else is rejected rather than stored blindly. */
    protected const REPORT_REASONS = ['price', 'cover', 'author', 'description', 'other'];

    /** Customer: report incorrect information on a book. */
    public function productReport(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('রিপোর্ট করতে লগইন করুন।');
        }
        $data = $request->validate([
            'product_id' => 'required|integer',
            'reason'     => 'required|string|in:' . implode(',', self::REPORT_REASONS),
            'details'    => 'nullable|string|max:1000',
        ]);
        $product = Product::findOrFail((int) $data['product_id']);

        // One open report per customer per book, so a frustrated shopper cannot flood the queue.
        $existing = DB::table('product_reports')
            ->where('customer_id', $user->id)
            ->where('product_id', $product->id)
            ->where('status', 'open')
            ->exists();
        if ($existing) {
            throw new MarvelException('এই বইয়ের জন্য আপনার একটি রিপোর্ট এখনো দেখা হচ্ছে।');
        }

        DB::table('product_reports')->insert([
            'customer_id' => $user->id,
            'product_id'  => $product->id,
            'reason'      => $data['reason'],
            'details'     => $data['details'] ?? null,
            'status'      => 'open',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return ['status' => 'success', 'message' => 'ধন্যবাদ! আপনার রিপোর্ট আমরা দেখে ঠিক করে নেব।'];
    }

    /** Admin: list product reports, newest first. */
    public function productReports(Request $request)
    {
        $rows = DB::table('product_reports as r')
            ->leftJoin('products as p', 'p.id', '=', 'r.product_id')
            ->leftJoin('users as u', 'u.id', '=', 'r.customer_id')
            ->when($request->input('status'), fn ($q, $v) => $q->where('r.status', $v))
            ->orderByDesc('r.created_at')
            ->limit(200)
            ->get([
                'r.id', 'r.reason', 'r.details', 'r.status', 'r.admin_note', 'r.created_at',
                'p.name as product_name', 'p.slug as product_slug',
                'u.name as customer_name',
            ]);
        return ['status' => 'success', 'reports' => $rows];
    }

    /** Admin: resolve or dismiss a report. */
    public function productReportUpdate(Request $request, $id)
    {
        $data = $request->validate([
            'status'     => 'required|string|in:open,resolved,dismissed',
            'admin_note' => 'nullable|string|max:1000',
        ]);
        DB::table('product_reports')->where('id', (int) $id)->update([
            'status'      => $data['status'],
            'admin_note'  => $data['admin_note'] ?? null,
            'resolved_at' => $data['status'] === 'open' ? null : now(),
            'updated_at'  => now(),
        ]);
        return ['status' => 'success'];
    }

    // ------------------------------------------------- invoice replacement note
    /**
     * The printed invoice carries a "Damaged or wrong book? Free replacement within 3 days"
     * guarantee. It is a promise to the customer, so the admin needs to be able to withdraw
     * it. Defaults to true, which is the behaviour before this setting existed.
     */
    protected function invoiceReplacementNote(): bool
    {
        $v = $this->options()['invoiceShowReplacementNote'] ?? null;
        return $v === null ? true : (bool) $v;
    }

    /** Admin: read/update the invoice replacement note toggle (super-admin). */
    public function invoiceSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            // `sometimes`, not `required`: the order board saves only the coupon, the settings
            // page saves only the note. A partial PUT must not wipe the other one.
            $data = $request->validate([
                'show_replacement_note' => 'sometimes|boolean',
                'coupon'                => 'sometimes|array',
                'coupon.enabled'        => 'sometimes|boolean',
                'coupon.code'           => 'sometimes|nullable|string|max:40',
                'coupon.amount'         => 'sometimes|nullable|numeric|min:0',
            ]);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            if (array_key_exists('show_replacement_note', $data)) {
                $options['invoiceShowReplacementNote'] = (bool) $data['show_replacement_note'];
            }
            if (array_key_exists('coupon', $data)) {
                $current = (array) ($options['invoiceCoupon'] ?? self::DEFAULT_INVOICE_COUPON);
                $options['invoiceCoupon'] = array_merge(
                    $current,
                    array_intersect_key($data['coupon'], array_flip(['enabled', 'code', 'amount']))
                );
            }
            $settings->update(['options' => $options]);
        }
        return [
            'status'                => 'success',
            'show_replacement_note' => $this->invoiceReplacementNote(),
            'coupon'                => $this->invoiceCoupon(),
        ];
    }

    /**
     * The printed slip's "🎁 Next order" promo line. Defaults ON — it has always printed, and
     * the live settings row has no key, so defaulting off would silently drop it from real
     * invoices. The switch exists to turn it off, not to remove it.
     */
    private function invoiceCoupon(): array
    {
        $c = (array) ($this->options()['invoiceCoupon'] ?? self::DEFAULT_INVOICE_COUPON);
        return [
            'enabled' => (bool) ($c['enabled'] ?? true),
            'code'    => (string) ($c['code'] ?? ''),
            'amount'  => (float) ($c['amount'] ?? 0),
        ];
    }

    // ------------------------------------------------------------ featured books
    /**
     * #2 — Admin-curated book selection for the home banner and the
     * frequently-bought-together row. Auto (algorithmic) by default; when the
     * admin picks specific books, those override the auto selection.
     */
    private function intIds($v): array
    {
        return array_values(array_filter(array_map('intval', (array) $v)));
    }

    private function featuredBookIds(): array
    {
        $opts = $this->options();
        $f = $opts['featured_books'] ?? [];
        $map = [];
        foreach ((array) ($f['fbt_map'] ?? []) as $pid => $ids) {
            $clean = $this->intIds($ids);
            if ((int) $pid > 0 && !empty($clean)) {
                $map[(int) $pid] = $clean;
            }
        }
        return [
            'banner'  => $this->intIds($f['banner'] ?? []),
            'fbt'     => $this->intIds($f['fbt'] ?? []),   // global fallback
            'fbt_map' => $map,                              // per-product override
        ];
    }

    private function loadBooksInOrder(array $ids)
    {
        if (empty($ids)) {
            return [];
        }
        // `image` is a JSON attribute on Product (not a relation) — select it directly.
        $books = Product::whereIn('id', $ids)
            ->where('status', 'publish')
            ->get(['id', 'name', 'slug', 'price', 'sale_price', 'image', 'quantity', 'shop_id'])
            ->keyBy('id');
        // preserve the admin-chosen order
        return collect($ids)->map(fn ($id) => $books->get($id))->filter()->values();
    }

    /**
     * Public: storefront reads the curated banner + FBT books. When a
     * `product_id` is passed, the FBT list is that product's own curated
     * selection (alada/per-product) — falling back to the global FBT list, then
     * to the storefront's automatic algorithm (empty here).
     */
    public function featuredBooks(Request $request)
    {
        $ids = $this->featuredBookIds();
        $pid = (int) $request->input('product_id');
        $fbtIds = ($pid && !empty($ids['fbt_map'][$pid])) ? $ids['fbt_map'][$pid] : $ids['fbt'];
        return [
            'banner' => $this->loadBooksInOrder($ids['banner']),
            'fbt'    => $this->loadBooksInOrder($fbtIds),
        ];
    }

    /** Admin: read/update the curated book IDs (super-admin). */
    public function featuredBooksSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'banner'  => 'nullable|array',
                'fbt'     => 'nullable|array',
                'fbt_map' => 'nullable|array',
            ]);
            $map = [];
            foreach ((array) ($data['fbt_map'] ?? []) as $pid => $bookIds) {
                $clean = $this->intIds($bookIds);
                if ((int) $pid > 0 && !empty($clean)) {
                    $map[(string) (int) $pid] = $clean;
                }
            }
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['featured_books'] = [
                'banner'  => $this->intIds($data['banner'] ?? []),
                'fbt'     => $this->intIds($data['fbt'] ?? []),
                'fbt_map' => $map,
            ];
            $settings->update(['options' => $options]);
        }
        // Return hydrated books so the admin UI can render chips immediately:
        // banner + global FBT + one entry per per-product FBT target.
        $ids = $this->featuredBookIds();
        $targets = [];
        foreach ($ids['fbt_map'] as $pid => $bookIds) {
            $product = $this->loadBooksInOrder([$pid])->first();
            if ($product) {
                $targets[] = [
                    'product' => $product,
                    'books'   => $this->loadBooksInOrder($bookIds),
                ];
            }
        }
        return [
            'banner'      => $this->loadBooksInOrder($ids['banner']),
            'fbt'         => $this->loadBooksInOrder($ids['fbt']),
            'fbt_targets' => $targets,
        ];
    }

    // ------------------------------------------------------------ image sizes
    /** Defaults + normalisation for the storefront image-size controls (#1). */
    private function imageSizeConfig(): array
    {
        $opts = $this->options();
        $s = $opts['image_sizes'] ?? [];
        $clamp = fn ($v, $def, $min, $max) => max($min, min($max, (int) ($v ?? $def) ?: $def));
        $style = ($s['home_card_style'] ?? 'mindful') === 'classic' ? 'classic' : 'mindful';
        return [
            'single_max'      => $clamp($s['single_max'] ?? null, 200, 100, 480),   // single-product cover max-width (px)
            'fbt_h'           => $clamp($s['fbt_h'] ?? null, 128, 72, 320),          // frequently-bought cover height (px)
            'home_cols'       => $clamp($s['home_cols'] ?? null, 5, 3, 8),           // home "All books" desktop columns
            'home_card_style' => $style,                                             // 'mindful' (new) | 'classic' (previous)
        ];
    }

    /** Public: storefront reads the configured image sizes. */
    public function imageSizes(Request $request)
    {
        return $this->imageSizeConfig();
    }

    /** Admin: read/update storefront image sizes (super-admin). */
    public function imageSizesSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'single_max'      => 'nullable|integer',
                'fbt_h'           => 'nullable|integer',
                'home_cols'       => 'nullable|integer',
                'home_card_style' => 'nullable|string',
            ]);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['image_sizes'] = [
                'single_max'      => (int) ($data['single_max'] ?? 200),
                'fbt_h'           => (int) ($data['fbt_h'] ?? 128),
                'home_cols'       => (int) ($data['home_cols'] ?? 5),
                'home_card_style' => ($data['home_card_style'] ?? 'mindful') === 'classic' ? 'classic' : 'mindful',
            ];
            $settings->update(['options' => $options]);
        }
        return $this->imageSizeConfig();
    }


    /** How long a payment link stays valid (hours). Admin-configurable, 6h by default. */
    /**
     * Bank-transfer details used when settings.options.bankTransfer is absent — which is the
     * case on the live row, so these values are what customers actually see today. Editing
     * the setting overrides them.
     */
    private const DEFAULT_BANK_TRANSFER = [
        'enabled'      => true,
        'bank_name'    => 'United Commercial Bank PLC',
        'branch'       => 'Mirpur Road',
        'account_name' => 'INDO BANGLA BOOK',
        'account_no'   => '1202112000004134',
        'routing_no'   => '245263073',
    ];

    /** The printed slip's promo line, when the settings row predates the key. */
    private const DEFAULT_INVOICE_COUPON = [
        'enabled' => true,
        'code'    => 'WELCOME50',
        'amount'  => 50,
    ];

    private function payLinkHours(): int
    {
        $h = (int) ($this->options()['payLinkHours'] ?? 6);
        return $h > 0 ? min($h, 720) : 6;
    }

    /** Admin: read/set the payment-link lifetime. */
    public function payLinkSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $hours = (int) $request->input('hours', 6);
            $hours = $hours > 0 ? min($hours, 720) : 6;
            $settings = Settings::first();
            $options = $settings->options ?? [];
            $options['payLinkHours'] = $hours;
            $settings->options = $options;
            $settings->save();
            return ['status' => 'success', 'hours' => $hours];
        }
        return ['hours' => $this->payLinkHours()];
    }

    // ------------------------------------------------------------ pay-by-link
    /** Admin: create/return a shareable payment link for an order. */
    public function orderPayLink(Request $request)
    {
        $order = Order::findOrFail($request->order_id);
        $ops = (array) ($order->ops_meta ?? []);
        // A payment link is short-lived: it stops working after `payLinkHours` (6 by
        // default, admin-configurable). An expired one is replaced by a brand-new token,
        // so an old link can never be revived by resending it.
        $hours = $this->payLinkHours();
        $expired = !empty($ops['pay_expires_at']) && now()->gt(Carbon::parse($ops['pay_expires_at']));
        if (empty($ops['pay_token']) || $expired || $request->boolean('regenerate')) {
            $ops['pay_token'] = 'pl_' . Str::random(24);
        }
        $ops['pay_expires_at'] = now()->addHours($hours)->toIso8601String();
        // #5 — partial / advance amount. `amount_bdt` (spec) or `amount`; `purpose`/`type`.
        $amount  = $request->filled('amount_bdt') ? (float) $request->input('amount_bdt')
            : ($request->filled('amount') ? (float) $request->input('amount') : null);
        $purpose = (string) ($request->input('purpose') ?: $request->input('type') ?: 'full');
        // COD / cash / pending orders carry paid_total = total by Pickbazar convention even
        // though nothing was collected, which makes a pay-link's due zero and bKash reject it
        // with "Invalid amount". Mirror the online-gateway stampPayLink path and zero it so the
        // link can collect the real outstanding amount (settlePayment credits it back on pay).
        if ((float) $order->paid_total >= (float) $order->total
            && in_array($order->payment_status, ['payment-cash-on-delivery', 'payment-cash', 'payment-pending'], true)) {
            $order->paid_total = 0;
        }
        $due = round((float) $order->total - (float) $order->paid_total);
        if ($amount !== null) {
            if ($amount > $due + 0.5) {
                throw new MarvelException('amount_bdt exceeds order due (৳' . round($due) . ').');
            }
            $ops['pay_amount']  = round($amount);
            $ops['pay_purpose'] = $purpose === 'advance' ? 'advance' : 'full';
        } elseif ($purpose === 'full') {
            // Caller explicitly asked for the whole due.
            unset($ops['pay_amount']);
            $ops['pay_purpose'] = 'full';
        } elseif (!isset($ops['pay_amount'])) {
            $ops['pay_purpose'] = 'full';
        }
        // No amount and no explicit 'full' → leave the link exactly as stamped. The admin's
        // "Copy pay link" button posts only {order_id}, and this branch used to wipe
        // pay_amount and force pay_purpose='full' — which silently turned a 50% pre-order
        // advance into a full-price bKash bill, because bkashCreate falls back to
        // $order->total when pay_amount is gone.
        // bKash service charge: when the desk opts to pass the gateway fee on to the buyer,
        // add bKash's standard 1.85% to what the link collects and record the split so
        // /pay/{token} can show an itemised bill (book amount + bKash charge).
        $payBase = (float) ($ops['pay_amount'] ?? $due);
        if ($request->boolean('bkash_charge') && $payBase > 0) {
            $charge = (int) round($payBase * self::BKASH_CHARGE_PCT / 100);
            $ops['bkash_charge'] = $charge;
            $ops['bkash_charge_base'] = (int) round($payBase);
            $ops['pay_amount'] = (int) round($payBase + $charge);
        } else {
            unset($ops['bkash_charge'], $ops['bkash_charge_base']);
        }

        $order->ops_meta = $ops;
        $order->saveQuietly();

        $base = rtrim(config('shop.shop_url') ?? 'https://indobangla.tech', '/');
        return [
            'status'       => 'success',
            'token'        => $ops['pay_token'],
            'pay_link'     => $base . '/pay/' . $ops['pay_token'],
            'amount_bdt'   => $ops['pay_amount'] ?? $due,
            'bkash_charge' => $ops['bkash_charge'] ?? 0,
            'base_bdt'     => $ops['bkash_charge_base'] ?? ($ops['pay_amount'] ?? $due),
            'purpose'      => $ops['pay_purpose'],
        ];
    }

    protected function findOrderByPayToken(string $token): ?Order
    {
        if ($token === '') {
            return null;
        }
        return Order::whereRaw("JSON_UNQUOTE(JSON_EXTRACT(ops_meta, '$.pay_token')) = ?", [$token])->first();
    }

    /** Public: order summary + payment methods + current payment state for the pay page. */
    public function payInfo(Request $request)
    {
        $order = $this->findOrderByPayToken((string) $request->input('token', ''));
        if (!$order) {
            throw new MarvelException('Invalid or expired payment link.');
        }
        $order->loadMissing('products');
        $ops = (array) ($order->ops_meta ?? []);
        $alreadyPaid = (float) $order->paid_total >= (float) $order->total;
        if (!$alreadyPaid && !empty($ops['pay_expires_at']) && now()->gt(Carbon::parse($ops['pay_expires_at']))) {
            throw new MarvelException('এই পেমেন্ট লিংকের মেয়াদ শেষ হয়ে গেছে। নতুন লিংকের জন্য যোগাযোগ করুন।');
        }
        $paid = self::orderIsPaid($order);
        // Only offer what the shop can actually collect money through. The live settings row
        // predates both keys, so the fallbacks — not the seeder — decide what happens today:
        // Nagad off until its credentials land, bank transfer on with the details above.
        $opts = (array) (Settings::getData()->options ?? []);
        $bank = (array) ($opts['bankTransfer'] ?? self::DEFAULT_BANK_TRANSFER);
        $bankOn = !empty($bank['enabled']) && !empty($bank['account_no']);
        $nagadOn = !empty($opts['nagadEnabled']);

        $methods = ['bkash'];
        if ($nagadOn) {
            $methods[] = 'nagad';
        }
        if ($bankOn) {
            $methods[] = 'bank';
        }
        // No 'card': there is no card gateway on this flow — payConfirm rejects it outright,
        // so offering the tile only walks the buyer into an error.
        // #5 — an advance pay-link charges only pay_amount of the full total.
        $payAmount = isset($ops['pay_amount']) ? (float) $ops['pay_amount'] : null;
        $isAdvance = ($ops['pay_purpose'] ?? 'full') === 'advance' && $payAmount !== null;
        return [
            'status' => 'success',
            'order'  => [
                'tracking_number' => $order->tracking_number,
                'customer_name'   => $order->customer_name,
                'total'           => (float) $order->total,
                'pay_amount'      => $payAmount,
                'pay_purpose'     => $isAdvance ? 'advance' : 'full',
                'already_paid'    => (float) $order->paid_total,
                // An order marked paid by its payment_status has a due of ZERO even when paid_total
                // was never raised to match — marking an order paid from the status control sets
                // payment_status only, and reading `total - paid_total` regardless made the invoice
                // and the pay screen announce 'paid' while still demanding the full amount.
                'due'             => $paid ? 0 : max(0, round((float) $order->total - (float) $order->paid_total)),
                'subtotal'        => (float) $order->amount,
                'delivery_fee'    => (float) $order->delivery_fee,
                'discount'        => (float) $order->discount,
                'advance'         => round((float) $order->total - (float) $order->amount - (float) $order->sales_tax - (float) $order->delivery_fee + (float) $order->discount),
                'placed_at'       => optional($order->created_at)->format('j M Y'),
                'paid'            => $paid,
                'pay_method'      => $ops['pay_method'] ?? null,
                // The 50% option itself, reported separately from pay_purpose — the screen must
                // keep offering it even after the buyer has flipped the link to 'full'.
                'advance_option'  => isset($ops['advance']['advance_bdt'])
                    ? round((float) $ops['advance']['advance_bdt'])
                    : null,
                // Set once the buyer has uploaded a transfer slip. payBankProof writes this and
                // orderOps reads it, but it was never *reported* — so /pay/{token} could not tell
                // the buyer their slip had been received, and the upload looked like it did
                // nothing. Never expose the file URL here: this endpoint is public.
                'bank_proof'      => isset($ops['bank_proof'])
                    ? [
                        'status'       => $ops['bank_proof']['status'] ?? 'pending_review',
                        'submitted_at' => $ops['bank_proof']['submitted_at'] ?? null,
                        'note'         => $ops['bank_proof']['review_note'] ?? null,
                    ]
                    : null,
                'is_club'         => !empty($ops['club_membership']),
                'club_coupon'     => $ops['club_coupon'] ?? null,
                'club_discount'   => $ops['club_discount'] ?? null,
                'items'           => $order->products->map(fn ($p) => [
                    'name'     => $p->name,
                    'quantity' => (int) ($p->pivot->order_quantity ?? 0),
                    'price'    => (float) ($p->pivot->subtotal ?? $p->pivot->unit_price ?? 0),
                    'image'    => is_array($p->image)
                        ? ($p->image['original'] ?? $p->image['thumbnail'] ?? null)
                        : null,
                ]),
            ],
            'methods' => $methods,
            // Only the account details — never the `enabled` flag or anything else from the
            // settings row. This endpoint is public.
            'bank'    => $bankOn ? [
                'bank_name'    => $bank['bank_name'] ?? '',
                'branch'       => $bank['branch'] ?? '',
                'account_name' => $bank['account_name'] ?? '',
                'account_no'   => $bank['account_no'] ?? '',
                'routing_no'   => $bank['routing_no'] ?? '',
            ] : null,
        ];
    }

    /**
     * Public: the buyer transferred money at a bank counter and is uploading the receipt.
     *
     * This does NOT mark the order paid — nobody has verified anything yet. It parks the
     * screenshot on the order for an admin to check; `orderOps` (admin-authed) is what
     * actually credits the payment. Guarded by the pay token, same as payInfo/payConfirm.
     */
    public function payBankProof(Request $request)
    {
        $order = $this->findOrderByPayToken((string) $request->input('token', ''));
        if (!$order) {
            throw new MarvelException('Invalid or expired payment link.');
        }
        $ops = (array) ($order->ops_meta ?? []);
        if (!empty($ops['pay_expires_at']) && now()->gt(Carbon::parse($ops['pay_expires_at']))
            && (float) $order->paid_total < (float) $order->total) {
            throw new MarvelException('এই পেমেন্ট লিংকের মেয়াদ শেষ হয়ে গেছে। নতুন লিংক নিন।');
        }
        // One pending receipt at a time — re-uploading after a rejection is fine, but the
        // link must not become a way to spam files at the server.
        if (($ops['bank_proof']['status'] ?? null) === 'pending_review') {
            throw new MarvelException('আপনার স্লিপটি ইতিমধ্যে জমা আছে — আমরা যাচাই করছি।');
        }
        $request->validate([
            'screenshot' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $attachment = new Attachment();
        $attachment->save();
        $attachment->addMedia($request->file('screenshot'))->toMediaCollection();
        $media = $attachment->getMedia()->first();

        $payAmount = isset($ops['pay_amount']) ? (float) $ops['pay_amount'] : (float) $order->total;
        $ops['pay_method'] = 'bank';
        $ops['bank_proof'] = [
            'status'        => 'pending_review',
            'url'           => $media ? $media->getUrl() : null,
            'thumbnail'     => $media ? $media->getUrl('thumbnail') : null,
            'attachment_id' => $attachment->id,
            'amount_bdt'    => round($payAmount),
            'submitted_at'  => now()->toIso8601String(),
        ];
        $ops['events'][] = [
            'type'        => 'bank_proof_submitted',
            'description' => 'Bank transfer slip uploaded by customer — awaiting review',
            'actor'       => $order->customer_name ?: 'Customer',
            'at'          => now()->toIso8601String(),
        ];
        $order->ops_meta = $ops;
        $order->saveQuietly();

        return ['status' => 'success', 'message' => 'স্লিপ জমা হয়েছে — যাচাইয়ের পর নিশ্চিত করা হবে।'];
    }

    /**
     * Credit a payment that has ALREADY been verified, and settle everything that hangs off
     * it (advance split, pre-order clock, Reader's Club activation, reseller charges).
     *
     * The one place money is recognised. Every caller must have proof first — bKash's execute
     * response, or an admin eyeballing a bank slip. Never call this straight from a
     * customer-facing request: that was the old payConfirm bug that gave away free orders.
     */
    private function settlePayment($order, string $method, ?float $amount = null): void
    {
        $ops = (array) ($order->ops_meta ?? []);
        $isAdvance = ($ops['pay_purpose'] ?? 'full') === 'advance';
        $payAmount = $amount ?? (isset($ops['pay_amount']) ? (float) $ops['pay_amount'] : (float) $order->total);
        $now = now()->toIso8601String();

        $ops['pay_method'] = $method;
        $ops['paid_at'] = $now;

        if ($isAdvance) {
            $order->paid_total = round((float) $order->paid_total + $payAmount);
            $order->order_status = 'order-processing'; // approved, awaiting balance
            if ((float) $order->paid_total >= (float) $order->total) {
                $order->payment_status = 'payment-success';
            }
            if (isset($ops['advance'])) {
                $ops['advance']['status']   = 'paid';
                $ops['advance']['paid_bdt'] = round($payAmount);
                $ops['advance']['due_bdt']  = round((float) $order->total - (float) $order->paid_total);
                // The pre-order clock starts the moment the advance clears — not when the
                // order was placed — and stops when it's delivered.
                $ops['preorder']['started_at'] = $now;
            }
            $this->notifyReplygeniePayment($order, round($payAmount), 'advance');
        } else {
            $order->payment_status = 'payment-success';
            $order->paid_total = $order->total;
            if (!empty($ops['advance'])) {
                $ops['advance']['status'] = 'paid';
                $this->notifyReplygeniePayment($order, (float) $order->total, 'full');
            }
        }

        // Auto-activate a Reader's Club membership when its fee is paid.
        if (!empty($ops['club_membership']) && empty($ops['club_activated'])) {
            $cc = $this->clubConfig();
            $this->syncClubCoupon($cc);
            $settings = Settings::first();
            $sopts = $settings->options ?? [];
            $members = $sopts['club_members'] ?? [];
            $members[] = [
                'email'   => $ops['club_email'] ?? null,
                'contact' => $order->customer_contact,
                'joined'  => now()->toDateTimeString(),
            ];
            $sopts['club_members'] = $members;
            $settings->update(['options' => $sopts]);
            $ops['club_activated'] = true;
            $ops['club_coupon'] = $cc['coupon_code'];
            $ops['club_discount'] = $cc['discount_pct'];
        }

        // Reseller charges. `reseller_applied` makes this idempotent — bKash can deliver the
        // same callback twice, and a top-up must never be credited twice.
        if (!empty($ops['reseller_user_id']) && empty($ops['reseller_applied'])) {
            $reseller = User::find($ops['reseller_user_id']);
            if ($reseller) {
                $rmeta = $this->resellerMeta($reseller);
                if (!empty($ops['reseller_fee']) && !$rmeta['is_reseller']) {
                    // The account opens here, and nowhere else — the fee has now actually been
                    // collected, so the ledger records it as paid rather than owed.
                    $rmeta['is_reseller'] = true;
                    $rmeta['opened_at'] = now()->toDateTimeString();
                    $rmeta['ledger'][] = [
                        'type'   => 'open_fee',
                        'amount' => -round($payAmount, 2),
                        'at'     => now()->toDateTimeString(),
                        'note'   => 'Reseller account opening fee (paid via ' . $method . ')',
                    ];
                    $this->saveResellerMeta($reseller, $rmeta);
                    $ops['reseller_applied'] = true;
                } elseif (!empty($ops['reseller_topup'])) {
                    $rmeta['available'] = round((float) $rmeta['available'] + $payAmount, 2);
                    $rmeta['ledger'][] = [
                        'type'   => 'topup',
                        'amount' => round($payAmount, 2),
                        'at'     => now()->toDateTimeString(),
                        'note'   => 'Balance load via ' . $method,
                    ];
                    $this->saveResellerMeta($reseller, $rmeta);
                    $ops['reseller_applied'] = true;
                }
            }
        }

        $order->ops_meta = $ops;
        $order->save();
        \Marvel\Helpers\AdminNotifier::send(
            "💰 <b>পেমেন্ট সম্পন্ন</b> #{$order->tracking_number} — " . strtoupper($method) . " · ৳" . number_format((float) $payAmount, 0)
        );
    }

    /**
     * Public: start a payment against the link.
     *
     * This endpoint can only *initiate* — it never marks anything paid. It used to fall
     * through to a "mark the order paid" branch for any method that wasn't live bKash, which
     * meant a customer could pick Nagad or Card on the public link and settle their own order
     * without sending a taka. Money is now only recognised in settlePayment(), reached from
     * the bKash callback (after execute) or an admin approving a bank slip.
     */
    public function payConfirm(Request $request)
    {
        $order = $this->findOrderByPayToken((string) $request->input('token', ''));
        if (!$order) {
            throw new MarvelException('Invalid or expired payment link.');
        }
        // Expiry is checked before any gateway is touched — an expired link must not be
        // able to open a bKash checkout either.
        $meta = (array) ($order->ops_meta ?? []);
        if (!empty($meta['pay_expires_at']) && now()->gt(Carbon::parse($meta['pay_expires_at']))
            && (float) $order->paid_total < (float) $order->total) {
            throw new MarvelException('এই পেমেন্ট লিংকের মেয়াদ শেষ হয়ে গেছে। নতুন লিংক নিন।');
        }
        if ($order->payment_status === 'payment-success') {
            return ['status' => 'success', 'paid' => true];
        }
        $method = (string) $request->input('method', '');

        // #5c — the buyer chooses full-vs-advance per attempt, and this re-stamps the meta so
        // bkashCreate (which reads pay_amount) charges the right figure.
        //
        // It must be REVERSIBLE. It used to only ever write 'full': a buyer who picked 100%,
        // bounced to bKash and came back without paying was stuck — the link was permanently
        // 'full', the 50% choice vanished from the screen, and every later bKash bill was for
        // the whole order. Switching back to 'advance' now restores the stamped advance.
        $wanted = (string) $request->input('purpose', '');
        $advanceBdt = isset($meta['advance']['advance_bdt']) ? round((float) $meta['advance']['advance_bdt']) : null;
        // A link created with the desk's "bKash charge" box carries bkash_charge in meta. The
        // full/advance re-stamp below recomputes pay_amount from the order, so re-apply the
        // 1.85% on the new base — otherwise picking 100%/advance silently drops the charge.
        $chargeOn = (int) ($meta['bkash_charge'] ?? 0) > 0;
        $restamp = function (array $m, float $base) use ($chargeOn) {
            if ($chargeOn && $base > 0) {
                $charge = (int) round($base * self::BKASH_CHARGE_PCT / 100);
                $m['bkash_charge']      = $charge;
                $m['bkash_charge_base'] = (int) round($base);
                $m['pay_amount']        = (int) round($base + $charge);
            } else {
                $m['pay_amount'] = round($base);
            }
            return $m;
        };
        if ($wanted === 'full') {
            $meta['pay_purpose'] = 'full';
            $meta = $restamp($meta, (float) $order->total - (float) $order->paid_total);
            $order->ops_meta = $meta;
            $order->saveQuietly();
        } elseif ($wanted === 'advance' && $advanceBdt !== null) {
            $meta['pay_purpose'] = 'advance';
            $meta = $restamp($meta, (float) $advanceBdt);
            $order->ops_meta = $meta;
            $order->saveQuietly();
        }

        // Bank transfers are verified by a human against the statement, so they go through
        // pay-bank-proof and an admin verdict — never through here.
        if ($method === 'bank') {
            throw new MarvelException('ব্যাংক ট্রান্সফারের ক্ষেত্রে স্লিপ আপলোড করুন — যাচাইয়ের পর নিশ্চিত করা হবে।');
        }

        if ($method !== 'bkash') {
            // Nagad/card have no working gateway here. Rather than pretend, say so.
            throw new MarvelException('এই পেমেন্ট মেথডটি এখন চালু নেই। বিকাশ বা ব্যাংক ট্রান্সফার ব্যবহার করুন।');
        }

        if (!$this->bkashConfig()) {
            throw new MarvelException('বিকাশ পেমেন্ট এই মুহূর্তে চালু নেই। ব্যাংক ট্রান্সফার ব্যবহার করুন।');
        }

        $request->merge(['order_id' => $order->id]);
        $res = $this->bkashCreate($request);
        $url = $res['bkash']['bkashURL'] ?? null;
        if (!$url) {
            throw new MarvelException('বিকাশ পেমেন্ট শুরু করা যায়নি। একটু পরে আবার চেষ্টা করুন।');
        }
        return ['status' => 'redirect', 'url' => $url];
    }

    /** Current prices for a set of product ids — powers the cart price-change alert. */
    public function priceCheck(Request $request)
    {
        $ids = array_values(array_filter(array_map('intval', explode(',', (string) $request->input('ids', '')))));
        if (empty($ids)) {
            return ['status' => 'success', 'prices' => []];
        }
        $rows = Product::whereIn('id', array_slice($ids, 0, 100))
            ->get(['id', 'price', 'sale_price', 'quantity']);
        return [
            'status' => 'success',
            'prices' => $rows->map(fn ($p) => [
                'id'         => $p->id,
                'price'      => (float) $p->price,
                'sale_price' => (float) $p->sale_price,
                'in_stock'   => (int) $p->quantity > 0,
            ])->values(),
        ];
    }

    // ---------------------------------------------------------- order create
    /**
     * Create an order from an external bot (ReplyGenie).
     * Body: { customer_name, customer_contact, address, items:[{id|sku, quantity}] }
     */
    public function createOrderApi(Request $request)
    {
        $request->validate([
            'customer_name'    => 'nullable|string',
            'customer_contact' => 'required|string',
            'items'            => 'required|array|min:1',
        ]);

        $shop = $this->mainShop();
        $amount = 0;
        $orderProducts = [];
        foreach ($request->items as $it) {
            $product = null;
            if (!empty($it['id'])) {
                $product = Product::find($it['id']);
            } elseif (!empty($it['sku'])) {
                $product = Product::where('sku', $it['sku'])->orWhere('slug', $it['sku'])->first();
            } elseif (!empty($it['name'])) {
                $product = Product::where('name', 'like', '%' . $it['name'] . '%')->first();
            }
            if (!$product) {
                continue;
            }
            $qty = max(1, (int) ($it['quantity'] ?? 1));
            $unit = (float) ($product->sale_price ?: $product->price);
            $amount += $unit * $qty;
            $orderProducts[$product->id] = [
                'order_quantity' => $qty,
                'unit_price'     => $unit,
                'subtotal'       => $unit * $qty,
            ];
        }
        if (empty($orderProducts)) {
            throw new MarvelException('None of the requested products were found.');
        }

        $delivery = (float) $request->input('delivery_fee', 60);
        $order = Order::create([
            'tracking_number'  => 'R-' . strtoupper(Str::random(8)),
            'customer_name'    => $request->customer_name ?? 'Facebook Customer',
            'customer_contact' => $request->customer_contact,
            'amount'           => $amount,
            'sales_tax'        => 0,
            'delivery_fee'     => $delivery,
            'discount'         => 0,
            'total'            => $amount + $delivery,
            'paid_total'       => 0,
            'shop_id'          => $shop?->id,
            'language'         => DEFAULT_LANGUAGE ?? 'en',
            'order_status'     => 'order-pending',
            'payment_status'   => 'payment-pending',
            'payment_gateway'  => 'CASH_ON_DELIVERY',
            'shipping_address' => $request->input('address') ? ['street_address' => $request->input('address')] : null,
            'billing_address'  => $request->input('address') ? ['street_address' => $request->input('address')] : null,
            'note'             => $request->input('note'),
        ]);
        $order->products()->attach($orderProducts);
        Order::commitStock($order); // reserve book stock on placement

        // Stamp who placed it, so the admin can tell a ReplyGenie order from a website one.
        $ops = (array) ($order->ops_meta ?? []);
        $ops['created_by'] = (string) $request->input('created_by', 'ReplyGenie');
        $ops['source'] = (string) $request->input('source', 'replygenie');
        $order->ops_meta = $ops;
        $order->saveQuietly();

        // #5 — pre-order / advance metadata (order stays PENDING_ADVANCE until 50% paid).
        $status = $order->order_status;
        $advanceOut = null;
        if ($request->boolean('is_preorder') || $request->filled('advance_bdt')) {
            $total = (float) $order->total;
            $advance = $request->filled('advance_bdt')
                ? (float) $request->input('advance_bdt')
                : round($total * ((float) $request->input('advance_percent', 50) / 100));
            $ops = (array) ($order->ops_meta ?? []);
            $ops['advance'] = [
                'is_preorder' => $request->boolean('is_preorder'),
                'percent'     => (float) $request->input('advance_percent', 50),
                'advance_bdt' => round($advance),
                'due_bdt'     => round($total - $advance),
                'status'      => 'pending_advance',
            ];
            $order->ops_meta = $ops;
            $order->saveQuietly();
            $status = 'PENDING_ADVANCE';
            $advanceOut = round($advance);
        }

        return [
            'status' => 'success',
            'order'  => array_filter([
                'id'              => $order->id,
                'tracking_number' => $order->tracking_number,
                'total'           => $order->total,
                'order_status'    => $order->order_status,
                'status'          => $status !== $order->order_status ? $status : null,
                'advance_bdt'     => $advanceOut,
            ], fn ($v) => $v !== null),
        ];
    }

    // ------------------------------------------------------- ReplyGenie connect
    /** Return the ReplyGenie connection config (token + endpoints) for the admin panel. */
    public function getReplygenieSettings(Request $request)
    {
        $c = $this->options()['replygenie'] ?? [];
        $base = rtrim(config('app.url') ?: url('/'), '/');
        return [
            'status'     => 'success',
            'replygenie' => [
                'enabled'       => (bool) ($c['enabled'] ?? false),
                'connect_token' => $c['token'] ?? '',
                'shop_slug'     => $c['shop_slug'] ?? 'indobangla-store',
                'delivery_fee'  => (float) ($c['delivery_fee'] ?? 60),
                'auth_header'   => 'X-Connect-Token',
                'endpoints'     => [
                    'product_search' => $base . '/product-search-api?q={query}',
                    'create_order'   => $base . '/replygenie/order',
                ],
            ],
        ];
    }

    /** Enable/disable ReplyGenie, set the target shop & default delivery fee, (re)issue the token. */
    public function updateReplygenieSettings(Request $request)
    {
        $data = $request->validate([
            'enabled'      => 'nullable|boolean',
            'shop_slug'    => 'nullable|string',
            'delivery_fee' => 'nullable|numeric',
            'regenerate'   => 'nullable|boolean',
        ]);
        $settings = Settings::first();
        $options  = $settings->options;
        $cur      = $options['replygenie'] ?? [];
        $token    = $cur['token'] ?? '';
        if (empty($token) || $request->boolean('regenerate')) {
            $token = 'rg_' . Str::random(40);
        }
        $options['replygenie'] = [
            'enabled'      => array_key_exists('enabled', $data) ? (bool) $data['enabled'] : ($cur['enabled'] ?? false),
            'token'        => $token,
            'shop_slug'    => $data['shop_slug'] ?? ($cur['shop_slug'] ?? 'indobangla-store'),
            'delivery_fee' => $data['delivery_fee'] ?? ($cur['delivery_fee'] ?? 60),
        ];
        $settings->update(['options' => $options]);
        return $this->getReplygenieSettings($request);
    }

    // ---------------------------------------------------- admin notifications
    /** Return the Telegram/WhatsApp notifier config for the admin panel. */
    public function getNotifySettings(Request $request)
    {
        $n = $this->options()['notify'] ?? [];
        $tg = $n['telegram'] ?? [];
        $wa = $n['whatsapp'] ?? [];
        return [
            'status' => 'success',
            'notify' => [
                'telegram' => [
                    'enabled'   => (bool) ($tg['enabled'] ?? false),
                    'bot_token' => $tg['bot_token'] ?? '',
                    'chat_id'   => $tg['chat_id'] ?? '',
                ],
                'whatsapp' => [
                    'enabled'  => (bool) ($wa['enabled'] ?? false),
                    'provider' => $wa['provider'] ?? 'twilio',
                    'sid'      => $wa['sid'] ?? '',
                    'token'    => $wa['token'] ?? '',
                    'from'     => $wa['from'] ?? '',
                    'to'       => $wa['to'] ?? '',
                    'phone_id' => $wa['phone_id'] ?? '',
                ],
            ],
        ];
    }

    /** Save the Telegram/WhatsApp notifier config (super-admin). */
    public function updateNotifySettings(Request $request)
    {
        $data = $request->validate([
            'telegram'          => 'nullable|array',
            'telegram.enabled'  => 'nullable|boolean',
            'telegram.bot_token'=> 'nullable|string',
            'telegram.chat_id'  => 'nullable|string',
            'whatsapp'          => 'nullable|array',
        ]);
        $settings = Settings::first();
        $options  = $settings->options ?? [];
        $options['notify'] = [
            'telegram' => [
                'enabled'   => (bool) data_get($data, 'telegram.enabled', false),
                'bot_token' => (string) data_get($data, 'telegram.bot_token', ''),
                'chat_id'   => (string) data_get($data, 'telegram.chat_id', ''),
            ],
            'whatsapp' => [
                'enabled'  => (bool) data_get($data, 'whatsapp.enabled', false),
                'provider' => (string) data_get($data, 'whatsapp.provider', 'twilio'),
                'sid'      => (string) data_get($data, 'whatsapp.sid', ''),
                'token'    => (string) data_get($data, 'whatsapp.token', ''),
                'from'     => (string) data_get($data, 'whatsapp.from', ''),
                'to'       => (string) data_get($data, 'whatsapp.to', ''),
                'phone_id' => (string) data_get($data, 'whatsapp.phone_id', ''),
            ],
        ];
        $settings->update(['options' => $options]);
        return $this->getNotifySettings($request);
    }

    /** Send a test notification to confirm the channels are wired (super-admin). */
    public function testNotify(Request $request)
    {
        \Marvel\Helpers\AdminNotifier::send('✅ IndoBangla notification test — সংযোগ ঠিক আছে।');
        return ['status' => 'success', 'message' => 'Test notification dispatched.'];
    }

    /**
     * Public order-create for ReplyGenie / FB bots, authenticated by the connect token
     * (header `X-Connect-Token`) instead of a logged-in user. Reuses createOrderApi.
     */
    public function replygenieOrder(Request $request)
    {
        $cfg = $this->options()['replygenie'] ?? [];
        if (empty($cfg['enabled']) || empty($cfg['token'])) {
            throw new MarvelException('ReplyGenie integration is disabled. Enable it in Settings → ReplyGenie.');
        }
        $sent = $request->header('X-Connect-Token') ?: $request->input('connect_token');
        if (!$sent || !hash_equals((string) $cfg['token'], (string) $sent)) {
            throw new MarvelException('Invalid ReplyGenie connect token.');
        }
        if (!$request->filled('delivery_fee') && isset($cfg['delivery_fee'])) {
            $request->merge(['delivery_fee' => $cfg['delivery_fee']]);
        }
        return $this->createOrderApi($request);
    }

    /** Shared connect-token gate for ReplyGenie / bot endpoints. */
    protected function assertReplygenieToken(Request $request): array
    {
        $cfg = $this->options()['replygenie'] ?? [];
        if (empty($cfg['enabled']) || empty($cfg['token'])) {
            throw new MarvelException('ReplyGenie integration is disabled. Enable it in Settings → ReplyGenie.');
        }
        $sent = $request->header('X-Connect-Token') ?: $request->input('connect_token');
        if (!$sent || !hash_equals((string) $cfg['token'], (string) $sent)) {
            throw new MarvelException('Invalid ReplyGenie connect token.');
        }
        return $cfg;
    }

    /** Resolve an order by order_id or tracking_number (for agent actions). */
    protected function resolveAgentOrder(Request $request): Order
    {
        if ($request->filled('order_id')) {
            return Order::findOrFail($request->order_id);
        }
        if ($request->filled('tracking_number')) {
            $o = Order::where('tracking_number', $request->tracking_number)->first();
            if ($o) {
                return $o;
            }
        }
        throw new MarvelException('order_id or tracking_number is required.');
    }

    protected function orderSummary(Order $order): array
    {
        $order->loadMissing('products');
        return [
            'id'               => $order->id,
            'tracking_number'  => $order->tracking_number,
            'customer_name'    => $order->customer_name,
            'customer_contact' => $order->customer_contact,
            'order_status'     => $order->order_status,
            'payment_status'   => $order->payment_status,
            'total'            => (float) $order->total,
            'paid_total'       => (float) $order->paid_total,
            'delivery_fee'     => (float) $order->delivery_fee,
            'discount'         => (float) $order->discount,
            'logistics'        => $order->logistics_provider,
            'note'             => $order->note,
            'items'            => $order->products->map(fn ($p) => [
                'id'       => $p->id,
                'name'     => $p->name,
                'quantity' => (int) ($p->pivot->order_quantity ?? 0),
                'price'    => (float) ($p->pivot->unit_price ?? 0),
            ]),
        ];
    }

    /**
     * Unified agent endpoint for the ReplyGenie chatbot (token-authed, no user login).
     * Its own AI decides intent, then calls this with a structured action.
     *
     * POST /replygenie/agent   header: X-Connect-Token: <rg token>
     * Body: { action, ...params }
     *   action=product_search  { q }
     *   action=create_order    { customer_name, customer_contact, address, items:[{name|id|sku, quantity}], note, delivery_fee }
     *   action=lookup_order    { order_id | tracking_number }
     *   action=modify_order    { order_id|tracking_number, address?, note?, discount?, delivery_fee?, adjustment?, items? }
     *   action=set_status      { order_id|tracking_number, order_status }
     *   action=courier_ship    { order_id|tracking_number, provider }
     *   action=courier_track   { order_id|tracking_number, provider, tracking_id? }
     */
    public function replygenieAgent(Request $request)
    {
        $this->assertReplygenieToken($request);
        $action = (string) $request->input('action', '');

        switch ($action) {
            case 'product_search':
                return $this->productSearch($request);

            case 'create_order': {
                // createOrderApi handles pre-order / advance metadata (is_preorder,
                // advance_percent, advance_bdt) so /replygenie/order gets it too.
                return $this->createOrderApi($request);
            }

            case 'lookup_order': {
                $order = $this->resolveAgentOrder($request);
                return ['status' => 'success', 'order' => $this->orderSummary($order)];
            }

            case 'modify_order': {
                $order = $this->resolveAgentOrder($request);
                // optional line-item replacement
                if ($request->filled('items') && is_array($request->items)) {
                    $sync = [];
                    $amount = 0;
                    foreach ($request->items as $it) {
                        $product = !empty($it['id'])
                            ? Product::find($it['id'])
                            : (!empty($it['sku'])
                                ? Product::where('sku', $it['sku'])->orWhere('slug', $it['sku'])->first()
                                : (!empty($it['name']) ? Product::where('name', 'like', '%' . $it['name'] . '%')->first() : null));
                        if (!$product) {
                            continue;
                        }
                        $qty  = max(1, (int) ($it['quantity'] ?? 1));
                        $unit = (float) ($product->sale_price ?: $product->price);
                        $amount += $unit * $qty;
                        $sync[$product->id] = ['order_quantity' => $qty, 'unit_price' => $unit, 'subtotal' => $unit * $qty];
                    }
                    if (!empty($sync)) {
                        $order->products()->sync($sync);
                        $order->amount = $amount;
                    }
                }
                if ($request->filled('address')) {
                    $order->shipping_address = ['street_address' => $request->input('address')];
                    $order->billing_address  = ['street_address' => $request->input('address')];
                }
                if ($request->has('note')) {
                    $order->note = $request->note;
                }
                if ($request->filled('discount')) {
                    $order->discount = (float) $request->discount;
                }
                if ($request->filled('delivery_fee')) {
                    $order->delivery_fee = (float) $request->delivery_fee;
                }
                $adjustment = (float) ($request->adjustment ?? 0);
                $order->total = max(0, (float) ($order->amount ?? 0)
                    + (float) ($order->sales_tax ?? 0)
                    + (float) ($order->delivery_fee ?? 0)
                    - (float) ($order->discount ?? 0)
                    + $adjustment);
                $order->save();
                \Marvel\Helpers\AdminNotifier::send(
                    "🤖 <b>ReplyGenie</b> অর্ডার এডিট #{$order->tracking_number} — মোট ৳" . number_format((float) $order->total, 0)
                );
                return ['status' => 'success', 'order' => $this->orderSummary($order)];
            }

            case 'set_status': {
                $order  = $this->resolveAgentOrder($request);
                $status = (string) $request->input('order_status', '');
                $allowed = ['order-pending', 'order-processing', 'order-at-local-facility',
                    'order-out-for-delivery', 'order-completed', 'order-cancelled', 'order-refunded', 'order-failed'];
                if (!in_array($status, $allowed, true)) {
                    throw new MarvelException('Invalid order_status.');
                }
                $order->order_status = $status; // Order::updated hook restores stock + notifies
                $order->save();
                return ['status' => 'success', 'order' => $this->orderSummary($order)];
            }

            case 'courier_ship': {
                $order    = $this->resolveAgentOrder($request);
                $provider = (string) $request->input('provider', '');
                $request->merge(['order_id' => $order->id]);
                $res = $this->createShipment($request, $provider);
                \Marvel\Helpers\AdminNotifier::send(
                    "🚚 <b>ReplyGenie</b> " . strtoupper($provider) . " শিপমেন্ট #{$order->tracking_number}"
                    . (!empty($res['tracking_id']) ? " — " . $res['tracking_id'] : '')
                );
                return $res;
            }

            case 'courier_track': {
                $order    = $this->resolveAgentOrder($request);
                $provider = (string) $request->input('provider', '');
                return $this->courierTrack($request, $provider);
            }

            case 'pay_link': {
                // Give the bot a shareable online-payment link to message the customer.
                $order = $this->resolveAgentOrder($request);
                $request->merge(['order_id' => $order->id]);
                $res = $this->orderPayLink($request);
                $advance = ($res['purpose'] ?? 'full') === 'advance';
                $amount = (float) ($res['amount_bdt'] ?? $order->total);
                $msg = $advance
                    ? "অর্ডার #{$order->tracking_number} এর ৫০% অগ্রিম ৳" . round($amount) . " পেমেন্ট লিংকঃ {$res['pay_link']}"
                    : "অর্ডার #{$order->tracking_number} এর পেমেন্ট লিংক: {$res['pay_link']} — লিংকে গিয়ে পছন্দের মেথডে পেমেন্ট করুন।";
                return [
                    'status'     => 'success',
                    'pay_link'   => $res['pay_link'],
                    'amount_bdt' => round($amount),
                    'purpose'    => $res['purpose'] ?? 'full',
                    'message'    => $msg,
                ];
            }

            case 'create_product': {
                return $this->agentCreateProduct($request);
            }

            case 'order_status': {
                $order = $this->resolveAgentOrder($request);
                $ops = (array) ($order->ops_meta ?? []);
                $adv = $ops['advance'] ?? null;
                if ($adv) {
                    $status = ($adv['status'] ?? '') === 'paid' ? 'APPROVED' : 'PENDING_ADVANCE';
                } else {
                    $status = strtoupper(str_replace('order-', '', (string) $order->order_status));
                }
                return [
                    'status'   => $status,
                    'paid_bdt' => round((float) $order->paid_total),
                    'due_bdt'  => round((float) $order->total - (float) $order->paid_total),
                ];
            }

            default:
                throw new MarvelException('Unknown agent action: ' . ($action ?: '(empty)'));
        }
    }

    /**
     * Manual order adjustment (discount / delivery fee / +/- adjustment / note / mark paid).
     * Moved out of a route closure so it can't break route:cache.
     */
    public function adjustOrder(Request $request)
    {
        $request->validate(['order_id' => 'required']);
        $order = Order::findOrFail($request->order_id);
        if ($request->filled('discount')) {
            $order->discount = (float) $request->discount;
        }
        if ($request->filled('delivery_fee')) {
            $order->delivery_fee = (float) $request->delivery_fee;
        }
        if ($request->has('note')) {
            $order->note = $request->note;
        }
        // Extra weight charge for heavy books — persisted so it survives later adjustments.
        // Computed as rate (৳/kg) × weight (kg); the pieces are kept so the invoice can show the
        // weight and the desk can re-edit. A bare weight_charge (no kg) is still honoured as a flat
        // amount for older orders.
        $ops = (array) ($order->ops_meta ?? []);
        if ($request->filled('weight_kg') || $request->filled('weight_rate')) {
            $wKg   = round((float) $request->input('weight_kg', 0), 3);
            $wRate = round((float) $request->input('weight_rate', 0), 2);
            $ops['weight_kg']     = $wKg;
            $ops['weight_rate']   = $wRate;
            $ops['weight_charge'] = (int) round($wKg * $wRate);
            $order->ops_meta = $ops;
        } elseif ($request->filled('weight_charge')) {
            $ops['weight_charge'] = round((float) $request->weight_charge);
            unset($ops['weight_kg'], $ops['weight_rate']);
            $order->ops_meta = $ops;
        }
        $weightCharge = (float) ($ops['weight_charge'] ?? 0);
        $adjustment = (float) ($request->adjustment ?? 0);
        $order->total = max(0, (float) ($order->amount ?? 0)
            + (float) ($order->sales_tax ?? 0)
            + (float) ($order->delivery_fee ?? 0)
            - (float) ($order->discount ?? 0)
            + $weightCharge
            + $adjustment);
        if ($request->boolean('mark_paid')) {
            $order->paid_total = $order->total;
            // Set the field that actually means "money received" — every screen reads
            // payment_status, so without this the desk could mark an order paid and see
            // no change at all.
            $order->payment_status = 'payment-success';
        }
        // #paid — let the desk correct the amount actually received, independent of the total
        // (e.g. record a partial payment). Clamped to 0…total.
        if ($request->filled('paid_total')) {
            $order->paid_total = min((float) $order->total, max(0, round((float) $request->input('paid_total'), 2)));
        }
        $order->save();
        return [
            'status' => 'success',
            'order'  => [
                'id' => $order->id, 'total' => $order->total, 'paid_total' => $order->paid_total,
                'discount' => $order->discount, 'delivery_fee' => $order->delivery_fee, 'note' => $order->note,
                'weight_charge' => $weightCharge,
                'weight_kg' => (float) ($ops['weight_kg'] ?? 0),
                'weight_rate' => (float) ($ops['weight_rate'] ?? 0),
            ],
        ];
    }

    /**
     * Operational tracking for the order-management board: call / message / two-step print /
     * multi-author notes / activity log — all stored in orders.ops_meta (single JSON column).
     */
    public function orderOps(Request $request)
    {
        $this->assertOrderDeskAccess($request);
        $request->validate(['order_id' => 'required']);
        $order = Order::findOrFail($request->order_id);
        $ops = (array) ($order->ops_meta ?? []);
        $ops += [
            'call_status' => 'none', 'call_attempts' => 0,
            'message_status' => 'none',
            'print_status' => 'none', 'print_count' => 0,
            'notes' => [], 'events' => [],
        ];
        $actor = optional($request->user())->name ?: 'Admin';
        $now   = now()->toIso8601String();
        $log   = function ($type, $desc) use (&$ops, $actor, $now) {
            $ops['events'][] = ['type' => $type, 'description' => $desc, 'actor' => $actor, 'at' => $now];
        };
        $p = (array) $request->input('patch', []);

        if (array_key_exists('call_status', $p)) {
            $ops['call_status'] = $p['call_status'];
            if ($p['call_status'] !== 'none') {
                $log('call_status_changed', 'Call marked: ' . ucfirst(str_replace('_', ' ', $p['call_status'])));
            }
        }
        if (!empty($p['call_attempt'])) {
            $ops['call_attempts'] = (int) $ops['call_attempts'] + 1;
            $log('call_attempt', 'Call attempt #' . $ops['call_attempts'] . ' logged');
        }
        if (array_key_exists('message_status', $p)) {
            $ops['message_status'] = $p['message_status'];
            $log($p['message_status'] === 'sent' ? 'message_sent' : 'message_unsent',
                $p['message_status'] === 'sent' ? 'Confirmation message sent' : 'Message marked not sent');
        }
        if (($p['print'] ?? null) === 'send') {
            $reprint = $ops['print_status'] !== 'none';
            $ops['print_status'] = 'sent';
            $log($reprint ? 'print_reprint' : 'print_command_sent',
                ($reprint ? 'Reprint' : 'Print') . ' command sent — slip confirm pending');
        }
        if (($p['print'] ?? null) === 'confirm') {
            $ops['print_status'] = 'confirmed';
            $ops['print_count'] = (int) $ops['print_count'] + 1;
            $log('print_confirmed', 'Slip printed — confirmed (' . $ops['print_count'] . '×)');
        }
        if (!empty($p['add_note']['text'])) {
            $ops['notes'][] = [
                'role' => $p['add_note']['role'] ?? 'moderator',
                'who'  => $p['add_note']['who'] ?? $actor,
                'text' => (string) $p['add_note']['text'],
                'at'   => $now,
            ];
            $log('note_added', 'Note added');
        }
        if (array_key_exists('tier', $p)) {
            $ops['tier'] = $p['tier'];
        }
        if (array_key_exists('courier', $p)) {
            $ops['courier'] = $p['courier'];
            if (!empty($p['courier'])) {
                $log('courier_assigned', 'Courier set: ' . $p['courier']);
            }
        }

        // Admin verdict on an uploaded bank slip. This is the only place a bank transfer turns
        // into money — the customer's upload never touches payment_status. Guarded on
        // pending_review so a double-click can't credit the same slip twice.
        $verdict = $p['bank_proof'] ?? null;
        if (in_array($verdict, ['confirm', 'reject'], true)
            && ($ops['bank_proof']['status'] ?? null) === 'pending_review') {
            if ($verdict === 'confirm') {
                $paid = (float) ($ops['bank_proof']['amount_bdt'] ?? 0);
                $ops['bank_proof']['status'] = 'confirmed';
                $ops['bank_proof']['reviewed_by'] = $actor;
                $ops['bank_proof']['reviewed_at'] = $now;
                $log('bank_proof_confirmed', 'Bank transfer verified — ৳' . round($paid) . ' credited');

                // Hand off to the one place money is recognised, so a bank transfer settles the
                // advance split, pre-order clock and club activation exactly as bKash does. It
                // persists ops itself, so write our edits down first.
                $order->ops_meta = $ops;
                $this->settlePayment($order, 'bank', $paid);
                return ['status' => 'success', 'ops' => $order->ops_meta];
            }
            $ops['bank_proof']['status'] = 'rejected';
            $ops['bank_proof']['reviewed_by'] = $actor;
            $ops['bank_proof']['reviewed_at'] = $now;
            if (!empty($p['bank_proof_note'])) {
                $ops['bank_proof']['review_note'] = (string) $p['bank_proof_note'];
            }
            $log('bank_proof_rejected', 'Bank slip rejected — customer may re-upload');
        }

        $order->ops_meta = $ops;
        $order->save();
        return ['status' => 'success', 'ops' => $ops];
    }

    /** Search orders across the whole table by tracking #, customer name/phone, or book title. */
    public function orderSearch(Request $request)
    {
        $q = trim((string) $request->input('q', ''));
        if ($q === '') {
            return ['status' => 'success', 'data' => [], 'total' => 0];
        }
        $orders = Order::query()
            ->with('products')
            ->where(function ($w) use ($q) {
                $w->where('tracking_number', 'like', "%{$q}%")
                    ->orWhere('customer_name', 'like', "%{$q}%")
                    ->orWhere('customer_contact', 'like', "%{$q}%")
                    // book by English name, Bangla name, or slug; plus author name
                    ->orWhereHas('products', fn ($p) => $p->where('name', 'like', "%{$q}%")
                        ->orWhere('bangla_name', 'like', "%{$q}%")
                        ->orWhere('slug', 'like', "%{$q}%")
                        ->orWhereHas('author', fn ($a) => $a->where('name', 'like', "%{$q}%")))
                    // registered customer's account name
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$q}%"));
            })
            ->limit(80)
            ->get();
        return ['status' => 'success', 'data' => $orders, 'total' => $orders->count()];
    }

    /** Per-customer order stats so the board can compute the loyalty tier. */
    public function orderCustomerStats(Request $request)
    {
        $ids = array_filter((array) $request->input('customer_ids', []));
        if (empty($ids)) {
            return ['status' => 'success', 'stats' => []];
        }
        $rows = \Illuminate\Support\Facades\DB::table('orders')
            ->whereIn('customer_id', $ids)
            ->whereNull('deleted_at')
            // Void orders are test/mistake rows the desk wrote off — counting them would drag a
            // real customer's tier down over orders they never actually placed.
            ->where('order_status', '!=', \Marvel\Enums\OrderStatus::VOID)
            ->select(
                'customer_id',
                \Illuminate\Support\Facades\DB::raw('COUNT(*) AS total'),
                \Illuminate\Support\Facades\DB::raw("SUM(CASE WHEN order_status = 'order-completed' THEN 1 ELSE 0 END) AS delivered"),
                \Illuminate\Support\Facades\DB::raw("SUM(CASE WHEN order_status IN ('order-cancelled','order-refunded') THEN 1 ELSE 0 END) AS returned")
            )
            ->groupBy('customer_id')
            ->get();
        $out = [];
        foreach ($rows as $r) {
            $out[$r->customer_id] = [
                'total' => (int) $r->total,
                'delivered' => (int) $r->delivered,
                'returned' => (int) $r->returned,
            ];
        }
        return ['status' => 'success', 'stats' => $out];
    }

    /** Test the ReplyGenie connection: token present + public search endpoint reachable. */
    public function testReplygenie(Request $request)
    {
        $cfg = $this->options()['replygenie'] ?? [];
        if (empty($cfg['enabled'])) {
            return ['status' => 'error', 'message' => 'ReplyGenie is disabled — enable it and click Save first.'];
        }
        if (empty($cfg['token'])) {
            return ['status' => 'error', 'message' => 'No connect token yet — click Save to generate one.'];
        }
        $base = rtrim(config('app.url') ?: url('/'), '/');
        try {
            $r = Http::timeout(15)->get($base . '/product-search-api', ['q' => 'a', 'limit' => 1]);
            $ok = $r->successful();
            return [
                'status'  => $ok ? 'ok' : 'error',
                'http'    => $r->status(),
                'message' => $ok
                    ? 'Connected ✓ token active, product-search reachable (found ' . ($r->json('count') ?? 0) . ' sample).'
                    : 'Search endpoint returned ' . $r->status() . '.',
            ];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Self-test failed: ' . $e->getMessage()];
        }
    }

    // ------------------------------------------------------- courier settings
    public function getCourierSettings(Request $request)
    {
        $c = $this->options()['couriers'] ?? [];
        $out = [];
        foreach (['redx', 'steadfast', 'paperfly', 'sundarban', 'pathao'] as $p) {
            $cfg = $c[$p] ?? [];
            $out[$p] = [
                'enabled'  => (bool) ($cfg['enabled'] ?? false),
                'has_token' => !empty($cfg['token']) || !empty($cfg['api_key']),
            ];
        }
        return ['status' => 'success', 'couriers' => $out];
    }

    public function updateCourierSettings(Request $request)
    {
        $data = $request->validate([
            'provider' => 'required|in:redx,steadfast,paperfly,sundarban,pathao',
            'enabled'  => 'nullable|boolean',
            'token'    => 'nullable|string',
            'api_key'  => 'nullable|string',
            'secret'   => 'nullable|string',
            'base_url' => 'nullable|string',
        ]);
        $settings = Settings::first();
        $options  = $settings->options;
        $couriers = $options['couriers'] ?? [];
        $cur = $couriers[$data['provider']] ?? [];
        $couriers[$data['provider']] = [
            'enabled'  => array_key_exists('enabled', $data) ? (bool) $data['enabled'] : ($cur['enabled'] ?? false),
            'token'    => !empty($data['token']) ? $data['token'] : ($cur['token'] ?? ''),
            'api_key'  => !empty($data['api_key']) ? $data['api_key'] : ($cur['api_key'] ?? ''),
            'secret'   => !empty($data['secret']) ? $data['secret'] : ($cur['secret'] ?? ''),
            'base_url' => $data['base_url'] ?? ($cur['base_url'] ?? ''),
        ];
        $options['couriers'] = $couriers;
        $settings->update(['options' => $options]);
        return $this->getCourierSettings($request);
    }

    /** Test connectivity to a courier using the stored credentials. */
    public function testCourier(Request $request, $provider)
    {
        $cfg = ($this->options()['couriers'] ?? [])[$provider] ?? [];
        try {
            switch ($provider) {
                case 'redx':
                    // RedX authenticates with the `API-ACCESS-TOKEN: Bearer <token>` header
                    // (NOT the standard Authorization header). Docs: redx.com.bd/developer-api
                    $base = rtrim($cfg['base_url'] ?? '', '/') ?: 'https://openapi.redx.com.bd/v1.0.0-beta';
                    $r = Http::withHeaders(['API-ACCESS-TOKEN' => 'Bearer ' . ($cfg['token'] ?? '')])
                        ->timeout(25)->get($base . '/areas');
                    break;
                case 'steadfast':
                    $r = Http::withHeaders([
                        'Api-Key'    => $cfg['api_key'] ?? '',
                        'Secret-Key' => $cfg['secret'] ?? '',
                        'Content-Type' => 'application/json',
                    ])->timeout(25)->get('https://portal.packzy.com/api/v1/get_balance');
                    break;
                case 'pathao':
                    $r = Http::timeout(25)->post(($cfg['base_url'] ?: 'https://api-hermes.pathao.com') . '/aladdin/api/v1/issue-token', [
                        'grant_type' => 'client_credentials',
                        'client_id'  => $cfg['api_key'] ?? '',
                        'client_secret' => $cfg['secret'] ?? '',
                    ]);
                    break;
                case 'paperfly':
                    $r = Http::withHeaders(['paperflykey' => $cfg['token'] ?? ''])->timeout(25)
                        ->get(($cfg['base_url'] ?: 'https://api.paperfly.com.bd') . '/OpenApi/api/v1');
                    break;
                default: // sundarban & others – ping the configured base url
                    $r = Http::timeout(20)->get($cfg['base_url'] ?: 'https://sundarbancourierltd.com');
            }
            return [
                'status'      => $r->successful() ? 'ok' : 'error',
                'http'        => $r->status(),
                'message'     => $r->successful() ? 'Connected successfully.' : 'Reachable but credentials/endpoint returned ' . $r->status() . '. Check the token.',
                'body_sample' => Str::limit($r->body(), 200),
            ];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Could not reach the courier API: ' . $e->getMessage()];
        }
    }

    // ------------------------------------------------------- payment settings
    public function getPaymentSettings(Request $request)
    {
        $p = $this->options()['payments'] ?? [];
        $out = [];
        foreach (['bkash', 'nagad', 'bank'] as $g) {
            $cfg = $p[$g] ?? [];
            $out[$g] = [
                'enabled'   => (bool) ($cfg['enabled'] ?? false),
                'mode'      => $cfg['mode'] ?? 'sandbox',
                'has_creds' => !empty($cfg['app_key']) || !empty($cfg['merchant_id']) || !empty($cfg['account']),
            ];
        }
        return ['status' => 'success', 'payments' => $out];
    }

    public function updatePaymentSettings(Request $request)
    {
        $data = $request->validate([
            'gateway'     => 'required|in:bkash,nagad,bank',
            'enabled'     => 'nullable|boolean',
            'mode'        => 'nullable|in:sandbox,live',
            'app_key'     => 'nullable|string',
            'app_secret'  => 'nullable|string',
            'username'    => 'nullable|string',
            'password'    => 'nullable|string',
            'merchant_id' => 'nullable|string',
            'account'     => 'nullable|string',
        ]);
        $settings = Settings::first();
        $options  = $settings->options;
        $payments = $options['payments'] ?? [];
        $cur = $payments[$data['gateway']] ?? [];
        $payments[$data['gateway']] = array_merge($cur, array_filter([
            'enabled'     => array_key_exists('enabled', $data) ? (bool) $data['enabled'] : ($cur['enabled'] ?? false),
            'mode'        => $data['mode'] ?? ($cur['mode'] ?? 'sandbox'),
            'app_key'     => $data['app_key'] ?? null,
            'app_secret'  => $data['app_secret'] ?? null,
            'username'    => $data['username'] ?? null,
            'password'    => $data['password'] ?? null,
            'merchant_id' => $data['merchant_id'] ?? null,
            'account'     => $data['account'] ?? null,
        ], fn ($v) => $v !== null));
        $options['payments'] = $payments;
        $settings->update(['options' => $options]);
        return $this->getPaymentSettings($request);
    }

    /** Test a payment gateway's stored credentials. */
    public function testPayment(Request $request, $gateway)
    {
        $cfg = ($this->options()['payments'] ?? [])[$gateway] ?? [];
        try {
            switch ($gateway) {
                case 'bkash':
                    $base = ($cfg['mode'] ?? 'sandbox') === 'live'
                        ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
                        : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
                    $r = Http::withHeaders([
                        'username'     => $cfg['username'] ?? '',
                        'password'     => $cfg['password'] ?? '',
                        'Content-Type' => 'application/json',
                        'Accept'       => 'application/json',
                    ])->timeout(25)->post($base . '/tokenized/checkout/token/grant', [
                        'app_key'    => $cfg['app_key'] ?? '',
                        'app_secret' => $cfg['app_secret'] ?? '',
                    ]);
                    $ok = $r->successful() && !empty($r->json('id_token'));
                    return [
                        'status'  => $ok ? 'ok' : 'error',
                        'http'    => $r->status(),
                        'message' => $ok
                            ? 'bKash credentials valid ✓ (' . ($cfg['mode'] ?? 'sandbox') . ' token received).'
                            : 'bKash rejected the credentials (' . $r->status() . '). ' . Str::limit($r->body(), 140),
                    ];
                case 'nagad':
                    $ok = !empty($cfg['merchant_id']) && !empty($cfg['app_key']);
                    return [
                        'status'  => $ok ? 'ok' : 'error',
                        'message' => $ok
                            ? 'Nagad merchant id & key are set ✓ (the full handshake runs at checkout).'
                            : 'Missing Nagad merchant id / app key.',
                    ];
                case 'bank':
                    $ok = !empty($cfg['account']);
                    return [
                        'status'  => $ok ? 'ok' : 'error',
                        'message' => $ok ? 'Bank transfer details saved ✓.' : 'No bank account details saved.',
                    ];
                default:
                    return ['status' => 'error', 'message' => 'Unknown gateway.'];
            }
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Could not reach the gateway: ' . $e->getMessage()];
        }
    }

    // ------------------------------------------------------- order line items
    /**
     * Add / remove / update products on an existing order and recompute totals.
     * Body: { order_id, add:[{product_id, quantity}], remove:[product_id], set:[{product_id, quantity}] }
     */
    public function editOrderItems(Request $request)
    {
        $request->validate(['order_id' => 'required']);
        $order = Order::with('products')->findOrFail($request->order_id);

        foreach ((array) $request->input('remove', []) as $pid) {
            $order->products()->detach($pid);
        }
        $addOrSet = array_merge((array) $request->input('add', []), (array) $request->input('set', []));
        foreach ($addOrSet as $it) {
            $pid = $it['product_id'] ?? null;
            $product = $pid ? Product::find($pid) : null;
            if (!$product) {
                continue;
            }
            $qty = max(1, (int) ($it['quantity'] ?? 1));
            // The admin can override the line price (a damaged copy, a haggled deal, a
            // wrong catalogue price). Without one we fall back to the book's own price.
            $unit = isset($it['price']) && $it['price'] !== '' && (float) $it['price'] >= 0
                ? (float) $it['price']
                : (float) ($product->sale_price ?: $product->price);
            $order->products()->syncWithoutDetaching([
                $product->id => [
                    'order_quantity' => $qty,
                    'unit_price'     => $unit,
                    'subtotal'       => $unit * $qty,
                ],
            ]);
        }

        $order->load('products');
        $amount = 0;
        foreach ($order->products as $p) {
            $amount += (float) ($p->pivot->subtotal ?? 0);
        }
        $order->amount = $amount;
        $order->total = max(0, $amount + (float) ($order->sales_tax ?? 0)
            + (float) ($order->delivery_fee ?? 0) - (float) ($order->discount ?? 0));

        // Money received can never exceed what the order now costs. Removing a line used to
        // leave paid_total at the OLD, higher total — and both payInfo and invoiceInfo read
        // `paid_total >= total` as "paid", so an order with a real balance owing showed as
        // settled and the pay screen offered no way to pay it.
        $order->paid_total = min((float) $order->paid_total, (float) $order->total);
        $order->save();

        // The pay link and the invoice quote a figure stamped into ops_meta at the time the
        // link was made. Editing the items has to re-stamp it, otherwise the customer keeps
        // being asked for the pre-edit amount however many times the order is corrected.
        $ops = (array) ($order->ops_meta ?? []);
        $due = max(0, round((float) $order->total - (float) $order->paid_total));
        if (!empty($ops['pay_token'])) {
            $advanceBdt = isset($ops['advance']['advance_bdt'])
                ? (float) $ops['advance']['advance_bdt'] : null;
            // An advance is a negotiated number, so it survives an edit — but it can never
            // be more than what is actually left to pay.
            $base = ($advanceBdt !== null && ($ops['pay_purpose'] ?? '') !== 'full')
                ? min($advanceBdt, $due)
                : $due;

            $ops['pay_amount'] = (int) round($base);
            // Re-derive the bKash service charge on the new base; leaving the old one would
            // collect a charge calculated against an amount that no longer exists.
            if ((int) ($ops['bkash_charge'] ?? 0) > 0 && $base > 0) {
                $charge = (int) round($base * self::BKASH_CHARGE_PCT / 100);
                $ops['bkash_charge']      = $charge;
                $ops['bkash_charge_base'] = (int) round($base);
                $ops['pay_amount']        = (int) round($base + $charge);
            } else {
                unset($ops['bkash_charge'], $ops['bkash_charge_base']);
            }

            if (isset($ops['advance']) && is_array($ops['advance'])) {
                $ops['advance']['advance_bdt'] = (int) round($base);
                $ops['advance']['due_bdt']     = (int) round((float) $order->total - $base);
            }

            $order->ops_meta = $ops;
            $order->save();
        }

        return [
            'status' => 'success',
            'order'  => [
                'id'     => $order->id,
                'amount' => $order->amount,
                'total'  => $order->total,
                // So the admin sees immediately what the customer will now be asked for.
                'paid_total' => (float) $order->paid_total,
                'due'        => $due,
                'pay_amount' => isset($ops['pay_amount']) ? (int) $ops['pay_amount'] : null,
                'products' => $order->products->map(fn ($p) => [
                    'id'   => $p->id,
                    'name' => $p->name,
                    'qty'  => (int) ($p->pivot->order_quantity ?? 0),
                    'unit_price' => (float) ($p->pivot->unit_price ?? 0),
                    'subtotal'   => (float) ($p->pivot->subtotal ?? 0),
                ]),
            ],
        ];
    }

    // --------------------------------------------------- courier: create shipment
    /** Create a shipment/consignment for an order with the selected courier. */
    public function createShipment(Request $request, $provider)
    {
        $cfg = ($this->options()['couriers'] ?? [])[$provider] ?? [];
        if (empty($cfg['enabled'])) {
            throw new MarvelException(ucfirst($provider) . ' is not enabled in Settings → Couriers & Payments.');
        }
        $order = Order::findOrFail($request->order_id);
        $addr = is_array($order->shipping_address) ? $order->shipping_address : [];
        $address = trim(($addr['street_address'] ?? '') . ' ' . ($addr['city'] ?? '') . ' ' . ($addr['state'] ?? ''));
        // The area the customer actually picked lives in `state` — `city` is the
        // division dropdown and is always set (defaults to 'Dhaka'), so reading it
        // first meant the picked area was never used.
        $shipArea = $addr['state'] ?? $addr['city'] ?? null;

        try {
            switch ($provider) {
                case 'steadfast':
                    $r = Http::withHeaders([
                        'Api-Key' => $cfg['api_key'] ?? '', 'Secret-Key' => $cfg['secret'] ?? '',
                        'Content-Type' => 'application/json',
                    ])->timeout(30)->post('https://portal.packzy.com/api/v1/create_order', [
                        'invoice'           => $order->tracking_number,
                        'recipient_name'    => $order->customer_name,
                        'recipient_phone'   => $order->customer_contact,
                        'recipient_address' => $address ?: 'N/A',
                        'cod_amount'        => (float) $order->total,
                        'note'              => $order->note,
                    ]);
                    break;
                case 'redx':
                    $base = $this->redxBase($cfg);
                    $headers = ['API-ACCESS-TOKEN' => 'Bearer ' . ($cfg['token'] ?? '')];
                    // RedX requires a delivery_area_id — resolve it from /areas by city/state name.
                    $cityName = $addr['state'] ?? $addr['city'] ?? 'Dhaka';
                    [$areaId, $areaName] = $this->redxResolveArea($base, $headers, $cityName);
                    $shipArea = $areaName ?: $cityName;
                    $payload = [
                        'customer_name'          => $order->customer_name ?: 'Customer',
                        'customer_phone'         => $order->customer_contact,
                        'delivery_area'          => $areaName ?: $cityName,
                        'customer_address'       => $address ?: 'N/A',
                        'merchant_invoice_id'    => $order->tracking_number,
                        'cash_collection_amount' => (string) round((float) $order->total),
                        'parcel_weight'          => (int) ($cfg['default_weight'] ?? 500),
                        'value'                  => (int) round((float) $order->total),
                    ];
                    if ($areaId) {
                        $payload['delivery_area_id'] = $areaId;
                    }
                    if (!empty($cfg['pickup_store_id'])) {
                        $payload['pickup_store_id'] = (int) $cfg['pickup_store_id'];
                    }
                    if (!empty($order->note)) {
                        $payload['instruction'] = Str::limit($order->note, 190, '');
                    }
                    $r = Http::withHeaders($headers)->timeout(30)->post($base . '/parcel', $payload);
                    break;
                default:
                    throw new MarvelException('Automatic shipment creation for ' . ucfirst($provider) . ' is not wired yet — mark it manually for now.');
            }
            if ($r->successful()) {
                $body = $r->json();
                // Pull the courier's own tracking id out of the (provider-specific) response.
                $tracking = $body['tracking_id']
                    ?? ($body['consignment']['consignment_id'] ?? null)
                    ?? ($body['consignment']['tracking_code'] ?? null)
                    ?? ($body['data']['tracking_id'] ?? null);
                $order->logistics_provider = $provider;
                if ($tracking) {
                    $order->note = trim(($order->note ? $order->note . ' | ' : '') . strtoupper($provider) . ': ' . $tracking);
                }
                // Persist courier entry into ops_meta so the order board shows the
                // tracking id + area (confirms the parcel was registered).
                $ops = (array) ($order->ops_meta ?? []);
                $ops['courier'] = $provider;
                $ops['courier_tracking_id'] = $tracking;
                $ops['courier_area'] = $shipArea;
                $ops['courier_sent_at'] = now()->toIso8601String();
                $order->ops_meta = $ops;
                $order->save();
                return [
                    'status'      => 'success',
                    'provider'    => $provider,
                    'tracking_id' => $tracking,
                    'area'        => $shipArea,
                    'response'    => $body,
                ];
            }
            throw new MarvelException(ucfirst($provider) . ' error ' . $r->status() . ': ' . Str::limit($r->body(), 200));
        } catch (MarvelException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new MarvelException('Shipment failed: ' . $e->getMessage());
        }
    }

    /**
     * Resolve a RedX delivery_area_id from an area/city name by scanning /areas.
     * Returns [id, name]; [null, null] if nothing matches (caller falls back).
     */
    protected function redxResolveArea(string $base, array $headers, string $cityName): array
    {
        try {
            // Our own synced list, so booking a parcel does not depend on RedX's
            // /areas being up. area_id order mirrors RedX's response order, which
            // the last-resort branch below relies on.
            $areas = \Marvel\Database\Models\CourierArea::where('provider', 'redx')
                ->orderBy('area_id')->get(['area_id', 'name'])
                ->map(fn ($a) => ['id' => (int) $a->area_id, 'name' => (string) $a->name])
                ->all();
            if (!$areas) {
                // Never synced — fall back to the live call rather than fail the parcel.
                $res = Http::withHeaders($headers)->timeout(20)->get($base . '/areas');
                if (!$res->successful()) {
                    return [null, null];
                }
                $areas = $res->json('areas') ?? $res->json('data') ?? $res->json() ?? [];
            }
            $needle = mb_strtolower(trim($cityName));
            $best = null;
            foreach ($areas as $a) {
                $nm = mb_strtolower((string) ($a['name'] ?? ''));
                if ($nm === '') {
                    continue;
                }
                if ($nm === $needle) {
                    return [(int) ($a['id'] ?? 0), $a['name'] ?? $cityName];
                }
                if (!$best && $needle !== '' && (str_contains($nm, $needle) || str_contains($needle, $nm))) {
                    $best = $a;
                }
            }
            if ($best) {
                return [(int) ($best['id'] ?? 0), $best['name'] ?? $cityName];
            }
            // last resort: first area returned (keeps the parcel from failing hard)
            $first = $areas[0] ?? null;
            return $first ? [(int) ($first['id'] ?? 0), $first['name'] ?? $cityName] : [null, null];
        } catch (\Throwable $e) {
            return [null, null];
        }
    }

    /**
     * Track a shipment with the courier. GET courier-track/{provider}?tracking_id=...
     */
    public function courierTrack(Request $request, $provider)
    {
        $cfg = ($this->options()['couriers'] ?? [])[$provider] ?? [];
        $trackingId = (string) $request->input('tracking_id', '');
        if ($trackingId === '') {
            throw new MarvelException('tracking_id is required.');
        }
        try {
            switch ($provider) {
                case 'redx':
                    $base = rtrim($cfg['base_url'] ?? '', '/') ?: 'https://openapi.redx.com.bd/v1.0.0-beta';
                    $r = Http::withHeaders(['API-ACCESS-TOKEN' => 'Bearer ' . ($cfg['token'] ?? '')])
                        ->timeout(25)->get($base . '/parcel/track/' . $trackingId);
                    break;
                case 'steadfast':
                    $r = Http::withHeaders([
                        'Api-Key' => $cfg['api_key'] ?? '', 'Secret-Key' => $cfg['secret'] ?? '',
                    ])->timeout(25)->get('https://portal.packzy.com/api/v1/status_by_cid/' . $trackingId);
                    break;
                default:
                    throw new MarvelException('Tracking for ' . ucfirst($provider) . ' is not wired yet.');
            }
            return [
                'status'   => $r->successful() ? 'success' : 'error',
                'http'     => $r->status(),
                'tracking' => $r->json(),
            ];
        } catch (MarvelException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new MarvelException('Tracking failed: ' . $e->getMessage());
        }
    }

    // --------------------------------------------------------- payment: bKash
    /**
     * Start a bKash tokenized payment for an order and return the bKash URL.
     *
     * Goes through the installed karim007/laravel-bkash-tokenize package rather than talking to
     * bKash by hand, so it authenticates with the **live merchant credentials already set in the
     * environment** (BKASH_APP_KEY / BKASH_SANDBOX / …) and token handling stays the package's
     * job. The package's own BkashTokenizePaymentController is only its demo (it hardcodes
     * `amount = 10`) — this is the real, order-aware entry point.
     */
    public function bkashCreate(Request $request)
    {
        // Single source of truth for "is bKash usable" — it also refuses sandbox credentials on
        // a production box, so this entry point can't be used to route real buyers at fake money.
        if (!$this->bkashConfig()) {
            throw new MarvelException('bKash is not configured for live payments. Add live credentials in Settings → Couriers & Payments.');
        }
        $order = Order::findOrFail($request->order_id);
        // A pay link may only be collecting a pre-order advance, so bKash must be told to take
        // what *this link* is for — not the whole order. `pay_amount` is the very figure
        // /pay/{token} shows the customer (payConfirm re-stamps it when they opt to pay in
        // full), so the screen and the charge can never disagree.
        $ops = (array) ($order->ops_meta ?? []);
        $payAmount = isset($ops['pay_amount']) ? (float) $ops['pay_amount'] : (float) $order->total;

        try {
            $payload = [
                'mode'                  => '0011', // 0011 = tokenized checkout
                'intent'                => 'sale',
                'currency'              => 'BDT',
                'amount'                => (string) $payAmount,
                'payerReference'        => (string) ($order->customer_contact ?: $order->tracking_number),
                'merchantInvoiceNumber' => (string) $order->tracking_number,
                // Same origin the owner already configured for bKash, but our own path.
                // config('bkash.callbackURL') points at the package's demo controller, which
                // knows nothing about orders and would leave the payment captured but the order
                // unsettled — while APP_URL is still the old .tech host. So: take their host,
                // swap the path.
                'callbackURL'           => $this->bkashCallbackUrl(),
            ];
            $body = (array) BkashPaymentTokenize::cPayment(json_encode($payload));
        } catch (\Throwable $e) {
            throw new MarvelException('bKash create failed: ' . $e->getMessage());
        }

        $url = $body['bkashURL'] ?? null;
        if (!$url) {
            throw new MarvelException('bKash create failed: ' . Str::limit(json_encode($body), 200));
        }

        // Remember the paymentID: bKash hands it back on the callback with no order reference,
        // so this is the only way to find our way home. Also pin the amount we asked for, to
        // compare against what bKash says it actually captured.
        if (!empty($body['paymentID'])) {
            $ops['bkash'] = [
                'payment_id' => $body['paymentID'],
                'amount_bdt' => $payAmount,
                'created_at' => now()->toIso8601String(),
            ];
            $order->ops_meta = $ops;
            $order->saveQuietly();
        }
        return ['status' => 'success', 'bkash' => $body];
    }

    /**
     * Where bKash should send the buyer back after they authorise.
     *
     * Built from the host the owner already configured (`BKASH_CALLBACK_URL`, currently the
     * live .bd domain) with our own path swapped in — `APP_URL` is still the old .tech host,
     * and the configured path lands on the package's order-blind demo controller.
     * `BKASH_ORDER_CALLBACK_URL` overrides the whole thing if it's ever needed.
     */
    private function bkashCallbackUrl(): string
    {
        $override = (string) (env('BKASH_ORDER_CALLBACK_URL') ?: '');
        if ($override !== '') {
            return rtrim($override, '/');
        }
        $configured = (string) (config('bkash.callbackURL') ?: '');
        $origin = $configured !== ''
            ? preg_replace('#/bkash/callback/?$#', '', $configured)
            : rtrim((string) config('app.url'), '/');
        return rtrim($origin, '/') . '/bkash-callback';
    }

    /**
     * Is bKash usable, and in which environment?
     *
     * The live merchant account is configured through the **environment** (config/bkash.php →
     * BKASH_APP_KEY / BKASH_SANDBOX / …), which is what the installed
     * karim007/laravel-bkash-tokenize package authenticates with. The admin Settings panel has
     * its own older sandbox copy of these fields — reading that instead is how a production box
     * ended up pointed at the sandbox. The env wins; Settings is only a fallback for boxes that
     * never had the env set.
     *
     * @return array{live: bool}|null  null = don't offer bKash at all
     */
    private function bkashConfig(): ?array
    {
        $envKey = (string) (config('bkash.bkash_app_key') ?: '');
        if ($envKey !== '') {
            $live = !filter_var(config('bkash.sandbox'), FILTER_VALIDATE_BOOLEAN);
        } else {
            $cfg = ($this->options()['payments'] ?? [])['bkash'] ?? [];
            if (empty($cfg['enabled']) || empty($cfg['app_key'])) {
                return null;
            }
            $live = ($cfg['mode'] ?? 'sandbox') === 'live';
        }

        // Sandbox money is not money. On a production box a sandbox checkout would let a real
        // customer "pay" with fake credentials, and the callback would settle the order — free
        // books. Refuse it: bKash reads as unavailable and the buyer is sent to bank transfer.
        if (!$live && app()->environment('production')) {
            return null;
        }
        return ['live' => $live];
    }

    /**
     * Public: where bKash sends the customer back after they authorise the payment.
     *
     * Create alone captures nothing — tokenized checkout only moves money once /execute is
     * called with the paymentID. That step did not exist, so bKash could never actually be
     * turned on. This closes the loop: execute, verify what came back, then settle.
     *
     * A plain GET because bKash drives the browser here; it carries no auth, so the paymentID
     * is the only credential and every claim is re-checked against bKash itself.
     */
    public function bkashCallback(Request $request)
    {
        $shop = rtrim(config('shop.shop_url') ?? 'https://indobangla.tech', '/');
        $paymentId = (string) $request->query('paymentID', '');
        $status    = strtolower((string) $request->query('status', ''));

        $order = $paymentId
            ? Order::whereRaw("JSON_UNQUOTE(JSON_EXTRACT(ops_meta, '$.bkash.payment_id')) = ?", [$paymentId])->first()
            : null;
        if (!$order) {
            return redirect()->away($shop . '/?pay=unknown');
        }
        $ops = (array) ($order->ops_meta ?? []);
        $back = $shop . '/pay/' . ($ops['pay_token'] ?? '');

        // The customer backed out at bKash's screen — leave the order untouched.
        if ($status && $status !== 'success') {
            $ops['bkash']['last_status'] = $status;
            $order->ops_meta = $ops;
            $order->saveQuietly();
            return redirect()->away($back . '?pay=' . urlencode($status));
        }

        // Already settled (customer refreshed the callback, or bKash retried it).
        if (($ops['bkash']['executed'] ?? false) || $order->payment_status === 'payment-success') {
            return redirect()->away($back);
        }

        $cfg = $this->bkashConfig();
        if (!$cfg) {
            return redirect()->away($back . '?pay=unavailable');
        }

        try {
            // Same package that created the payment, so both ends use the same credentials and
            // environment. queryPayment is the package's own fallback for when execute comes back
            // empty (bKash occasionally does that on a retried callback) — without it we'd call a
            // captured payment "failed".
            $body = (array) BkashPaymentTokenize::executePayment($paymentId);
            if (!$body) {
                $body = (array) BkashPaymentTokenize::queryPayment($paymentId);
            }
        } catch (\Throwable $e) {
            // The customer's money may or may not have moved — never guess, in their favour
            // or ours. Park it for a human.
            $ops['bkash']['error'] = Str::limit($e->getMessage(), 200);
            $order->ops_meta = $ops;
            $order->saveQuietly();
            \Marvel\Helpers\AdminNotifier::send(
                "⚠️ <b>bKash execute ব্যর্থ</b> #{$order->tracking_number} — হাতে যাচাই করুন (paymentID: {$paymentId})"
            );
            return redirect()->away($back . '?pay=error');
        }

        // 'Completed' + statusCode 0000 is the only response that means the money is ours —
        // the same pair the package's own sample callback checks before calling it a success.
        $ok = ($body['statusCode'] ?? null) === '0000'
            && ($body['transactionStatus'] ?? null) === 'Completed'
            && !empty($body['trxID']);
        $ops['bkash'] = array_merge($ops['bkash'] ?? [], [
            'executed'    => true,
            'last_status' => $body['transactionStatus'] ?? 'unknown',
            'trx_id'      => $body['trxID'] ?? null,
            'executed_at' => now()->toIso8601String(),
        ]);
        if (!$ok) {
            $ops['bkash']['error'] = Str::limit(json_encode($body), 300);
            $order->ops_meta = $ops;
            $order->saveQuietly();
            return redirect()->away($back . '?pay=failed');
        }

        // Trust bKash's figure, not ours: if they captured a different amount, that is what
        // the customer actually paid.
        $paid = isset($body['amount']) ? (float) $body['amount'] : (float) ($ops['bkash']['amount_bdt'] ?? $order->total);
        $order->ops_meta = $ops;
        $order->saveQuietly();

        $this->settlePayment($order, 'bkash', $paid);
        return redirect()->away($back);
    }

    // ----------------------------------------------------- home real sections
    /** Deal of the day: the published in-stock book with the biggest discount. */
    public function dealOfTheDay(Request $request)
    {
        // Fetch the top discounted candidates and pick the first one that actually has a
        // cover image (the `image` column can hold JSON null / {} which is NOT SQL NULL,
        // so a whereNotNull filter alone lets image-less books slip through).
        $candidates = Product::query()
            ->where('status', 'publish')
            ->where('type_id', 8)
            ->whereNotNull('sale_price')
            ->where('sale_price', '>', 0)
            ->whereColumn('sale_price', '<', 'price')
            ->where('quantity', '>', 0)
            ->orderByRaw('(price - sale_price) / price DESC')
            ->limit(20)
            ->get(['id', 'name', 'slug', 'price', 'sale_price', 'quantity', 'image']);
        $p = $candidates->first(function ($x) {
            $img = is_array($x->image) ? ($x->image['original'] ?? null) : null;
            return !empty($img);
        });
        if (!$p) {
            return ['status' => 'success', 'deal' => null];
        }
        return [
            'status' => 'success',
            'deal'   => [
                'id' => $p->id, 'name' => $p->name, 'slug' => $p->slug,
                'price' => (float) $p->price, 'sale_price' => (float) $p->sale_price,
                'quantity' => (int) $p->quantity,
                // The home "Frequently bought together" bundle builds real cart items from
                // this payload — without a shop_id they'd fail at checkout.
                'shop_id' => $p->shop_id,
                'off' => (int) round((1 - $p->sale_price / $p->price) * 100),
                'image' => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'url' => '/products/' . $p->slug,
            ],
        ];
    }

    /** Popular books for the "frequently bought together" bundle (real products). */
    public function popularBooks(Request $request)
    {
        $limit = min((int) ($request->input('limit', 3)), 8);
        $items = Product::query()
            ->where('status', 'publish')
            ->where('type_id', 8)
            ->where('quantity', '>', 0)
            ->orderByDesc('sold_quantity')
            ->limit($limit * 4 + 8)
            ->get(['id', 'name', 'slug', 'price', 'sale_price', 'image'])
            ->filter(function ($p) {
                $img = is_array($p->image) ? ($p->image['original'] ?? null) : null;
                return !empty($img);
            })
            ->take($limit)
            ->values();
        $data = $items->map(fn ($p) => [
            'id' => $p->id, 'name' => $p->name, 'slug' => $p->slug,
            // shop_id + quantity: the home bundle builds real cart items from this payload,
            // and a cart item without a shop_id fails at checkout.
            'shop_id' => $p->shop_id, 'quantity' => (int) $p->quantity,
            'price' => (float) $p->price,
            'sale_price' => (float) ($p->sale_price ?: $p->price),
            'image' => is_array($p->image) ? ($p->image['original'] ?? null) : null,
            'url' => '/products/' . $p->slug,
        ]);
        return ['status' => 'success', 'products' => $data];
    }

    /**
     * Category-wise book rails for the home page: the top book categories, each with a
     * handful of in-stock books that actually have a cover image.
     */
    /**
     * Book categories with their in-stock counts — for the header mega-menu and genre grid.
     * homeCategories() also returns categories, but it loads a products page for each one; a
     * navigation menu only needs the names, so this stays a single counted query.
     */
    public function bookCategories(Request $request)
    {
        $limit = min(max((int) $request->input('limit', 24), 1), 60);

        $cats = \Marvel\Database\Models\Category::query()
            ->where('type_id', 8)
            ->withCount(['products' => fn ($q) => $q->where('status', 'publish')
                ->where('type_id', 8)->where('quantity', '>', 0)])
            ->orderByDesc('products_count')
            ->limit($limit)
            ->get(['id', 'name', 'slug']);

        return [
            'status'     => 'success',
            // Categories with nothing in stock are dropped: a menu entry that opens an empty
            // results page is worse than no entry.
            'categories' => $cats->filter(fn ($c) => $c->products_count > 0)->map(fn ($c) => [
                'id'    => $c->id,
                'name'  => $c->name,
                'slug'  => $c->slug,
                'count' => (int) $c->products_count,
            ])->values(),
        ];
    }

    public function homeCategories(Request $request)
    {
        $catLimit = min((int) ($request->input('categories', 5)), 8);
        $perCat   = min((int) ($request->input('per', 6)), 12);

        $cats = \Marvel\Database\Models\Category::query()
            ->where('type_id', 8)
            ->whereHas('products', fn ($q) => $q->where('status', 'publish')->where('quantity', '>', 0))
            ->withCount(['products' => fn ($q) => $q->where('status', 'publish')->where('type_id', 8)->where('quantity', '>', 0)])
            ->orderByDesc('products_count')
            ->limit($catLimit + 3)
            ->get(['id', 'name', 'slug']);

        $sections = [];
        foreach ($cats as $cat) {
            $products = Product::query()
                ->where('status', 'publish')
                ->where('type_id', 8)
                ->where('quantity', '>', 0)
                ->whereHas('categories', fn ($q) => $q->where('categories.id', $cat->id))
                ->orderByDesc('sold_quantity')
                ->limit($perCat * 3 + 6)
                ->get(['id', 'name', 'slug', 'price', 'sale_price', 'image'])
                ->filter(fn ($p) => is_array($p->image) && !empty($p->image['original']))
                ->take($perCat)
                ->values();
            if ($products->count() < 2) {
                continue;
            }
            $sections[] = [
                'category' => ['id' => $cat->id, 'name' => $cat->name, 'slug' => $cat->slug],
                'products' => $products->map(fn ($p) => [
                    'id' => $p->id, 'name' => $p->name, 'slug' => $p->slug,
                    'price' => (float) $p->price,
                    'sale_price' => (float) ($p->sale_price ?: $p->price),
                    'image' => $p->image['original'] ?? null,
                    'url' => '/products/' . $p->slug,
                ]),
            ];
            if (count($sections) >= $catLimit) {
                break;
            }
        }
        return ['status' => 'success', 'sections' => $sections];
    }

    /**
     * Public in-stock book listing for the storefront (home "All books", category pages).
     * Only quantity>0 books with a cover are returned (out-of-stock never shown up front).
     * `seed` gives a stable random order per page-load (so each reload feels fresh but
     * pagination stays consistent); `category` filters by category slug.
     */
    public function booksListing(Request $request)
    {
        $limit = min(max((int) $request->input('limit', 20), 1), 40);
        $page  = max(1, (int) $request->input('page', 1));
        $seed  = $request->input('seed');
        $text  = trim((string) $request->input('text', ''));

        $query = Product::query()
            ->where('status', 'publish')
            ->where('type_id', 8)
            ->whereNotNull('image')
            ->with(['type:id,slug,name,settings', 'author:id,name,slug']);

        // Out-of-stock books stay hidden on browse, but appear when the user searches.
        if ($text === '') {
            $query->where('quantity', '>', 0);
        }

        // "New arrivals" surfaces must be able to drop pre-orders: those books have a stock
        // number but are not actually on the shelf yet, so listing them as newly arrived
        // promises something the shop cannot ship today.
        if ($request->boolean('exclude_preorder')) {
            $query->where(fn ($q) => $q->whereNull('is_preorder')->orWhere('is_preorder', false));
        }

        if ($cat = $request->input('category')) {
            $query->whereHas('categories', fn ($c) => $c->where('categories.slug', $cat));
        }

        // ---- advanced-search filters (header panel). Each is optional and independent, so a
        // half-filled form narrows only by what was actually typed.
        if ($author = trim((string) $request->input('author', ''))) {
            $query->whereHas('author', fn ($a) => $a->where('name', 'like', '%' . $author . '%'));
        }
        if ($publisher = trim((string) $request->input('publisher', ''))) {
            $query->whereHas('manufacturer', fn ($m) => $m->where('name', 'like', '%' . $publisher . '%'));
        }
        // Compare against the price the customer actually pays: sale_price when there is one,
        // otherwise price. Filtering on `price` alone would drop discounted books out of a
        // budget range they genuinely fall inside.
        $effectivePrice = 'COALESCE(NULLIF(sale_price, 0), price)';
        if (($min = $request->input('min_price')) !== null && $min !== '') {
            $query->whereRaw("$effectivePrice >= ?", [(float) $min]);
        }
        if (($max = $request->input('max_price')) !== null && $max !== '') {
            $query->whereRaw("$effectivePrice <= ?", [(float) $max]);
        }
        // On a text search out-of-stock books are included by default (above); this lets the
        // advanced panel ask for in-stock only anyway.
        if ($request->boolean('in_stock')) {
            $query->where('quantity', '>', 0);
        }

        if ($text !== '') {
            // Smart search: whole-phrase match (name / bangla / slug / author / category)
            // PLUS per-word + phonetic (SOUNDEX) matching for typo/spelling tolerance,
            // across both Bangla and English fields.
            $like    = '%' . $text . '%';
            $tokens  = array_slice(preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [], 0, 6);
            $query->where(function ($q) use ($like, $tokens) {
                $q->where('name', 'like', $like)
                    ->orWhere('bangla_name', 'like', $like)
                    ->orWhere('slug', 'like', $like)
                    ->orWhereHas('author', fn ($a) => $a->where('name', 'like', $like))
                    ->orWhereHas('categories', fn ($c) =>
                        $c->where('categories.name', 'like', $like)->orWhere('categories.slug', 'like', $like));
                foreach ($tokens as $tok) {
                    $tl = '%' . $tok . '%';
                    $q->orWhere('name', 'like', $tl)
                        ->orWhere('bangla_name', 'like', $tl)
                        ->orWhere('slug', 'like', $tl)
                        ->orWhereHas('author', fn ($a) => $a->where('name', 'like', $tl));

                    // SOUNDEX only understands Latin letters. On Bangla it collapses almost
                    // every word to the same code, so searching "পাতালজাতক" dragged in every
                    // book starting with প. Keep the typo tolerance for English titles only.
                    $isAscii = strlen($tok) === mb_strlen($tok);
                    if ($isAscii && mb_strlen($tok) >= 3) {
                        $q->orWhereRaw('SOUNDEX(name) = SOUNDEX(?)', [$tok]);
                    }
                }
            });
        }
        if ($text !== '') {
            // Relevance-ish: exact-ish name match first, then in-stock, then newest.
            $query->orderByRaw('(name LIKE ?) DESC', ['%' . $text . '%'])
                ->orderByRaw('(quantity > 0) DESC')
                ->orderByDesc('created_at');
        } elseif ($seed !== null && $seed !== '') {
            $query->orderByRaw('RAND(?)', [(int) $seed]);
        } elseif ($request->boolean('random')) {
            $query->inRandomOrder();
        } else {
            $query->orderByDesc('created_at');
        }

        $p = $query->paginate($limit, ['*'], 'page', $page);

        // "Did you mean" suggestion when the query barely matched — find the
        // closest book/category by phonetic name so a misspelled title/slug
        // still points the reader to the right book.
        $suggestion = null;
        if ($text !== '' && $page === 1 && $p->total() <= 1) {
            $firstTok = $tokens[0] ?? $text;
            $near = Product::query()
                ->where('status', 'publish')->where('type_id', 8)->whereNotNull('image')
                ->where(function ($q) use ($firstTok) {
                    $q->whereRaw('SOUNDEX(name) = SOUNDEX(?)', [$firstTok])
                        ->orWhere('name', 'like', mb_substr($firstTok, 0, 3) . '%')
                        ->orWhere('slug', 'like', mb_substr($firstTok, 0, 3) . '%');
                })
                ->orderByDesc('sold_quantity')
                ->first(['name', 'slug']);
            if ($near) {
                $suggestion = ['name' => $near->name, 'slug' => $near->slug];
            }
        }

        return [
            'data'         => $p->items(),
            'current_page' => $p->currentPage(),
            'last_page'    => $p->lastPage(),
            'total'        => $p->total(),
            'suggestion'   => $suggestion,
        ];
    }

    /** Related in-stock books for the single product page: by author, by category, recommended. */
    public function relatedBooks(Request $request)
    {
        $pid = $request->input('product_id');
        $product = Product::with('categories:id')->find($pid);
        if (!$product) {
            return ['status' => 'success', 'by_author' => [], 'by_category' => [], 'recommended' => []];
        }
        $base = fn () => Product::query()
            ->where('status', 'publish')->where('type_id', 8)
            ->where('quantity', '>', 0)->whereNotNull('image')
            ->where('id', '!=', $pid)
            ->with(['type:id,slug,settings', 'author:id,name,slug']);

        $byAuthor = $product->author_id
            ? $base()->where('author_id', $product->author_id)->inRandomOrder()->limit(12)->get()
            : collect();

        $catIds = $product->categories->pluck('id');
        $byCategory = $catIds->isNotEmpty()
            ? $base()->whereHas('categories', fn ($c) => $c->whereIn('categories.id', $catIds))
                ->where(fn ($q) => $product->author_id ? $q->where('author_id', '!=', $product->author_id)->orWhereNull('author_id') : $q)
                ->inRandomOrder()->limit(16)->get()
            : collect();

        $recommended = $base()->orderByDesc('sold_quantity')->limit(16)->get();

        return [
            'status'      => 'success',
            'by_author'   => $byAuthor->values(),
            'by_category' => $byCategory->values(),
            'recommended' => $recommended->values(),
        ];
    }

    /**
     * Ensure the bundle-tier coupons exist and return them (real coupons the
     * customer can apply at checkout). Buy-more-save-more pricing tiers.
     */
    public function bundleCoupons(Request $request)
    {
        $tiers = [
            ['code' => 'BOOK3', 'amount' => 15, 'label' => 'Pick 3 books'],
            ['code' => 'BOOK5', 'amount' => 25, 'label' => 'Pick 5 books'],
            ['code' => 'BOOK10', 'amount' => 35, 'label' => 'Pick 10 books'],
        ];
        foreach ($tiers as $t) {
            \Marvel\Database\Models\Coupon::firstOrCreate(
                ['code' => $t['code']],
                [
                    'language'    => DEFAULT_LANGUAGE ?? 'en',
                    'description' => $t['label'] . ' and save ' . $t['amount'] . '%',
                    'type'        => 'percentage',
                    'amount'      => $t['amount'],
                    'minimum_cart_amount' => 0,
                    'active_from' => now(),
                    'expire_at'   => now()->addYear(),
                    'is_approve'  => true,
                ]
            );
        }
        return ['status' => 'success', 'tiers' => $tiers];
    }

    /**
     * Reader's Club sign-up (real membership capture + welcome coupon).
     * Full monthly auto-billing would need recurring payment infra; this stores
     * the member and issues a real member coupon they can use immediately.
     */
    public function clubJoin(Request $request)
    {
        $data = $request->validate([
            'email'   => 'required|email',
            'contact' => 'nullable|string',
        ]);
        $settings = Settings::first();
        $options  = $settings->options;
        $members  = $options['club_members'] ?? [];
        $already  = collect($members)->firstWhere('email', $data['email']);
        if (!$already) {
            $members[] = [
                'email'   => $data['email'],
                'contact' => $data['contact'] ?? null,
                'joined'  => now()->toDateTimeString(),
            ];
            $options['club_members'] = $members;
            $settings->update(['options' => $options]);
        }
        // real member coupon
        \Marvel\Database\Models\Coupon::firstOrCreate(
            ['code' => 'READCLUB'],
            [
                'language'    => DEFAULT_LANGUAGE ?? 'en',
                'description' => "Reader's Club member — 20% off",
                'type'        => 'percentage',
                'amount'      => 20,
                'minimum_cart_amount' => 0,
                'active_from' => now(),
                'expire_at'   => now()->addYear(),
                'is_approve'  => true,
            ]
        );
        return [
            'status'  => 'success',
            'member'  => $data['email'],
            'coupon'  => 'READCLUB',
            'discount' => 20,
        ];
    }

    /**
     * #8 — Coupon analytics: real per-coupon redemption count, sales generated,
     * and discount given, aggregated from the orders table (coupon_id). The admin
     * UI computes profit/ROI/tier client-side from these real numbers.
     */
    public function couponAnalytics(Request $request)
    {
        $coupons = \Marvel\Database\Models\Coupon::query()
            // is_approve drives the on/off switch on /admin/coupons. `active` below is a
            // DATE window (not expired); a coupon can be inside its window and still be
            // switched off, so the two are reported separately.
            ->select('id', 'code', 'type', 'amount', 'active_from', 'expire_at', 'created_at', 'is_approve')
            ->orderByDesc('created_at')
            ->get();

        // Aggregate order figures grouped by coupon_id in a single query.
        $stats = Order::query()
            ->whereNotNull('coupon_id')
            ->selectRaw('coupon_id, COUNT(*) as uses, COALESCE(SUM(total),0) as sales, COALESCE(SUM(discount),0) as discount_given')
            ->groupBy('coupon_id')
            ->get()
            ->keyBy('coupon_id');

        $now = now();
        $rows = $coupons->map(function ($c) use ($stats, $now) {
            $s = $stats->get($c->id);
            $active = !$c->expire_at || \Carbon\Carbon::parse($c->expire_at)->greaterThanOrEqualTo($now);
            return [
                'id'             => (int) $c->id,
                'code'           => $c->code,
                'type'           => $c->type,
                'amount'         => (float) $c->amount,
                'active'         => (bool) $active,
                'is_approve'     => (bool) $c->is_approve,
                'expire_at'      => $c->expire_at ? (string) $c->expire_at : null,
                'uses'           => $s ? (int) $s->uses : 0,
                'sales'          => $s ? (float) $s->sales : 0,
                'discount_given' => $s ? (float) $s->discount_given : 0,
            ];
        })->values();

        return ['coupons' => $rows];
    }

    /**
     * Superadmin command-center summary — real aggregates from the live DB. Each
     * block is computed defensively so a single failing query never 500s the
     * whole dashboard; sections with no data source stay client-side sample.
     */
    public function dashboardSummary(Request $request)
    {
        $bn = ['জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
        $safe = function (callable $fn, $fallback) {
            try {
                return $fn();
            } catch (\Throwable $e) {
                return $fallback;
            }
        };

        // ---- today vs yesterday ----
        $today = $safe(function () {
            $t = Order::whereDate('created_at', now()->toDateString());
            $y = Order::whereDate('created_at', now()->subDay()->toDateString());
            return [
                'orders'          => (clone $t)->count(),
                'revenue'         => (float) (clone $t)->sum('total'),
                'yesterdayOrders' => (clone $y)->count(),
                'yesterdayRevenue' => (float) (clone $y)->sum('total'),
            ];
        }, null);

        // ---- new accounts (last 7 days) ----
        $newAccounts = $safe(fn () => \Marvel\Database\Models\User::where('created_at', '>=', now()->subDays(7))->count(), null);
        $newAccountsPrev = $safe(fn () => \Marvel\Database\Models\User::whereBetween('created_at', [now()->subDays(14), now()->subDays(7)])->count(), 0);

        // ---- last 7 months sales ----
        $sales = $safe(function () use ($bn) {
            $rows = [];
            for ($i = 6; $i >= 0; $i--) {
                $m = now()->subMonths($i);
                $q = Order::whereYear('created_at', $m->year)->whereMonth('created_at', $m->month);
                $rows[] = [
                    'm'      => $bn[$m->month - 1],
                    'sales'  => (float) (clone $q)->sum('total'),
                    'orders' => (clone $q)->count(),
                ];
            }
            return $rows;
        }, null);

        // ---- order status breakdown ----
        $status = $safe(function () {
            $counts = Order::selectRaw('order_status, COUNT(*) c')->groupBy('order_status')->pluck('c', 'order_status');
            $get = fn ($k) => (int) ($counts[$k] ?? 0);
            return [
                'completed'  => $get('order-completed') + $get('order-out-for-delivery') + $get('order-at-local-facility'),
                'processing' => $get('order-processing'),
                'pending'    => $get('order-pending'),
                'cancelled'  => $get('order-cancelled') + $get('order-failed'),
                'refunded'   => $get('order-refunded'),
            ];
        }, null);

        // ---- reviews / feedback ----
        $feedback = $safe(function () {
            $total = \Marvel\Database\Models\Review::count();
            if (!$total) {
                return null;
            }
            $avg = (float) \Marvel\Database\Models\Review::avg('rating');
            $pos = \Marvel\Database\Models\Review::where('rating', '>=', 4)->count();
            $neu = \Marvel\Database\Models\Review::where('rating', 3)->count();
            $neg = \Marvel\Database\Models\Review::where('rating', '<', 3)->count();
            return [
                'avgRating'    => round($avg, 1),
                'totalReviews' => $total,
                'positive'     => (int) round($pos / $total * 100),
                'neutral'      => (int) round($neu / $total * 100),
                'negative'     => (int) round($neg / $total * 100),
            ];
        }, null);

        // ---- top vendors (by order count) ----
        $topVendors = $safe(function () {
            return Shop::withCount(['orders', 'products'])
                ->orderByDesc('orders_count')
                ->limit(5)->get(['id', 'name'])
                ->map(fn ($s) => [
                    'name'   => $s->name,
                    'orders' => (int) $s->orders_count,
                    'products' => (int) $s->products_count,
                ])->values();
        }, null);

        // ---- category-wise book counts ----
        $categorySales = $safe(function () {
            return \Marvel\Database\Models\Category::where('type_id', 8)
                ->withCount(['products' => fn ($q) => $q->where('status', 'publish')])
                ->orderByDesc('products_count')
                ->limit(5)->get(['id', 'name'])
                ->map(fn ($c) => ['name' => $c->name, 'value' => (int) $c->products_count])
                ->values();
        }, null);

        // ---- issues (cancel / refund) ----
        $issues = $safe(function () use ($status) {
            $s = $status ?? [];
            return [
                'cancelled' => (int) ($s['cancelled'] ?? 0),
                'refunded'  => (int) ($s['refunded'] ?? 0),
            ];
        }, null);

        // ---- monthly cancel / refund flow (last 5 months) ----
        $issueFlow = $safe(function () use ($bn) {
            $rows = [];
            for ($i = 4; $i >= 0; $i--) {
                $m = now()->subMonths($i);
                $q = Order::whereYear('created_at', $m->year)->whereMonth('created_at', $m->month);
                $rows[] = [
                    'm'      => $bn[$m->month - 1],
                    'cancel' => (clone $q)->whereIn('order_status', ['order-cancelled', 'order-failed'])->count(),
                    'return' => (clone $q)->where('order_status', 'order-refunded')->count(),
                    'refund' => (clone $q)->where('order_status', 'order-refunded')->count(),
                ];
            }
            return $rows;
        }, null);

        // ---- vendor activity: products added this month vs last, top shops ----
        $vendorActivity = $safe(function () {
            $thisM = \Illuminate\Support\Facades\DB::table('products')
                ->select('shop_id', \Illuminate\Support\Facades\DB::raw('COUNT(*) c'))
                ->where('created_at', '>=', now()->startOfMonth())
                ->groupBy('shop_id')->pluck('c', 'shop_id');
            $lastM = \Illuminate\Support\Facades\DB::table('products')
                ->select('shop_id', \Illuminate\Support\Facades\DB::raw('COUNT(*) c'))
                ->whereBetween('created_at', [now()->subMonth()->startOfMonth(), now()->startOfMonth()])
                ->groupBy('shop_id')->pluck('c', 'shop_id');
            $shops = Shop::orderByDesc('id')->limit(60)->get(['id', 'name'])->keyBy('id');
            $ids = collect($thisM->keys())->merge($lastM->keys())->unique()->take(30);
            return $ids->map(function ($sid) use ($thisM, $lastM, $shops) {
                $now = (int) ($thisM[$sid] ?? 0);
                $prev = (int) ($lastM[$sid] ?? 0);
                $status = $now === 0 && $prev > 0 ? 'dormant' : ($now < $prev ? 'declining' : ($now > $prev ? 'growing' : 'steady'));
                return [
                    'name'   => optional($shops->get($sid))->name ?? ('Shop #' . $sid),
                    'now'    => $now,
                    'prev'   => $prev,
                    'status' => $status,
                ];
            })->sortBy(fn ($v) => $v['status'] === 'dormant' ? 0 : ($v['status'] === 'declining' ? 1 : 2))
                ->take(6)->values();
        }, null);

        // ---- alerts from real signals ----
        $alerts = $safe(function () use ($status) {
            $out = [];
            $pending = (int) ($status['pending'] ?? 0);
            if ($pending > 0) {
                $out[] = ['type' => $pending > 20 ? 'critical' : 'warning', 'title' => $pending . ' টি অর্ডার pending', 'detail' => 'প্রসেস করা বাকি — অর্ডার প্যানেল দেখুন।', 'tag' => 'Orders'];
            }
            $lowStock = Product::where('status', 'publish')->where('type_id', 8)->whereBetween('quantity', [1, 3])->count();
            if ($lowStock > 0) {
                $out[] = ['type' => 'warning', 'title' => $lowStock . ' টি বই কম স্টকে', 'detail' => 'স্টক ৩ বা তার কম — রিস্টক করুন।', 'tag' => 'Stock'];
            }
            $pendingResell = Product::where('is_resell', true)->whereRaw("JSON_EXTRACT(resell_meta, '$.status') = 'pending'")->count();
            if ($pendingResell > 0) {
                $out[] = ['type' => 'warning', 'title' => $pendingResell . ' টি রিসেল লিস্টিং অপেক্ষমাণ', 'detail' => 'অ্যাপ্রুভ করা বাকি — Book Resell দেখুন।', 'tag' => 'Resell'];
            }
            $pendingPayouts = User::where('reseller_meta->is_reseller', true)->get(['reseller_meta'])
                ->reduce(fn ($c, $u) => $c + collect(($u->reseller_meta['payouts'] ?? []))->where('status', 'requested')->count(), 0);
            if ($pendingPayouts > 0) {
                $out[] = ['type' => 'warning', 'title' => $pendingPayouts . ' টি payout রিকোয়েস্ট', 'detail' => 'রিসেলার bKash payout — Reseller Business দেখুন।', 'tag' => 'Payout'];
            }
            return $out;
        }, null);

        return [
            'today'          => $today,
            'newAccounts'    => $newAccounts,
            'newAccountsPrev' => $newAccountsPrev,
            'sales'          => $sales,
            'orderStatus'    => $status,
            'feedback'       => $feedback,
            'topVendors'     => $topVendors,
            'categorySales'  => $categorySales,
            'issues'         => $issues,
            'issueFlow'      => $issueFlow,
            'vendorActivity' => $vendorActivity,
            'alerts'         => $alerts,
            'generatedAt'    => now()->toDateTimeString(),
        ];
    }

    // ============================================================ BOOK RESELL (Mode A)
    private const RESELL_CONDITIONS = ['used', 'good', 'like_new', 'readable'];

    /**
     * The shop everything we create belongs to.
     *
     * This used to hard-code the slug `indobangla-store`. A database import replaced the
     * shops table and that slug stopped existing, which silently broke every feature that
     * creates products or orders. It is now a setting, and the fallback is "whichever shop
     * actually holds the catalogue" — so a future import cannot break it either.
     */
    public static function resolveMainShopId(): ?int
    {
        $options = optional(Settings::first())->options ?? [];
        $id = (int) ($options['main_shop_id'] ?? 0);
        if ($id > 0 && Shop::whereKey($id)->exists()) {
            return $id;
        }

        $shop = $this->mainShop();
        if ($shop) {
            return (int) $shop->id;
        }

        $busiest = DB::table('products')->whereNotNull('shop_id')
            ->groupBy('shop_id')->orderByRaw('COUNT(*) DESC')->value('shop_id');

        return $busiest ? (int) $busiest : optional(Shop::orderBy('id')->first())->id;
    }

    private function mainShopId(): ?int
    {
        return self::resolveMainShopId();
    }

    private function mainShop(): ?Shop
    {
        $id = $this->mainShopId();
        return $id ? Shop::find($id) : null;
    }

    /** #5 — tell ReplyGenie an (advance/full) payment landed so it can message the customer. */
    private function notifyReplygeniePayment($order, float $paid, string $type): void
    {
        try {
            $token = ($this->options()['replygenie'] ?? [])['token'] ?? '';
            if (!$token) {
                return;
            }
            Http::timeout(8)
                ->withHeaders(['X-Connect-Token' => $token])
                ->post('https://replygenie.cloud/api/webhook/website/payment', [
                    'order_id'        => (int) $order->id,
                    'tracking_number' => $order->tracking_number,
                    'paid_bdt'        => round($paid),
                    'payment_type'    => $type,
                    'status'          => 'APPROVED',
                ]);
        } catch (\Throwable $e) {
            // best-effort; a failed webhook must never block the customer's payment
        }
    }

    /**
     * #4 — ReplyGenie: create an (optionally pre-order) product from an Amazon
     * link + given fields, and return the new id/slug.
     */
    private function agentCreateProduct(Request $request)
    {
        $data = $request->validate([
            'title'       => 'required|string',
            'price_bdt'   => 'required|numeric|min:1',
            'quantity'    => 'nullable|integer|min:0',
            'stock'       => 'nullable|integer|min:0',
            'amazon_url'  => 'nullable|string',
            'image_url'   => 'nullable|string',
            'source'      => 'nullable|string',
            'weight_kg'   => 'nullable|numeric',
            'preorder'    => 'nullable|boolean',
            'sale_price'  => 'nullable|numeric',
            'image'       => 'nullable|string',
            'author'      => 'nullable|string',
            'description' => 'nullable|string',
        ]);
        $preorder = $request->boolean('preorder');
        // support both `image` and the spec's `image_url`
        $imageUrl = $data['image'] ?? ($data['image_url'] ?? null);

        // Idempotency: same Amazon link ⇒ return the existing product, don't duplicate.
        if (!empty($data['amazon_url'])) {
            $existing = Product::where('external_product_url', $data['amazon_url'])->first();
            if ($existing) {
                return [
                    'status'          => 'success',
                    'product_id'      => (int) $existing->id,
                    'slug'            => $existing->slug,
                    'already_existed' => true,
                    'preorder'        => (bool) preg_match('/প্রি-অর্ডার/u', (string) $existing->description),
                    'url'             => '/products/' . $existing->slug,
                ];
            }
        }

        $p = new Product();
        $p->name         = $data['title'];
        $p->type_id      = 8;
        $p->shop_id      = $this->mainShopId();
        $p->price        = (float) $data['price_bdt'];
        $p->sale_price   = !empty($data['sale_price']) ? (float) $data['sale_price'] : null;
        $p->min_price    = $p->sale_price ?: $p->price;
        $p->max_price    = $p->price;
        // Stock comes from the caller when it sends one (`quantity` or `stock`); only fall
        // back to a default when it doesn't, so an order can never exceed the real stock.
        $sentQty = $request->has('quantity') ? $request->input('quantity')
            : ($request->has('stock') ? $request->input('stock') : null);
        $p->quantity     = $sentQty !== null && $sentQty !== ''
            ? max(0, (int) $sentQty)
            : ($preorder ? 100 : 1);
        $p->in_stock     = 1;
        $p->status       = 'publish';
        $p->product_type = 'simple';
        $p->is_digital   = 0;
        $p->is_external   = 0;
        // Amazon link stashed on the (unused for internal) external URL field for reference.
        if (!empty($data['amazon_url'])) {
            $p->external_product_url = $data['amazon_url'];
        }
        $note = [];
        if ($preorder) {
            $note[] = '🔖 প্রি-অর্ডার — Amazon থেকে আনা হবে।';
        }
        if (!empty($data['weight_kg'])) {
            $note[] = 'ওজন: ' . $data['weight_kg'] . ' কেজি।';
        }
        $p->description = trim(($data['description'] ?? '') . "\n" . implode(' ', $note));
        if (!empty($imageUrl)) {
            $p->image = ['original' => $imageUrl, 'thumbnail' => $imageUrl];
        }
        $p->save();

        if (!empty($data['author'])) {
            $author = \Marvel\Database\Models\Author::firstOrCreate(
                ['name' => $data['author']],
                ['slug' => Str::slug($data['author']) . '-' . Str::random(4), 'language' => DEFAULT_LANGUAGE ?? 'en'],
            );
            $p->author_id = $author->id;
            $p->save();
        }

        return [
            'status'          => 'success',
            'product_id'      => (int) $p->id,
            'slug'            => $p->slug,
            'already_existed' => false,
            'preorder'        => $preorder,
            'url'             => '/products/' . $p->slug,
        ];
    }

    /** Customer: books this user has actually purchased (eligible to resell). */
    public function resellEligibleBooks(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $ids = \Illuminate\Support\Facades\DB::table('order_product')
            ->join('orders', 'orders.id', '=', 'order_product.order_id')
            ->where('orders.customer_id', $user->id)
            ->pluck('order_product.product_id')->unique()->values();
        $books = Product::whereIn('id', $ids)
            ->where('is_resell', false)
            ->get(['id', 'name', 'slug', 'price', 'sale_price', 'image', 'author_id'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => (float) $p->price,
                'image' => is_array($p->image) ? ($p->image['original'] ?? null) : null,
            ]);
        return ['data' => $books];
    }

    /** Customer: create a resell listing (a draft Product pending admin approval). */
    public function resellCreate(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $data = $request->validate([
            'original_id' => 'required|integer',
            'price'       => 'required|numeric|min:1',
            'condition'   => 'required|string',
            'images'      => 'required|array|min:1',
            'delivery_by' => 'nullable|string', // 'self' | 'indobangla'
            'note'        => 'nullable|string',
        ]);
        if (!in_array($data['condition'], self::RESELL_CONDITIONS, true)) {
            throw new MarvelException('Invalid condition.');
        }
        $original = Product::find($data['original_id']);
        if (!$original) {
            throw new MarvelException('Original book not found.');
        }
        // Price cannot exceed IndoBangla's price for this book.
        $cap = (float) ($original->sale_price ?: $original->price);
        if ((float) $data['price'] > $cap) {
            throw new MarvelException('Resell price cannot exceed ৳' . round($cap) . '.');
        }
        $first = $data['images'][0];
        $img = is_array($first) ? $first : ['original' => $first, 'thumbnail' => $first];

        $product = new Product();
        $product->name = $original->name . ' — Resold (' . ucfirst(str_replace('_', ' ', $data['condition'])) . ')';
        $product->type_id = $original->type_id ?: 8;
        $product->shop_id = $this->mainShopId();
        $product->author_id = $original->author_id;
        $product->price = (float) $data['price'];
        $product->sale_price = null;
        $product->min_price = (float) $data['price'];
        $product->max_price = (float) $data['price'];
        $product->quantity = 1;
        $product->in_stock = 1;
        $product->status = 'draft';           // hidden until admin approves
        $product->product_type = 'simple';
        $product->is_digital = 0;
        $product->description = $data['note'] ?? $original->description;
        $product->image = $img;
        $product->gallery = array_map(fn ($x) => is_array($x) ? $x : ['original' => $x, 'thumbnail' => $x], $data['images']);
        $product->is_resell = true;
        $product->resell_meta = [
            'seller_id'    => (int) $user->id,
            'seller_name'  => $user->name,
            'condition'    => $data['condition'],
            'status'       => 'pending',
            'original_id'  => (int) $original->id,
            'delivery_by'  => in_array($data['delivery_by'] ?? '', ['self', 'indobangla'], true) ? $data['delivery_by'] : 'self',
            'buyer_id'     => null,
            'buyer_name'   => null,
            'created_at'   => now()->toDateTimeString(),
        ];
        $product->save();

        return ['status' => 'success', 'id' => $product->id];
    }

    /** Customer: my resell listings + current wallet balance. */
    public function resellMyBooks(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $items = Product::where('is_resell', true)
            ->whereRaw("JSON_EXTRACT(resell_meta, '$.seller_id') = ?", [$user->id])
            ->orderByDesc('id')->get(['id', 'name', 'slug', 'price', 'image', 'status', 'resell_meta'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => (float) $p->price,
                'image' => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'status' => $p->resell_meta['status'] ?? 'pending',
                'condition' => $p->resell_meta['condition'] ?? null,
                'buyer_name' => $p->resell_meta['buyer_name'] ?? null,
                'delivery_by' => $p->resell_meta['delivery_by'] ?? 'self',
            ]);
        $wallet = Wallet::where('customer_id', $user->id)->first();
        $balance = $wallet ? $this->walletPointsToCurrency($wallet->available_points) : 0;
        return ['data' => $items, 'wallet_balance' => $balance, 'conditions' => self::RESELL_CONDITIONS];
    }

    /** Admin: list resell listings, optionally by status. */
    public function resellAdminList(Request $request)
    {
        $status = $request->input('status'); // pending | approved | sold | rejected
        $q = Product::where('is_resell', true)->orderByDesc('id');
        if ($status) {
            $q->whereRaw("JSON_EXTRACT(resell_meta, '$.status') = ?", [$status]);
        }
        $items = $q->get(['id', 'name', 'slug', 'price', 'image', 'gallery', 'status', 'resell_meta'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => (float) $p->price,
                'image' => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'gallery' => collect($p->gallery ?? [])->map(fn ($g) => is_array($g) ? ($g['original'] ?? null) : $g)->filter()->values(),
                'meta' => $p->resell_meta,
            ]);
        return ['data' => $items];
    }

    /** Admin: approve or reject a resell listing. */
    public function resellModerate(Request $request)
    {
        $data = $request->validate(['id' => 'required|integer', 'action' => 'required|string']);
        $product = Product::where('is_resell', true)->findOrFail($data['id']);
        $meta = $product->resell_meta ?? [];
        if ($data['action'] === 'approve') {
            $product->status = 'publish';
            $meta['status'] = 'approved';
        } elseif ($data['action'] === 'reject') {
            $product->status = 'draft';
            $meta['status'] = 'rejected';
        } else {
            throw new MarvelException('Invalid action.');
        }
        $product->resell_meta = $meta;
        $product->save();
        return ['status' => 'success', 'resell_status' => $meta['status']];
    }

    /**
     * Admin: mark a resell listing as sold — records the buyer, hides the listing,
     * and credits the seller's wallet with the sale price (usable on next orders).
     */
    public function resellMarkSold(Request $request)
    {
        $data = $request->validate([
            'id'         => 'required|integer',
            'buyer_name' => 'nullable|string',
            'buyer_id'   => 'nullable|integer',
        ]);
        $product = Product::where('is_resell', true)->findOrFail($data['id']);
        $meta = $product->resell_meta ?? [];
        if (($meta['status'] ?? null) === 'sold') {
            return ['status' => 'already_sold'];
        }
        $meta['status'] = 'sold';
        $meta['buyer_name'] = $data['buyer_name'] ?? ($meta['buyer_name'] ?? null);
        $meta['buyer_id'] = $data['buyer_id'] ?? ($meta['buyer_id'] ?? null);
        $meta['sold_at'] = now()->toDateTimeString();
        $product->resell_meta = $meta;
        $product->status = 'draft';   // remove from the storefront once sold
        $product->quantity = 0;
        $product->save();

        // Credit the seller's wallet balance with the sale price.
        $sellerId = (int) ($meta['seller_id'] ?? 0);
        $credited = 0;
        if ($sellerId) {
            $wallet = Wallet::firstOrCreate(['customer_id' => $sellerId]);
            $pts = $this->currencyToWalletPoints((float) $product->price);
            $wallet->total_points = ($wallet->total_points ?? 0) + $pts;
            $wallet->available_points = ($wallet->available_points ?? 0) + $pts;
            $wallet->save();
            $credited = (float) $product->price;
        }
        return ['status' => 'success', 'credited' => $credited];
    }

    // ============================================================ RESELLER BUSINESS (Mode B)
    private function resellerConfig(): array
    {
        $o = $this->options();
        $r = $o['reseller'] ?? [];
        return [
            'open_fee'       => (float) ($r['open_fee'] ?? 1000),
            'discount_pct'   => (float) ($r['discount_pct'] ?? 5),   // reseller cost = base * (1 - this%)
            'markup_cap_pct' => (float) ($r['markup_cap_pct'] ?? 5), // may raise price up to this% above base
            'hold_days'      => (int) ($r['hold_days'] ?? 7),
            // Smallest number of copies a reseller must commit to when listing a book. Config,
            // not a constant, so the desk can change it without a rebuild. Floor of 1 — a zero
            // would quietly turn the rule off and nobody would notice it had.
            'min_qty'        => max(1, (int) ($r['min_qty'] ?? 3)),
        ];
    }

    private function resellerMeta(User $user): array
    {
        $m = $user->reseller_meta ?? [];
        return array_merge([
            'is_reseller' => false,
            'opened_at'   => null,
            'available'   => 0,
            'pending'     => 0,
            'products'    => [],
            'ledger'      => [],
            'payouts'     => [],
        ], is_array($m) ? $m : []);
    }

    private function saveResellerMeta(User $user, array $meta): void
    {
        $user->reseller_meta = $meta;
        $user->save();
    }

    /** Customer: my reseller status + config. */
    public function resellerStatus(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        return ['config' => $this->resellerConfig(), 'meta' => $this->resellerMeta($user)];
    }

    /**
     * Customer: open a reseller account — hands back a pay link for the opening fee.
     *
     * This used to flip `is_reseller` on and merely log the fee as a debt, so accounts opened
     * without a taka being collected. The account now opens in settlePayment(), i.e. only once
     * bKash confirms or an admin approves a bank slip.
     */
    public function resellerOpen(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $meta = $this->resellerMeta($user);
        if ($meta['is_reseller']) {
            return ['status' => 'already_open', 'meta' => $meta];
        }
        return $this->resellerPayLink($user, (float) $this->resellerConfig()['open_fee'], 'fee');
    }

    /** Customer: load money onto the reseller balance — same pay screen as the fee. */
    public function resellerTopup(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        if (!$this->resellerMeta($user)['is_reseller']) {
            throw new MarvelException('Open a reseller account first.');
        }
        $data = $request->validate(['amount' => 'required|numeric|min:1|max:100000']);
        return $this->resellerPayLink($user, round((float) $data['amount']), 'topup');
    }

    /**
     * Build a /pay/{token} link for a reseller charge.
     *
     * Mirrors clubStart: a real Order carries the money, so the pay screen, the bKash callback
     * and the bank-slip review all work on it unchanged — no second payment path to keep in
     * sync. What the payment *does* on success is decided by the ops_meta marker.
     */
    private function resellerPayLink(User $user, float $amount, string $purpose): array
    {
        if ($amount <= 0) {
            throw new MarvelException('Invalid amount.');
        }
        $shop = $this->mainShop();
        $order = Order::create([
            'customer_id'      => $user->id,
            'customer_name'    => $user->name,
            'customer_contact' => $user->contact ?? '',
            'amount'           => $amount,
            'total'            => $amount,
            'paid_total'       => 0,
            'sales_tax'        => 0,
            'delivery_fee'     => 0,
            'discount'         => 0,
            'shop_id'          => $shop?->id,
            'language'         => DEFAULT_LANGUAGE ?? 'en',
            'order_status'     => 'order-pending',
            'payment_status'   => 'payment-pending',
            'payment_gateway'  => 'ONLINE',
        ]);
        $ops = [
            'reseller_user_id' => $user->id,
            'pay_token'        => 'pl_' . Str::random(24),
            'pay_amount'       => round($amount),
            'pay_purpose'      => 'full',
            ($purpose === 'fee' ? 'reseller_fee' : 'reseller_topup') => true,
        ];
        $order->ops_meta = $ops;
        $order->saveQuietly();
        $base = rtrim(config('shop.shop_url') ?? 'https://indobangla.tech', '/');
        return [
            'status'   => 'pay',
            'purpose'  => $purpose,
            'amount'   => $amount,
            'pay_link' => $base . '/pay/' . $ops['pay_token'],
        ];
    }

    /** Customer: add an IndoBangla product to my reseller shop at my price. */
    public function resellerAddProduct(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $data = $request->validate([
            'product_id' => 'required|integer',
            'my_price'   => 'required|numeric|min:1',
            'qty'        => 'nullable|integer|min:1',
        ]);
        $meta = $this->resellerMeta($user);
        if (!$meta['is_reseller']) {
            throw new MarvelException('Open a reseller account first.');
        }
        $product = Product::find($data['product_id']);
        if (!$product || $product->is_resell) {
            throw new MarvelException('Product not found.');
        }
        $cfg = $this->resellerConfig();

        // How many copies the reseller is taking on. Enforced here rather than only in the form,
        // because the form is not the only way to reach this endpoint.
        $min = (int) $cfg['min_qty'];
        $qty = (int) ($data['qty'] ?? $min);
        if ($qty < $min) {
            throw new MarvelException("যেকোনো বইয়ের অন্তত {$min} কপি নিতে হবে।");
        }
        // Promising copies the shop hasn't got is a promise to the customer we can't keep, so
        // check the shelf before accepting the listing.
        $inStock = (int) $product->quantity;
        if ($inStock < $qty) {
            throw new MarvelException("এই বইয়ের স্টকে আছে {$inStock} কপি — {$qty} কপি নেওয়া যাবে না।");
        }
        $base = (float) ($product->sale_price ?: $product->price);
        $cost = round($base * (1 - $cfg['discount_pct'] / 100), 2);
        $cap  = round($base * (1 + $cfg['markup_cap_pct'] / 100), 2);
        $my   = (float) $data['my_price'];
        if ($my < $base || $my > $cap) {
            throw new MarvelException('Your price must be between ৳' . round($base) . ' and ৳' . round($cap) . '.');
        }
        // upsert by product_id
        $meta['products'] = collect($meta['products'])->reject(fn ($p) => (int) $p['product_id'] === (int) $product->id)->values()->all();
        $meta['products'][] = [
            'product_id' => (int) $product->id,
            'name'       => $product->name,
            'image'      => is_array($product->image) ? ($product->image['original'] ?? null) : null,
            'slug'       => $product->slug,
            'base_price' => $base,
            'cost'       => $cost,
            'my_price'   => $my,
            'margin'     => round($my - $cost, 2),
            'qty'        => $qty,
            'sold_count' => 0,
            'added_at'   => now()->toDateTimeString(),
        ];
        $this->saveResellerMeta($user, $meta);
        return ['status' => 'success', 'meta' => $meta];
    }

    public function resellerRemoveProduct(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $data = $request->validate(['product_id' => 'required|integer']);
        $meta = $this->resellerMeta($user);
        $meta['products'] = collect($meta['products'])->reject(fn ($p) => (int) $p['product_id'] === (int) $data['product_id'])->values()->all();
        $this->saveResellerMeta($user, $meta);
        return ['status' => 'success', 'meta' => $meta];
    }

    /** Customer: request a bKash payout from available balance. */
    public function resellerRequestPayout(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('Please log in.');
        }
        $data = $request->validate(['amount' => 'required|numeric|min:1', 'bkash' => 'required|string']);
        $meta = $this->resellerMeta($user);
        if (!$meta['is_reseller']) {
            throw new MarvelException('Not a reseller.');
        }
        if ((float) $data['amount'] > (float) $meta['available']) {
            throw new MarvelException('Requested amount exceeds available balance.');
        }
        $meta['available'] = round($meta['available'] - $data['amount'], 2);
        $meta['payouts'][] = [
            'amount' => (float) $data['amount'],
            'bkash'  => $data['bkash'],
            'status' => 'requested',
            'at'     => now()->toDateTimeString(),
        ];
        $meta['ledger'][] = ['type' => 'payout_request', 'amount' => -(float) $data['amount'], 'at' => now()->toDateTimeString(), 'note' => 'bKash payout requested'];
        $this->saveResellerMeta($user, $meta);
        return ['status' => 'success', 'meta' => $meta];
    }

    // ---- Admin (super-admin) ----
    public function resellerConfigAdmin(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'open_fee'       => 'nullable|numeric',
                'discount_pct'   => 'nullable|numeric',
                'markup_cap_pct' => 'nullable|numeric',
                'hold_days'      => 'nullable|integer',
                'min_qty'        => 'nullable|integer|min:1',
            ]);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['reseller'] = [
                'open_fee'       => (float) ($data['open_fee'] ?? 1000),
                'discount_pct'   => (float) ($data['discount_pct'] ?? 5),
                'markup_cap_pct' => (float) ($data['markup_cap_pct'] ?? 5),
                'hold_days'      => (int) ($data['hold_days'] ?? 7),
                'min_qty'        => max(1, (int) ($data['min_qty'] ?? 3)),
            ];
            $settings->update(['options' => $options]);
        }
        return $this->resellerConfig();
    }

    public function resellerAdminList(Request $request)
    {
        $users = User::whereNotNull('reseller_meta')
            ->where('reseller_meta->is_reseller', true)
            ->get(['id', 'name', 'email', 'reseller_meta']);
        $rows = $users->map(function ($u) {
            $m = $this->resellerMeta($u);
            return [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email,
                'available' => (float) $m['available'], 'pending' => (float) $m['pending'],
                'products' => collect($m['products'])->map(fn ($p) => [
                    'product_id' => $p['product_id'], 'name' => $p['name'],
                    'my_price' => $p['my_price'], 'cost' => $p['cost'], 'margin' => $p['margin'], 'sold_count' => $p['sold_count'] ?? 0,
                ])->values(),
                'payouts' => collect($m['payouts'])->map(fn ($p, $i) => array_merge($p, ['index' => $i]))->values(),
                'opened_at' => $m['opened_at'],
            ];
        });
        return ['data' => $rows];
    }

    /** Admin: record a reseller sale — credits the reseller's margin into pending (held). */
    public function resellerRecordSale(Request $request)
    {
        $data = $request->validate(['reseller_id' => 'required|integer', 'product_id' => 'required|integer', 'qty' => 'nullable|integer']);
        $user = User::findOrFail($data['reseller_id']);
        $meta = $this->resellerMeta($user);
        $qty = max(1, (int) ($data['qty'] ?? 1));
        $found = false;
        $meta['products'] = collect($meta['products'])->map(function ($p) use ($data, $qty, &$found, &$meta) {
            if ((int) $p['product_id'] === (int) $data['product_id']) {
                $found = true;
                $p['sold_count'] = ($p['sold_count'] ?? 0) + $qty;
                $credit = round(($p['margin'] ?? 0) * $qty, 2);
                $meta['pending'] = round(($meta['pending'] ?? 0) + $credit, 2);
                $meta['ledger'][] = ['type' => 'sale', 'amount' => $credit, 'at' => now()->toDateTimeString(), 'note' => $qty . '× ' . $p['name'] . ' sold (held)', 'product_id' => $p['product_id']];
            }
            return $p;
        })->all();
        if (!$found) {
            throw new MarvelException('Product not in this reseller\'s shop.');
        }
        $this->saveResellerMeta($user, $meta);
        return ['status' => 'success'];
    }

    /** Admin: release held earnings to available (after the hold period / delivery). */
    public function resellerRelease(Request $request)
    {
        $data = $request->validate(['reseller_id' => 'required|integer', 'amount' => 'nullable|numeric']);
        $user = User::findOrFail($data['reseller_id']);
        $meta = $this->resellerMeta($user);
        $amount = isset($data['amount']) ? min((float) $data['amount'], (float) $meta['pending']) : (float) $meta['pending'];
        if ($amount <= 0) {
            return ['status' => 'nothing_to_release'];
        }
        $meta['pending'] = round($meta['pending'] - $amount, 2);
        $meta['available'] = round($meta['available'] + $amount, 2);
        $meta['ledger'][] = ['type' => 'release', 'amount' => $amount, 'at' => now()->toDateTimeString(), 'note' => 'Held earnings released to available'];
        $this->saveResellerMeta($user, $meta);
        return ['status' => 'success', 'released' => $amount];
    }

    /** Admin: all payout requests across resellers. */
    public function resellerPayouts(Request $request)
    {
        $users = User::where('reseller_meta->is_reseller', true)->get(['id', 'name', 'reseller_meta']);
        $rows = [];
        foreach ($users as $u) {
            $m = $this->resellerMeta($u);
            foreach ($m['payouts'] as $i => $p) {
                $rows[] = array_merge($p, ['reseller_id' => $u->id, 'reseller_name' => $u->name, 'index' => $i]);
            }
        }
        return ['data' => $rows];
    }

    /** Admin: approve (mark paid) or reject a payout request. */
    public function resellerPayoutAction(Request $request)
    {
        $data = $request->validate(['reseller_id' => 'required|integer', 'index' => 'required|integer', 'action' => 'required|string']);
        $user = User::findOrFail($data['reseller_id']);
        $meta = $this->resellerMeta($user);
        if (!isset($meta['payouts'][$data['index']])) {
            throw new MarvelException('Payout request not found.');
        }
        $payout = $meta['payouts'][$data['index']];
        if ($payout['status'] !== 'requested') {
            return ['status' => 'already_processed'];
        }
        if ($data['action'] === 'approve') {
            $meta['payouts'][$data['index']]['status'] = 'paid';
            $meta['payouts'][$data['index']]['paid_at'] = now()->toDateTimeString();
            $meta['ledger'][] = ['type' => 'payout_paid', 'amount' => 0, 'at' => now()->toDateTimeString(), 'note' => 'bKash payout ৳' . $payout['amount'] . ' paid to ' . $payout['bkash']];
        } elseif ($data['action'] === 'reject') {
            $meta['payouts'][$data['index']]['status'] = 'rejected';
            $meta['available'] = round($meta['available'] + $payout['amount'], 2); // refund to balance
            $meta['ledger'][] = ['type' => 'payout_rejected', 'amount' => $payout['amount'], 'at' => now()->toDateTimeString(), 'note' => 'Payout rejected — refunded to balance'];
        } else {
            throw new MarvelException('Invalid action.');
        }
        $this->saveResellerMeta($user, $meta);
        return ['status' => 'success'];
    }

    // ============================================================ ROTATING HERO BANNERS (#1)
    private function defaultBanners(): array
    {
        return [
            ['style' => 'parchment', 'badge' => 'IndoBangla গ্যালারি', 'headline' => 'ইতিহাস ও প্রবন্ধ', 'subtext' => 'জানার আনন্দ, শেখার গভীরতা — সেরা লেখকদের বই, ১০০% অরিজিনাল প্রিন্টে।', 'cta_text' => 'দেখুন', 'cta_link' => '/books/search?category=history', 'category' => 'history'],
            ['style' => 'cloth', 'badge' => 'IndoBangla গ্যালারি', 'headline' => 'সাহিত্য ও কথাসাহিত্য', 'subtext' => 'গল্প-উপন্যাসের জগতে ডুব দিন — কালজয়ী সব লেখকের বই।', 'cta_text' => 'দেখুন', 'cta_link' => '/books/search?category=fiction', 'category' => 'fiction'],
            ['style' => 'kraft', 'badge' => 'IndoBangla গ্যালারি', 'headline' => 'রহস্য, থ্রিলার ও রোমাঞ্চ', 'subtext' => 'প্রতিটি পাতায় টান টান উত্তেজনা — সেরা থ্রিলার সংগ্রহ।', 'cta_text' => 'দেখুন', 'cta_link' => '/books/search?category=thriller', 'category' => 'thriller'],
            ['style' => 'library', 'badge' => 'IndoBangla ক্যাটালগ', 'headline' => 'বাংলা বইয়ের সংগ্রহ', 'subtext' => 'কলকাতা ও বাংলাদেশের সেরা বই — এক ঠিকানায়।', 'cta_text' => 'দেখুন', 'cta_link' => '/books/search?category=bengali-books', 'category' => 'bengali-books'],
        ];
    }

    private function normalizeBanners($raw): array
    {
        $styles = ['parchment', 'cloth', 'kraft', 'library'];
        $out = [];
        foreach ((array) $raw as $b) {
            if (!is_array($b) || empty($b['headline'])) {
                continue;
            }
            $out[] = [
                'style'    => in_array($b['style'] ?? '', $styles, true) ? $b['style'] : 'parchment',
                'badge'    => (string) ($b['badge'] ?? 'IndoBangla গ্যালারি'),
                'headline' => (string) $b['headline'],
                'subtext'  => (string) ($b['subtext'] ?? ''),
                'cta_text' => (string) ($b['cta_text'] ?? 'দেখুন'),
                'cta_link' => (string) ($b['cta_link'] ?? '/books/search'),
                'category' => (string) ($b['category'] ?? ''),
            ];
        }
        return $out;
    }

    /** Public: storefront reads the rotating hero banners. */
    public function rotatingBanners(Request $request)
    {
        $opts = $this->options();
        $banners = $this->normalizeBanners($opts['rotating_banners'] ?? null);
        return ['banners' => $banners ?: $this->defaultBanners()];
    }

    /** Admin: read/update the rotating banners (super-admin). */
    public function rotatingBannersSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate(['banners' => 'nullable|array']);
            $banners = $this->normalizeBanners($data['banners'] ?? []);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['rotating_banners'] = $banners;
            $settings->update(['options' => $options]);
        }
        $opts = $this->options();
        $banners = $this->normalizeBanners($opts['rotating_banners'] ?? null);
        return ['banners' => $banners ?: $this->defaultBanners()];
    }

    // ============================================================ PURCHASED-BEFORE (#1)
    /** Customer: has this user bought this product before? (latest order + date) */
    public function purchaseCheck(Request $request)
    {
        $user = $request->user();
        $pid = (int) $request->input('product_id');
        if (!$user || !$pid) {
            return ['purchased' => false];
        }
        $row = \Illuminate\Support\Facades\DB::table('order_product')
            ->join('orders', 'orders.id', '=', 'order_product.order_id')
            ->where('orders.customer_id', $user->id)
            ->where('order_product.product_id', $pid)
            ->orderByDesc('orders.created_at')
            ->select('orders.id', 'orders.tracking_number', 'orders.created_at')
            ->first();
        if (!$row) {
            return ['purchased' => false];
        }
        return [
            'purchased'        => true,
            'order_id'         => (int) $row->id,
            'tracking_number'  => $row->tracking_number,
            'date'             => $row->created_at,
        ];
    }

    // ============================================================ SAVED BOOKS / PRICE (#7)
    /**
     * Admin: books saved to wishlists, aggregated with who saved them + price.
     *
     * Supports a free-text search (book / author / publisher / saver), author and
     * publisher filters, a saved-at date window, sorting and pagination.
     */
    public function wishlistInsights(Request $request)
    {
        $search        = trim((string) $request->input('search', ''));
        $authorId      = (int) $request->input('author_id', 0);
        $publisherId   = (int) $request->input('manufacturer_id', 0);
        $from          = trim((string) $request->input('from', ''));
        $to            = trim((string) $request->input('to', ''));
        $sort          = (string) $request->input('sort', 'saved');
        $page          = max(1, (int) $request->input('page', 1));
        $limit         = min(60, max(1, (int) $request->input('limit', 20)));

        // The date window narrows both which books show up and how many saves we count
        // for them, so "most saved this month" means what it says.
        $window  = '';
        $windowBindings = [];
        if ($from !== '') {
            $window .= ' AND w.created_at >= ?';
            $windowBindings[] = $from . ' 00:00:00';
        }
        if ($to !== '') {
            $window .= ' AND w.created_at <= ?';
            $windowBindings[] = $to . ' 23:59:59';
        }

        $countSql = "COALESCE((SELECT COUNT(*) FROM wishlists w WHERE w.product_id = products.id{$window}), 0)";
        $lastSql  = "(SELECT MAX(w.created_at) FROM wishlists w WHERE w.product_id = products.id{$window})";

        $query = Product::query()
            ->with(['author:id,name', 'manufacturer:id,name'])
            ->select('products.*')
            ->selectRaw("{$countSql} AS wishlist_count", $windowBindings)
            ->selectRaw("{$lastSql} AS last_saved_at", $windowBindings)
            // Only books that actually sit in someone's wishlist (inside the window).
            ->whereRaw("EXISTS (SELECT 1 FROM wishlists w WHERE w.product_id = products.id{$window})", $windowBindings);

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($w) use ($like) {
                $w->where('products.name', 'like', $like)
                    ->orWhere('products.bangla_name', 'like', $like)
                    ->orWhere('products.slug', 'like', $like)
                    ->orWhereHas('author', fn ($a) => $a->where('name', 'like', $like))
                    ->orWhereHas('manufacturer', fn ($m) => $m->where('name', 'like', $like))
                    // …or the name/email of whoever saved it.
                    ->orWhereRaw(
                        'EXISTS (SELECT 1 FROM wishlists w JOIN users u ON u.id = w.user_id
                                 WHERE w.product_id = products.id AND (u.name LIKE ? OR u.email LIKE ?))',
                        [$like, $like]
                    );
            });
        }
        if ($authorId > 0) {
            $query->where('products.author_id', $authorId);
        }
        if ($publisherId > 0) {
            $query->where('products.manufacturer_id', $publisherId);
        }

        switch ($sort) {
            case 'recent':     $query->orderByDesc('last_saved_at'); break;
            case 'oldest':     $query->orderBy('last_saved_at'); break;
            case 'price_high': $query->orderByDesc('products.price'); break;
            case 'price_low':  $query->orderBy('products.price'); break;
            case 'name':       $query->orderBy('products.name'); break;
            default:           $query->orderByDesc('wishlist_count')->orderByDesc('last_saved_at');
        }

        $paginator = $query->paginate($limit, ['*'], 'page', $page);

        // Who saved each book on this page — one query, not one per row.
        $savers = \Illuminate\Support\Facades\DB::table('wishlists')
            ->join('users', 'users.id', '=', 'wishlists.user_id')
            ->whereIn('wishlists.product_id', collect($paginator->items())->pluck('id'))
            ->orderByDesc('wishlists.created_at')
            ->get(['wishlists.product_id', 'wishlists.created_at', 'users.name', 'users.email'])
            ->groupBy('product_id');

        $data = collect($paginator->items())->map(function ($p) use ($savers) {
            $rows = $savers->get($p->id, collect());
            return [
                'product_id'    => (int) $p->id,
                'name'          => $p->name,
                'slug'          => $p->slug,
                'price'         => (float) $p->price,
                'sale_price'    => (float) ($p->sale_price ?: 0),
                'image'         => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'author'        => $p->author->name ?? null,
                'publisher'     => $p->manufacturer->name ?? null,
                'count'         => (int) $p->wishlist_count,
                'last_saved_at' => $p->last_saved_at,
                'users'         => $rows->take(25)->pluck('name')->values(),
                'savers'        => $rows->take(25)->map(fn ($r) => [
                    'name'  => $r->name,
                    'email' => $r->email,
                    'date'  => $r->created_at,
                ])->values(),
            ];
        })->values();

        return [
            'data'         => $data,
            'total'        => $paginator->total(),
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            // Dropdown options, limited to authors/publishers that actually have saved books.
            'authors'      => $this->wishlistFacets('author_id', 'authors'),
            'publishers'   => $this->wishlistFacets('manufacturer_id', 'manufacturers'),
        ];
    }

    /** Distinct authors / publishers among books that are in at least one wishlist. */
    protected function wishlistFacets(string $column, string $table)
    {
        return \Illuminate\Support\Facades\DB::table($table)
            ->whereIn('id', function ($q) use ($column) {
                $q->select("products.{$column}")->from('products')
                    ->whereNotNull("products.{$column}")
                    ->whereRaw('EXISTS (SELECT 1 FROM wishlists w WHERE w.product_id = products.id)');
            })
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    /** Admin: quick-edit a product's price (keeps min/max in sync). */
    public function productQuickPrice(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'price'      => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric',
        ]);
        $p = Product::findOrFail($data['product_id']);
        $p->price = (float) $data['price'];
        $p->sale_price = !empty($data['sale_price']) ? (float) $data['sale_price'] : null;
        $p->min_price = $p->sale_price ?: $p->price;
        $p->max_price = $p->price;
        $p->save();
        return ['status' => 'success', 'price' => (float) $p->price, 'sale_price' => (float) ($p->sale_price ?: 0)];
    }

    // ============================================================ PRE-HOME PAGE (#8)
    /** Public: whether the pre-home intro page is active. */
    public function prehome(Request $request)
    {
        $o = $this->options();
        return ['enabled' => (bool) ($o['prehome_enabled'] ?? false)];
    }

    /** Admin: toggle the pre-home intro page (super-admin). */
    public function prehomeSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate(['enabled' => 'nullable|boolean']);
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['prehome_enabled'] = (bool) ($data['enabled'] ?? false);
            $settings->update(['options' => $options]);
        }
        $o = $this->options();
        return ['enabled' => (bool) ($o['prehome_enabled'] ?? false)];
    }

    // ============================================================ VENDORS REPORT (#6)
    /** Admin: per-vendor revenue, sells, this/last month, status — real data. */
    public function vendorReport(Request $request)
    {
        $now = now();
        $agg = Order::selectRaw('shop_id, COUNT(*) as sells, COALESCE(SUM(total),0) as revenue')
            ->whereNotNull('shop_id')->groupBy('shop_id')->get()->keyBy('shop_id');
        $thisM = Order::selectRaw('shop_id, COALESCE(SUM(total),0) as t')
            ->where('created_at', '>=', $now->copy()->startOfMonth())->whereNotNull('shop_id')
            ->groupBy('shop_id')->pluck('t', 'shop_id');
        $lastM = Order::selectRaw('shop_id, COALESCE(SUM(total),0) as t')
            ->whereBetween('created_at', [$now->copy()->subMonth()->startOfMonth(), $now->copy()->startOfMonth()])
            ->whereNotNull('shop_id')->groupBy('shop_id')->pluck('t', 'shop_id');

        $data = Shop::withCount('products')->get(['id', 'name', 'slug', 'is_active'])
            ->map(function ($s) use ($agg, $thisM, $lastM) {
                $a = $agg->get($s->id);
                return [
                    'id'         => (int) $s->id,
                    'name'       => $s->name,
                    'slug'       => $s->slug,
                    'status'     => $s->is_active ? 'Active' : 'Inactive',
                    'products'   => (int) $s->products_count,
                    'totalSells' => $a ? (int) $a->sells : 0,
                    'revenue'    => $a ? (float) $a->revenue : 0,
                    'thisMonth'  => (float) ($thisM[$s->id] ?? 0),
                    'lastMonth'  => (float) ($lastM[$s->id] ?? 0),
                    'suspicious' => (bool) preg_match('/[<>]|payload|xss|hacker|@.*\./i', (string) $s->name),
                ];
            })
            ->sortByDesc('revenue')->values();
        return ['data' => $data];
    }

    // ============================================================ CONVERSION-RATE PRICING (#7)
    private function conversionConfig(): array
    {
        $c = $this->options()['conversion'] ?? [];
        return [
            'rate'      => (float) ($c['rate'] ?? 2),        // Indian default multiplier
            'bd_rate'   => (float) ($c['bd_rate'] ?? 1),     // Bangladeshi default
            'sale_rate' => (float) ($c['sale_rate'] ?? 0),   // 0 = no auto sale price
            'overrides' => array_values(array_filter((array) ($c['overrides'] ?? []), 'is_array')),
            'schedule'  => is_array($c['schedule'] ?? null) ? $c['schedule'] : null,
            'tiers'     => (array) ($c['tiers'] ?? []),   // silver|gold|premium => rate
        ];
    }

    // ---------------------------------------------------------- MEMBERSHIP CARDS
    /** A tier rate against the normal rate is just a percentage off. */
    private function memberPercent(?string $tier, array $cfg): int
    {
        $rate = (float) ($cfg['tiers'][$tier] ?? 0);
        $normal = $cfg['rate'] > 0 ? $cfg['rate'] : 2;
        if (!$tier || $rate <= 0 || $rate >= $normal) {
            return 0;
        }
        return (int) round((1 - ($rate / $normal)) * 100);
    }

    /**
     * The member's 8-digit card number *is* their coupon code, so the tier discount
     * flows through the normal checkout coupon box with no separate pricing path.
     * No tier (or a tier rate that isn't a discount) → the card's coupon is removed.
     */
    private function syncMemberCoupon($user, ?array $cfg = null): int
    {
        $no = (string) ($user->membership_no ?? '');
        if ($no === '') {
            return 0;
        }

        // Prefer a Reader's-Club tier (direct discount %); fall back to a legacy
        // conversion-rate tier (silver/gold/premium) so old members keep working.
        $tier    = $this->clubTier($user->membership_tier);
        $percent = $tier ? (int) $tier['discount_pct'] : 0;
        if (!$tier && $user->membership_tier) {
            $percent = $this->memberPercent($user->membership_tier, $cfg ?? $this->conversionConfig());
        }

        // The card only discounts while it is active, not expired, and not cancelled/banned.
        $status  = $user->membership_status ?: 'active';   // legacy members (null) are active
        $expired = $user->membership_expires_at && $user->membership_expires_at->isPast();
        $active  = $user->membership_tier && $status === 'active' && !$expired;

        $coupon = Coupon::withTrashed()->where('code', $no)->first();
        if (!$active || $percent <= 0) {
            $coupon?->forceDelete();   // cancelled/banned/expired card → coupon disabled everywhere
            return 0;
        }
        $coupon = $coupon ?: new Coupon(['code' => $no]);
        $coupon->fill([
            'code'        => $no,
            'type'        => CouponType::PERCENTAGE_COUPON,
            'amount'      => $percent,
            'description' => ($tier['name'] ?? ucfirst((string) $user->membership_tier)) . ' membership card',
            'language'    => 'en',
            'is_approve'  => true,
            'target'      => true,          // logged-in customers only
            'user_id'     => $user->id,     // and only *this* member — enforced on verify + order
            'active_from' => $user->membership_activated_at ?? now(),
            'expire_at'   => $user->membership_expires_at ?? now()->addYears(5),
        ]);
        $coupon->deleted_at = null;
        $coupon->save();
        return $percent;
    }

    /** Admin: read/save the membership tier rates (and re-sync every member's card coupon). */
    public function membershipTiers(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate(['tiers' => 'required|array']);
            $tiers = [];
            foreach ($data['tiers'] as $k => $v) {
                $k = strtolower((string) $k);
                if (in_array($k, ['silver', 'gold', 'premium'], true) && (float) $v > 0) {
                    $tiers[$k] = (float) $v;
                }
            }
            $settings = Settings::first();
            $options = $settings->options ?? [];
            $options['conversion'] = array_merge((array) ($options['conversion'] ?? []), ['tiers' => $tiers]);
            $settings->options = $options;
            $settings->save();

            $cfg = $this->conversionConfig();
            $synced = 0;
            User::whereNotNull('membership_tier')->chunkById(300, function ($users) use ($cfg, &$synced) {
                foreach ($users as $u) {
                    $this->syncMemberCoupon($u, $cfg);
                    $synced++;
                }
            });
            return ['status' => 'success', 'tiers' => $tiers, 'synced' => $synced];
        }

        $cfg = $this->conversionConfig();
        $counts = User::whereNotNull('membership_tier')
            ->selectRaw('membership_tier, count(*) as c')->groupBy('membership_tier')
            ->pluck('c', 'membership_tier');
        return [
            'rate'    => $cfg['rate'],
            'tiers'   => $cfg['tiers'],
            'percent' => collect(['silver', 'gold', 'premium'])
                ->mapWithKeys(fn ($t) => [$t => $this->memberPercent($t, $cfg)]),
            'members' => $counts,
        ];
    }

    /** Admin: find customers by name / email / phone / card number. */
    public function membershipSearch(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return ['data' => []];
        }
        $users = User::where(fn ($w) => $w->where('name', 'like', "%{$q}%")
            ->orWhere('email', 'like', "%{$q}%")
            ->orWhere('mobile_number', 'like', "%{$q}%")
            ->orWhere('membership_no', 'like', "{$q}%"))
            ->limit(8)
            ->get(['id', 'name', 'email', 'membership_no', 'membership_tier', 'membership_status', 'membership_expires_at']);
        return ['data' => $users];
    }

    /** Admin: give a customer a tier (or clear it) — issues/activates the card coupon. */
    public function membershipAssign(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|integer',
            'tier'    => 'nullable|string',
        ]);
        $tierId = $data['tier'] ?: null;
        $tier   = $this->clubTier($tierId);
        // Accept a configured club tier id, or a legacy conversion tier (silver/gold/premium).
        if ($tierId && !$tier && !in_array($tierId, ['silver', 'gold', 'premium'], true)) {
            throw new MarvelException('Unknown membership tier.');
        }

        $user = User::findOrFail($data['user_id']);
        $user->membership_tier = $tierId;
        if ($tierId) {
            $years = $tier ? (int) $tier['validity_years'] : 1;
            $user->membership_status        = 'active';
            $user->membership_activated_at  = now();
            $user->membership_expires_at    = now()->addYears(max(1, $years));
        } else {
            $user->membership_status        = null;
            $user->membership_activated_at  = null;
            $user->membership_expires_at    = null;
        }
        $user->saveQuietly();

        $percent = $this->syncMemberCoupon($user);
        $tierName = $tier['name'] ?? ucfirst((string) $tierId);
        return [
            'status'        => 'success',
            'user_id'       => $user->id,
            'name'          => $user->name,
            'membership_no' => $user->membership_no,
            'tier'          => $user->membership_tier,
            'status_flag'   => $user->membership_status,
            'expires_at'    => optional($user->membership_expires_at)->toDateString(),
            'percent'       => $percent,
            'message'       => $tierId
                ? "{$user->name} এখন {$tierName} সদস্য — কার্ড {$user->membership_no} দিলে {$percent}% ছাড় (মেয়াদ " . optional($user->membership_expires_at)->format('d M Y') . ")।"
                : "{$user->name} এর মেম্বারশিপ সরানো হয়েছে।",
        ];
    }

    /**
     * Admin: cancel / ban / reactivate a member's card. A cancelled or banned card
     * immediately stops discounting (its bound coupon is removed); reactivating restores it.
     */
    public function membershipCardAction(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|integer',
            'action'  => 'required|string|in:cancel,ban,reactivate',
            'reason'  => 'nullable|string',
        ]);
        $user = User::findOrFail($data['user_id']);
        if (!$user->membership_tier) {
            throw new MarvelException('এই গ্রাহকের কোনো সক্রিয় মেম্বারশিপ নেই।');
        }

        switch ($data['action']) {
            case 'cancel':
                $user->membership_status = 'cancelled';
                break;
            case 'ban':
                $user->membership_status = 'banned';
                break;
            case 'reactivate':
                $user->membership_status = 'active';
                // If the validity had lapsed, restart the window from a configured tier.
                if (empty($user->membership_expires_at) || $user->membership_expires_at->isPast()) {
                    $tier = $this->clubTier($user->membership_tier);
                    $user->membership_activated_at = now();
                    $user->membership_expires_at   = now()->addYears($tier ? max(1, (int) $tier['validity_years']) : 1);
                }
                break;
        }
        $user->saveQuietly();
        $percent = $this->syncMemberCoupon($user);

        $labels = ['cancel' => 'বাতিল', 'ban' => 'ব্যান', 'reactivate' => 'পুনরায় চালু'];
        return [
            'status'            => 'success',
            'user_id'           => $user->id,
            'membership_status' => $user->membership_status,
            'percent'           => $percent,
            'message'           => "{$user->name} এর কার্ড {$user->membership_no} {$labels[$data['action']]} করা হয়েছে।",
        ];
    }

    /** Re-price every book that has an MRP, at the current config. Returns the count. */
    private function repriceAll(array $cfg): int
    {
        $n = 0;
        Product::where('type_id', 8)->whereNotNull('mrp')->where('mrp', '>', 0)->with('categories:id')
            ->chunkById(300, function ($books) use ($cfg, &$n) {
                foreach ($books as $p) {
                    $r = $this->resolveConversionRate($p, $cfg);
                    $price = $this->roundPrice($p->mrp * $r['rate']);
                    $sale  = $r['sale_rate'] > 0 ? $this->roundPrice($p->mrp * $r['sale_rate']) : null;
                    if ($sale !== null && $sale >= $price) {
                        $sale = null;
                    }
                    $p->price = $price;
                    $p->sale_price = $sale;
                    $p->min_price = $sale ?: $price;
                    $p->max_price = $price;
                    $p->saveQuietly();
                    $n++;
                }
            });
        return $n;
    }

    /**
     * Cron (hourly, key-guarded): when a scheduled rate's window has passed, restore the
     * rates that were in force before it and re-price every book back.
     */
    public function conversionCron(Request $request)
    {
        $token = $this->options()['replygenie']['token'] ?? '';
        if (!$token || (string) $request->query('key') !== (string) $token) {
            abort(401);
        }
        $c = $this->options()['conversion'] ?? [];
        $s = is_array($c['schedule'] ?? null) ? $c['schedule'] : null;
        if (empty($s['enabled']) || empty($s['until'])) {
            return ['status' => 'idle'];
        }
        if (now()->lt(Carbon::parse($s['until']))) {
            return ['status' => 'waiting', 'until' => $s['until']];
        }
        $prev = (array) ($s['prev'] ?? []);
        $settings = Settings::first();
        $options = $settings->options ?? [];

        // Restore the *whole* config exactly as it was before the scheduled rate —
        // rebuilding it field-by-field silently dropped the sale rate and the tiers.
        if (!empty($prev['snapshot'])) {
            $restored = (array) $prev['snapshot'];
            $restored['schedule'] = null;
            $options['conversion'] = $restored;
            $settings->options = $options;
            $settings->save();
            $repriced = $this->repriceAll($this->conversionConfig());
            return [
                'status'        => 'reverted',
                'restored_rate' => (float) ($restored['rate'] ?? 2),
                'restored_sale' => (float) ($restored['sale_rate'] ?? 0),
                'repriced'      => $repriced,
            ];
        }

        // Legacy schedules (saved before snapshots existed): keep everything else intact.
        $options['conversion'] = array_merge($c, [
            'rate'      => (float) ($prev['rate'] ?? 2),
            'bd_rate'   => (float) ($prev['bd_rate'] ?? 1),
            'sale_rate' => (float) ($prev['sale_rate'] ?? 0),
            'schedule'  => null,
        ]);
        $settings->options = $options;
        $settings->save();

        $repriced = $this->repriceAll($this->conversionConfig());
        return ['status' => 'reverted', 'restored_rate' => $options['conversion']['rate'], 'repriced' => $repriced];
    }

    /** Most-specific rate for a product: product > author+publisher > author > publisher > category > origin. */
    private function resolveConversionRate($product, array $cfg): array
    {
        $catIds = method_exists($product, 'categories') ? $product->categories->pluck('id')->all() : [];
        $aid = (int) ($product->author_id ?? 0);
        $mid = (int) ($product->manufacturer_id ?? 0);
        $pid = (int) $product->id;

        $match = function ($type, $test) use ($cfg) {
            foreach ($cfg['overrides'] as $o) {
                if (($o['type'] ?? '') === $type && $test($o)) {
                    return ['rate' => (float) ($o['rate'] ?? $cfg['rate']), 'sale_rate' => (float) ($o['sale_rate'] ?? $cfg['sale_rate'])];
                }
            }
            return null;
        };

        return $match('product', fn ($o) => (int) ($o['id'] ?? 0) === $pid)
            ?? $match('author_in_publisher', fn ($o) => (int) ($o['id'] ?? 0) === $aid && (int) ($o['id2'] ?? 0) === $mid)
            ?? $match('author', fn ($o) => (int) ($o['id'] ?? 0) === $aid)
            ?? $match('publisher', fn ($o) => (int) ($o['id'] ?? 0) === $mid)
            ?? $match('category', fn ($o) => in_array((int) ($o['id'] ?? 0), $catIds, true))
            ?? [
                'rate'      => ($product->book_origin ?? 'indian') === 'bd' ? $cfg['bd_rate'] : $cfg['rate'],
                'sale_rate' => $cfg['sale_rate'],
            ];
    }

    /** Admin: read/update conversion config (global rates + scope overrides). */
    public function conversionSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'rate'      => 'nullable|numeric',
                'bd_rate'   => 'nullable|numeric',
                'sale_rate' => 'nullable|numeric',
                'overrides' => 'nullable|array',
                'schedule'  => 'nullable|array',
            ]);
            // A scheduled rate remembers the rates in force *before* it, so the cron can
            // put them back when the window ends. Re-saving inside a live window keeps
            // the original "previous" rates — never the temporary ones.
            $before = $this->conversionConfig();
            $sched = (array) ($data['schedule'] ?? []);
            $schedule = null;
            if (!empty($sched['enabled'])) {
                $until = ($sched['mode'] ?? 'duration') === 'range' && !empty($sched['end'])
                    ? Carbon::parse($sched['end'])->endOfDay()
                    : now()->add(($sched['unit'] ?? 'hour') === 'day' ? 'days' : 'hours', max(1, (int) ($sched['amount'] ?? 24)));
                $snapshot = $before;
                unset($snapshot['schedule']);   // the config exactly as it stands right now
                $schedule = [
                    'enabled' => true,
                    'until'   => $until->toDateTimeString(),
                    'prev'    => $before['schedule']['prev'] ?? [
                        'rate'      => $before['rate'],
                        'bd_rate'   => $before['bd_rate'],
                        'sale_rate' => $before['sale_rate'],
                        'snapshot'  => $snapshot,
                    ],
                ];
            }
            $overrides = [];
            foreach ((array) ($data['overrides'] ?? []) as $o) {
                if (empty($o['type']) || !isset($o['rate'])) {
                    continue;
                }
                $overrides[] = [
                    'type'      => (string) $o['type'],
                    'id'        => (int) ($o['id'] ?? 0),
                    'id2'       => (int) ($o['id2'] ?? 0),
                    'label'     => (string) ($o['label'] ?? ''),
                    'rate'      => (float) $o['rate'],
                    'sale_rate' => (float) ($o['sale_rate'] ?? 0),
                ];
            }
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['conversion'] = [
                'rate'      => (float) ($data['rate'] ?? 2),
                'bd_rate'   => (float) ($data['bd_rate'] ?? 1),
                'sale_rate' => (float) ($data['sale_rate'] ?? 0),
                'overrides' => $overrides,
                'schedule'  => $schedule,
            ];
            $settings->update(['options' => $options]);
        }
        return $this->conversionConfig();
    }

    /**
     * Admin: recompute selling prices from MRP for every book (optionally a scope),
     * using the resolved conversion rate. Books without an MRP are left untouched.
     */
    /** Apply the scope filter (category / author / publisher / product) to a query. */
    private function conversionScope($q, string $scope, int $scopeId)
    {
        if ($scope === 'category' && $scopeId) {
            $q->whereHas('categories', fn ($c) => $c->where('categories.id', $scopeId));
        } elseif ($scope === 'author' && $scopeId) {
            $q->where('author_id', $scopeId);
        } elseif ($scope === 'publisher' && $scopeId) {
            $q->where('manufacturer_id', $scopeId);
        } elseif ($scope === 'product' && $scopeId) {
            $q->where('id', $scopeId);
        }
        return $q;
    }

    /**
     * Exclusions: books matching ANY of these are left completely alone, whatever the
     * include-filters say. Exclude always wins — that's the point of an exception list.
     */
    private function conversionExclude($q, array $f)
    {
        $ints = fn ($v) => array_values(array_filter(array_map('intval', (array) $v)));
        $cats = $ints($f['categories'] ?? []);
        $auth = $ints($f['authors'] ?? []);
        $pub  = $ints($f['publishers'] ?? []);
        $prod = $ints($f['products'] ?? []);
        if ($cats) {
            $q->whereDoesntHave('categories', fn ($c) => $c->whereIn('categories.id', $cats));
        }
        if ($auth) {
            $q->where(fn ($w) => $w->whereNull('author_id')->orWhereNotIn('author_id', $auth));
        }
        if ($pub) {
            $q->where(fn ($w) => $w->whereNull('manufacturer_id')->orWhereNotIn('manufacturer_id', $pub));
        }
        if ($prod) {
            $q->whereNotIn('id', $prod);
        }
        return $q;
    }

    /**
     * Multi-criteria filter: books must match ALL provided groups (AND), and any
     * of the ids within a group (OR). e.g. publisher X AND category in [A,B].
     */
    private function conversionFilters($q, array $f)
    {
        $ints = fn ($v) => array_values(array_filter(array_map('intval', (array) $v)));
        $cats = $ints($f['categories'] ?? []);
        $auth = $ints($f['authors'] ?? []);
        $pub  = $ints($f['publishers'] ?? []);
        $prod = $ints($f['products'] ?? []);
        if ($cats) {
            $q->whereHas('categories', fn ($c) => $c->whereIn('categories.id', $cats));
        }
        if ($auth) {
            $q->whereIn('author_id', $auth);
        }
        if ($pub) {
            $q->whereIn('manufacturer_id', $pub);
        }
        if ($prod) {
            $q->whereIn('id', $prod);
        }
        return $q;
    }

    /**
     * Admin: re-price books in a scope.
     *  mode=reprice (default) → price = MRP × rate; skips books without an MRP.
     *  mode=set_mrp → MRP = round(current price ÷ rate); keeps the price the same,
     *                 so existing books get an MRP without any visible price change,
     *                 ready to be re-priced when the rate changes.
     * Returns the list of books whose price actually changed (old → new) + counts.
     */
    public function conversionApply(Request $request)
    {
        $cfg = $this->conversionConfig();
        $scope = (string) $request->input('scope', 'all');
        $scopeId = (int) $request->input('id', 0);
        $filters = (array) $request->input('filters', []);
        $exclude = (array) $request->input('exclude', []);
        $mode = $request->input('mode') === 'set_mrp' ? 'set_mrp' : 'reprice';
        $assumed = (float) $request->input('assumed_rate', 0);

        // Prefer multi-criteria `filters`; fall back to the single scope/id. Exclusions
        // are applied on top of whichever was used, and always win.
        $base = function () use ($filters, $exclude, $scope, $scopeId) {
            $q = Product::query()->where('type_id', 8)->with(['categories:id', 'author:id,name', 'manufacturer:id,name']);
            $q = $filters
                ? $this->conversionFilters($q, $filters)
                : $this->conversionScope($q, $scope, $scopeId);
            return array_filter($exclude) ? $this->conversionExclude($q, $exclude) : $q;
        };

        // How many in-scope books still have no MRP (they can't be re-priced yet).
        $withoutMrp = (clone $base())->where(fn ($w) => $w->whereNull('mrp')->orWhere('mrp', '<=', 0))->count();

        $updated = 0;
        $changes = [];
        $q = $base();
        if ($mode === 'reprice') {
            $q->whereNotNull('mrp')->where('mrp', '>', 0);
        }
        $q->chunkById(300, function ($books) use ($cfg, $mode, $assumed, &$updated, &$changes) {
            foreach ($books as $p) {
                $r = $this->resolveConversionRate($p, $cfg);
                if ($mode === 'set_mrp') {
                    $rate = $assumed > 0 ? $assumed : ($r['rate'] > 0 ? $r['rate'] : 1);
                    // MRP is derived from the REGULAR price (price = MRP × rate),
                    // never the discounted sale price — using sale_price here gives a
                    // too-low MRP and throws off every later re-price.
                    $p->mrp = round((float) $p->price / $rate);
                    if (empty($p->book_origin)) {
                        $p->book_origin = 'indian';
                    }
                    $p->saveQuietly();
                    $updated++;
                    continue;
                }
                if (empty($p->mrp) || $p->mrp <= 0) {
                    continue;
                }
                $old = round((float) $p->price);
                // The old sale price has to be read before we overwrite it below — the list
                // shows both regular and sale, and reprice moves both.
                $oldSale = $p->sale_price !== null ? round((float) $p->sale_price) : null;
                $price = $this->roundPrice($p->mrp * $r['rate']);
                $sale  = $r['sale_rate'] > 0 ? $this->roundPrice($p->mrp * $r['sale_rate']) : null;
                if ($sale !== null && $sale >= $price) {
                    $sale = null;
                }
                $p->price = $price;
                $p->sale_price = $sale;
                $p->min_price = $sale ?: $price;
                $p->max_price = $price;
                $p->saveQuietly();
                $updated++;
                if ($old != $price && count($changes) < 500) {
                    $changes[] = [
                        'product_id' => (int) $p->id,
                        'name'       => $p->name,
                        'slug'       => $p->slug,
                        'image'      => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                        'author'     => $p->author->name ?? null,
                        'publisher'  => $p->manufacturer->name ?? null,
                        'old_price'  => $old,
                        'new_price'  => $price,
                        // reprice sets sale_price too, but it was never reported — the admin
                        // could not see what the discounted price actually became.
                        'old_sale'   => $oldSale,
                        'new_sale'   => $sale,
                        'mrp'        => (float) $p->mrp,
                    ];
                }
            }
        });

        // Prices moved — drop the cached catalog responses so the shop shows them now.
        if ($mode !== 'set_mrp' && $changes) {
            Cache::increment('catalog:version');
        }

        return [
            'status'      => 'success',
            'mode'        => $mode,
            'updated'     => $updated,
            'without_mrp' => $withoutMrp,
            'changed'     => count($changes),
            'changes'     => $changes,
        ];
    }

    /**
     * Admin: turn a "coupon conversion rate" into a real percentage coupon.
     * A coupon rate of 1.6 against a normal rate of 2 is simply 20% off, so it rides
     * the existing checkout discount flow instead of a second pricing path.
     */
    public function conversionCoupon(Request $request)
    {
        $data = $request->validate([
            'code'      => 'required|string|max:40',
            'rate'      => 'required|numeric|min:0.01',
            'expire_at' => 'nullable|date',
        ]);
        $cfg = $this->conversionConfig();
        $normal = $cfg['rate'] > 0 ? $cfg['rate'] : 2;
        if ($data['rate'] >= $normal) {
            throw new MarvelException("Coupon rate must be lower than the normal rate (×{$normal}).");
        }
        $percent = (int) round((1 - ($data['rate'] / $normal)) * 100);
        $code = strtoupper(preg_replace('/\s+/', '', $data['code']));

        $coupon = Coupon::withTrashed()->firstOrNew(['code' => $code]);
        $coupon->fill([
            'type'        => CouponType::PERCENTAGE_COUPON,
            'amount'      => $percent,
            'description' => "Conversion rate ×{$data['rate']} (normal ×{$normal})",
            'language'    => 'en',
            'is_approve'  => true,
            'target'      => false,
            'active_from' => now(),
            'expire_at'   => !empty($data['expire_at']) ? Carbon::parse($data['expire_at'])->endOfDay() : now()->addYear(),
        ]);
        $coupon->deleted_at = null;
        $coupon->save();

        return [
            'status'    => 'success',
            'code'      => $code,
            'percent'   => $percent,
            'rate'      => (float) $data['rate'],
            'expire_at' => $coupon->expire_at,
            'message'   => "কুপন {$code} — রেট ×{$data['rate']} মানে {$percent}% ছাড় (সাধারণ রেট ×{$normal})।",
        ];
    }

    // ============================================================ FEATURE REGISTRY + HEALTH
    /**
     * Admin: every feature we've shipped, with a live probe of each. A feature that can't
     * actually work (its table/column/token is gone) comes back red — so a broken deploy
     * shows up here instead of in a customer's face.
     */
    public function featureRegistry(Request $request)
    {
        $out = [];
        foreach (FeatureRegistry::features() as $f) {
            $status = 'ok';
            $note = null;
            try {
                $res = ($f['check'])();
                if (is_array($res) && isset($res['fail'])) {
                    $status = 'fail';
                    $note = $res['fail'];
                } elseif (is_array($res) && isset($res['warn'])) {
                    $status = 'warn';
                    $note = $res['warn'];
                } elseif (is_string($res)) {
                    $note = $res;
                }
            } catch (\Throwable $e) {
                // A probe that blows up *is* a broken feature — report it, don't hide it.
                $status = 'fail';
                $note = 'probe error: ' . $e->getMessage();
            }

            $out[] = [
                'key'     => $f['key'],
                'name'    => $f['name'],
                'detail'  => $f['detail'] ?? null,
                'area'    => $f['area'] ?? 'Other',
                'version' => $f['version'] ?? '1.0.0',
                'date'    => $f['date'] ?? null,
                'admin'   => $f['admin'] ?? null,
                'status'  => $status,
                'note'    => $note,
            ];
        }

        $counts = [
            'total' => count($out),
            'ok'    => count(array_filter($out, fn ($f) => $f['status'] === 'ok')),
            'warn'  => count(array_filter($out, fn ($f) => $f['status'] === 'warn')),
            'fail'  => count(array_filter($out, fn ($f) => $f['status'] === 'fail')),
        ];

        return ['data' => $out, 'counts' => $counts, 'checked_at' => now()->toIso8601String()];
    }

    // ============================================================ DELIVERY AREAS
    /**
     * The real RedX delivery-area list, cached for a day. The checkout address form
     * autocompletes from this, so what the customer picks is exactly what the courier
     * knows — no more area mismatches when a shipment is booked.
     */
    public function courierAreas(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        // Served from our own table, never from RedX. The list used to come from a
        // live call behind a 24h cache — so an outage (or an empty response cached
        // for a day) left customers unable to pick an area at all.
        if (!\Marvel\Database\Models\CourierArea::where('provider', 'redx')->exists()) {
            try {
                // Never synced yet: try once, but a courier problem must not break checkout.
                $this->syncRedxAreas();
            } catch (\Throwable $e) {
                // fall through and return what we have
            }
        }

        $query = \Marvel\Database\Models\CourierArea::where('provider', 'redx')->orderBy('area_id');
        if ($q !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $q) . '%';
            $query->where(function ($w) use ($like) {
                $w->where('name', 'like', $like)
                    ->orWhere('district', 'like', $like)
                    ->orWhere('zone', 'like', $like);
            })->limit(25);
        }

        $areas = $query->get()->map(fn ($a) => [
            'id'       => (int) $a->area_id,
            'name'     => (string) $a->name,
            'district' => (string) ($a->district ?? ''),
            'zone'     => (string) ($a->zone ?? ''),
        ])->values()->all();

        return ['data' => $areas, 'total' => count($areas)];
    }

    /**
     * Admin: pull the courier's area list into our table. POST courier-areas-sync
     */
    public function syncCourierAreas(Request $request)
    {
        $n = $this->syncRedxAreas();
        return [
            'status' => 'success',
            'synced' => $n,
            'total'  => \Marvel\Database\Models\CourierArea::where('provider', 'redx')->count(),
        ];
    }

    /** RedX's base URL with the scheme the settings form does not enforce. */
    protected function redxBase(array $cfg): string
    {
        $base = rtrim($cfg['base_url'] ?? '', '/') ?: 'https://openapi.redx.com.bd/v1.0.0-beta';
        // Without this the access token goes out over plain http.
        if (!str_starts_with($base, 'http')) {
            $base = 'https://' . $base;
        }
        return $base;
    }

    /**
     * Refresh courier_areas from RedX. Upserts and never truncates: a bad or empty
     * response must leave the previous list standing, because checkout reads it.
     */
    protected function syncRedxAreas(): int
    {
        $cfg   = ($this->options()['couriers'] ?? [])['redx'] ?? [];
        $token = $cfg['token'] ?? '';
        if (!$token) {
            throw new MarvelException('RedX token is not set in Settings → Couriers & Payments.');
        }
        $res = Http::withHeaders(['API-ACCESS-TOKEN' => 'Bearer ' . $token])
            ->timeout(40)->get($this->redxBase($cfg) . '/areas');
        if (!$res->successful()) {
            throw new MarvelException('RedX returned HTTP ' . $res->status() . ' for /areas.');
        }

        $now  = now();
        $rows = collect($res->json('areas') ?? $res->json('data') ?? [])
            ->map(fn ($a) => [
                'provider'   => 'redx',
                'area_id'    => (int) ($a['id'] ?? 0),
                'name'       => trim((string) ($a['name'] ?? '')),
                'district'   => (string) ($a['district_name'] ?? ($a['division_name'] ?? '')),
                'zone'       => (string) ($a['zone_name'] ?? ''),
                'post_code'  => (string) ($a['post_code'] ?? ''),
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->filter(fn ($a) => $a['area_id'] > 0 && $a['name'] !== '')
            ->unique('area_id')
            ->values();

        if ($rows->isEmpty()) {
            throw new MarvelException('RedX returned no usable areas — the existing list is kept.');
        }

        foreach ($rows->chunk(500) as $chunk) {
            \Marvel\Database\Models\CourierArea::upsert(
                $chunk->all(),
                ['provider', 'area_id'],
                ['name', 'district', 'zone', 'post_code', 'updated_at']
            );
        }
        return $rows->count();
    }

    // ============================================================ SUPPORT TICKETS (#10)
    /** Customer: open a ticket. */
    public function ticketCreate(Request $request)
    {
        $data = $request->validate([
            'subject'  => 'required|string|max:160',
            'message'  => 'required|string|max:2000',
            'category' => 'nullable|string|max:40',
            'order_id' => 'nullable|integer',
        ]);
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('টিকেট খুলতে লগইন করুন।');
        }
        $id = DB::table('support_tickets')->insertGetId([
            'customer_id'   => $user->id,
            'order_id'      => $data['order_id'] ?? null,
            'subject'       => $data['subject'],
            'category'      => $data['category'] ?? 'other',
            'status'        => 'open',
            'last_reply_at' => now(),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
        DB::table('support_ticket_messages')->insert([
            'ticket_id'  => $id,
            'sender'     => 'customer',
            'message'    => $data['message'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return ['status' => 'success', 'id' => $id, 'message' => 'টিকেট খোলা হয়েছে — আমরা শীঘ্রই উত্তর দেব।'];
    }

    /** Customer: my tickets (with the full thread). Admin: every ticket. */
    public function ticketList(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user && $user->hasPermissionTo(Permission::SUPER_ADMIN);

        $q = DB::table('support_tickets as t')
            ->leftJoin('users as u', 'u.id', '=', 't.customer_id')
            ->leftJoin('orders as o', 'o.id', '=', 't.order_id')
            ->select('t.*', 'u.name as customer', 'u.email', 'u.mobile_number as contact', 'o.tracking_number');
        if (!$isAdmin) {
            if (!$user) {
                return ['data' => [], 'counts' => []];
            }
            $q->where('t.customer_id', $user->id);
        }
        if ($request->filled('status')) {
            $q->where('t.status', $request->input('status'));
        }
        $rows = $q->orderByDesc('t.last_reply_at')->limit(200)->get();

        $msgs = DB::table('support_ticket_messages')
            ->whereIn('ticket_id', $rows->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('ticket_id');

        $data = $rows->map(fn ($t) => [
            'id'       => (int) $t->id,
            'subject'  => $t->subject,
            'category' => $t->category,
            'status'   => $t->status,
            'customer' => $t->customer,
            'contact'  => $t->contact ?: $t->email,
            'order'    => $t->tracking_number,
            'created_at'    => $t->created_at,
            'last_reply_at' => $t->last_reply_at,
            'messages' => collect($msgs[$t->id] ?? [])->map(fn ($m) => [
                'sender'  => $m->sender,
                'message' => $m->message,
                'at'      => $m->created_at,
            ])->values(),
        ]);

        $counts = DB::table('support_tickets')
            ->when(!$isAdmin && $user, fn ($x) => $x->where('customer_id', $user->id))
            ->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');

        return ['data' => $data, 'counts' => $counts];
    }

    /** Customer or admin: reply on a ticket (admin replies flip it to "answered"). */
    public function ticketReply(Request $request)
    {
        $data = $request->validate([
            'ticket_id' => 'required|integer',
            'message'   => 'required|string|max:2000',
        ]);
        $user = $request->user();
        $ticket = DB::table('support_tickets')->where('id', $data['ticket_id'])->first();
        if (!$ticket) {
            throw new MarvelException('Ticket not found.');
        }
        $isAdmin = $user && $user->hasPermissionTo(Permission::SUPER_ADMIN);
        if (!$isAdmin && (!$user || (int) $ticket->customer_id !== (int) $user->id)) {
            throw new MarvelException('এই টিকেটটি আপনার নয়।');
        }

        DB::table('support_ticket_messages')->insert([
            'ticket_id'  => $ticket->id,
            'sender'     => $isAdmin ? 'admin' : 'customer',
            'message'    => $data['message'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('support_tickets')->where('id', $ticket->id)->update([
            'status'        => $isAdmin ? 'answered' : 'open',
            'last_reply_at' => now(),
            'updated_at'    => now(),
        ]);
        return ['status' => 'success'];
    }

    /** Admin: close (or reopen) a ticket. */
    public function ticketStatus(Request $request)
    {
        $data = $request->validate([
            'ticket_id' => 'required|integer',
            'status'    => 'required|string|in:open,answered,closed',
        ]);
        DB::table('support_tickets')->where('id', $data['ticket_id'])
            ->update(['status' => $data['status'], 'updated_at' => now()]);
        return ['status' => 'success'];
    }

    // ============================================================ RESTOCK REQUESTS (#12)
    private const RESTOCK_FREE = 3;          // free requests per customer
    private const RESTOCK_POINTS = 10;       // wallet points per request beyond that

    /**
     * How many free requests a customer has left. The free allowance only burns once the
     * admin has *confirmed* a request and the customer still hasn't ordered the book —
     * asking for books that were never restocked costs them nothing.
     */
    private function restockQuota(int $customerId): array
    {
        $confirmedUnordered = DB::table('restock_requests')
            ->where('customer_id', $customerId)
            ->where('status', 'confirmed')
            ->count();
        $free = max(0, self::RESTOCK_FREE - $confirmedUnordered);
        $wallet = Wallet::where('customer_id', $customerId)->first();
        return [
            'free_left'           => $free,
            'confirmed_unordered' => $confirmedUnordered,
            'costs_points'        => $free === 0,
            'points_per_request'  => self::RESTOCK_POINTS,
            'wallet_points'       => (int) ($wallet->available_points ?? 0),
        ];
    }

    /** Customer: ask for an out-of-stock book to be restocked. */
    public function restockRequest(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException('রিকোয়েস্ট করতে লগইন করুন।');
        }
        $product = Product::findOrFail((int) $request->input('product_id'));

        if (DB::table('restock_requests')->where('customer_id', $user->id)->where('product_id', $product->id)->exists()) {
            throw new MarvelException('এই বইয়ের জন্য আপনি আগেই রিকোয়েস্ট করেছেন।');
        }

        $quota = $this->restockQuota($user->id);
        $charged = 0;

        // Out of free requests: each one now costs wallet points — the shop warns first,
        // and we still refuse if the wallet can't cover it.
        if ($quota['costs_points']) {
            $wallet = Wallet::where('customer_id', $user->id)->first();
            $have = (int) ($wallet->available_points ?? 0);
            if ($have < self::RESTOCK_POINTS) {
                throw new MarvelException(
                    'আপনার ' . self::RESTOCK_FREE . 'টি ফ্রি রিকোয়েস্ট শেষ এবং সেগুলোর বই এখনো অর্ডার করেননি। '
                    . 'নতুন রিকোয়েস্টে ' . self::RESTOCK_POINTS . ' পয়েন্ট লাগবে, কিন্তু আপনার আছে ' . $have . '।'
                );
            }
            $wallet->available_points = $have - self::RESTOCK_POINTS;
            $wallet->save();
            $charged = self::RESTOCK_POINTS;
        }

        $id = DB::table('restock_requests')->insertGetId([
            'customer_id'    => $user->id,
            'product_id'     => $product->id,
            'status'         => 'requested',
            'points_charged' => $charged,
            // What the customer actually wants — edition, language, cover.
            'customer_note'  => $request->input('note') ?: null,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return [
            'status'  => 'success',
            'id'      => $id,
            'charged' => $charged,
            'quota'   => $this->restockQuota($user->id),
            'message' => $charged
                ? "রিকোয়েস্ট জমা হয়েছে। {$charged} পয়েন্ট কাটা হয়েছে।"
                : 'রিকোয়েস্ট জমা হয়েছে — বইটি আনা গেলে আপনাকে জানাব।',
        ];
    }

    /** Customer: my restock requests + how much quota is left. */
    public function restockMine(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return ['data' => [], 'quota' => null];
        }
        $rows = DB::table('restock_requests as r')
            ->leftJoin('products as p', 'p.id', '=', 'r.product_id')
            ->where('r.customer_id', $user->id)
            ->select('r.*', 'p.name', 'p.slug', 'p.image', 'p.price', 'p.quantity as stock')
            ->orderByDesc('r.id')
            ->get()
            ->map(function ($r) {
                $img = json_decode($r->image ?? 'null', true);
                return [
                    'id'            => (int) $r->id,
                    'product_id'    => (int) $r->product_id,
                    'name'          => $r->name,
                    'slug'          => $r->slug,
                    'image'         => is_array($img) ? ($img['original'] ?? null) : null,
                    'status'        => $r->status,
                    'price'         => (float) ($r->confirmed_price ?: $r->price),
                    'in_stock'      => (int) $r->stock > 0,
                    'points'        => (int) $r->points_charged,
                    'admin_note'    => $r->admin_note,
                    'customer_note' => $r->customer_note,
                    'eta_days'      => $r->eta_days ? (int) $r->eta_days : null,
                    // Derived, not stored: editing eta_days later moves the date with it.
                    'expected_date' => $this->restockExpectedDate($r),
                    'created_at'    => $r->created_at,
                ];
            });

        return ['data' => $rows, 'quota' => $this->restockQuota($user->id)];
    }

    /** Admin: every restock request. */
    public function restockList(Request $request)
    {
        $rows = DB::table('restock_requests as r')
            ->leftJoin('products as p', 'p.id', '=', 'r.product_id')
            ->leftJoin('users as u', 'u.id', '=', 'r.customer_id')
            ->select(
                'r.*',
                'p.name as product', 'p.image as product_image', 'p.price', 'p.quantity as stock',
                'u.name as customer', 'u.mobile_number as contact', 'u.email',
            )
            ->when($request->filled('status'), fn ($q) => $q->where('r.status', $request->input('status')))
            ->orderByDesc('r.id')
            ->limit(300)
            ->get();

        // Group by book: what the admin actually wants to see is "how many people want this".
        $data = $rows->map(function ($r) {
            $img = json_decode($r->product_image ?? 'null', true);
            return [
                'id'              => (int) $r->id,
                'product_id'      => (int) $r->product_id,
                'product'         => $r->product,
                'image'           => is_array($img) ? ($img['original'] ?? null) : null,
                'price'           => (float) $r->price,
                'stock'           => (int) $r->stock,
                'customer'        => $r->customer,
                'contact'         => $r->contact ?: $r->email,
                'status'          => $r->status,
                'points'          => (int) $r->points_charged,
                // Sent back so the admin form can be re-opened and edited at any time.
                'confirmed_price' => $r->confirmed_price ? (float) $r->confirmed_price : null,
                'admin_note'      => $r->admin_note,
                'customer_note'   => $r->customer_note,
                'eta_days'        => $r->eta_days ? (int) $r->eta_days : null,
                'expected_date'   => $this->restockExpectedDate($r),
                'created_at'      => $r->created_at,
            ];
        });

        $demand = $data->groupBy('product_id')->map->count();
        $counts = DB::table('restock_requests')->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        return ['data' => $data, 'demand' => $demand, 'counts' => $counts];
    }

    /**
     * Admin: decide on a restock request. Confirming brings the book back — stock, an
     * updated price, and pre-order mode so ordering it demands the 50% advance.
     */
    public function restockAction(Request $request)
    {
        $data = $request->validate([
            'id'       => 'required|integer',
            'action'   => 'required|string|in:confirm,decline',
            'price'    => 'nullable|numeric|min:1',
            'quantity' => 'nullable|integer|min:1',
            'note'     => 'nullable|string|max:300',
            'eta_days' => 'nullable|integer|min:1|max:365',
        ]);
        $req = DB::table('restock_requests')->where('id', $data['id'])->first();
        if (!$req) {
            throw new MarvelException('Request not found.');
        }

        if ($data['action'] === 'decline') {
            DB::table('restock_requests')->where('id', $req->id)->update([
                'status' => 'declined', 'admin_note' => $data['note'] ?? null, 'updated_at' => now(),
            ]);
            return ['status' => 'success', 'new_status' => 'declined'];
        }

        // Re-confirming is allowed and expected: the admin can come back and change the
        // price, the quantity or the ETA at any time. Changing the price here only moves
        // the book's *future* price — orders already placed keep the unit_price stored on
        // their line, so nobody's bill changes retroactively.
        $product = Product::findOrFail($req->product_id);
        if (!empty($data['price'])) {
            $product->price = (float) $data['price'];
            $product->max_price = (float) $data['price'];
            $product->min_price = (float) ($product->sale_price ?: $data['price']);
        }
        $product->quantity = (int) ($data['quantity'] ?? max(1, (int) $product->quantity));
        $product->in_stock = 1;
        // A restocked book is sold pre-order style: 50% up front.
        $product->is_preorder = true;
        $product->preorder_advance_pct = 50;
        $product->saveQuietly();
        Cache::increment('catalog:version');

        $update = [
            'status'          => 'confirmed',
            'confirmed_price' => $product->price,
            'admin_note'      => $data['note'] ?? null,
            'updated_at'      => now(),
        ];
        if (array_key_exists('eta_days', $data) && $data['eta_days'] !== null) {
            $update['eta_days'] = (int) $data['eta_days'];
        }
        // The clock starts at the first confirm and is not reset by later edits.
        if (empty($req->confirmed_at)) {
            $update['confirmed_at'] = now();
        }
        DB::table('restock_requests')->where('id', $req->id)->update($update);

        $fresh = DB::table('restock_requests')->where('id', $req->id)->first();
        $eta = $this->restockExpectedDate($fresh);

        return [
            'status'        => 'success',
            'new_status'    => 'confirmed',
            'price'         => (float) $product->price,
            'expected_date' => $eta,
            'message'       => "বইটি আনা যাবে — দাম ৳" . round($product->price)
                . ($eta ? ", আনুমানিক {$eta}-এর মধ্যে আসবে" : '')
                . ", ৫০% অগ্রিমে অর্ডার করা যাবে।",
        ];
    }

    /** When the book should land: the day it was confirmed, plus however long admin said. */
    private function restockExpectedDate($row): ?string
    {
        if (empty($row->eta_days)) {
            return null;
        }
        $from = !empty($row->confirmed_at)
            ? \Carbon\Carbon::parse($row->confirmed_at)
            : \Carbon\Carbon::parse($row->created_at);
        return $from->addDays((int) $row->eta_days)->toDateString();
    }

    // ============================================================ EXCHANGE / RETURN (#16, #17)
    private const REPORT_DAYS = 3;    // must tell us within 3 days of delivery
    private const EXCHANGE_DAYS = 7;  // and the swap must finish within 7

    /** Where an order stands in its exchange window. */
    private function exchangeWindow(Order $order): array
    {
        $ops = (array) ($order->ops_meta ?? []);
        $delivered = $ops['delivered_at'] ?? null;
        if (!$delivered || $order->order_status !== 'order-completed') {
            return ['delivered' => false, 'open' => false];
        }
        $d = Carbon::parse($delivered);
        $reportBy = $d->copy()->addDays(self::REPORT_DAYS);
        $exchangeBy = $d->copy()->addDays(self::EXCHANGE_DAYS);
        $hasRequest = DB::table('exchange_requests')->where('order_id', $order->id)->exists();

        // Report within 3 days, or the window shuts by itself.
        $open = $hasRequest ? now()->lte($exchangeBy) : now()->lte($reportBy);

        return [
            'delivered'      => true,
            'delivered_at'   => $d->toIso8601String(),
            'report_by'      => $reportBy->toIso8601String(),
            'exchange_by'    => $exchangeBy->toIso8601String(),
            'report_days'    => self::REPORT_DAYS,
            'exchange_days'  => self::EXCHANGE_DAYS,
            'hours_to_report' => max(0, (int) now()->diffInHours($reportBy, false)),
            'days_to_report' => max(0, (int) now()->diffInDays($reportBy, false)),
            'open'           => $open,
            'has_request'    => $hasRequest,
            'closed_reason'  => $open ? null : ($hasRequest ? 'exchange window (7 days) is over' : 'no problem was reported within 3 days'),
        ];
    }

    /** Customer/admin: the exchange window + which books can still be swapped. */
    public function exchangeWindowInfo(Request $request)
    {
        $order = Order::with('products')->findOrFail($request->input('order_id'));
        $window = $this->exchangeWindow($order);
        $existing = DB::table('exchange_requests')->where('order_id', $order->id)->get()->keyBy('product_id');

        $items = $order->products->map(fn ($p) => [
            'product_id' => (int) $p->id,
            'name'       => $p->name,
            'image'      => is_array($p->image) ? ($p->image['original'] ?? null) : null,
            'quantity'   => (int) ($p->pivot->order_quantity ?? 1),
            'price'      => (float) ($p->pivot->unit_price ?? $p->price),
            // A resold (second-hand) copy is sold as-seen: no exchange, no return.
            'is_resell'  => (bool) $p->is_resell,
            'eligible'   => !$p->is_resell,
            'request'    => isset($existing[$p->id]) ? [
                'id'     => (int) $existing[$p->id]->id,
                'status' => $existing[$p->id]->status,
                'type'   => $existing[$p->id]->type,
            ] : null,
        ]);

        return ['window' => $window, 'items' => $items, 'tracking_number' => $order->tracking_number];
    }

    /** Customer: report a problem with one book and ask for an exchange or a return. */
    public function exchangeRequest(Request $request)
    {
        $data = $request->validate([
            'order_id'   => 'required|integer',
            'product_id' => 'required|integer',
            'quantity'   => 'nullable|integer|min:1',
            'type'       => 'nullable|string|in:exchange,return',
            'reason'     => 'required|string|max:60',
            'note'       => 'nullable|string|max:500',
            'images'     => 'nullable|array',
        ]);

        $order = Order::with('products')->findOrFail($data['order_id']);
        $window = $this->exchangeWindow($order);
        if (!$window['delivered']) {
            throw new MarvelException('অর্ডারটি এখনো ডেলিভারি হয়নি।');
        }
        if (!$window['open']) {
            throw new MarvelException('এক্সচেঞ্জের সময় শেষ — ' . $window['closed_reason'] . '.');
        }
        $line = $order->products->firstWhere('id', (int) $data['product_id']);
        if (!$line) {
            throw new MarvelException('এই বইটি অর্ডারে নেই।');
        }
        if ($line->is_resell) {
            throw new MarvelException('রিসেল (ব্যবহৃত) বই এক্সচেঞ্জ বা রিটার্ন করা যায় না — অর্ডারের আগেই তা জানানো হয়েছিল।');
        }
        if (DB::table('exchange_requests')->where('order_id', $order->id)->where('product_id', $line->id)->exists()) {
            throw new MarvelException('এই বইয়ের জন্য আগেই একটি রিকোয়েস্ট আছে।');
        }

        $id = DB::table('exchange_requests')->insertGetId([
            'order_id'    => $order->id,
            'product_id'  => $line->id,
            'customer_id' => $order->customer_id,
            'quantity'    => min((int) ($data['quantity'] ?? 1), (int) ($line->pivot->order_quantity ?? 1)),
            'type'        => $data['type'] ?? 'exchange',
            'reason'      => $data['reason'],
            'note'        => $data['note'] ?? null,
            'images'      => json_encode($data['images'] ?? []),
            'status'      => 'requested',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return ['status' => 'success', 'id' => $id, 'message' => 'রিকোয়েস্ট জমা হয়েছে — আমরা যোগাযোগ করব।'];
    }

    /** Admin: every exchange/return request, newest first. */
    public function exchangeList(Request $request)
    {
        $rows = DB::table('exchange_requests as e')
            ->leftJoin('orders as o', 'o.id', '=', 'e.order_id')
            ->leftJoin('products as p', 'p.id', '=', 'e.product_id')
            ->select(
                'e.*',
                'o.tracking_number',
                'o.customer_name',
                'o.customer_contact',
                'o.total as order_total',
                'p.name as product_name',
                'p.image as product_image',
                'p.quantity as product_stock',
            )
            ->when($request->filled('status'), fn ($q) => $q->where('e.status', $request->input('status')))
            ->orderByDesc('e.id')
            ->limit(200)
            ->get();

        $data = $rows->map(function ($r) {
            $img = json_decode($r->product_image ?? 'null', true);
            return [
                'id'           => (int) $r->id,
                'order_id'     => (int) $r->order_id,
                'tracking'     => $r->tracking_number,
                'customer'     => $r->customer_name,
                'contact'      => $r->customer_contact,
                'product_id'   => (int) $r->product_id,
                'product'      => $r->product_name,
                'image'        => is_array($img) ? ($img['original'] ?? null) : null,
                'stock'        => (int) $r->product_stock,
                'quantity'     => (int) $r->quantity,
                'type'         => $r->type,
                'reason'       => $r->reason,
                'note'         => $r->note,
                'status'       => $r->status,
                'restock'      => (bool) $r->restock,
                'admin_note'   => $r->admin_note,
                'created_at'   => $r->created_at,
            ];
        });

        $counts = DB::table('exchange_requests')->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        return ['data' => $data, 'counts' => $counts, 'total' => $data->count()];
    }

    /**
     * Admin: move a request along. The stock rules live here —
     *  approve  → nothing moves yet (the book is still with the customer)
     *  received → the returned copy is back; it goes on the shelf only if `restock` is set
     *             (a damaged copy must NOT be resold), and the replacement copy comes off stock
     *  completed/rejected → closes the request
     */
    public function exchangeAction(Request $request)
    {
        $data = $request->validate([
            'id'         => 'required|integer',
            'action'     => 'required|string|in:approve,reject,received,complete',
            'restock'    => 'nullable|boolean',
            'admin_note' => 'nullable|string|max:500',
        ]);

        $req = DB::table('exchange_requests')->where('id', $data['id'])->first();
        if (!$req) {
            throw new MarvelException('Request not found.');
        }

        $update = ['updated_at' => now()];
        if ($request->filled('admin_note')) {
            $update['admin_note'] = $data['admin_note'];
        }
        $stockMsg = '';

        switch ($data['action']) {
            case 'approve':
                $update['status'] = 'approved';
                break;

            case 'reject':
                $update['status'] = 'rejected';
                break;

            case 'received':
                $update['status'] = 'received';
                $restock = (bool) ($data['restock'] ?? false);
                $update['restock'] = $restock;

                $book = Product::find($req->product_id);
                if ($book) {
                    // The damaged copy only returns to stock if the admin says it's sellable.
                    if ($restock) {
                        $book->quantity = (int) $book->quantity + (int) $req->quantity;
                        $stockMsg .= "ফেরত আসা {$req->quantity} কপি স্টকে যোগ হয়েছে। ";
                    } else {
                        $stockMsg .= 'ফেরত কপি স্টকে যোগ হয়নি (বিক্রয়যোগ্য নয়)। ';
                    }
                    // An exchange ships a fresh copy — that one leaves stock.
                    if ($req->type === 'exchange') {
                        $book->quantity = max(0, (int) $book->quantity - (int) $req->quantity);
                        $stockMsg .= "বদলি {$req->quantity} কপি স্টক থেকে বাদ গেছে।";
                    }
                    $book->in_stock = $book->quantity > 0 ? 1 : 0;
                    $book->saveQuietly();
                    Cache::increment('catalog:version');
                }
                break;

            case 'complete':
                $update['status'] = 'completed';
                break;
        }

        DB::table('exchange_requests')->where('id', $req->id)->update($update);

        // keep the order's own log honest
        $order = Order::find($req->order_id);
        if ($order) {
            $ops = (array) ($order->ops_meta ?? []);
            $ops['notes'] = array_slice(array_merge($ops['notes'] ?? [], [[
                'at'   => now()->toIso8601String(),
                'by'   => 'admin',
                'text' => "এক্সচেঞ্জ #{$req->id} — {$update['status']}. {$stockMsg}",
            ]]), -30);
            $order->ops_meta = $ops;
            $order->saveQuietly();
        }

        return ['status' => 'success', 'new_status' => $update['status'], 'stock' => trim($stockMsg)];
    }

    // ============================================================ ABANDONED CHECKOUT (#20)
    /** Shop: called when someone lands on the checkout page with a cart. */
    public function checkoutIntent(Request $request)
    {
        $data = $request->validate([
            'items' => 'nullable|array',
            'total' => 'nullable|numeric',
        ]);
        $user = $request->user();
        $items = collect((array) ($data['items'] ?? []))->take(30)->values()->all();
        if (!$items) {
            return ['status' => 'ignored'];
        }

        // One open intent per customer — refresh it rather than piling up a row per visit.
        $intent = DB::table('checkout_intents')
            ->where('converted', false)
            ->when($user, fn ($q) => $q->where('customer_id', $user->id))
            ->when(!$user, fn ($q) => $q->whereNull('customer_id')->where('contact', (string) $request->input('contact', '')))
            ->orderByDesc('id')
            ->first();

        $row = [
            'customer_id' => $user?->id,
            'name'        => $user?->name ?? $request->input('name'),
            'contact'     => (string) ($request->input('contact') ?? $user?->mobile_number ?? ''),
            'email'       => $user?->email,
            'items'       => json_encode($items),
            'total'       => (float) ($data['total'] ?? 0),
            'item_count'  => count($items),
            'updated_at'  => now(),
        ];
        if ($intent) {
            DB::table('checkout_intents')->where('id', $intent->id)->update($row);
            return ['status' => 'success', 'id' => $intent->id];
        }
        $row['created_at'] = now();
        $id = DB::table('checkout_intents')->insertGetId($row);
        return ['status' => 'success', 'id' => $id];
    }

    /** Admin: everyone who reached checkout and never placed the order. */
    public function abandonedCheckouts(Request $request)
    {
        $rows = DB::table('checkout_intents')
            ->where('converted', false)
            ->orderByDesc('updated_at')
            ->limit(200)
            ->get();

        $data = $rows->map(fn ($r) => [
            'id'         => (int) $r->id,
            'name'       => $r->name ?: 'Guest',
            'contact'    => $r->contact,
            'email'      => $r->email,
            'items'      => json_decode($r->items ?? '[]', true),
            'item_count' => (int) $r->item_count,
            'total'      => (float) $r->total,
            'contacted'  => (bool) $r->contacted,
            'hours_ago'  => (int) Carbon::parse($r->updated_at)->diffInHours(now()),
            'updated_at' => $r->updated_at,
        ]);

        return [
            'data'  => $data,
            'total' => $data->count(),
            'value' => round($data->sum('total')),
        ];
    }

    /** Admin: tick one off once the customer has been called. */
    public function abandonedContacted(Request $request)
    {
        $id = (int) $request->input('id');
        DB::table('checkout_intents')->where('id', $id)->update(['contacted' => true, 'updated_at' => now()]);
        return ['status' => 'success'];
    }

    /** Recompute an order's money from its lines. */
    private function recalcOrder(Order $order): void
    {
        $order->load('products');
        $amount = 0;
        foreach ($order->products as $p) {
            $amount += (float) ($p->pivot->subtotal ?? 0);
        }
        $order->amount = $amount;
        $order->total = max(0, $amount + (float) ($order->sales_tax ?? 0)
            + (float) ($order->delivery_fee ?? 0) - (float) ($order->discount ?? 0));
        $order->saveQuietly();
    }

    /**
     * Admin: move a book (or part of its quantity) from one order to another — the
     * customer ordered it on the wrong order, or two orders are being merged. Both
     * orders' totals are recomputed, and the line price travels with the book.
     */
    public function orderMoveItem(Request $request)
    {
        $data = $request->validate([
            'from_order_id' => 'required|integer',
            'to_order'      => 'required',            // id or tracking number
            'product_id'    => 'required|integer',
            'quantity'      => 'nullable|integer|min:1',
        ]);

        $from = Order::with('products')->findOrFail($data['from_order_id']);
        $to = Order::where('id', $data['to_order'])
            ->orWhere('tracking_number', $data['to_order'])
            ->first();
        if (!$to) {
            throw new MarvelException('Target order not found.');
        }
        if ((int) $to->id === (int) $from->id) {
            throw new MarvelException('Source and target order are the same.');
        }

        $line = $from->products->firstWhere('id', (int) $data['product_id']);
        if (!$line) {
            throw new MarvelException('That book is not on this order.');
        }
        $have = (int) ($line->pivot->order_quantity ?? 1);
        $move = min($have, max(1, (int) ($data['quantity'] ?? $have)));
        $unit = (float) ($line->pivot->unit_price ?? $line->price);

        // take it off the source (or just reduce the quantity)
        if ($move >= $have) {
            $from->products()->detach($line->id);
        } else {
            $left = $have - $move;
            $from->products()->updateExistingPivot($line->id, [
                'order_quantity' => $left,
                'unit_price'     => $unit,
                'subtotal'       => $unit * $left,
            ]);
        }

        // add it to the target, stacking onto an existing line if the book is already there
        $to->load('products');
        $existing = $to->products->firstWhere('id', $line->id);
        $newQty = $move + ($existing ? (int) ($existing->pivot->order_quantity ?? 0) : 0);
        $to->products()->syncWithoutDetaching([
            $line->id => [
                'order_quantity' => $newQty,
                'unit_price'     => $unit,
                'subtotal'       => $unit * $newQty,
            ],
        ]);

        $this->recalcOrder($from);
        $this->recalcOrder($to);

        $note = "{$move}× \"{$line->name}\" সরানো হয়েছে অর্ডার #{$from->tracking_number} → #{$to->tracking_number}";
        foreach ([$from, $to] as $o) {
            $ops = (array) ($o->ops_meta ?? []);
            $ops['notes'] = array_slice(array_merge($ops['notes'] ?? [], [[
                'at' => now()->toIso8601String(), 'by' => 'admin', 'text' => $note,
            ]]), -30);
            $o->ops_meta = $ops;
            $o->saveQuietly();
        }

        return [
            'status'  => 'success',
            'moved'   => $move,
            'from'    => ['id' => $from->id, 'tracking_number' => $from->tracking_number, 'total' => (float) $from->total],
            'to'      => ['id' => $to->id, 'tracking_number' => $to->tracking_number, 'total' => (float) $to->total],
            'message' => $note,
        ];
    }

    // ============================================================ PRE-ORDER
    /** The pre-order clock: starts when the advance clears, stops on delivery. 28 days = late. */
    private function preorderClock(Order $order): array
    {
        $ops = (array) ($order->ops_meta ?? []);
        $started = $ops['preorder']['started_at'] ?? ($ops['paid_at'] ?? null);
        $delivered = in_array($order->order_status, ['order-completed', 'order-delivered'], true);
        $end = $delivered ? ($order->updated_at ?? now()) : now();

        if (!$started) {
            return ['days' => null, 'running' => false, 'delivered' => $delivered, 'late' => false, 'started_at' => null];
        }
        $days = (int) Carbon::parse($started)->startOfDay()->diffInDays(Carbon::parse($end)->startOfDay());
        return [
            'days'       => $days,
            'running'    => !$delivered,
            'delivered'  => $delivered,
            'late'       => !$delivered && $days > 28,     // window blown
            'started_at' => (string) $started,
        ];
    }

    /**
     * All orders that carry a pre-order (they all have an `advance` block in ops_meta).
     *
     * Parent rows only. When an order is split per shop the child rows inherit ops_meta, advance
     * block and all, so counting them too would report one pre-order as two — and a cancelled
     * child would land in its own bucket, away from the parent it belongs to. The parent row is
     * the customer's actual pre-order, and it's also the only one an admin sees on the board, so
     * this keeps the summary cards counting exactly what clicking them can show.
     */
    private function preorderOrders()
    {
        return Order::whereRaw("JSON_EXTRACT(ops_meta, '$.advance') IS NOT NULL")->whereNull('parent_id');
    }

    /** Admin: the pre-order board summary — pending / processing / delivered / overdue. */
    public function preorderSummary(Request $request)
    {
        $counts = ['pending_advance' => 0, 'processing' => 0, 'delivered' => 0, 'overdue' => 0, 'total' => 0];
        $overdue = [];

        $this->preorderOrders()->with('products:id,name')->chunkById(300, function ($orders) use (&$counts, &$overdue) {
            foreach ($orders as $o) {
                $counts['total']++;
                $clock = $this->preorderClock($o);
                $paid = (float) $o->paid_total > 0;

                if ($clock['delivered']) {
                    $counts['delivered']++;
                } elseif (!$paid) {
                    $counts['pending_advance']++;
                } else {
                    $counts['processing']++;
                }
                if ($clock['late']) {
                    $counts['overdue']++;
                    if (count($overdue) < 50) {
                        $overdue[] = [
                            'order_id'        => (int) $o->id,
                            'tracking_number' => $o->tracking_number,
                            'customer_name'   => $o->customer_name,
                            'days'            => $clock['days'],
                            'total'           => (float) $o->total,
                            'paid'            => (float) $o->paid_total,
                        ];
                    }
                }
            }
        });

        return ['counts' => $counts, 'overdue' => $overdue, 'window_days' => 28];
    }

    /* ---------------------------------------------------------------------------------------- *
     *  Order board — the tab badges, the totals and the list all come from here.
     * ---------------------------------------------------------------------------------------- */

    /**
     * order_status → board bucket. Mirrors TO_BUCKET in
     * admin/rest/src/components/order/indo-order-board.tsx — change one, change the other.
     *
     * 'pending' is deliberately absent. The board resolves `TO_BUCKET[status] || 'pending'`, so
     * pending means "every status not named here"; boardTab() mirrors that with a NOT IN, which
     * also keeps a status nobody has mapped yet visible instead of dropping it from every tab.
     */
    private const BOARD_BUCKETS = [
        'ready'     => ['order-processing', 'order-at-local-facility'],
        'shipped'   => ['order-out-for-delivery'],
        'transit'   => [],   // nothing maps here — TO_BUCKET has no transit status either
        'delivered' => ['order-completed'],
        'returned'  => ['order-cancelled', 'order-refunded'],
        'void'      => ['order-void'],
    ];

    /** The board's isOpen() is the negation of this list. */
    private const BOARD_CLOSED_STATUSES = ['order-completed', 'order-cancelled', 'order-refunded', 'order-void'];

    /** Tiers the board doesn't ask you to phone — TIERS[*].skipCall in indo-order-board.tsx. */
    private const BOARD_SKIP_CALL_TIERS = ['regular', 'prime', 'star'];

    /**
     * 'void' and 'archived' sit outside the bucket partition on purpose.
     *
     * Voiding archives the order, and the board's default view hides archived rows — so a 'void'
     * tab that respected that filter would always read 0 and there would be no way to look at
     * what you had voided. Both tabs therefore ignore the archived filter; the other tabs still
     * partition the working list exactly.
     */
    private const BOARD_TABS = ['all', 'attention', 'printstuck', 'pending', 'ready', 'shipped', 'transit', 'delivered', 'returned', 'void', 'archived'];

    /** Tabs that deliberately look past the "hide archived" default. */
    private const BOARD_TABS_INCLUDING_ARCHIVED = ['void', 'archived'];

    /**
     * The orders this user is allowed to see on the board.
     *
     * Mirrors OrderController::fetchOrders(), including its parent_id rule, which is easy to miss:
     * a super admin sees only *parent* orders, while a store owner or staff member sees the
     * per-shop *child* rows. A looser query here would quietly show one shop another shop's
     * orders, so this stays a deliberate copy of the access rules.
     */
    private function boardScope(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
        // getPermissionNames(), not hasPermissionTo(): the latter throws when a permission isn't
        // registered on this install instead of returning false.
        $held = $user->getPermissionNames()->all();
        $q = Order::query();

        if (in_array(Permission::SUPER_ADMIN, $held, true)) {
            return $request->filled('shop_id')
                ? $q->where('orders.shop_id', $request->input('shop_id'))->whereNotNull('orders.parent_id')
                : $q->whereNull('orders.parent_id');
        }
        if (in_array(Permission::STORE_OWNER, $held, true)) {
            return $q->whereNotNull('orders.parent_id')->whereIn('orders.shop_id', $user->shops->pluck('id'));
        }
        if (in_array(Permission::STAFF, $held, true)) {
            return $q->whereNotNull('orders.parent_id')->where('orders.shop_id', $user->shop_id);
        }
        throw new MarvelException(NOT_AUTHORIZED);
    }

    /**
     * A customer's tier, as SQL. Mirrors computeTier() in indo-order-board.tsx over the numbers
     * orderCustomerStats() feeds it — and those count a customer's *whole* history (parent and
     * child rows, no parent_id filter), so this subquery must not filter either, or the tier the
     * count uses would disagree with the badge drawn on the card. Needs boardWithTier()'s join.
     */
    private function boardTierExpr(): string
    {
        $tot = 'COALESCE(cs.t, 0)';
        $ret = 'COALESCE(cs.r, 0)';
        // computeTier divides only when total is non-zero. NULLIF reproduces that: the rate goes
        // NULL, and NULL never satisfies < or >, so those branches fall through exactly as the
        // `total ? ret / total : 0` guard does.
        $rate = "($ret / NULLIF($tot, 0))";
        // A JSON null unquotes to the *string* 'null', which would beat the falsy check that
        // `if (override) return override` does in JS. Treat it as absent.
        $ovr = "JSON_UNQUOTE(JSON_EXTRACT(orders.ops_meta, '$.tier'))";
        return "CASE
            WHEN $ovr IS NOT NULL AND $ovr <> 'null' THEN $ovr
            WHEN $ret >= 2 AND $rate > 0.2 THEN 'risky'
            WHEN $tot >= 30 AND $ret = 0 THEN 'star'
            WHEN $tot >= 15 AND $rate <= 0.1 THEN 'prime'
            WHEN $tot >= 5  AND $rate <= 0.2 THEN 'regular'
            ELSE 'new'
        END";
    }

    /** Joins each order to its customer's lifetime totals, so boardTierExpr() can read them. */
    private function boardWithTier($q)
    {
        $stats = DB::table('orders')
            ->selectRaw("customer_id, COUNT(*) AS t, SUM(order_status IN ('order-cancelled','order-refunded')) AS r")
            ->whereNull('deleted_at')
            // Must match orderCustomerStats() exactly — that is what draws the tier badge on the
            // card, and a tier computed from a different set would contradict it on screen.
            ->where('order_status', '!=', \Marvel\Enums\OrderStatus::VOID)
            ->groupBy('customer_id');
        return $q->leftJoinSub($stats, 'cs', 'cs.customer_id', '=', 'orders.customer_id');
    }

    /** needsAttention() from the board, as SQL. */
    private function boardAttentionWhere(): string
    {
        $tier   = $this->boardTierExpr();
        $call   = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(orders.ops_meta, '$.call_status')), 'none')";
        $print  = "JSON_UNQUOTE(JSON_EXTRACT(orders.ops_meta, '$.print_status'))";
        $skip   = "'" . implode("','", self::BOARD_SKIP_CALL_TIERS) . "'";
        $closed = "'" . implode("','", self::BOARD_CLOSED_STATUSES) . "'";

        // ageDays >= 3 in the board is floor((now - created)/86400000) >= 3, i.e. created at
        // least 3×24h ago — which is what INTERVAL 3 DAY means here.
        return "orders.order_status NOT IN ($closed) AND (
            ($tier NOT IN ($skip) AND $call IN ('none','noanswer'))
            OR orders.created_at <= (NOW() - INTERVAL 3 DAY)
            OR $tier = 'risky'
            OR $print = 'sent'
        )";
    }

    /**
     * Narrow a board query to one tab. Every count and the list itself go through this, so a
     * badge and the list it opens describe the same set by construction rather than by luck.
     */
    private function boardTab($q, ?string $tab)
    {
        // Archived orders are out of the working list; only the tabs meant to look at them do.
        if (!in_array($tab, self::BOARD_TABS_INCLUDING_ARCHIVED, true)) {
            $q->whereNull('orders.archived_at');
        }

        switch ($tab) {
            case 'attention':
                return $this->boardWithTier($q)->whereRaw($this->boardAttentionWhere());
            case 'printstuck':
                return $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(orders.ops_meta, '$.print_status')) = 'sent'");
            case 'pending':
                return $q->whereNotIn('orders.order_status', array_merge(...array_values(self::BOARD_BUCKETS)));
            case 'archived':
                return $q->whereNotNull('orders.archived_at');
            case 'ready':
            case 'shipped':
            case 'transit':
            case 'delivered':
            case 'returned':
            case 'void':
                return $q->whereIn('orders.order_status', self::BOARD_BUCKETS[$tab]);
            default:
                return $q;
        }
    }

    /**
     * The pre-order ids in one state, classified by the *same* preorderClock() that
     * preorderSummary() counts with — so clicking a summary card can never open a list that
     * disagrees with the number printed on it.
     */
    private function boardPreorderIds(string $state): array
    {
        $ids = [];
        $this->preorderOrders()->chunkById(300, function ($orders) use (&$ids, $state) {
            foreach ($orders as $o) {
                $clock = $this->preorderClock($o);
                $paid  = (float) $o->paid_total > 0;
                $ops   = (array) ($o->ops_meta ?? []);
                switch ($state) {
                    case 'pending_advance': $match = !$clock['delivered'] && !$paid; break;
                    case 'processing':      $match = !$clock['delivered'] && $paid;  break;
                    case 'delivered':       $match = (bool) $clock['delivered'];     break;
                    case 'overdue':         $match = (bool) $clock['late'];          break;
                    case 'admin':           $match = ($ops['source'] ?? null) === 'admin-preorder'; break;
                    default:                $match = true;
                }
                if ($match) {
                    $ids[] = (int) $o->id;
                }
            }
        });
        return $ids;
    }

    /**
     * Everything the order board draws: tab badges, the four totals, and the page of orders.
     *
     * The board used to fetch ten orders and count *those*, so "Pending 3" meant "3 of the 10
     * you happen to be looking at" rather than 3 of 8,000. Counting and filtering both live here
     * now, and both are built from boardScope() + boardTab(), so they always describe one set.
     */
    public function orderBoard(Request $request)
    {
        $this->assertOrderDeskAccess($request);

        $f = $request->validate([
            'tab'      => 'nullable|string|in:' . implode(',', self::BOARD_TABS),
            'preorder' => 'nullable|string|in:all,pending_advance,processing,delivered,overdue,admin',
            'page'     => 'nullable|integer|min:1',
            'limit'    => 'nullable|integer|min:1|max:100',
        ]);
        $tab   = $f['tab'] ?? 'all';
        $limit = (int) ($f['limit'] ?? 10);

        // Resolved once: the classification loop is the same work preorderSummary() already does.
        $preorderIds = !empty($f['preorder']) ? $this->boardPreorderIds($f['preorder']) : null;

        // A fresh builder per query — Eloquent builders accumulate, so counts must not share one.
        $base = function () use ($request, $preorderIds) {
            $q = $this->boardScope($request);
            if ($preorderIds !== null) {
                $q->whereIn('orders.id', $preorderIds);   // an empty list matches nothing, as intended
            }
            return $q;
        };

        $counts = [];
        foreach (self::BOARD_TABS as $t) {
            $counts[$t] = (int) $this->boardTab($base(), $t)->count('orders.id');
        }

        // The board's own totals: items + delivery, and books by quantity. `total` is not usable
        // here — it has the discount already taken off, which the on-screen figure does not.
        $items = 'COALESCE((SELECT SUM(op.subtotal) FROM order_product op WHERE op.order_id = orders.id), 0)';
        $books = 'COALESCE((SELECT SUM(op.order_quantity) FROM order_product op WHERE op.order_id = orders.id), 0)';
        $row = $this->boardTab($base(), $tab)->selectRaw(
            "COUNT(*) AS n_orders, COALESCE(SUM($books), 0) AS n_books, COALESCE(SUM($items + orders.delivery_fee), 0) AS n_value"
        )->first();

        // paid, mirroring the board: settled gateway, or enough money already taken.
        $unpaid = $this->boardTab($base(), $tab)
            ->whereNotIn('orders.order_status', self::BOARD_CLOSED_STATUSES)
            // Same reasoning as orderIsPaid(): paid_total >= total is true for every COD
            // order by construction, which hid them all from the unpaid count.
            ->where('orders.payment_status', '!=', 'payment-success')
            ->count('orders.id');

        $page = $this->boardTab($base(), $tab)
            ->select('orders.*')
            ->orderByDesc('orders.created_at')
            ->paginate($limit, ['*'], 'page', (int) ($f['page'] ?? 1));

        return [
            'status'    => 'success',
            'data'      => $page->items(),
            'paginator' => [
                'total'       => $page->total(),
                'currentPage' => $page->currentPage(),
                'lastPage'    => $page->lastPage(),
                'perPage'     => $page->perPage(),
            ],
            'counts'  => $counts,
            'summary' => [
                'orders' => (int) ($row->n_orders ?? 0),
                'books'  => (int) ($row->n_books ?? 0),
                'value'  => round((float) ($row->n_value ?? 0)),
                'unpaid' => (int) $unpaid,
            ],
        ];
    }

    /* ---------------------------------------------------------------------------------------- *
     *  Order lifecycle — void, archive, unlock
     * ---------------------------------------------------------------------------------------- */

    /** How long after delivery the desk can still act before an order locks itself. */
    private const ADMIN_ACTION_DAYS = 7;

    /** How long after delivery the customer can still ask for a return / exchange. */
    private const CUSTOMER_RETURN_DAYS = 3;

    /**
     * When an order was delivered.
     *
     * ops_meta.delivered_at is stamped by the Order model the moment a status becomes
     * 'order-completed', but only orders delivered since that hook existed carry it — the older
     * history has nothing. updated_at is the honest fallback: for a delivered order it is the
     * last time anyone touched it, which in practice is the delivery itself.
     */
    private function deliveredAt(Order $order): ?Carbon
    {
        $ops = (array) ($order->ops_meta ?? []);
        $stamp = $ops['delivered_at'] ?? null;
        if ($stamp) {
            return Carbon::parse($stamp);
        }
        return $order->updated_at ? Carbon::parse($order->updated_at) : null;
    }

    /**
     * The desk's lifecycle actions on one order.
     *
     * Void, archive and unarchive are ordinary desk work. Unlock is not: it reopens an order the
     * system already closed, so it is super-admin only and always leaves a note behind.
     */
    public function orderLifecycle(Request $request)
    {
        $this->assertOrderDeskAccess($request);

        $data = $request->validate([
            'order_id' => 'required|integer',
            'action'   => 'required|string|in:void,unvoid,archive,unarchive,unlock',
            'reason'   => 'nullable|string|max:500',
        ]);

        $order = Order::findOrFail($data['order_id']);
        $user  = $request->user();
        $isSuperAdmin = $user && $user->getPermissionNames()->contains(Permission::SUPER_ADMIN);
        $ops = (array) ($order->ops_meta ?? []);
        $who = $user->name ?? 'Admin';

        switch ($data['action']) {
            case 'void':
                if ($order->order_status === OrderStatus::VOID) {
                    return ['status' => 'success', 'message' => 'Already void.'];
                }
                // Remember where it came from: unvoid has to put it back, and there is no other
                // record of the status once it is overwritten.
                $ops['void'] = [
                    'from'   => $order->order_status,
                    'by'     => $who,
                    'at'     => now()->toIso8601String(),
                    'reason' => $data['reason'] ?? null,
                ];
                $order->ops_meta = $ops;
                $order->order_status = OrderStatus::VOID;
                // Voiding is the desk saying "this was never a real order", so it leaves the
                // working list at the same moment — that is what auto-archive means here.
                $order->archived_at = now();
                $order->save();   // saved, not saveQuietly: the updated hook puts the books back
                break;

            case 'unvoid':
                if ($order->order_status !== OrderStatus::VOID) {
                    throw new MarvelException('This order is not void.');
                }
                if (!$isSuperAdmin) {
                    throw new MarvelException(NOT_AUTHORIZED);
                }
                $back = $ops['void']['from'] ?? OrderStatus::PENDING;
                // The void released this order's books. Bringing it back has to take them again,
                // or the shelf count stays inflated by an order that is live once more. Clearing
                // the flags lets commitStock do its normal, idempotent job.
                if (!empty($ops['stock_released'])) {
                    unset($ops['stock_released'], $ops['stock_committed']);
                }
                unset($ops['void']);
                $order->ops_meta = $ops;
                $order->order_status = $back;
                $order->archived_at = null;
                $order->save();
                Order::commitStock($order->fresh());
                break;

            case 'archive':
                $order->archived_at = now();
                $order->save();
                break;

            case 'unarchive':
                $order->archived_at = null;
                $order->save();
                break;

            case 'unlock':
                if (!$isSuperAdmin) {
                    throw new MarvelException(NOT_AUTHORIZED);
                }
                if (!$order->locked_at) {
                    return ['status' => 'success', 'message' => 'Not locked.'];
                }
                // Reopening a closed order is worth a trail — it is the one action here that
                // undoes something the system decided on its own.
                $ops['unlocks'] = array_slice(array_merge($ops['unlocks'] ?? [], [[
                    'by'     => $who,
                    'at'     => now()->toIso8601String(),
                    'reason' => $data['reason'] ?? null,
                ]]), -10);
                $order->ops_meta = $ops;
                $order->locked_at = null;
                $order->save();
                break;
        }

        $fresh = $order->fresh();
        return [
            'status'      => 'success',
            'order_id'    => (int) $fresh->id,
            'order_status' => $fresh->order_status,
            'locked_at'   => $fresh->locked_at,
            'archived_at' => $fresh->archived_at,
            'ops_meta'    => $fresh->ops_meta,
        ];
    }

    /**
     * Close out every delivered order whose windows have run out.
     *
     * Called by the scheduled sweep. Returns how many it locked so the command can report it.
     * Uses a plain UPDATE on purpose: this only sets locked_at, so there is no status change to
     * account for, and going through Eloquent would fire the admin Telegram notifier once per
     * order — thousands of messages on the first run.
     */
    public function lockDeliveredOrders(int $days = self::ADMIN_ACTION_DAYS): int
    {
        // COALESCE, matching deliveredAt(): use the stamped delivery time when the order has one
        // and fall back to updated_at for the history that predates the stamp.
        $delivered = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ops_meta, '$.delivered_at')), updated_at)";
        return DB::table('orders')
            ->whereNull('deleted_at')
            ->whereNull('locked_at')
            ->where('order_status', OrderStatus::COMPLETED)
            ->whereRaw("$delivered <= (NOW() - INTERVAL ? DAY)", [$days])
            ->update(['locked_at' => now()]);
    }



    /**
     * Void pre-orders whose advance was never paid, after a grace period.
     *
     * Targets only stampPreorder orders (`ops_meta.advance.status = pending_advance`) still
     * pending with nothing paid — never a COD order, never a partial payment, never a
     * bank-transfer awaiting verification. Goes through save() (not a bulk UPDATE) on purpose:
     * the Order model's `updated` hook is what puts the reserved books back and hands the
     * pre-order slot back; a plain UPDATE would skip it.
     */
    public function voidAbandonedPreorders(int $hours = 24, int $limit = 200): int
    {
        $orders = Order::whereNull('deleted_at')
            ->where('order_status', 'order-pending')
            ->where('payment_status', 'payment-pending')
            ->where(function ($q) {
                $q->whereNull('paid_total')->orWhere('paid_total', '<=', 0);
            })
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(ops_meta, '$.advance.status')) = 'pending_advance'")
            ->where('created_at', '<=', now()->subHours(max(1, $hours)))
            ->orderBy('id')
            ->limit(max(1, $limit))
            ->get();

        $voided = 0;
        foreach ($orders as $order) {
            try {
                if ($order->order_status === OrderStatus::VOID) {
                    continue;
                }
                $ops = (array) ($order->ops_meta ?? []);
                $ops['void'] = [
                    'from'   => $order->order_status,
                    'by'     => 'system (auto)',
                    'at'     => now()->toIso8601String(),
                    'reason' => "pre-order advance unpaid > {$hours}h",
                ];
                $order->ops_meta = $ops;
                $order->order_status = OrderStatus::VOID;
                $order->archived_at = now();
                $order->save(); // saved, not saveQuietly: the updated hook releases stock + slot
                $voided++;
            } catch (\Throwable $e) {
                // one bad order must not stop the sweep
            }
        }
        return $voided;
    }

    /** Admin: which books are open for pre-order, and how they're tracking. */
    public function preorderProducts(Request $request)
    {
        $items = Product::where('is_preorder', true)
            ->with(['author:id,name', 'manufacturer:id,name'])
            ->orderByDesc('preorder_count')
            ->limit(300)
            ->get();

        $data = $items->map(function ($p) {
            $until  = $p->preorder_until ? Carbon::parse($p->preorder_until) : null;
            $closed = $until && $until->isPast();
            $limit  = $p->preorder_limit ? (int) $p->preorder_limit : null;
            $count  = (int) $p->preorder_count;
            $full   = $limit !== null && $count >= $limit;
            return [
                'product_id' => (int) $p->id,
                'name'       => $p->name,
                'slug'       => $p->slug,
                'image'      => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'author'     => $p->author->name ?? null,
                'publisher'  => $p->manufacturer->name ?? null,
                'price'      => (float) $p->price,
                'advance_pct' => (int) ($p->preorder_advance_pct ?: 50),
                'until'      => $p->preorder_until,
                'limit'      => $limit,               // null = unlimited
                'count'      => $count,
                'remaining'  => $limit !== null ? max(0, $limit - $count) : null,
                'status'     => $closed ? 'closed' : ($full ? 'full' : 'open'),
            ];
        });

        return ['data' => $data, 'total' => $data->count()];
    }

    /** Admin: open/close a book for pre-order straight from the pre-order list. */
    public function preorderUpdate(Request $request)
    {
        $data = $request->validate([
            'product_id'   => 'required|integer',
            'is_preorder'  => 'required|boolean',
            'until'        => 'nullable|date',
            'limit'        => 'nullable|integer|min:0',      // 0/null = unlimited
            'advance_pct'  => 'nullable|integer|min:1|max:100',
        ]);
        $p = Product::findOrFail($data['product_id']);
        $p->is_preorder = (bool) $data['is_preorder'];
        $p->preorder_until = $data['until'] ?? null;
        $p->preorder_limit = !empty($data['limit']) ? (int) $data['limit'] : null;
        $p->preorder_advance_pct = (int) ($data['advance_pct'] ?? 50);
        $p->saveQuietly();
        Cache::increment('catalog:version');

        return ['status' => 'success', 'product_id' => $p->id, 'is_preorder' => (bool) $p->is_preorder];
    }

    // ============================================================ CUSTOMERS OVERVIEW
    /** Order statuses that mean the money is real. */
    private const PAID_STATUSES = [
        'order-completed', 'order-processing', 'order-out-for-delivery', 'order-at-local-facility',
    ];

    /**
     * Admin: the customers page — headline numbers, a revenue trend, segments, and the
     * customer rows with what each has actually spent and ordered.
     */
    public function customersOverview(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $page   = max(1, (int) $request->input('page', 1));
        $limit  = min(60, max(1, (int) $request->input('limit', 20)));

        $paid = "'" . implode("','", self::PAID_STATUSES) . "'";
        $spentSql  = "COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.customer_id = users.id AND o.order_status IN ($paid)),0)";
        $ordersSql = "COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = users.id),0)";
        $doneSql   = "COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = users.id AND o.order_status = 'order-completed'),0)";
        $backSql   = "COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = users.id AND o.order_status IN ('order-refunded','order-cancelled')),0)";
        $lastSql   = "(SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = users.id)";
        $rateSql   = "(SELECT AVG(r.rating) FROM reviews r WHERE r.user_id = users.id)";

        $base = User::query()
            ->whereHas('permissions', fn ($q) => $q->where('name', Permission::CUSTOMER));

        $rows = (clone $base)
            ->with('wallet:id,customer_id,available_points')
            ->select('users.*')
            ->selectRaw("$spentSql AS spent")
            ->selectRaw("$ordersSql AS orders_count")
            ->selectRaw("$doneSql AS delivered_count")
            ->selectRaw("$backSql AS returned_count")
            ->selectRaw("$lastSql AS last_order_at")
            ->selectRaw("$rateSql AS avg_rating");

        if ($search !== '') {
            $like = '%' . $search . '%';
            $rows->where(fn ($w) => $w->where('users.name', 'like', $like)
                ->orWhere('users.email', 'like', $like));
        }

        $paginator = $rows->orderByDesc('spent')->paginate($limit, ['*'], 'page', $page);

        // The three most recent orders per customer on this page — one query, not one each.
        $ids = collect($paginator->items())->pluck('id');
        $recent = \Illuminate\Support\Facades\DB::table('orders')
            ->whereIn('customer_id', $ids)
            ->orderByDesc('created_at')
            ->get(['id', 'customer_id', 'tracking_number', 'total', 'order_status', 'created_at'])
            ->groupBy('customer_id');

        $data = collect($paginator->items())->map(function ($u) use ($recent) {
            $spent = (float) $u->spent;
            $done = (int) $u->delivered_count;
            $back = (int) $u->returned_count;
            $settled = $done + $back;
            return [
                'id'            => (int) $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'contact'       => $u->profile->contact ?? null,
                'is_active'     => (bool) $u->is_active,
                'wallet_points' => (int) ($u->wallet->available_points ?? 0),
                'spent'         => round($spent),
                'orders_count'  => (int) $u->orders_count,
                'delivered'     => $done,
                'returned'      => $back,
                // Happiness is just how much of what they settled actually stuck.
                'happiness'     => $settled > 0 ? (int) round($done / $settled * 100) : 100,
                'rating'        => $u->avg_rating ? round((float) $u->avg_rating, 1) : null,
                'last_order_at' => $u->last_order_at,
                'segment'       => $spent >= 25000 ? 'high' : ($spent >= 5000 ? 'regular' : 'low'),
                'orders'        => ($recent->get($u->id) ?? collect())->take(3)->map(fn ($o) => [
                    'no'     => $o->tracking_number,
                    'amount' => round((float) $o->total),
                    'status' => $o->order_status,
                    'date'   => $o->created_at,
                ])->values(),
            ];
        })->values();

        return [
            'data'         => $data,
            'total'        => $paginator->total(),
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'stats'        => $this->customerStats($base, $paid),
            'trend'        => $this->revenueTrend($paid),
        ];
    }

    /** Headline numbers + segment split across every customer, not just this page. */
    private function customerStats($base, string $paid): array
    {
        $spentExpr = "COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.customer_id = users.id AND o.order_status IN ($paid)),0)";

        $revenue = (float) \Illuminate\Support\Facades\DB::table('orders')
            ->whereIn('order_status', self::PAID_STATUSES)->sum('total');

        $high = (clone $base)->whereRaw("$spentExpr >= 25000")->count();
        $regular = (clone $base)->whereRaw("$spentExpr >= 5000 AND $spentExpr < 25000")->count();
        $low = (clone $base)->whereRaw("$spentExpr < 5000")->count();

        // Nobody home for two months, but they did buy once — worth chasing.
        $atRisk = (clone $base)
            ->whereRaw("(SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = users.id) < ?", [now()->subDays(60)])
            ->count();

        return [
            'total'         => $high + $regular + $low,
            'total_revenue' => round($revenue),
            'high_value'    => $high,
            'regular'       => $regular,
            'low_value'     => $low,
            'new_30d'       => (clone $base)->where('users.created_at', '>=', now()->subDays(30))->count(),
            'at_risk'       => $atRisk,
        ];
    }

    /** Revenue for each of the last 6 months, oldest first. */
    private function revenueTrend(string $paid): array
    {
        $out = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $total = (float) \Illuminate\Support\Facades\DB::table('orders')
                ->whereIn('order_status', self::PAID_STATUSES)
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum('total');
            $out[] = ['label' => $month->format('M'), 'value' => round($total)];
        }
        return $out;
    }

    // ============================================================ 1-MINUTE BOOK CHALLENGE
    /** Rules of the challenge. Admin owns every number here. */
    private function challengeConfig(): array
    {
        $o = $this->options();
        $c = is_array($o['challenge'] ?? null) ? $o['challenge'] : [];
        return [
            'enabled'         => (bool) ($c['enabled'] ?? false),
            'duration_sec'    => (int) ($c['duration_sec'] ?? 60),
            'per_book_pct'    => (float) ($c['per_book_pct'] ?? 1),
            'cap_pct'         => (float) ($c['cap_pct'] ?? 10),
            'stake_points'    => (int) ($c['stake_points'] ?? 100),
            'coupon_minutes'  => (int) ($c['coupon_minutes'] ?? 20),
            'daily_limit'     => (int) ($c['daily_limit'] ?? 1),
        ];
    }

    /**
     * Public: the challenge rules, for the home-page banner.
     *
     * Guests need to see this too — the banner is how they find out the game exists — so it
     * carries no wallet or run state, only the rules.
     */
    public function challengeInfo(Request $request)
    {
        $cfg = $this->challengeConfig();
        return [
            'enabled'      => $cfg['enabled'],
            'duration_sec' => $cfg['duration_sec'],
            'per_book_pct' => $cfg['per_book_pct'],
            'cap_pct'      => $cfg['cap_pct'],
            'stake_points' => $cfg['stake_points'],
            'daily_limit'  => $cfg['daily_limit'],
        ];
    }

    /** Admin: read/write the challenge rules (super-admin). */
    public function challengeSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'enabled'        => 'nullable|boolean',
                'duration_sec'   => 'nullable|integer|min:10|max:600',
                'per_book_pct'   => 'nullable|numeric|min:0|max:100',
                'cap_pct'        => 'nullable|numeric|min:0|max:100',
                'stake_points'   => 'nullable|integer|min:0',
                'coupon_minutes' => 'nullable|integer|min:1|max:1440',
                'daily_limit'    => 'nullable|integer|min:1|max:20',
            ]);
            $settings = Settings::first();
            $options = $settings->options;
            $options['challenge'] = array_merge(
                $this->challengeConfig(),
                array_filter($data, fn ($v) => $v !== null)
            );
            $settings->options = $options;
            $settings->save();
        }
        return $this->challengeConfig();
    }

    /**
     * A run whose minute ran out without a checkout has lost its stake — and so has one
     * that earned a coupon and then let it expire without ordering.
     */
    private function expireRun(ChallengeRun $run): ChallengeRun
    {
        if ($run->status === ChallengeRun::RUNNING && $run->expires_at->isPast()) {
            $run->status = ChallengeRun::FORFEITED;
            $run->save();
        }
        if ($run->status === ChallengeRun::CHECKOUT && $run->coupon_id) {
            $coupon = \Marvel\Database\Models\Coupon::find($run->coupon_id);
            if (!$coupon || now()->gt(\Carbon\Carbon::parse($coupon->expire_at))) {
                $run->status = ChallengeRun::FORFEITED;
                $run->save();
            }
        }
        return $run;
    }

    /** Is the customer mid-challenge — still playing, or holding an unspent coupon? */
    private function pendingRun(int $userId): ?ChallengeRun
    {
        $run = ChallengeRun::where('user_id', $userId)
            ->whereIn('status', [ChallengeRun::RUNNING, ChallengeRun::CHECKOUT])
            ->latest('id')->first();
        if (!$run) {
            return null;
        }
        $run = $this->expireRun($run);
        return in_array($run->status, [ChallengeRun::RUNNING, ChallengeRun::CHECKOUT], true)
            ? $run
            : null;
    }

    /** How many runs the customer has already used up today. */
    private function runsToday(int $userId): int
    {
        return ChallengeRun::where('user_id', $userId)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();
    }

    /** Customer: can I play, and is a run already going? */
    public function challengeStatus(Request $request)
    {
        $user = $request->user();
        $cfg = $this->challengeConfig();
        $wallet = Wallet::where('customer_id', $user->id)->first();
        $points = (float) ($wallet->available_points ?? 0);

        $active = ChallengeRun::where('user_id', $user->id)
            ->where('status', ChallengeRun::RUNNING)
            ->latest('id')->first();
        if ($active) {
            $active = $this->expireRun($active);
        }
        $live = $active && $active->isLive() ? $active : null;

        $used = $this->runsToday($user->id);
        $reason = null;
        if (!$cfg['enabled']) {
            $reason = 'চ্যালেঞ্জ এখন বন্ধ আছে।';
        } elseif ($points < $cfg['stake_points']) {
            $reason = "চ্যালেঞ্জে অংশ নিতে ওয়ালেটে অন্তত {$cfg['stake_points']} পয়েন্ট থাকতে হবে। আপনার আছে " . round($points) . "।";
        } elseif (!$live && $used >= $cfg['daily_limit']) {
            $reason = 'আজকের চ্যালেঞ্জ শেষ — আগামীকাল আবার চেষ্টা করুন।';
        }

        // `pending` is what tells the shop to keep the customer's old cart parked: it stays
        // true from the moment the minute starts until they either order or lose the coupon.
        $pending = $this->pendingRun($user->id);

        return [
            'config'      => $cfg,
            'points'      => round($points),
            'used_today'  => $used,
            'eligible'    => $reason === null && !$live,
            'reason'      => $reason,
            'pending'     => (bool) $pending,
            'active'      => $live ? [
                'run_id'       => $live->id,
                'books'        => $live->books_count,
                'seconds_left' => max(0, now()->diffInSeconds($live->expires_at, false)),
                'discount_pct' => $this->challengeDiscount($live->books_count, $cfg),
            ] : null,
        ];
    }

    /** Books added → percent off, capped. */
    private function challengeDiscount(int $books, array $cfg): float
    {
        return min($books * $cfg['per_book_pct'], $cfg['cap_pct']);
    }

    /**
     * Customer: start the minute.
     *
     * The stake is taken here, up front. That is what makes an abandoned run settle itself:
     * walking away costs the points with no background job needed, and finishing the order
     * hands them straight back (see ChallengeRun::settleForOrder).
     */
    public function challengeStart(Request $request)
    {
        $user = $request->user();
        $cfg = $this->challengeConfig();

        if (!$cfg['enabled']) {
            throw new MarvelException('চ্যালেঞ্জ এখন বন্ধ আছে।');
        }

        // One run at a time, per person — a second tab cannot open its own minute.
        $active = ChallengeRun::where('user_id', $user->id)
            ->where('status', ChallengeRun::RUNNING)->latest('id')->first();
        if ($active) {
            $this->expireRun($active);
            if ($active->isLive()) {
                throw new MarvelException('চ্যালেঞ্জ ইতিমধ্যেই চলছে — অন্য ট্যাবটি ব্যবহার করুন।');
            }
        }

        if ($this->runsToday($user->id) >= $cfg['daily_limit']) {
            throw new MarvelException('আজকের চ্যালেঞ্জ শেষ — আগামীকাল আবার চেষ্টা করুন।');
        }

        $wallet = Wallet::where('customer_id', $user->id)->first();
        $stake = $cfg['stake_points'];
        if (!$wallet || (float) $wallet->available_points < $stake) {
            throw new MarvelException("চ্যালেঞ্জে অংশ নিতে ওয়ালেটে অন্তত {$stake} পয়েন্ট থাকতে হবে।");
        }

        $run = null;
        DB::transaction(function () use (&$run, $user, $wallet, $stake, $cfg) {
            if ($stake > 0) {
                $wallet->available_points -= $stake;
                $wallet->points_used += $stake;
                $wallet->save();
            }
            $run = ChallengeRun::create([
                'user_id'       => $user->id,
                'session_token' => Str::random(48),
                'started_at'    => now(),
                'expires_at'    => now()->addSeconds($cfg['duration_sec']),
                'status'        => ChallengeRun::RUNNING,
                'product_ids'   => [],
                'points_staked' => $stake,
            ]);
        });

        return [
            'status'        => 'success',
            'run_id'        => $run->id,
            'token'         => $run->session_token,
            'seconds_left'  => $cfg['duration_sec'],
            'staked_points' => $stake,
            'config'        => $cfg,
        ];
    }

    /** The run the caller's tab owns, or nothing. */
    private function runForToken(Request $request): ChallengeRun
    {
        $run = ChallengeRun::where('user_id', $request->user()->id)
            ->where('session_token', (string) $request->input('token'))
            ->latest('id')->first();
        if (!$run) {
            throw new MarvelException('চ্যালেঞ্জটি খুঁজে পাওয়া যায়নি।');
        }
        return $run;
    }

    /**
     * Customer: a book went into the cart during the minute.
     *
     * The count is kept here rather than read off the cart at checkout, because the cart
     * lives in the browser — anything it claims is unverifiable.
     */
    public function challengeAdd(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'token'      => 'required|string',
            'source'     => 'required|string',
            'page_key'   => 'nullable|string',
        ]);
        $cfg = $this->challengeConfig();
        $run = $this->expireRun($this->runForToken($request));

        if (!$run->isLive()) {
            throw new MarvelException('সময় শেষ — এই বইটি আর গোনা হবে না।');
        }

        // The hunt is the game: books must be found on their own page, not picked off a
        // wishlist, a bundle strip, or a listing grid.
        if ($request->input('source') !== 'product') {
            throw new MarvelException('চ্যালেঞ্জে বইয়ের নিজস্ব পেজ থেকে যোগ করতে হবে — উইশলিস্ট, বান্ডল বা লিস্ট থেকে নয়।');
        }
        if (!Product::where('id', $request->product_id)->exists()) {
            throw new MarvelException('বইটি পাওয়া যায়নি।');
        }

        // Distinct titles only: the same book five times is still one book.
        $ids = $run->product_ids ?? [];
        if (in_array((int) $request->product_id, $ids, true)) {
            return [
                'books'        => $run->books_count,
                'discount_pct' => $this->challengeDiscount($run->books_count, $cfg),
                'seconds_left' => max(0, now()->diffInSeconds($run->expires_at, false)),
                'already'      => true,
            ];
        }

        $pageKey = (string) ($request->input('page_key') ?: $request->input('product_id'));
        $hits = $run->page_hits ?? [];
        if ((int) ($hits[$pageKey] ?? 0) >= ChallengeRun::MAX_PER_PAGE) {
            throw new MarvelException('একটি পেজ থেকে সর্বোচ্চ ' . ChallengeRun::MAX_PER_PAGE . 'টি বই নেওয়া যাবে — অন্য বই খুঁজুন।');
        }
        $hits[$pageKey] = (int) ($hits[$pageKey] ?? 0) + 1;

        $ids[] = (int) $request->product_id;
        $run->product_ids = $ids;
        $run->page_hits = $hits;
        $run->books_count = count($ids);
        $run->save();

        return [
            'books'        => $run->books_count,
            'discount_pct' => $this->challengeDiscount($run->books_count, $cfg),
            'seconds_left' => max(0, now()->diffInSeconds($run->expires_at, false)),
        ];
    }

    /**
     * Customer: the minute is up — turn the books into a coupon.
     *
     * The discount rides the normal coupon flow (bound to this customer, short-lived), so
     * checkout needs no special case and the code is useless to anyone else.
     */
    public function challengeFinish(Request $request)
    {
        $request->validate(['token' => 'required|string']);
        $cfg = $this->challengeConfig();
        $run = $this->runForToken($request);

        if ($run->status === ChallengeRun::CHECKOUT && $run->coupon_id) {
            $coupon = \Marvel\Database\Models\Coupon::find($run->coupon_id);
            if ($coupon) {
                return [
                    'status'       => 'success',
                    'code'         => $coupon->code,
                    'discount_pct' => (float) $coupon->amount,
                    'books'        => $run->books_count,
                    'expires_at'   => $coupon->expire_at,
                ];
            }
        }
        if ($run->status !== ChallengeRun::RUNNING) {
            throw new MarvelException('চ্যালেঞ্জটি আর চালু নেই।');
        }

        $books = $run->books_count;
        $pct = $this->challengeDiscount($books, $cfg);

        if ($pct <= 0) {
            $run->status = ChallengeRun::FORFEITED;
            $run->save();
            return [
                'status'       => 'empty',
                'books'        => 0,
                'discount_pct' => 0,
                'message'      => 'কোনো বই যোগ করা হয়নি — এবার কোনো ছাড় নেই।',
            ];
        }

        $expires = now()->addMinutes($cfg['coupon_minutes']);
        $coupon = \Marvel\Database\Models\Coupon::create([
            'code'                => 'CHLG' . strtoupper(Str::random(6)),
            'language'            => DEFAULT_LANGUAGE ?? 'en',
            'description'         => "১ মিনিট চ্যালেঞ্জ — {$books} বই, {$pct}% ছাড়",
            'type'                => 'percentage',
            'amount'              => $pct,
            'minimum_cart_amount' => 0,
            'active_from'         => now(),
            'expire_at'           => $expires,
            'user_id'             => $run->user_id,   // bound to the player
            'target'              => true,
            'is_approve'          => true,
        ]);

        $run->status = ChallengeRun::CHECKOUT;
        $run->discount_pct = $pct;
        $run->coupon_id = $coupon->id;
        $run->save();

        return [
            'status'         => 'success',
            'code'           => $coupon->code,
            'discount_pct'   => $pct,
            'books'          => $books,
            'expires_at'     => $expires->toIso8601String(),
            'staked_points'  => $run->points_staked,
        ];
    }

    // ============================================================ ADMIN MANUAL PRE-ORDER
    /** Defaults for the manual pre-order desk. */
    private function preorderConfig(): array
    {
        $o = $this->options();
        $c = is_array($o['preorder_desk'] ?? null) ? $o['preorder_desk'] : [];
        return [
            // amazon.in lists in INR, amazon.com in USD — pick the rate off the link's domain.
            'in_rate'         => (float) ($c['in_rate'] ?? 1.7),
            'com_rate'        => (float) ($c['com_rate'] ?? 130),
            'weight_per_kg'   => (float) ($c['weight_per_kg'] ?? 350),
            'delivery_fee'    => (float) ($c['delivery_fee'] ?? 60),
            'advance_pct'     => (int) ($c['advance_pct'] ?? 50),
            'eta_min_days'    => (int) ($c['eta_min_days'] ?? 28),
            'eta_max_days'    => (int) ($c['eta_max_days'] ?? 40),
            // Amazon re-prices constantly, so the quote we gave has a short shelf life.
            'pay_hours'       => (int) ($c['pay_hours'] ?? 8),
            'msg_template'    => (string) ($c['msg_template'] ?? self::PREORDER_MSG),
        ];
    }

    /** What the admin sends the customer along with the pay link. */
    private const PREORDER_MSG = "আসসালামু আলাইকুম {name},\n\n"
        . "আপনার প্রি-অর্ডারটি প্রস্তুত ✅\n"
        . "📚 {items}\n"
        . "💵 মোট: ৳{total}\n"
        . "💳 এখন দিতে হবে (অগ্রিম): ৳{advance}\n"
        . "📦 বাকি ৳{due} ডেলিভারির সময়\n"
        . "🚚 {eta}\n\n"
        . "নিচের লিংকে পেমেন্ট করলেই অর্ডার কনফার্ম হয়ে যাবে:\n{link}\n\n"
        . "⏳ লিংকটি {hours} ঘণ্টা কাজ করবে।\n"
        . "⚠️ Amazon-এ দাম দ্রুত বদলায় — দেরি হলে বইয়ের দাম বেড়ে যেতে পারে, তাই দ্রুত পেমেন্ট করে নিন।\n\n"
        . "ধন্যবাদ — IndoBangla";

    /** Admin: read/write the pre-order desk defaults (super-admin). */
    public function preorderSettings(Request $request)
    {
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'in_rate'       => 'nullable|numeric|min:0',
                'com_rate'      => 'nullable|numeric|min:0',
                'weight_per_kg' => 'nullable|numeric|min:0',
                'delivery_fee'  => 'nullable|numeric|min:0',
                'advance_pct'   => 'nullable|integer|min:1|max:100',
                'eta_min_days'  => 'nullable|integer|min:0',
                'eta_max_days'  => 'nullable|integer|min:0',
                'pay_hours'     => 'nullable|integer|min:1|max:720',
                'msg_template'  => 'nullable|string|max:2000',
            ]);
            $settings = Settings::first();
            $options = $settings->options;
            $options['preorder_desk'] = array_merge($this->preorderConfig(), array_filter(
                $data,
                fn ($v) => $v !== null
            ));
            $settings->options = $options;
            $settings->save();
        }
        return $this->preorderConfig();
    }

    /** Which rate applies to a source link — .in is INR, .com is USD. */
    private function rateForUrl(?string $url, array $cfg): array
    {
        $host = strtolower((string) parse_url((string) $url, PHP_URL_HOST));
        $isCom = $host !== '' && !str_contains($host, 'amazon.in') && str_contains($host, 'amazon.');
        return $isCom
            ? ['rate' => $cfg['com_rate'], 'currency' => 'USD']
            : ['rate' => $cfg['in_rate'], 'currency' => 'INR'];
    }

    /**
     * Admin: what would this book sell for?
     * selling price = source price × rate + weight × per-kg charge, then shop rounding.
     */
    public function preorderQuote(Request $request)
    {
        $data = $request->validate([
            'source_price'  => 'required|numeric|min:0',
            'weight_kg'     => 'nullable|numeric|min:0',
            'source_url'    => 'nullable|string',
            'rate'          => 'nullable|numeric|min:0',
            'weight_per_kg' => 'nullable|numeric|min:0',
        ]);
        $cfg = $this->preorderConfig();
        $r = $this->rateForUrl($data['source_url'] ?? null, $cfg);
        // Admin can override the conversion rate and the per-kg weight charge per quote.
        $rate = $request->filled('rate') ? (float) $data['rate'] : $r['rate'];
        $weightPerKg = $request->filled('weight_per_kg') ? (float) $data['weight_per_kg'] : (float) $cfg['weight_per_kg'];

        $weight = (float) ($data['weight_kg'] ?? 0);
        $base = (float) $data['source_price'] * $rate;
        $ship = $weight * $weightPerKg;

        return [
            'price'        => $this->roundPrice($base + $ship),
            'rate'         => $rate,
            'currency'     => $r['currency'],
            'base_bdt'     => round($base),
            'weight_bdt'   => round($ship),
            'weight_kg'    => $weight,
            'weight_per_kg' => $weightPerKg,
        ];
    }

    /**
     * Admin: create a manual pre-order in one shot — customer, books, order, pay link.
     *
     * Mirrors what the ReplyGenie agent does, but the admin drives every field, and unlike
     * the agent's orders this one is linked to a real customer_id + address.
     */
    public function preorderCreate(Request $request)
    {
        $data = $request->validate([
            'customer_id'      => 'nullable|integer',
            'customer_name'    => 'required_without:customer_id|nullable|string',
            'customer_contact' => 'required|string',
            'customer_email'   => 'nullable|email',
            'address'          => 'nullable|array',

            'items'                 => 'required|array|min:1',
            'items.*.product_id'    => 'nullable|integer',
            'items.*.title'         => 'required_without:items.*.product_id|nullable|string',
            'items.*.price'         => 'required|numeric|min:1',
            'items.*.quantity'      => 'nullable|integer|min:1',
            // How many copies the new pre-order PRODUCT carries in stock. Distinct from
            // `quantity`, which is how many copies this customer is ordering.
            'items.*.stock_qty'     => 'nullable|integer|min:0|max:100000',
            'items.*.source_url'    => 'nullable|string',
            'items.*.image_url'     => 'nullable|string',
            'items.*.author'        => 'nullable|string',
            'items.*.weight_kg'     => 'nullable|numeric|min:0',

            'delivery_fee'     => 'nullable|numeric|min:0',
            'discount'         => 'nullable|numeric|min:0',
            'advance_percent'  => 'nullable|numeric|min:0|max:100',
            'advance_bdt'      => 'nullable|numeric|min:0',
            'pay_hours'        => 'nullable|integer|min:1|max:720',
            'eta_text'         => 'nullable|string',
            'note'             => 'nullable|string',
        ]);
        $cfg = $this->preorderConfig();

        // ---- customer: reuse the selected one, otherwise stand up a new account.
        $customer = !empty($data['customer_id']) ? User::find($data['customer_id']) : null;
        if (!$customer) {
            $email = $data['customer_email']
                ?: 'po_' . preg_replace('/\D/', '', $data['customer_contact']) . '@indobangla.tech';
            $customer = User::where('email', $email)->first();
            if (!$customer) {
                $customer = User::create([
                    'name'     => $data['customer_name'] ?: 'Pre-order customer',
                    'email'    => $email,
                    'password' => Hash::make(Str::random(16)),
                ]);
                $customer->givePermissionTo(Permission::CUSTOMER);
            }
        }

        $addr = $data['address'] ?? [];
        if (!empty($addr['street_address'])) {
            Address::updateOrCreate(
                ['customer_id' => $customer->id, 'type' => 'billing'],
                ['title' => 'Pre-order', 'default' => true, 'address' => $addr]
            );
        }

        // ---- books: existing ones by id, new ones created as real pre-order products.
        $orderProducts = [];
        $amount = 0;
        foreach ($data['items'] as $item) {
            $qty = max(1, (int) ($item['quantity'] ?? 1));
            $price = (float) $item['price'];

            $product = !empty($item['product_id']) ? Product::find($item['product_id']) : null;
            if (!$product) {
                $product = $this->createPreorderProduct($item, $price, $cfg);
            }

            $orderProducts[$product->id] = [
                'order_quantity' => $qty,
                'unit_price'     => $price,
                'subtotal'       => $price * $qty,
            ];
            $amount += $price * $qty;
        }

        $deliveryFee = (float) ($data['delivery_fee'] ?? $cfg['delivery_fee']);
        $discount = (float) ($data['discount'] ?? 0);
        $total = max(0, $amount + $deliveryFee - $discount);

        $advance = isset($data['advance_bdt']) && $data['advance_bdt'] !== null
            ? (float) $data['advance_bdt']
            : round($total * ((float) ($data['advance_percent'] ?? $cfg['advance_pct']) / 100));
        $advance = min($advance, $total);

        $eta = $data['eta_text']
            ?: "পেমেন্ট কনফার্মের পর {$cfg['eta_min_days']}–{$cfg['eta_max_days']} দিন";

        $order = Order::create([
            'customer_id'      => $customer->id,
            'customer_name'    => $customer->name,
            'customer_contact' => $data['customer_contact'],
            'amount'           => $amount,
            'delivery_fee'     => $deliveryFee,
            'discount'         => $discount,
            'sales_tax'        => 0,
            'paid_total'       => 0,
            'total'            => $total,
            'delivery_time'    => $eta,
            'note'             => $data['note'] ?? null,
            'order_status'     => 'order-pending',
            'payment_status'   => 'payment-pending',
            'payment_gateway'  => 'CASH_ON_DELIVERY',
            'shop_id'          => $this->mainShopId(),
            'language'         => 'en',
            'billing_address'  => $addr ?: null,
            'shipping_address' => $addr ?: null,
        ]);
        $order->products()->attach($orderProducts);
        Order::commitStock($order);

        // Pay link — the advance is what we charge now; the rest is due on delivery.
        $token = 'pl_' . Str::random(24);
        $ops = $order->ops_meta ?? [];
        $ops['created_by'] = 'Admin';
        $ops['source'] = 'admin-preorder';
        $ops['advance'] = [
            'is_preorder' => true,
            'percent'     => $total > 0 ? round($advance / $total * 100) : 0,
            'advance_bdt' => round($advance),
            'due_bdt'     => round($total - $advance),
            'status'      => 'pending_advance',
        ];
        $ops['preorder'] = ['eta' => $eta];
        $payHours = (int) ($data['pay_hours'] ?? $cfg['pay_hours']);
        $expiresAt = now()->addHours($payHours);

        $ops['pay_token'] = $token;
        $ops['pay_expires_at'] = $expiresAt->toIso8601String();
        $ops['pay_amount'] = round($advance);
        $ops['pay_purpose'] = 'advance';

        // Optional bKash service charge, same rule and same meta keys the order board's
        // "copy pay link" box uses (orderPayLink), so the pay screen and payConfirm already
        // know how to read it. Off unless the admin ticks it.
        if ($request->boolean('bkash_charge') && $advance > 0) {
            $charge = (int) round($advance * self::BKASH_CHARGE_PCT / 100);
            $ops['bkash_charge']      = $charge;
            $ops['bkash_charge_base'] = (int) round($advance);
            $ops['pay_amount']        = (int) round($advance + $charge);
        } else {
            unset($ops['bkash_charge'], $ops['bkash_charge_base']);
        }

        $order->ops_meta = $ops;
        $order->save();

        $base = rtrim(config('shop.shop_url') ?: 'https://indobangla.tech', '/');
        $link = $base . '/pay/' . $token;

        // Fill the template here so the admin gets a ready-to-send message, not a form.
        $titles = collect($data['items'])->map(fn ($i) => $i['title'] ?? '')->filter()->implode(', ');
        $message = strtr($cfg['msg_template'], [
            '{name}'    => $customer->name,
            '{items}'   => $titles,
            '{total}'   => round($total),
            '{advance}' => round($advance),
            '{due}'     => round($total - $advance),
            '{eta}'     => $eta,
            '{link}'    => $link,
            '{hours}'   => $payHours,
        ]);

        return [
            'status'          => 'success',
            'order_id'        => $order->id,
            'tracking_number' => $order->tracking_number,
            'customer_id'     => $customer->id,
            'customer_name'   => $customer->name,
            'contact'         => $data['customer_contact'],
            'amount'          => round($amount),
            'delivery_fee'    => round($deliveryFee),
            'discount'        => round($discount),
            'total'           => round($total),
            'advance_bdt'     => round($advance),
            'due_bdt'         => round($total - $advance),
            'eta'             => $eta,
            'pay_link'        => $link,
            'pay_hours'       => $payHours,
            'expires_at'      => $expiresAt->toIso8601String(),
            'message'         => $message,
        ];
    }

    /** A book the admin typed in (or pulled off Amazon) becomes a real pre-order product. */
    private function preorderShopIdFor(?string $sourceUrl): ?int
    {
        $url = trim((string) $sourceUrl);
        if ($url !== '' && preg_match('#^https?://([^/]*\.)?amazon\.[a-z.]+/#i', $url)) {
            $shop = Shop::where('slug', 'amazonbooks')->first(['id']);
            if ($shop) {
                return (int) $shop->id;
            }
        }
        // Falls back to the main shop if that shop was renamed or deleted — a missing shop must
        // never block a pre-order, and a null shop_id hides the product from the storefront.
        return $this->mainShopId();
    }

    private function createPreorderProduct(array $item, float $price, array $cfg): Product
    {
        // Same book, same link → same product. Keeps repeat pre-orders from cloning the catalogue.
        if (!empty($item['source_url'])) {
            $existing = Product::where('external_product_url', $item['source_url'])->first();
            if ($existing) {
                return $existing;
            }
        }

        $name = trim((string) $item['title']);
        $slug = Str::slug($name) ?: 'preorder-' . Str::random(6);
        if (Product::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(4);
        }

        $product = new Product();
        $product->name = $name;
        $product->slug = $slug;
        $product->type_id = 8;
        // Books sourced from an Amazon link belong to the dedicated AmazonBooks storefront, so
        // imported titles stay separable from our own stock. Anything else lands in the main shop.
        $product->shop_id = $this->preorderShopIdFor($item['source_url'] ?? null);
        $product->price = $price;
        $product->min_price = $price;
        $product->max_price = $price;
        // Stock comes from the form. It used to be a hardcoded 100, which advertised a hundred
        // copies of a book the shop had not bought yet.
        $product->quantity = isset($item['stock_qty']) && $item['stock_qty'] !== ''
            ? max(0, (int) $item['stock_qty'])
            : 100;
        $product->status = 'publish';
        $product->product_type = 'simple';
        $product->external_product_url = $item['source_url'] ?? null;
        $product->is_preorder = true;
        $product->preorder_advance_pct = $cfg['advance_pct'];
        $product->description = '🔖 প্রি-অর্ডার — বইটি আনতে '
            . $cfg['eta_min_days'] . '–' . $cfg['eta_max_days'] . ' দিন সময় লাগবে।';
        if (!empty($item['image_url'])) {
            // Download the fetched cover to our own storage so it actually renders on the
            // storefront: a raw Amazon/source URL is neither whitelisted for next/image nor
            // hotlink-safe (Amazon blocks/expires them). Fall back to the remote URL only if
            // the download fails, so a hiccup never drops the cover entirely.
            $stored = $this->storeRemoteImage($item['image_url']);
            $product->image = $stored
                ?: ['original' => $item['image_url'], 'thumbnail' => $item['image_url']];
        }
        if (!empty($item['weight_kg'])) {
            $product->book_meta = array_merge(
                is_array($product->book_meta) ? $product->book_meta : [],
                ['item_weight' => $item['weight_kg']]
            );
        }
        if (!empty($item['author'])) {
            $author = Author::firstOrCreate(
                ['name' => $item['author']],
                ['slug' => Str::slug($item['author']), 'language' => 'en', 'is_approved' => true]
            );
            $product->author_id = $author->id;
        }
        $product->save();
        Cache::increment('catalog:version');

        return $product;
    }

    /**
     * Download a remote image (a fetched book cover) into our own public storage and
     * return an attachment-shaped array the Product `image` column expects. Mirrors the
     * AI-import path (AiExtractController) so preorder covers live on our domain and render.
     * Returns null (never throws) on any failure — creating the pre-order must not hinge
     * on an image download succeeding.
     */
    private function storeRemoteImage(string $url): ?array
    {
        $url = trim($url);
        if ($url === '' || !preg_match('#^https?://#i', $url)) {
            return null;
        }
        try {
            $resp = Http::timeout(30)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; IndoBanglaBot/1.0)',
            ])->get($url);
            if ($resp->failed()) {
                return null;
            }
            $body = $resp->body();
            $ctype = strtolower($resp->header('Content-Type') ?? '');
            // Not an image (e.g. an HTML block/expiry page dressed as a jpg URL).
            if (!str_starts_with($ctype, 'image/') && strlen($body) < 500) {
                return null;
            }
            $ext = 'jpg';
            foreach (['png' => 'png', 'webp' => 'webp', 'gif' => 'gif', 'jpeg' => 'jpg', 'jpg' => 'jpg'] as $needle => $e) {
                if (str_contains($ctype, $needle)) {
                    $ext = $e;
                    break;
                }
            }
            $name = 'preorder-covers/' . bin2hex(random_bytes(8)) . '.' . $ext;
            Storage::disk('public')->put($name, $body);
            $publicUrl = rtrim(config('app.url'), '/') . '/storage/' . $name;
            return [
                'id'        => null,
                'thumbnail' => $publicUrl,
                'original'  => $publicUrl,
                'file_name' => basename($name),
            ];
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Admin: how many books already have an MRP (so the panel can show what's ready). */
    public function conversionStatus(Request $request)
    {
        $total = Product::where('type_id', 8)->where('status', 'publish')->count();
        $withMrp = Product::where('type_id', 8)->whereNotNull('mrp')->where('mrp', '>', 0)->count();
        return ['total' => $total, 'with_mrp' => $withMrp, 'without_mrp' => max(0, $total - $withMrp)];
    }

    /**
     * Shop rounding: drop the fraction, then land on a 5 or a 0 by last digit —
     * 0–1 → down to the 0, 2–6 → that block's 5, 7–9 → up to the next 0.
     * e.g. 71.75 → 70, 72–74 → 75, 76 → 75, 77–79 → 80.
     */
    private function roundPrice($n): int
    {
        $n = (int) floor((float) $n);
        if ($n <= 0) {
            return 0;
        }
        $d = $n % 10;
        $base = $n - $d;
        $r = $d <= 1 ? $base : ($d <= 6 ? $base + 5 : $base + 10);
        return $r > 0 ? $r : 5;   // never round a real price down to zero
    }

    /** Admin: compute the price a single MRP/origin would map to (for the product form preview). */
    public function conversionPreview(Request $request)
    {
        $cfg = $this->conversionConfig();
        $mrp = (float) $request->input('mrp', 0);

        // Printed country drives the conversion. Bangladesh = no conversion (MRP is the
        // price). Anything else = foreign, so MRP is converted with the foreign rate.
        // `origin` is still accepted for backward compatibility with older callers.
        $country = strtolower(trim((string) $request->input('country', '')));
        if ($country !== '') {
            $isBd = $country === 'bangladesh';
        } else {
            $isBd = $request->input('origin', 'indian') === 'bd';
        }

        $rate     = $isBd ? $cfg['bd_rate'] : $cfg['rate'];
        $saleRate = $cfg['sale_rate'];
        $source   = $isBd ? 'bd' : 'foreign';

        // Category presets (Settings → Conversion Rate → per-category rules). Only meaningful
        // for foreign books, e.g. a "Magazine" category priced at rupee × 2. Most-specific wins.
        $rawCats = $request->input('category_ids', []);
        if (is_string($rawCats)) {
            $rawCats = explode(',', $rawCats);
        }
        $catIds = array_filter(array_map('intval', (array) $rawCats));
        if ($request->filled('category_id')) {
            $catIds[] = (int) $request->input('category_id');
        }
        if (!$isBd && !empty($catIds)) {
            foreach ($cfg['overrides'] as $o) {
                if (($o['type'] ?? '') === 'category'
                    && in_array((int) ($o['id'] ?? 0), $catIds, true)
                    && isset($o['rate'])) {
                    $rate     = (float) $o['rate'];
                    $saleRate = (float) ($o['sale_rate'] ?? $saleRate);
                    $source   = 'category:' . ($o['label'] ?: (string) $o['id']);
                    break;
                }
            }
        }

        return [
            'rate'       => $rate,
            'price'      => $mrp > 0 ? $this->roundPrice($mrp * $rate) : 0,
            'sale_price' => $mrp > 0 && $saleRate > 0 ? $this->roundPrice($mrp * $saleRate) : 0,
            'sale_rate'  => $saleRate,
            'is_bd'      => $isBd,
            'source'     => $source,
        ];
    }

    // =====================================================================
    //  Per-product landing pages (#custom)
    //  Any product can have an extra, standalone marketing landing view at
    //  /landing/{slug} while the product still works normally in the catalogue.
    //  Config is stored in Settings.options.landing_pages keyed by product id.
    // =====================================================================

    /** Normalise + default a single landing config (safe for empty input). */
    private function normalizeLanding($cfg): array
    {
        $cfg = is_array($cfg) ? $cfg : [];
        $strList = function ($v) {
            return array_values(array_filter(array_map(
                fn ($x) => is_string($x) ? trim($x) : '',
                (array) $v
            ), fn ($x) => $x !== ''));
        };
        $themes = ['royal', 'classic', 'festive', 'modern'];
        // Read the key once — the old form used $cfg['theme'] in the true branch without the
        // ?? guard, so any config lacking a theme (every product without a saved landing page)
        // 500'd on "Undefined array key theme".
        $wantTheme = $cfg['theme'] ?? 'royal';
        $theme     = in_array($wantTheme, $themes, true) ? $wantTheme : 'royal';

        // Landing template picks WHICH storefront layout renders. 'default' is the
        // config-driven generic template (theme/badge/highlights/etc. below drive it).
        // Anything else is a bespoke, single-product design (e.g. 'anandamela' for the
        // Anandamela 1433 Puja annual) whose look is hard-coded in the shop — the generic
        // config fields are then decorative only.
        $templates    = ['default', 'anandamela'];
        $wantTemplate = $cfg['template'] ?? 'default';
        $template     = in_array($wantTemplate, $templates, true) ? $wantTemplate : 'default';

        $features = [];
        foreach ((array) ($cfg['features'] ?? []) as $f) {
            if (!is_array($f)) continue;
            $t = trim((string) ($f['title'] ?? ''));
            $x = trim((string) ($f['text'] ?? ''));
            if ($t === '' && $x === '') continue;
            $features[] = ['icon' => trim((string) ($f['icon'] ?? '📘')) ?: '📘', 'title' => $t, 'text' => $x];
        }
        $stats = [];
        foreach ((array) ($cfg['stats'] ?? []) as $s) {
            if (!is_array($s)) continue;
            $v = trim((string) ($s['value'] ?? ''));
            $l = trim((string) ($s['label'] ?? ''));
            if ($v === '' && $l === '') continue;
            $stats[] = ['value' => $v, 'label' => $l];
        }
        $testimonials = [];
        foreach ((array) ($cfg['testimonials'] ?? []) as $tt) {
            if (!is_array($tt)) continue;
            $txt = trim((string) ($tt['text'] ?? ''));
            if ($txt === '') continue;
            $testimonials[] = [
                'name'   => trim((string) ($tt['name'] ?? 'পাঠক')),
                'role'   => trim((string) ($tt['role'] ?? '')),
                'text'   => $txt,
                'rating' => max(1, min(5, (int) ($tt['rating'] ?? 5))),
            ];
        }
        $faqs = [];
        foreach ((array) ($cfg['faqs'] ?? []) as $fq) {
            if (!is_array($fq)) continue;
            $q = trim((string) ($fq['q'] ?? ''));
            $a = trim((string) ($fq['a'] ?? ''));
            if ($q === '' || $a === '') continue;
            $faqs[] = ['q' => $q, 'a' => $a];
        }

        return [
            'enabled'       => (bool) ($cfg['enabled'] ?? false),
            'template'      => $template,
            'theme'         => $theme,
            'badge'         => trim((string) ($cfg['badge'] ?? '')),
            'headline'      => trim((string) ($cfg['headline'] ?? '')),
            'subheadline'   => trim((string) ($cfg['subheadline'] ?? '')),
            'hero_note'     => trim((string) ($cfg['hero_note'] ?? '')),
            'cta_primary'   => trim((string) ($cfg['cta_primary'] ?? '')),
            'cta_secondary' => trim((string) ($cfg['cta_secondary'] ?? '')),
            'video'         => trim((string) ($cfg['video'] ?? '')),
            'show_related'  => (bool) ($cfg['show_related'] ?? true),
            'highlights'    => $strList($cfg['highlights'] ?? []),
            'features'      => $features,
            'stats'         => $stats,
            'testimonials'  => $testimonials,
            'faqs'          => $faqs,
        ];
    }

    /** Raw landing map from settings, keyed by (string) product id. */
    private function landingMap(): array
    {
        $map = $this->options()['landing_pages'] ?? [];
        return is_array($map) ? $map : [];
    }

    /** Hydrate a product for the storefront landing page. */
    private function landingProduct(Product $product): array
    {
        $product->load([
            'type:id,name,slug,settings',
            'shop:id,name,slug',
            'author:id,name,slug',
            'manufacturer:id,name,slug,image',
            'categories:id,name,slug',
            'tags:id,name,slug',
        ]);
        $arr = $product->toArray();
        $arr['book'] = $product->book;      // appended book_meta spec (may be null)
        $arr['in_flash_sale'] = (bool) ($product->in_flash_sale ?? false);
        return $arr;
    }

    /**
     * Public: storefront landing page data for one product (by slug or id).
     * Returns enabled=false when the product has no active landing config so
     * the shop can show a graceful "not available" state.
     */
    public function landingPage(Request $request)
    {
        $slug = trim((string) $request->input('slug', ''));
        $id   = (int) $request->input('product_id', 0);
        $product = $slug !== ''
            ? Product::where('slug', $slug)->first()
            : ($id ? Product::find($id) : null);

        if (!$product) {
            return ['status' => 'not_found', 'enabled' => false];
        }
        $cfg = $this->normalizeLanding($this->landingMap()[(string) $product->id] ?? []);
        if (!$cfg['enabled']) {
            return ['status' => 'disabled', 'enabled' => false, 'slug' => $product->slug];
        }
        return [
            'status'  => 'success',
            'enabled' => true,
            'config'  => $cfg,
            'product' => $this->landingProduct($product),
        ];
    }

    /** Public: lightweight list of all products that have a live landing page. */
    public function landingList(Request $request)
    {
        $map = $this->landingMap();
        $ids = [];
        foreach ($map as $pid => $cfg) {
            if ((bool) (($cfg['enabled'] ?? false)) && (int) $pid > 0) {
                $ids[] = (int) $pid;
            }
        }
        if (empty($ids)) {
            return ['status' => 'success', 'data' => []];
        }
        $books = Product::whereIn('id', $ids)->where('status', 'publish')
            ->get(['id', 'name', 'slug', 'price', 'sale_price', 'image'])
            ->map(fn ($p) => [
                'id'         => $p->id,
                'name'       => $p->name,
                'slug'       => $p->slug,
                'price'      => $p->price,
                'sale_price' => $p->sale_price,
                'image'      => is_array($p->image) ? ($p->image['original'] ?? null) : null,
                'url'        => '/landing/' . $p->slug,
            ]);
        return ['status' => 'success', 'data' => $books->values()];
    }

    /**
     * Super-admin: GET returns every configured landing page (hydrated with its
     * product) for the overview UI; POST upserts ONE product's landing config.
     */
    public function landingSettings(Request $request)
    {
        if ($request->isMethod('post')) {
            $data = $request->validate([
                'product_id' => 'required|integer',
                'config'     => 'nullable|array',
            ]);
            $pid = (int) $data['product_id'];
            if (!Product::whereKey($pid)->exists()) {
                throw new MarvelException('Product not found.');
            }
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $map      = is_array($options['landing_pages'] ?? null) ? $options['landing_pages'] : [];
            $cfg      = $this->normalizeLanding($data['config'] ?? []);
            if (!$cfg['enabled']
                && $cfg['template'] === 'default'
                && empty($cfg['headline']) && empty($cfg['highlights'])
                && empty($cfg['features']) && empty($cfg['badge'])) {
                // fully empty + disabled + generic template → drop the entry entirely.
                // A bespoke template (e.g. 'anandamela') is meaningful on its own even
                // with the generic fields blank, so it is always kept.
                unset($map[(string) $pid]);
            } else {
                $map[(string) $pid] = $cfg;
            }
            $options['landing_pages'] = $map;
            $settings->update(['options' => $options]);
        }

        $map = $this->landingMap();
        $out = [];
        foreach ($map as $pid => $cfg) {
            $product = Product::find((int) $pid);
            if (!$product) continue;
            $out[] = [
                'product' => [
                    'id'    => $product->id,
                    'name'  => $product->name,
                    'slug'  => $product->slug,
                    'image' => is_array($product->image) ? ($product->image['original'] ?? null) : null,
                ],
                'config'  => $this->normalizeLanding($cfg),
            ];
        }
        return ['status' => 'success', 'data' => $out];
    }

    private function options(): array
    {
        $s = Settings::first();
        return $s ? ($s->options ?? []) : [];
    }

    /* ============================ Product copy / move ============================
     * Super-admin tools on the custom "All products" screen: duplicate a product
     * into a shop (default: its own shop), or move it to a different shop.
     * ========================================================================== */

    /** Guard: only a super-admin may copy/move products across shops. */
    private function assertSuperAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !$user->hasPermissionTo(Permission::SUPER_ADMIN)) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
    }

    /**
     * Guard: who may work the order desk (notes, courier, call/print status, bank verdicts).
     *
     * The order-ops route only lives behind `auth:sanctum`, and orderOps looks orders up by id
     * without checking who owns them — so without this, any signed-in customer could rewrite
     * any order. Mirrors the admin app's own `allowedRoles`.
     *
     * `getPermissionNames()` rather than `hasPermissionTo()`: the latter throws when a
     * permission isn't registered, which would lock the desk out entirely.
     */
    /* ------------------------------------------------- live visitors (command centre) */

    /** A visitor counts as "here" if they pinged within this many seconds. */
    /** bKash's service charge. One source of truth — it was a bare 1.85 in three places. */
    /**
     * Has money actually been received for this order?
     *
     * ONLY payment_status answers that. `paid_total >= total` cannot: storeOrder seeds
     * paid_total = total (Pickbazar means "total payable" by it), and only stampPayLink /
     * stampPreorder zero it — neither of which a COD order goes through. So that test was
     * true for EVERY cod order from the moment it was created, and every COD invoice link
     * announced PAID for an order where nothing had been collected.
     *
     * settlePayment sets payment_status = payment-success the moment enough money lands, and
     * the admin's "mark paid" now sets it too, so this is the one field that means what it says.
     */
    private static function orderIsPaid($order): bool
    {
        return $order->payment_status === 'payment-success';
    }

    private const BKASH_CHARGE_PCT = 1.85;

    private const PRESENCE_WINDOW = 120;

    /**
     * Public: the shop's heartbeat. One upsert per visitor per beat.
     *
     * Telemetry must never cost a page view, so every failure here is swallowed and answered
     * 200 — a visitor counter is not worth breaking the storefront over.
     */
    public function presencePing(Request $request)
    {
        try {
            $vid = substr(preg_replace('/[^A-Za-z0-9_-]/', '', (string) $request->input('vid', '')), 0, 64);
            if ($vid === '') {
                return ['status' => 'success'];
            }
            DB::table('visitor_pings')->updateOrInsert(
                ['visitor_id' => $vid],
                ['last_seen' => now()]
            );
        } catch (\Throwable $e) {
            // Swallowed on purpose — see above.
        }
        return ['status' => 'success'];
    }

    /** Admin: how many visitors are on the site right now. */
    public function liveUsers(Request $request)
    {
        $this->assertOrderDeskAccess($request);
        try {
            $now = now();
            $live = DB::table('visitor_pings')
                ->where('last_seen', '>=', $now->copy()->subSeconds(self::PRESENCE_WINDOW))
                ->count();
            $today = DB::table('visitor_pings')
                ->where('last_seen', '>=', $now->copy()->subHour())
                ->count();

            // Keep the table the size of "recent visitors" instead of "everyone ever". Pruning on
            // read means no cron to forget about; 1 in ~20 reads is enough to keep up.
            if (random_int(1, 20) === 1) {
                DB::table('visitor_pings')
                    ->where('last_seen', '<', $now->copy()->subDay())
                    ->delete();
            }
            return ['status' => 'success', 'live' => $live, 'last_hour' => $today];
        } catch (\Throwable $e) {
            // Never take the dashboard down over a counter — the UI shows "—" for null.
            return ['status' => 'success', 'live' => null, 'last_hour' => null];
        }
    }

    private function assertOrderDeskAccess(Request $request): void
    {
        $user = $request->user();
        $held = $user ? $user->getPermissionNames()->all() : [];
        $allowed = [Permission::SUPER_ADMIN, Permission::STORE_OWNER, Permission::STAFF];
        if (!array_intersect($held, $allowed)) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
    }

    /** Small shop list for the copy/move picker: id, name, slug. */
    public function productShops(Request $request)
    {
        $this->assertSuperAdmin($request);
        $shops = Shop::query()
            ->orderByDesc('is_active')->orderBy('name')
            ->get(['id', 'name', 'slug', 'is_active']);
        return ['status' => 'success', 'data' => $shops];
    }

    /**
     * POST integrations/product-move
     * body: { product_id, target_shop_id }
     * Reassigns the product (and its variation rows) to another shop.
     */
    public function productMove(Request $request)
    {
        $this->assertSuperAdmin($request);
        $request->validate([
            'product_id'     => ['required', 'exists:Marvel\Database\Models\Product,id'],
            'target_shop_id' => ['required', 'exists:Marvel\Database\Models\Shop,id'],
        ]);

        $product   = Product::findOrFail($request->product_id);
        $targetId  = (int) $request->target_shop_id;
        if ((int) $product->shop_id === $targetId) {
            return ['status' => 'error', 'message' => 'Product is already in that shop.'];
        }

        $product->shop_id = $targetId;
        $product->save();
        // variation_options reference the product by product_id only (no shop_id
        // column), so they move with the product automatically.

        return [
            'status'  => 'success',
            'message' => 'Product moved.',
            'data'    => ['id' => $product->id, 'shop_id' => $targetId],
        ];
    }

    /**
     * POST integrations/product-copy
     * body: { product_id, target_shop_id }
     * Duplicates the product into the target shop (draft), including gallery,
     * category/tag/attribute pivots and variation rows. Returns the new product.
     */
    public function productCopy(Request $request)
    {
        $this->assertSuperAdmin($request);
        $request->validate([
            'product_id'     => ['required', 'exists:Marvel\Database\Models\Product,id'],
            'target_shop_id' => ['required', 'exists:Marvel\Database\Models\Shop,id'],
        ]);

        $source   = Product::with(['categories', 'tags', 'variations', 'variation_options'])
            ->findOrFail($request->product_id);
        $targetId = (int) $request->target_shop_id;

        return DB::transaction(function () use ($source, $targetId) {
            $copy = $source->replicate();
            $copy->shop_id = $targetId;
            $copy->status  = 'draft';
            $copy->name    = $source->name . ' (Copy)';
            $copy->slug    = $this->uniqueProductSlug($source->slug ?: Str::slug($source->name));
            // Clear anything that must not be shared between two rows.
            unset($copy->id);
            $copy->created_at = null;
            $copy->updated_at = null;
            $copy->save();

            if ($source->categories->count()) {
                $copy->categories()->sync($source->categories->pluck('id')->all());
            }
            if ($source->tags->count()) {
                $copy->tags()->sync($source->tags->pluck('id')->all());
            }
            if ($source->variations->count()) {
                $copy->variations()->sync($source->variations->pluck('id')->all());
            }
            foreach ($source->variation_options as $v) {
                $row = $v->replicate();
                $row->product_id = $copy->id;
                if (isset($row->sku) && $row->sku !== null) {
                    $row->sku = $row->sku . '_copy_' . $copy->id;
                }
                $row->created_at = null;
                $row->updated_at = null;
                $row->save();
            }

            return [
                'status'  => 'success',
                'message' => 'Product copied.',
                'data'    => ['id' => $copy->id, 'slug' => $copy->slug, 'shop_id' => $targetId],
            ];
        });
    }

    /** Make a product slug unique by appending -copy / -copy-2 … */
    private function uniqueProductSlug(string $base): string
    {
        $base = Str::slug($base) ?: 'product';
        $slug = $base . '-copy';
        $i = 2;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $base . '-copy-' . $i;
            $i++;
        }
        return $slug;
    }

    /* ---------------------------------------------------------------------------------------- *
     *  Feature check board — what has been tested, by the assistant and by a human
     * ---------------------------------------------------------------------------------------- */

    /**
     * The registry joined with whatever verdicts exist, plus a tally.
     *
     * The registry is the source of truth for *what exists*; the table only says what happened
     * to it. So a feature shipped after the last check simply appears as untested rather than
     * vanishing, which is the failure mode a hand-maintained checklist always ends up with.
     */
    public function featureChecks(Request $request)
    {
        $this->assertOrderDeskAccess($request);

        $rows = DB::table('feature_checks')->get()->keyBy('feature_key');

        $items = [];
        foreach (FeatureChecks::REGISTRY as $f) {
            $row = $rows[$f['key']] ?? null;

            // First sight of a feature: write down what the assistant actually did when it
            // shipped, so the board starts out honest rather than uniformly blank.
            if (!$row) {
                DB::table('feature_checks')->insert([
                    'feature_key'       => $f['key'],
                    'ai_staging_status' => $f['ai_staging'] ?? 'untested',
                    'ai_staging_note'   => $f['ai_staging_note'] ?? null,
                    'ai_staging_at'     => ($f['ai_staging'] ?? 'untested') !== 'untested' ? now() : null,
                    'ai_live_status'    => $f['ai_live'] ?? 'untested',
                    'ai_live_note'      => $f['ai_live_note'] ?? null,
                    'ai_live_at'        => ($f['ai_live'] ?? 'untested') !== 'untested' ? now() : null,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
                $row = DB::table('feature_checks')->where('feature_key', $f['key'])->first();
            }

            $items[] = [
                'key'               => $f['key'],
                'area'              => $f['area'],
                'area_label'        => FeatureChecks::AREAS[$f['area']] ?? $f['area'],
                'title'             => $f['title'],
                'where'             => $f['where'],
                'ai_staging_status' => $row->ai_staging_status,
                'ai_staging_note'   => $row->ai_staging_note,
                'ai_staging_at'     => $row->ai_staging_at,
                'ai_live_status'    => $row->ai_live_status,
                'ai_live_note'      => $row->ai_live_note,
                'ai_live_at'        => $row->ai_live_at,
                'human_status'      => $row->human_status,
                'human_note'        => $row->human_note,
                'human_by'          => $row->human_by,
                'human_checked_at'  => $row->human_checked_at,
            ];
        }

        $n = fn ($col, $val) => count(array_filter($items, fn ($i) => $i[$col] === $val));
        $tally = [
            'total'           => count($items),
            'ai_staging_pass' => $n('ai_staging_status', 'passed'),
            'ai_live_pass'    => $n('ai_live_status', 'passed'),
            'human_pass'      => $n('human_status', 'passed'),
            // The number worth acting on: nobody at all has tried these, anywhere.
            'nobody_checked'  => count(array_filter($items, fn ($i) =>
                $i['ai_staging_status'] === 'untested'
                && $i['ai_live_status'] === 'untested'
                && $i['human_status'] === 'untested')),
        ];

        return [
            'status' => 'success',
            'items'  => $items,
            'areas'  => FeatureChecks::AREAS,
            'tally'  => $tally,
            // The human column is per-database; saying which site avoids reading a staging tick
            // as a live one. (The assistant's two columns come from the registry, so they read
            // the same on both.)
            'env'    => config('app.env'),
        ];
    }

    public function featureCheckSet(Request $request)
    {
        $this->assertOrderDeskAccess($request);

        $data = $request->validate([
            'key'    => 'required|string|in:' . implode(',', FeatureChecks::keys()),
            'column' => 'required|string|in:human,ai_staging,ai_live',
            'status' => 'required|string|in:untested,passed,failed',
            'note'   => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $patch = ['updated_at' => now()];

        if ($data['column'] === 'human') {
            $patch['human_status'] = $data['status'];
            $patch['human_note'] = $data['note'] ?? null;
            $patch['human_by'] = $user->name ?? 'Admin';
            $patch['human_checked_at'] = $data['status'] === 'untested' ? null : now();
        } else {
            // ai_staging / ai_live — how the assistant records a run it has just done.
            $col = $data['column'];
            $patch[$col . '_status'] = $data['status'];
            $patch[$col . '_note'] = $data['note'] ?? null;
            $patch[$col . '_at'] = $data['status'] === 'untested' ? null : now();
        }

        DB::table('feature_checks')->updateOrInsert(
            ['feature_key' => $data['key']],
            $patch + ['created_at' => now()]
        );

        return ['status' => 'success'] + (array) DB::table('feature_checks')->where('feature_key', $data['key'])->first();
    }

    /* ============================ Custom sub-admin roles ============================
     * Super-admin only. Lets a full super-admin define named roles (a set of
     * admin-panel sections) and create / assign restricted sub-admins.
     * See Marvel\Traits\AdminRolesTrait for storage + resolution.
     * ============================================================================ */

    /** GET  -> { sections: catalogue, roles: [...] }
     *  PUT  -> save the roles array (full super-admin only). */
    public function adminRoles(Request $request)
    {
        if ($request->isMethod('put')) {
            if (!$this->isFullSuperAdmin($request->user())) {
                throw new AuthorizationException(NOT_AUTHORIZED);
            }
            $data = $request->validate(['roles' => 'nullable|array']);
            $roles = collect($data['roles'] ?? [])
                ->map(fn ($r) => $this->sanitizeAdminRole($r))
                ->filter()
                ->values()
                ->all();
            $settings = Settings::first();
            $options  = $settings->options ?? [];
            $options['admin_roles'] = $roles;
            $settings->update(['options' => $options]);
        }
        return [
            'status'   => 'success',
            'sections' => $this->adminSectionsCatalog(),
            'roles'    => $this->adminRolesList(),
        ];
    }

    /** POST { name, email, password, role_id? } -> create a new admin/sub-admin.
     *  role_id empty  => full super-admin; set => restricted to that role. */
    public function createAdmin(Request $request)
    {
        if (!$this->isFullSuperAdmin($request->user())) {
            throw new AuthorizationException(NOT_AUTHORIZED);
        }
        $data = $request->validate([
            'name'     => 'required|string|max:191',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role_id'  => 'nullable|string',
        ]);

        $roleId = !empty($data['role_id']) ? $data['role_id'] : null;
        // A restricted role_id must actually exist.
        if ($roleId !== null && !collect($this->adminRolesList())->firstWhere('id', $roleId)) {
            throw new MarvelException('Selected role does not exist.');
        }

        $user = User::create([
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password'      => Hash::make($data['password']),
            'is_active'     => true,
            'admin_role_id' => $roleId,
        ]);
        // admins skip the e-mail verification gate
        $user->email_verified_at = now();
        $user->save();

        // empty roles table gotcha: ensure the role exists before assigning
        SpatieRole::findOrCreate(Role::SUPER_ADMIN, 'api');
        $user->givePermissionTo(Permission::SUPER_ADMIN);
        $user->assignRole(Role::SUPER_ADMIN);

        Profile::firstOrCreate(['customer_id' => $user->id]);

        return [
            'status'        => 'success',
            'id'            => $user->id,
            'admin_role_id' => $user->admin_role_id,
        ];
    }

    /** PUT { user_id, role_id? } -> change an existing admin's role.
     *  role_id empty => promote to full super-admin. */
    public function assignAdminRole(Request $request)
    {
        if (!$this->isFullSuperAdmin($request->user())) {
            throw new AuthorizationException(NOT_AUTHORIZED);
        }
        $data = $request->validate([
            'user_id' => 'required',
            'role_id' => 'nullable|string',
        ]);

        $roleId = !empty($data['role_id']) ? $data['role_id'] : null;
        if ($roleId !== null && !collect($this->adminRolesList())->firstWhere('id', $roleId)) {
            throw new MarvelException('Selected role does not exist.');
        }

        $target = User::find($data['user_id']);
        if (!$target) {
            throw new MarvelException(NOT_FOUND);
        }
        // never let the caller lock themselves out of full access
        if ($target->id == $request->user()->id && $roleId !== null) {
            throw new MarvelException('You cannot restrict your own account.');
        }
        // make sure the target can actually reach the admin panel
        try {
            if (!$target->hasPermissionTo(Permission::SUPER_ADMIN)) {
                SpatieRole::findOrCreate(Role::SUPER_ADMIN, 'api');
                $target->givePermissionTo(Permission::SUPER_ADMIN);
                $target->assignRole(Role::SUPER_ADMIN);
            }
        } catch (\Throwable $e) {
            // permission not registered yet -> grant it
            $target->givePermissionTo(Permission::SUPER_ADMIN);
        }

        $target->admin_role_id = $roleId;
        $target->save();

        return ['status' => 'success', 'id' => $target->id, 'admin_role_id' => $target->admin_role_id];
    }

    /* ======================== Online payments (bKash / bank) ledger ========================
     * bKash & bank-transfer payments live inside orders.ops_meta:
     *   ops_meta.bkash      = { payment_id, trx_id, amount_bdt, executed_at, last_status }
     *   ops_meta.bank_proof = { status, amount_bdt, url, submitted_at }
     *   ops_meta.pay_method / paid_at / payment_verified
     * This exposes them as a searchable ledger + a re-check (re-query bKash) action so the
     * admin can confirm a transaction id / amount before shipping.
     * ===================================================================================== */

    /** WHERE clause: orders that carry a real bKash transaction or a bank slip. */
    private function scopeHasOnlinePayment($query)
    {
        return $query->where(function ($w) {
            $w->whereRaw("(JSON_UNQUOTE(JSON_EXTRACT(ops_meta,'$.bkash.trx_id')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(ops_meta,'$.bkash.trx_id')) <> 'null')")
              ->orWhereRaw("JSON_EXTRACT(ops_meta,'$.bank_proof.status') IS NOT NULL");
        });
    }

    /** Build one flat ledger row from an order. */
    private function paymentRow($o): array
    {
        $ops   = (array) ($o->ops_meta ?? []);
        $bkash = $ops['bkash'] ?? [];
        $bank  = $ops['bank_proof'] ?? [];
        $hasBkash = !empty($bkash['trx_id']);
        $method = $ops['pay_method'] ?? ($hasBkash ? 'bkash' : (!empty($bank) ? 'bank' : null));
        $amount = $hasBkash
            ? ($bkash['amount_bdt'] ?? $o->paid_total)
            : ($bank['amount_bdt'] ?? $o->paid_total);
        $when = $ops['paid_at']
            ?? ($bank['submitted_at'] ?? ($bkash['executed_at'] ?? (string) $o->created_at));
        return [
            'order_id'         => $o->id,
            'tracking_number'  => $o->tracking_number,
            'method'           => $method,
            'trx_id'           => $bkash['trx_id'] ?? null,
            'bkash_payment_id' => $bkash['payment_id'] ?? null,
            'bank_status'      => $bank['status'] ?? null,
            'bank_slip'        => $bank['url'] ?? null,
            'customer_name'    => $o->customer_name,
            'customer_contact' => $o->customer_contact,
            'amount'           => round((float) $amount),
            'total'            => round((float) $o->total),
            'paid_total'       => round((float) $o->paid_total),
            'payment_status'   => $o->payment_status,
            'order_status'     => $o->order_status,
            'verified'         => (bool) ($ops['payment_verified'] ?? false),
            'paid_at'          => $when,
            'created_at'       => (string) $o->created_at,
        ];
    }

    /**
     * GET payments-list?method=all|bkash|bank&search=&page=&limit=
     * One search box matches across trx id, customer name, mobile, order id, tracking number
     * and amount.
     */
    public function paymentsList(Request $request)
    {
        $method = (string) $request->input('method', 'all');
        $q      = trim((string) $request->input('search', ''));
        $limit  = min(100, max(5, (int) ($request->input('limit', 30) ?: 30)));

        $query = Order::query()->whereNull('parent_id');
        $this->scopeHasOnlinePayment($query);

        if ($method === 'bkash') {
            $query->whereRaw("(JSON_UNQUOTE(JSON_EXTRACT(ops_meta,'$.bkash.trx_id')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(ops_meta,'$.bkash.trx_id')) <> 'null')");
        } elseif ($method === 'bank') {
            $query->whereRaw("JSON_EXTRACT(ops_meta,'$.bank_proof.status') IS NOT NULL");
        }

        if ($q !== '') {
            $like = '%' . $q . '%';
            $query->where(function ($w) use ($like, $q) {
                $w->where('tracking_number', 'like', $like)
                  ->orWhere('customer_name', 'like', $like)
                  ->orWhere('customer_contact', 'like', $like)
                  ->orWhere('total', 'like', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(ops_meta,'$.bkash.trx_id')) like ?", [$like]);
                if (ctype_digit($q)) {
                    $w->orWhere('id', (int) $q);
                }
            });
        }

        $paginator = $query->orderByDesc('id')->paginate($limit);
        $paginator->getCollection()->transform(fn ($o) => $this->paymentRow($o));

        // small totals strip for the page header
        $sumQuery = Order::query()->whereNull('parent_id');
        $this->scopeHasOnlinePayment($sumQuery);

        return [
            'status'  => 'success',
            'summary' => [
                'count' => (clone $sumQuery)->count(),
            ],
            'data'         => $paginator->items(),
            'total'        => $paginator->total(),
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
        ];
    }

    /**
     * POST payment-recheck { order_id, action: 'requery'|'verify'|'unverify' }
     *  - requery : re-ask bKash (queryPayment by payment_id) and refresh trx/amount/status
     *  - verify  : mark ops_meta.payment_verified = true (admin eyeballed it)
     *  - unverify: clear the flag
     */
    public function paymentRecheck(Request $request)
    {
        $data = $request->validate([
            'order_id' => 'required',
            'action'   => 'required|string|in:requery,verify,unverify',
        ]);
        $order = Order::find($data['order_id']);
        if (!$order) {
            throw new MarvelException(NOT_FOUND);
        }
        $ops = (array) ($order->ops_meta ?? []);

        if ($data['action'] === 'verify' || $data['action'] === 'unverify') {
            $ops['payment_verified'] = $data['action'] === 'verify';
            $ops['payment_verified_by'] = optional($request->user())->name;
            $ops['payment_verified_at'] = now()->toIso8601String();
            $order->ops_meta = $ops;
            $order->saveQuietly();
            return ['status' => 'success', 'payment' => $this->paymentRow($order->fresh())];
        }

        // requery
        $paymentId = $ops['bkash']['payment_id'] ?? null;
        if (!$paymentId) {
            throw new MarvelException('No bKash payment id on this order to re-check.');
        }
        if (!$this->bkashConfig()) {
            throw new MarvelException('bKash is not configured.');
        }
        try {
            $body = (array) BkashPaymentTokenize::queryPayment($paymentId);
        } catch (\Throwable $e) {
            throw new MarvelException('bKash query failed: ' . Str::limit($e->getMessage(), 120));
        }
        $ops['bkash'] = array_merge($ops['bkash'] ?? [], [
            'last_status'   => $body['transactionStatus'] ?? ($ops['bkash']['last_status'] ?? null),
            'trx_id'        => $body['trxID'] ?? ($ops['bkash']['trx_id'] ?? null),
            'amount_bdt'    => isset($body['amount']) ? (float) $body['amount'] : ($ops['bkash']['amount_bdt'] ?? null),
            'rechecked_at'  => now()->toIso8601String(),
        ]);
        $order->ops_meta = $ops;
        $order->saveQuietly();

        return [
            'status'  => 'success',
            'bkash'   => [
                'transactionStatus' => $body['transactionStatus'] ?? null,
                'trxID'             => $body['trxID'] ?? null,
                'amount'            => $body['amount'] ?? null,
                'statusCode'        => $body['statusCode'] ?? null,
            ],
            'payment' => $this->paymentRow($order->fresh()),
        ];
    }

    /**
     * RedX parcel status → our OrderStatus. Only `delivered` and `pickup-pending`
     * are confirmed against live parcels; the rest are RedX's documented slugs,
     * matched loosely (substring) so a wording variant still lands somewhere sane.
     * Returns null for "no mapping — leave the order status alone" (holds,
     * in-progress returns): a status we do not understand must never overwrite ours.
     */
    /**
     * The built-in RedX-status → our-status defaults. A `null` value means
     * "leave our order status alone". The admin can override any row from
     * Settings → Couriers (stored in couriers.redx.status_map); those wins.
     * The new courier statuses (shipped/in-transit/partial-delivered/on-hold)
     * are non-accounting — see OrderStatus.
     */
    public const REDX_STATUS_DEFAULTS = [
        'pickup-pending'    => OrderStatus::PROCESSING,        // booked & ready to ship
        'pickup-cancelled'  => null,                           // courier cancel — owner reviews
        'picked-up'         => OrderStatus::SHIPPED,
        'pickup-completed'  => OrderStatus::SHIPPED,
        'in-transit'        => OrderStatus::IN_TRANSIT,
        'received-at-hub'   => OrderStatus::IN_TRANSIT,
        'out-for-delivery'  => OrderStatus::OUT_FOR_DELIVERY,
        // RedX's real term for "the agent is out delivering it" — it is NOT delivered yet, so it
        // must NOT map to completed (that would count revenue + credit the vendor before delivery).
        'delivery-in-progress' => OrderStatus::OUT_FOR_DELIVERY,
        'delivered'         => OrderStatus::COMPLETED,
        'partial-delivered' => OrderStatus::PARTIAL_DELIVERED,
        'agent-hold'        => OrderStatus::ON_HOLD,
        'on-hold'           => OrderStatus::ON_HOLD,
        'return-to-merchant' => OrderStatus::CANCELLED,        // goods came back → no sale
        'cancelled'         => null,
    ];

    protected function redxStatusToOrderStatus(?string $redx): ?string
    {
        $s = strtolower(trim((string) $redx));
        if ($s === '') {
            return null;
        }
        // 1) Admin override from Settings → Couriers wins. An empty string in the
        // map is an explicit "no change" the admin chose, so honour it as null.
        $override = ($this->options()['couriers'] ?? [])['redx']['status_map'] ?? [];
        if (is_array($override) && array_key_exists($s, $override)) {
            $v = $override[$s];
            return ($v === '' || $v === null) ? null : (string) $v;
        }
        // 2) Built-in defaults.
        if (array_key_exists($s, self::REDX_STATUS_DEFAULTS)) {
            return self::REDX_STATUS_DEFAULTS[$s];
        }
        // 3) Loose fallback on the words RedX uses in its status/track vocabulary.
        if (str_contains($s, 'hold')) {
            return OrderStatus::ON_HOLD;
        }
        if (str_contains($s, 'pending-return') || str_contains($s, 'cancel')) {
            return null; // in-progress or courier-cancel — don't touch our status
        }
        if (str_contains($s, 'return')) {
            return OrderStatus::CANCELLED;
        }
        if (str_contains($s, 'partial')) {
            return OrderStatus::PARTIAL_DELIVERED;
        }
        // "delivery-in-progress" / "on the way" / "out for delivery" = still out for delivery,
        // NOT done. Check this BEFORE the completed rule so a delivery still in progress can never
        // be read as delivered (which would count revenue + credit the vendor early).
        if ((str_contains($s, 'deliver') && str_contains($s, 'progress'))
            || str_contains($s, 'on the way') || str_contains($s, 'out-for') || str_contains($s, 'out for')) {
            return OrderStatus::OUT_FOR_DELIVERY;
        }
        // Only a genuine "delivered" (past tense, no in-progress qualifier) may complete the order.
        if (str_contains($s, 'deliver') && !str_contains($s, 'out') && !str_contains($s, 'progress')) {
            return OrderStatus::COMPLETED;
        }
        if (str_contains($s, 'transit') || str_contains($s, 'hub') || str_contains($s, 'received')) {
            return OrderStatus::IN_TRANSIT;
        }
        if (str_contains($s, 'pick')) {
            return OrderStatus::SHIPPED;
        }
        return null;
    }

    /**
     * The "hisab": pull /parcel/info and reduce it to the money RedX bills and the
     * net it will settle to the merchant account. Returns a normalized array;
     * throws only on a hard transport failure so the caller can surface it.
     *
     *   net_payout = cash_collection_amount − charge − cod_charge
     *
     * That is exactly the per-parcel figure on RedX's own settlement invoice; RedX
     * exposes no merchant-level invoice/balance endpoint, so we compute it ourselves.
     */
    protected function redxParcelInfo(string $base, array $headers, string $trackingId): array
    {
        $r = Http::withHeaders($headers)->timeout(25)->get($base . '/parcel/info/' . $trackingId);
        if (!$r->successful()) {
            throw new MarvelException('RedX /parcel/info returned HTTP ' . $r->status() . ' for ' . $trackingId . '.');
        }
        $p = (array) ($r->json('parcel') ?? []);
        $cod       = (float) ($p['cash_collection_amount'] ?? 0);
        $charge    = (float) ($p['charge'] ?? 0);
        $codCharge = (float) ($p['cod_charge'] ?? 0);
        return [
            'provider'               => 'redx',
            'tracking_id'            => (string) ($p['tracking_id'] ?? $trackingId),
            'merchant_invoice_id'    => (string) ($p['merchant_invoice_id'] ?? ''),
            'courier_status'         => (string) ($p['status'] ?? ''),
            'value'                  => (float) ($p['value'] ?? 0),
            'cod_collected'          => $cod,
            'delivery_charge'        => $charge,
            'cod_charge'             => $codCharge,
            'net_payout'             => round($cod - $charge - $codCharge, 2),
            'delivery_area'          => (string) ($p['delivery_area'] ?? ''),
        ];
    }

    /**
     * Courier transaction ("hisab") for one order: what RedX billed and what it
     * will pay back, plus the order-status RedX's status maps to.
     *   GET courier-transaction/{provider}?order_id=123  (or ?tracking_id=...)
     *   &apply_status=1  → also advance our order_status to the mapped one (guarded)
     *
     * Applying status is OFF by default and deliberately conservative: it never
     * moves an order OUT of a terminal/accounting state (completed/cancelled/
     * refunded/void/failed) — that path claws back vendor balance and releases
     * stock — and never auto-cancels. Those stay a human decision.
     */
    public function courierTransaction(Request $request, $provider)
    {
        if ($provider !== 'redx') {
            throw new MarvelException('Transactions for ' . ucfirst($provider) . ' are not wired yet.');
        }
        $cfg = ($this->options()['couriers'] ?? [])['redx'] ?? [];
        $base = $this->redxBase($cfg);
        $headers = ['API-ACCESS-TOKEN' => 'Bearer ' . ($cfg['token'] ?? '')];

        $order = null;
        $trackingId = (string) $request->input('tracking_id', '');
        if ($request->filled('order_id')) {
            $order = Order::findOrFail($request->input('order_id'));
            $ops = (array) ($order->ops_meta ?? []);
            $trackingId = $trackingId ?: (string) ($ops['courier_tracking_id'] ?? '');
        }
        if ($trackingId === '') {
            throw new MarvelException('order_id (with a booked RedX parcel) or tracking_id is required.');
        }

        $info = $this->redxParcelInfo($base, $headers, $trackingId);
        $mapped = $this->redxStatusToOrderStatus($info['courier_status']);
        $info['mapped_order_status'] = $mapped;

        if ($order) {
            // Persist the hisab so the order board shows it without re-hitting RedX.
            $ops = (array) ($order->ops_meta ?? []);
            $ops['courier_txn']    = $info;
            $ops['courier_status'] = $info['courier_status'];
            $ops['courier_synced_at'] = now()->toIso8601String();

            $applied = false;
            $terminal = [
                OrderStatus::COMPLETED, OrderStatus::CANCELLED, OrderStatus::REFUNDED,
                OrderStatus::FAILED, 'order-void',
            ];
            if ($request->boolean('apply_status') && $mapped
                && $mapped !== $order->order_status
                && !in_array($order->order_status, $terminal, true)   // don't leave an accounting state
                && $mapped !== OrderStatus::CANCELLED) {              // never auto-cancel (stock release)
                $order->order_status = $mapped;
                $applied = true;
            }
            $order->ops_meta = $ops;
            $order->save();
            $info['status_applied'] = $applied;
            $info['order_status']   = $order->order_status;
        }

        return ['status' => 'success', 'transaction' => $info];
    }

    /**
     * Poll RedX for the delivery status of in-flight orders and advance order_status to match.
     * Run hourly by the `courier:sync-status` command — RedX has no webhook wired here, so
     * without this the board never learns a parcel moved (it sits on "ready to ship" while RedX
     * shows "delivered"). This method was referenced by the command but never existed, so the
     * scheduled sync crashed every run — RedX status was never syncing at all.
     *
     * Mirrors courierTransaction()'s guards exactly: only RedX orders that carry a booked
     * tracking id, never leaves a terminal/accounting state, never auto-cancels (no stock
     * release). Uses saveQuietly() so a batch never fires the per-order Telegram/stock hook
     * (bulk hook = spam per [[order-lifecycle]]); a single summary is sent at the end instead.
     */
    public function syncCourierStatuses(int $days = 45, int $limit = 500): array
    {
        $cfg = ($this->options()['couriers'] ?? [])['redx'] ?? [];
        if (empty($cfg['enabled']) || empty($cfg['token'])) {
            return ['checked' => 0, 'updated' => 0, 'details' => []];
        }
        $base = $this->redxBase($cfg);
        $headers = ['API-ACCESS-TOKEN' => 'Bearer ' . $cfg['token']];

        $terminal = [
            OrderStatus::COMPLETED, OrderStatus::CANCELLED, OrderStatus::REFUNDED,
            OrderStatus::FAILED, 'order-void',
        ];

        $orders = Order::query()
            ->where('created_at', '>=', now()->subDays($days))
            ->where('ops_meta->courier', 'redx')
            ->whereNotNull('ops_meta->courier_tracking_id')
            ->whereNotIn('order_status', $terminal)
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $checked = 0;
        $updated = 0;
        $details = [];
        foreach ($orders as $order) {
            $ops = (array) ($order->ops_meta ?? []);
            $trackingId = (string) ($ops['courier_tracking_id'] ?? '');
            if ($trackingId === '') {
                continue;
            }
            $checked++;
            try {
                $info = $this->redxParcelInfo($base, $headers, $trackingId);
            } catch (\Throwable $e) {
                continue; // transient RedX error — retried next hour
            }
            $mapped = $this->redxStatusToOrderStatus($info['courier_status']);
            $info['mapped_order_status'] = $mapped;

            $ops['courier_txn']       = $info;
            $ops['courier_status']    = $info['courier_status'];
            $ops['courier_synced_at'] = now()->toIso8601String();

            $from = $order->order_status;
            if ($mapped
                && $mapped !== $from
                && !in_array($from, $terminal, true)   // never leave an accounting state
                && $mapped !== OrderStatus::CANCELLED) { // never auto-cancel (stock release)
                $order->order_status = $mapped;
                $updated++;
                $details[] = ['id' => $order->tracking_number, 'from' => $from, 'to' => $mapped];
            }
            $order->ops_meta = $ops;
            $order->saveQuietly(); // quiet: no per-order Telegram/stock hook on a batch
        }

        if ($updated > 0) {
            $lines = array_map(fn ($d) => "#{$d['id']}: {$d['from']} → {$d['to']}", array_slice($details, 0, 20));
            \Marvel\Helpers\AdminNotifier::send(
                "🚚 <b>RedX status sync</b> — {$updated} order updated\n" . implode("\n", $lines)
            );
        }

        return ['checked' => $checked, 'updated' => $updated, 'details' => $details];
    }

    /**
     * Products for a share-cart short link (/shared-cart?i=id.qty-id.qty). The `share-cart` route
     * existed but this method never did, so the link always 500'd and the page rendered empty —
     * which shows up as "stock khali" even for a book that's actually in stock. Returns published
     * products by id with the exact fields the cart + card need (shop.id + image.thumbnail feed
     * generateCartItem). Order doesn't matter — the page re-keys quantities by id.
     */
    public function shareCartItems(Request $request)
    {
        $ids = array_values(array_filter(array_map('intval', explode(',', (string) $request->input('ids', '')))));
        if (empty($ids)) {
            return ['status' => 'success', 'products' => []];
        }
        $products = Product::with(['shop'])
            ->whereIn('id', array_slice($ids, 0, 50))
            ->where('status', 'publish')
            ->get()
            ->map(fn ($p) => [
                'id'          => $p->id,
                'name'        => $p->name,
                'slug'        => $p->slug,
                'image'       => $p->image,
                'price'       => (float) $p->price,
                'sale_price'  => (float) $p->sale_price,
                'quantity'    => (int) $p->quantity,
                'in_stock'    => (int) $p->quantity > 0,
                'unit'        => $p->unit,
                'is_preorder' => (bool) $p->is_preorder,
                'shop_id'     => $p->shop_id,
                'shop'        => $p->shop
                    ? ['id' => $p->shop->id, 'name' => $p->shop->name, 'slug' => $p->shop->slug]
                    : ['id' => $p->shop_id],
            ])
            ->values();
        return ['status' => 'success', 'products' => $products];
    }

    /**
     * Reset a customer's password after they prove ownership of their phone via an SMS OTP.
     * Flow: shop sends the code with the existing `send-otp-code`, then posts it here with the
     * new password. Reuses the exact OTP gateway UserController uses. Lives here (not in
     * UserController) because that controller has diverged on live and can't be safely
     * redeployed. Body: { phone_number, otp_id, code, password }.
     */
    public function resetPasswordByOtp(Request $request)
    {
        $data = $request->validate([
            'phone_number' => 'required|string',
            'otp_id'       => 'required|string',
            'code'         => 'required|string',
            'password'     => 'required|string|min:6',
        ]);

        // Verify the OTP against the same gateway the OTP login uses.
        try {
            $gateway = config('auth.active_otp_gateway', 'smsnetbd');
            $gatewayClass = "Marvel\\Otp\\Gateways\\" . ucfirst($gateway) . 'Gateway';
            $otp = new \Marvel\Otp\Gateways\OtpGateway(new $gatewayClass());
            $check = $otp->checkVerification($data['otp_id'], $data['code'], $data['phone_number']);
            if (!$check->isValid()) {
                return ['success' => false, 'message' => 'OTP যাচাই ব্যর্থ — কোডটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।'];
            }
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'OTP যাচাই করা যায়নি। একটু পরে আবার চেষ্টা করুন।'];
        }

        // Find the account by the verified phone — last-10-digit match so 0 / 88 / +88 formatting
        // never hides it (same rule the order lookup uses).
        $digits = substr(preg_replace('/\D/', '', $data['phone_number']), -10);
        if (strlen($digits) !== 10) {
            return ['success' => false, 'message' => 'মোবাইল নম্বরটি সঠিক নয়।'];
        }
        $profile = Profile::whereRaw(
            "RIGHT(REPLACE(REPLACE(COALESCE(contact, ''), '+', ''), ' ', ''), 10) = ?",
            [$digits]
        )->first();
        $user = $profile ? User::find($profile->customer_id) : null;
        if (!$user) {
            return ['success' => false, 'message' => 'এই নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি।'];
        }

        $user->password = Hash::make($data['password']);
        $user->save();

        return [
            'success' => true,
            'message' => 'পাসওয়ার্ড রিসেট হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
            'email'   => $user->email,
        ];
    }

    /**
     * Record a blocked login attempt (wrong password / no account / inactive / app-invalid).
     * UserController::token() calls this statically, but the method was never defined — so every
     * email login threw "Call to undefined method ... logLoginBlocked" and 500'd (the shop just
     * saw "no response"). Best-effort and NEVER throws: a telemetry write must not break login.
     */
    public static function logLoginBlocked(string $email, string $reason, $request = null): void
    {
        try {
            \Illuminate\Support\Facades\Log::warning('login.blocked', [
                'email'  => $email,
                'reason' => $reason,
                'ip'     => $request instanceof \Illuminate\Http\Request ? $request->ip() : null,
                'at'     => now()->toDateTimeString(),
            ]);
        } catch (\Throwable $e) {
            // swallow — logging a blocked attempt must never affect the login response
        }
    }

    // ------------------------------------------------------------------
    // Restored 2026-07-22. These ten methods still had live routes but the
    // methods themselves were lost when an older copy of this controller was
    // uploaded over the newer one (commit f3307a89), so every one of those
    // endpoints answered with 'Call to undefined method' — which is why
    // /admin/analytics never updated, POS drafts would not save, the product
    // recycle bin could not restore, and invoice links 500'd.
    // ------------------------------------------------------------------

    /** Admin: storefront analytics summary for the last N days — visitors, funnel, journeys. */
    public function analyticsSummary(Request $request)
    {
        $days  = max(1, min(90, (int) $request->input('days', 7)));
        $since = now()->subDays($days);
        $ev    = fn () => DB::table('analytics_events')->where('created_at', '>=', $since);

        $visitors     = $ev()->where('session_id', '!=', 'login')->distinct()->count('session_id');
        $pageViews    = $ev()->where('event', 'page_view')->count();
        $productViews = $ev()->where('event', 'page_view')->where('path', 'like', '/products/%')->count();
        $cartAdds     = $ev()->where('event', 'add_to_cart')->count();
        $loginBlocked = $ev()->where('event', 'login_blocked')->count();

        $topPages = $ev()->where('event', 'page_view')
            ->select('path', DB::raw('count(*) as views'), DB::raw('count(distinct session_id) as visitors'))
            ->groupBy('path')->orderByDesc('views')->limit(15)->get();

        // Recent sessions with their in-order page journey.
        $recent = $ev()->where('session_id', '!=', 'login')
            ->select('session_id', DB::raw('max(created_at) as last_at'), DB::raw('min(created_at) as first_at'), DB::raw('count(*) as events'))
            ->groupBy('session_id')->orderByDesc('last_at')->limit(30)->get();

        $sessions = $recent->map(function ($s) use ($since) {
            $evs = DB::table('analytics_events')
                ->where('session_id', $s->session_id)->where('created_at', '>=', $since)
                ->orderBy('created_at')->limit(60)->get(['event', 'path', 'created_at', 'user_id']);
            $uid  = optional($evs->firstWhere('user_id', '!=', null))->user_id;
            $user = $uid ? DB::table('users')->where('id', $uid)->first(['name', 'email', 'mobile_number']) : null;
            return [
                'session'    => substr((string) $s->session_id, 0, 8),
                'user'       => $user ? ($user->name ?: $user->mobile_number ?: $user->email) : null,
                'events'     => (int) $s->events,
                'duration_s' => max(0, strtotime((string) $s->last_at) - strtotime((string) $s->first_at)),
                'started_at' => $s->first_at,
                'journey'    => $evs->map(fn ($e) => [
                    'event' => $e->event,
                    'path'  => $e->path,
                    'at'    => $e->created_at,
                ])->values(),
            ];
        });

        $blocks = $ev()->where('event', 'login_blocked')
            ->orderByDesc('created_at')->limit(25)->get(['path', 'meta', 'ip', 'created_at']);

        return [
            'status'  => 'success',
            'days'    => $days,
            // since-when data exists + events in the chosen window, so a new store
            // understands why 1/7/30 days can read the same.
            'meta'    => [
                'first_event_at' => DB::table('analytics_events')->min('created_at'),
                'from'           => $since->toDateString(),
                'window_events'  => $ev()->count(),
            ],
            'kpis'    => [
                'visitors'      => $visitors,
                'page_views'    => $pageViews,
                'product_views' => $productViews,
                'cart_adds'     => $cartAdds,
                'login_blocked' => $loginBlocked,
            ],
            'funnel'        => ['page_views' => $pageViews, 'product_views' => $productViews, 'cart_adds' => $cartAdds],
            'top_pages'     => $topPages,
            'sessions'      => $sessions,
            'login_blocked' => $blocks,
        ];
    }

    /** Public: record a storefront event. Kept fire-and-forget — it must never break a page. */
    public function track(Request $request)
    {
        $sid   = substr((string) $request->input('sid', ''), 0, 64);
        $event = substr((string) $request->input('event', ''), 0, 32);
        $allowed = ['page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_start', 'order_placed'];
        if ($sid === '' || !in_array($event, $allowed, true)) {
            return ['status' => 'ok'];
        }
        try {
            DB::table('analytics_events')->insert([
                'session_id'  => $sid,
                'user_id'     => optional(auth('sanctum')->user())->id,
                'event'       => $event,
                'path'        => substr((string) $request->input('path', ''), 0, 512) ?: null,
                'product_id'  => $request->filled('product_id') ? (int) $request->input('product_id') : null,
                'referrer'    => substr((string) $request->input('referrer', ''), 0, 512) ?: null,
                'duration_ms' => $request->filled('duration_ms') ? (int) $request->input('duration_ms') : null,
                'meta'        => $request->filled('meta') ? json_encode($request->input('meta')) : null,
                'ip'          => substr((string) $request->ip(), 0, 64),
                'user_agent'  => substr((string) $request->userAgent(), 0, 512),
                'created_at'  => now(),
            ]);
        } catch (\Throwable $e) {
            // swallow — a tracking hiccup must not surface to the shopper
        }
        return ['status' => 'ok'];
    }

    /** Admin: park the current POS order as a draft (not placed) so it can be resumed later. */
    public function saveOrderDraft(Request $request)
    {
        $label = substr(trim((string) $request->input('label', '')), 0, 191) ?: 'খসড়া অর্ডার';
        $id = DB::table('order_drafts')->insertGetId([
            'label'      => $label,
            'payload'    => json_encode($request->input('payload', [])),
            'created_by' => optional($request->user())->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return ['status' => 'success', 'id' => $id, 'label' => $label];
    }

    /** Admin: the 5 most recent drafts for the create-order header. */
    public function listOrderDrafts(Request $request)
    {
        $drafts = DB::table('order_drafts')->orderByDesc('id')->limit(5)->get(['id', 'label', 'created_at']);
        return ['status' => 'success', 'drafts' => $drafts];
    }

    /** Admin: one draft's saved state, to reload it into the POS form. */
    public function getOrderDraft(Request $request, $id)
    {
        $row = DB::table('order_drafts')->where('id', (int) $id)->first();
        if (!$row) {
            throw new MarvelException('খসড়াটি পাওয়া যায়নি।');
        }
        return ['status' => 'success', 'id' => $row->id, 'label' => $row->label, 'payload' => json_decode($row->payload, true)];
    }

    /** Admin: drop a draft (e.g. once its order has been placed). */
    public function deleteOrderDraft(Request $request, $id)
    {
        DB::table('order_drafts')->where('id', (int) $id)->delete();
        return ['status' => 'success'];
    }


    public function forceDeleteProduct(Request $request, $id)
    {
        $p = Product::onlyTrashed()->where('type_id', 8)->findOrFail($id);
        $p->categories()->detach();
        $p->tags()->detach();
        $p->forceDelete();
        return ['success' => true, 'id' => (int) $id];
    }

    // Recycle bin: restore a soft-deleted product, or purge it for good.
    public function restoreTrashedProduct(Request $request, $id)
    {
        $p = Product::onlyTrashed()->where('type_id', 8)->findOrFail($id);
        $p->restore();
        return ['success' => true, 'id' => (int) $id];
    }

    /** Public: the read-only invoice behind /invoice/{token}. Always viewable — paid or not. */
    public function invoiceInfo(Request $request)
    {
        $token = (string) $request->input('token', '');
        $order = $token === ''
            ? null
            : Order::whereRaw("JSON_UNQUOTE(JSON_EXTRACT(ops_meta, '$.invoice_token')) = ?", [$token])->first();
        if (!$order) {
            throw new MarvelException('Invoice not found.');
        }
        $order->loadMissing('products');
        $ops = (array) ($order->ops_meta ?? []);
        $paid = self::orderIsPaid($order);
        // Surface a live pay link only while one is genuinely payable (unpaid + not expired), so
        // the invoice can carry a "Pay now" button for a due amount without ever reviving a dead
        // link.
        $payLink = null;
        if (!$paid && !empty($ops['pay_token'])) {
            $expired = !empty($ops['pay_expires_at']) && now()->gt(Carbon::parse($ops['pay_expires_at']));
            if (!$expired) {
                $base = rtrim(config('shop.shop_url') ?? 'https://indobangla.bd', '/');
                $payLink = $base . '/pay/' . $ops['pay_token'];
            }
        }
        $opts = (array) (Settings::getData()->options ?? []);
        return [
            'status'  => 'success',
            'invoice' => [
                'tracking_number' => $order->tracking_number,
                'customer_name'   => $order->customer_name,
                'customer_contact' => $order->customer_contact,
                'shipping_address' => $order->shipping_address,
                'placed_at'       => optional($order->created_at)->format('j M Y'),
                'order_status'    => $order->order_status,
                'payment_status'  => $order->payment_status,
                'paid'            => $paid,
                'subtotal'        => (float) $order->amount,
                'delivery_fee'    => (float) $order->delivery_fee,
                'weight_charge'   => (int) ($ops['weight_charge'] ?? 0),
                'weight_kg'       => (float) ($ops['weight_kg'] ?? 0),
                'discount'        => (float) $order->discount,
                'total'           => (float) $order->total,
                'paid_total'      => (float) $order->paid_total,
                // An order marked paid by its payment_status has a due of ZERO even when paid_total
                // was never raised to match — marking an order paid from the status control sets
                // payment_status only, and reading `total - paid_total` regardless made the invoice
                // and the pay screen announce 'paid' while still demanding the full amount.
                'due'             => $paid ? 0 : max(0, round((float) $order->total - (float) $order->paid_total)),
                'pay_method'      => $ops['pay_method'] ?? null,
                'pay_link'        => $payLink,
                'items'           => $order->products->map(fn ($p) => [
                    'name'         => $p->name,
                    'manufacturer' => optional($p->manufacturer)->name,
                    'quantity'     => (int) ($p->pivot->order_quantity ?? 0),
                    'price'        => (float) ($p->pivot->subtotal ?? $p->pivot->unit_price ?? 0),
                    // A book with no cover stores JSON null/{} rather than SQL NULL, so read the
                    // key instead of trusting the column to be empty.
                    'image'        => is_array($p->image)
                        ? ($p->image['thumbnail'] ?? $p->image['original'] ?? null)
                        : null,
                    'slug'         => $p->slug,
                ]),
            ],
            'shop' => [
                'name' => $opts['siteTitle'] ?? 'IndoBangla',
            ],
        ];
    }

    /**
     * Admin: mint (once) a stable, non-expiring invoice link the desk can send so the buyer can
     * view their invoice without opening the order. Unlike the pay token this never rotates, so
     * a link shared today keeps working.
     */
    public function orderInvoiceLink(Request $request)
    {
        $order = Order::findOrFail($request->order_id);
        $ops = (array) ($order->ops_meta ?? []);
        if (empty($ops['invoice_token'])) {
            $ops['invoice_token'] = 'inv_' . Str::random(24);
            $order->ops_meta = $ops;
            $order->saveQuietly();
        }
        $base = rtrim(config('shop.shop_url') ?? 'https://indobangla.bd', '/');
        return [
            'status'        => 'success',
            'invoice_token' => $ops['invoice_token'],
            'invoice_link'  => $base . '/invoice/' . $ops['invoice_token'],
        ];
    }
}
