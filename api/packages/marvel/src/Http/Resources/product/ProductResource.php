<?php

namespace Marvel\Http\Resources;

use Illuminate\Http\Request;

class ProductResource extends Resource
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
            'id'                   => $this->id,
            'name'                 => $this->name,
            'slug'                 => $this->slug,
            'type'                 => getResourceData($this->type, ['settings']), // if you need extra data then pass key in array by second parameter
            'language'             => $this->language,
            'translated_languages' => $this->translated_languages,
            'product_type'         => $this->product_type,
            'shop'                 => getResourceData($this->shop, []), // if you need extra data then pass key in array by second parameter
            'sale_price'           => $this->sale_price,
            'max_price'            => $this->max_price,
            'min_price'            => $this->min_price,
            'image'                => $this->image,
            'status'               => $this->status,
            'price'                => $this->price,
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
            'book_origin'                => $this->book_origin,
            'quantity'             => $this->quantity,
            'unit'                 => $this->unit,
            'sku'                  => $this->sku,
            'sold_quantity'        => $this->sold_quantity,
            'in_flash_sale'        => $this->in_flash_sale,
            'visibility'           => $this->visibility
        ];
    }
}
