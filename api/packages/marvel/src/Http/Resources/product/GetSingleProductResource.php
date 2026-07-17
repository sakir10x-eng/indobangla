<?php

namespace Marvel\Http\Resources;

use Illuminate\Http\Request;
use Marvel\Helper\ResourceHelpers;

class GetSingleProductResource extends Resource
{
    /**
     * Transform the resource into an array.
     *
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        return [
            'id'                           => $this->id,
            'name'                         => $this->name,
            'slug'                         => $this->slug,
            'type' => [
                ...getResourceData($this->type),
                'layoutType' => $this->type->settings['layoutType'] ?? null
            ],
            'language'                     => $this->language,
            'translated_languages'         => $this->translated_languages,
            'product_type'                 => $this->product_type,
            'categories'                   => getResourceCollection($this->categories, []), // if you need extra data then pass key in array by second parameter
            'tags'                         => getResourceCollection($this->tags, []), // if you need extra data then pass key in array by second parameter
            'metas'                        => $this->metas,
            'digital_file'                 => $this->digital_file,
            'book'                         => $this->book,
            'variations'                   => getVariations($this->variations),
            'variation_options'            => $this->variation_options,
            'shop_id'                      => $this->shop_id,
            'shop'                         => getResourceData($this->shop, []), // if you need extra data then pass key in array by second parameter
            'author'                       => getResourceData($this->author, ['image', 'bangla_name', 'bio']),  // if you need extra data then pass key in array by second parameter
            'manufacturer'                 => getResourceData($this->manufacturer, ['image', 'cover_image', 'bangla_name', 'description', 'website']),  // if you need extra data then pass key in array by second parameter
            'related_products'             => RelatedProductResource::collection($this->related_products),
            'description'                  => $this->description,
            'in_stock'                     => $this->in_stock,
            'is_taxable'                   => $this->is_taxable,
            'is_digital'                   => $this->is_digital,
            'is_external'                  => $this->is_external,
            'external_product_url'         => $this->external_product_url,
            'external_product_button_text' => $this->external_product_button_text,
            'sale_price'                   => $this->sale_price,
            'max_price'                    => $this->max_price,
            'min_price'                    => $this->min_price,
            'ratings'                      => $this->ratings,
            'total_reviews'                => $this->total_reviews,
            'rating_count'                 => $this->rating_count,
            'my_review'                    => $this->my_review,
            'in_wishlist'                  => $this->in_wishlist,
            'sku'                          => $this->sku,
            'gallery'                      => $this->gallery,
            'image'                        => $this->image,
            'video'                        => $this->video,
            'status'                       => $this->status,
            'height'                       => $this->height,
            'length'                       => $this->length,
            'width'                        => $this->width,
            'price'                        => $this->price,
            'mrp'                        => $this->mrp,
            'is_resell'                  => (bool) $this->is_resell,
            'resell_meta'                => $this->resell_meta,
            'is_preorder'                => (bool) $this->is_preorder,
            'preorder_until'             => $this->preorder_until,
            'preorder_limit'             => $this->preorder_limit,
            'preorder_show_count'        => (bool) ($this->preorder_show_count ?? true),
            'preorder_count'             => (int) $this->preorder_count,
            'preorder_advance_pct'       => (int) ($this->preorder_advance_pct ?: 50),
            'preorder_full_pay_discount_pct' => (int) ($this->preorder_full_pay_discount_pct ?? 5),
            'gift_max'                   => (int) ($this->gift_max ?? 0),
            'gift_per_copy'              => (bool) ($this->gift_per_copy ?? true),
            'gift_product_ids'           => $this->gift_product_ids ?: [],
            'gift_products'              => (($ids = $this->gift_product_ids) && (int) ($this->gift_max ?? 0) > 0)
                ? \Marvel\Database\Models\Product::whereIn('id', $ids)->get()->map(function ($g) {
                    return [
                        'id'         => $g->id,
                        'name'       => $g->name,
                        'slug'       => $g->slug,
                        'price'      => (float) ($g->sale_price ?: $g->price),
                        'quantity'   => (int) $g->quantity,
                        'in_stock'   => (int) $g->quantity > 0,
                        'image'      => $g->image,
                    ];
                })->values()
                : [],
            'book_origin'                => $this->book_origin,
            'quantity'                     => $this->quantity,
            'unit'                         => $this->unit,
            'in_flash_sale'                => $this->in_flash_sale
        ];
    }
}
