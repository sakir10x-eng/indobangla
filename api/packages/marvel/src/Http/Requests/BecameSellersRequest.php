<?php

namespace Marvel\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Marvel\Enums\Permission;


class BecameSellersRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Only used by store/update (writes) — index/show take a plain Request. These rewrite the
     * seller page and platform commission tiers, so they must be a super-admin action.
     *
     * @return bool
     */
    public function authorize()
    {
        return (bool) ($this->user()?->can(Permission::SUPER_ADMIN));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'page_options' => ['required', 'array'],
            'commission.*.min_balance' => ['required','numeric', 'min:0'],
            'commission.*.max_balance' => ['required'],
            'commission.*.commission' => ['required','numeric', 'min:0'],
            'commission.*.level' => ['required','string'],
            'commission.*.sub_level' => ['required','string'],
        ];
    }

    public function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json($validator->errors(), 422));
    }
}
