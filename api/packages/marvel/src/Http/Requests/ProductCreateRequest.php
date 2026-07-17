<?php

namespace Marvel\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Marvel\Enums\ProductStatus;
use Marvel\Enums\ProductType;
use Marvel\Enums\Permission;
use Marvel\Database\Models\Settings;
use Marvel\Database\Models\Shop;

class ProductCreateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * A super-admin can create a product straight from the global "All products"
     * screen without picking a shop. When shop_id is missing we default it to the
     * main IndoBangla shop, so the required-shop_id validation never blocks them.
     */
    protected function prepareForValidation()
    {
        if (!$this->filled('shop_id')) {
            $user = $this->user();
            if ($user && $user->hasPermissionTo(Permission::SUPER_ADMIN)) {
                $mainShopId = $this->resolveMainShopId();
                if ($mainShopId) {
                    $this->merge(['shop_id' => $mainShopId]);
                }
            }
        }
    }

    /** Main shop = Settings.options.main_shop_id, else the shop with the most products, else the first shop. */
    private function resolveMainShopId(): ?int
    {
        $options = optional(Settings::first())->options ?? [];
        $id = (int) ($options['main_shop_id'] ?? 0);
        if ($id > 0 && Shop::whereKey($id)->exists()) {
            return $id;
        }

        $busiest = DB::table('products')->whereNotNull('shop_id')
            ->groupBy('shop_id')->orderByRaw('COUNT(*) DESC')->value('shop_id');
        if ($busiest) {
            return (int) $busiest;
        }

        return optional(Shop::orderBy('id')->first())->id;
    }


    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        $productStatus = [
            ProductStatus::UNDER_REVIEW,
            ProductStatus::APPROVED,
            ProductStatus::REJECTED,
            ProductStatus::PUBLISH,
            ProductStatus::UNPUBLISH,
            ProductStatus::DRAFT,
        ];

        $productType = [
            ProductType::SIMPLE,
            ProductType::VARIABLE
        ];

        return [
            'name'                         => ['required', 'string', 'max:255'],
            'slug'                         => ['nullable', 'string'],
            'price'                        => ['nullable', 'numeric'],
            'sale_price'                   => ['nullable', 'lte:price'],
            'type_id'                      => ['required', 'exists:Marvel\Database\Models\Type,id'],
            'shop_id'                      => ['required', 'exists:Marvel\Database\Models\Shop,id'],
            'manufacturer_id'              => ['nullable', 'exists:Marvel\Database\Models\Manufacturer,id'],
            'author_id'                    => ['nullable', 'exists:Marvel\Database\Models\Author,id'],
            'product_type'                 => ['required', Rule::in($productType)],
            'categories'                   => ['array'],
            'tags'                         => ['array'],
            'language'                     => ['nullable', 'string'],
            'dropoff_locations'            => ['array'],
            'pickup_locations'             => ['array'],
            'digital_file'                 => ['array'],
            'variations'                   => ['array'],
            'variation_options'            => ['array'],
            'quantity'                     => ['nullable', 'integer'],
            'unit'                         => ['required', 'string'],
            'description'                  => ['nullable', 'string', 'max:10000'],
            'sku'                          => ['string', 'unique:variation_options,sku'],
            'image'                        => ['array'],
            'gallery'                      => ['array'],
            'video'                        => ['array'],
            'status'                       => ['string', Rule::in($productStatus)],
            'height'                       => ['nullable', 'string'],
            'length'                       => ['nullable', 'string'],
            'width'                        => ['nullable', 'string'],
            'external_product_url'         => ['nullable', 'string'],
            'external_product_button_text' => ['nullable', 'string'],
            'in_stock'                     => ['boolean'],
            'is_taxable'                   => ['boolean'],
            'is_digital'                   => ['boolean'],
            'is_external'                  => ['boolean'],
            'is_rental'                    => ['boolean'],
            "variation_options.upsert.*.sku" => ['string', 'unique:variation_options,sku'],
        ];
    }

    public function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json($validator->errors(), 422));
    }
}
