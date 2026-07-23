<?php

namespace Marvel\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Marvel\Enums\Permission;


class CustomPageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Only used by store/update (writes) — index takes a plain Request. These create/edit the
     * public CMS pages (About/Terms/Privacy/header), so they must be a super-admin action.
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
        ];
    }

    public function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json($validator->errors(), 422));
    }
}