<?php

namespace Marvel\Database\Models;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Cviebrock\EloquentSluggable\Sluggable;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Marvel\Traits\Excludable;
use Kodeine\Metable\Metable;
use Marvel\Exceptions\MarvelException;
use Marvel\Traits\TranslationTrait;

class Product extends Model
{
    use Sluggable, SoftDeletes, Excludable, Metable, TranslationTrait;

    public $guarded = [];

    protected $table = 'products';
    protected $metaTable = 'products_meta'; //optional.
    // protected $disableFluentMeta = true;
    public $hideMeta = true;

    /**
     * Any product write through the admin — edit, publish, restock, AI-batch create/update —
     * bumps the catalog cache version so the change shows up in search + listings at once
     * instead of waiting out the 5–15 min catalog.cache TTL (see CacheCatalogResponse).
     * Order stock changes use saveQuietly(), which does NOT fire these events, so checkout
     * traffic never flushes the cache.
     */
    protected static function booted(): void
    {
        // Best-effort: a cache hiccup must never break the write itself. Throwing here would
        // 500 every publish/edit AND every void (void releases stock via a product save) —
        // failing to invalidate just means the catalog serves a stale copy until its TTL.
        $bustCatalog = static function (): void {
            try {
                Cache::increment('catalog:version');
            } catch (\Throwable $e) {
                // ignore — invalidation is not worth failing a product write over
            }
        };
        static::saved($bustCatalog);
        static::deleted($bustCatalog);
    }

    protected $casts = [
        'image' => 'json',
        'gallery' => 'json',
        'video' => 'json',
        'resell_meta' => 'json',
        'gift_product_ids' => 'array',
        'preorder_show_count' => 'boolean',
        'gift_per_copy' => 'boolean',
    ];

    // gift_max is NOT NULL DEFAULT 0, but the admin create form can submit an
    // explicit null (gift feature off). An explicit null bypasses the column
    // default and violates the NOT NULL constraint, so product create/import
    // fails. Coerce null to 0 here so every write path stays valid.
    public function setGiftMaxAttribute($value)
    {
        $this->attributes['gift_max'] = $value ?? 0;
    }

    // Same guard for gift_per_copy (NOT NULL DEFAULT 1). The boolean cast does
    // not turn an explicit null into 0/1, so coerce it here.
    public function setGiftPerCopyAttribute($value)
    {
        $this->attributes['gift_per_copy'] = is_null($value) ? 1 : (int) (bool) $value;
    }

    protected $appends = [
        'ratings',
        'total_reviews',
        'rating_count',
        'my_review',
        'in_wishlist',
        'blocked_dates',
        'translated_languages',
        'book',
        'search_keywords',
    ];

    /**
     * The source link for an imported book.
     *
     * The old shop kept it in `pre_url`; ours writes `external_product_url`. Both are still
     * in the table, and 546 imported books only have the old one — so read through to it
     * rather than copying data around and having to keep the two columns in step.
     */
    public function getExternalProductUrlAttribute($value)
    {
        return $value ?: ($this->attributes['pre_url'] ?? null);
    }

    /**
     * IndoBangla book specification fields, stored as a single "book_meta"
     * meta entry (ISBN, language, print type, page count, dimensions, etc.).
     */
    public function getBookAttribute()
    {
        try {
            $val = $this->getMeta('book_meta');
            if (!empty($val)) {
                return $val;
            }
            // LEGACY FALLBACK — books carried over from the old site keep these details in their
            // own columns (ISBN_10/13, paper_hard_cover, page_number, book_printed_origin …), not
            // in book_meta: only ~29 of ~9,000 products ever got a book_meta row, so without this
            // the ISBN / print type / page count / printed country read blank everywhere. Nothing
            // is rewritten here — the values are simply surfaced, and the first admin save
            // persists them into book_meta going forward.
            $a = $this->attributes;
            // Old values differ in case and wording from the current dropdowns
            // ("hardcover", "Old (unused)", "Abroad", "india"), so map them onto the canonical
            // options. Anything unrecognised passes through untouched rather than being dropped.
            $norm = function ($v, array $map) {
                $v = trim((string) ($v ?? ''));
                if ($v === '') {
                    return null;
                }
                return $map[mb_strtolower($v)] ?? $v;
            };
            $legacy = [
                'printed_country' => $norm($a['book_printed_origin'] ?? ($a['country_origin'] ?? null), [
                    'bangladesh' => 'Bangladesh', 'india' => 'India', 'china' => 'China',
                    'uk' => 'UK', 'usa' => 'USA', 'abroad' => 'Others', 'others' => 'Others',
                ]),
                'language'      => $norm($a['book_wriiten_language'] ?? null, []),
                'print_type'    => $norm($a['paper_hard_cover'] ?? null, [
                    'hardcover' => 'Hardcover', 'hard cover' => 'Hardcover',
                    'paperback' => 'Paperback', 'paper back' => 'Paperback',
                    'flexibound' => 'Flexibound', 'leatherbound' => 'Leatherbound',
                ]),
                'condition'     => $norm($a['item_condition'] ?? null, [
                    'new' => 'New', 'used' => 'Used',
                    'old (unused)' => 'Old Stock (unused)', 'old stock (unused)' => 'Old Stock (unused)',
                    'old like new' => 'Old Stock (unused)',
                    'little damage' => 'Little Damaged', 'little damaged' => 'Little Damaged',
                    'damage' => 'Damaged', 'damaged' => 'Damaged',
                ]),
                'reading_level' => $norm($a['readling_level'] ?? null, []),
                'edition'       => $norm($a['book_edition'] ?? null, []),
                'isbn10'        => $norm($a['ISBN_10'] ?? null, []),
                'isbn13'        => $norm($a['ISBN_13'] ?? null, []),
                'item_weight'   => $norm($a['item_weight'] ?? null, []),
                'page_number'   => $norm($a['page_number'] ?? null, []),
            ];
            $legacy = array_filter($legacy, fn ($v) => $v !== null && $v !== '');
            return !empty($legacy) ? $legacy : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Admin-editable search keywords ("search_keywords" meta). Auto-suggested from the product's
     * own details in the admin form, then matched by the storefront search so a book also surfaces
     * for the words shoppers actually type (synonyms, alternate spellings, series names).
     */
    public function getSearchKeywordsAttribute()
    {
        try {
            $val = $this->getMeta('search_keywords');
            return is_string($val) && $val !== '' ? $val : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Return the sluggable configuration array for this model.
     *
     * @return array
     */
    public function sluggable(): array
    {
        return [
            'slug' => [
                'source' => 'name'
            ]
        ];
    }


    public function scopeWithUniqueSlugConstraints(Builder $query, Model $model): Builder
    {
        return $query->where('language', $model->language);
    }

    /**
     * Get the user's full name.
     *
     * @return string
     */
    public function getBlockedDatesAttribute()
    {
        return $this->getBlockedDates();
    }

    function getBlockedDates()
    {
        $_blockedDates = $this->fetchBlockedDatesForAProduct();
        $_flatBlockedDates = [];
        foreach ($_blockedDates as $date) {
            $from = Carbon::parse($date->from);
            $to = Carbon::parse($date->to);
            $dateRange = CarbonPeriod::create($from, $to);
            $_blockedDates = $dateRange->toArray();
            unset($_blockedDates[count($_blockedDates) - 1]);
            $_flatBlockedDates =  array_unique(array_merge($_flatBlockedDates, $_blockedDates));
        }
        return $_flatBlockedDates;
    }

    public function fetchBlockedDatesForAProduct()
    {
        return  Availability::where('product_id', $this->id)->where('bookable_type', 'Marvel\Database\Models\Product')->whereDate('to', '>=', Carbon::now())->get();
    }

    /**
     * @return BelongsTo
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(Type::class, 'type_id');
    }

    /**
     * @return BelongsTo
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    /**
     * @return BelongsTo
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class, 'author_id');
    }

    /**
     * @return BelongsTo
     */
    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class, 'manufacturer_id');
    }

    /**
     * @return BelongsTo
     */
    public function shipping(): BelongsTo
    {
        return $this->belongsTo(Shipping::class, 'shipping_class_id');
    }

    /**
     * @return BelongsToMany
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_product');
    }

    /**
     * @return BelongsToMany
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tag');
    }

    /**
     * @return HasMany
     */
    public function variation_options(): HasMany
    {
        return $this->hasMany(Variation::class, 'product_id');
    }

    /**
     * @return belongsToMany
     */
    public function orders(): belongsToMany
    {
        return $this->belongsToMany(Order::class)->withTimestamps();
    }

    /**
     * @return BelongsToMany
     */
    public function variations(): BelongsToMany
    {
        return $this->belongsToMany(AttributeValue::class, 'attribute_product');
    }

    /**
     * @return HasMany
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'product_id');
    }

    /**
     * @return HasMany
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class, 'product_id');
    }

    /**
     * Admin-managed book awards attached to this product.
     * @return BelongsToMany
     */
    public function awards(): BelongsToMany
    {
        return $this->belongsToMany(Award::class, 'award_product');
    }

    /**
     * @return HasMany
     */
    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class, 'product_id');
    }

    public function getRatingsAttribute()
    {
        return round($this->reviews()->avg('rating'), 2);
    }

    public function getTotalReviewsAttribute()
    {
        return $this->reviews()->count();
    }

    public function getRatingCountAttribute()
    {
        return $this->reviews()->orderBy('rating', 'DESC')->groupBy('rating')->select('rating', DB::raw('count(*) as total'))->get();
    }

    public function getMyReviewAttribute()
    {
        if (auth()->user() && !empty($this->reviews()->where('user_id', auth()->user()->id)->first())) {
            return $this->reviews()->where('user_id', auth()->user()->id)->get();
        }
        return null;
    }

    public function getInWishlistAttribute()
    {
        if (auth()->user() && !empty($this->wishlists()->where('user_id', auth()->user()->id)->first())) {
            return true;
        }
        return false;
    }

    public function digital_file()
    {
        return $this->morphOne(DigitalFile::class, 'fileable');
    }

    public function availabilities()
    {
        return $this->morphMany(Availability::class, 'bookable');
    }


    /**
     * @return BelongsToMany
     */
    public function dropoff_locations(): BelongsToMany
    {
        return $this->belongsToMany(Resource::class, 'dropoff_location_product', 'product_id', 'resource_id');
    }
    /**
     * @return BelongsToMany
     */
    public function pickup_locations(): BelongsToMany
    {
        return $this->belongsToMany(Resource::class, 'pickup_location_product', 'product_id', 'resource_id');
    }
    /**
     * @return BelongsToMany
     */
    public function deposits(): BelongsToMany
    {
        return $this->belongsToMany(Resource::class, 'deposit_product', 'product_id', 'resource_id');
    }
    /**
     * @return BelongsToMany
     */
    public function persons(): BelongsToMany
    {
        return $this->belongsToMany(Resource::class, 'person_product', 'product_id', 'resource_id');
    }
    /**
     * @return BelongsToMany
     */
    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Resource::class, 'feature_product', 'product_id', 'resource_id');
    }

    /**
     * @return BelongsToMany
     */
    public function flash_sales(): BelongsToMany
    {
        return $this->belongsToMany(FlashSale::class, 'flash_sale_products')->withPivot('flash_sale_id', 'product_id');
    }

    /**
     * flash_sale_requests
     *
     * @return BelongsToMany
     */
    public function flash_sale_requests(): BelongsToMany
    {
        return $this->belongsToMany(FlashSaleRequests::class, "flash_sale_requests_products");
    }

    public function loadRelated($slug, $limit = 10, $language = DEFAULT_LANGUAGE)
    {
        $relatedProducts = [];
        try {
            $product    = $this->where('slug', $slug)->firstOrFail();
            $categories = $product->categories()->pluck('id');

            $relatedProducts = $this->where('language', $language)
                ->whereHas('categories', function ($query) use ($categories) {
                    $query->whereIn('categories.id', $categories);
                })->with('type')->limit($limit)->get();
        } catch (Exception $e) {
            logger($e->getMessage()); // logging the error
        }
        $this->setRelation('related_products', $relatedProducts);
        return $this;
    }
}
