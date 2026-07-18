<?php


namespace Marvel\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;


class UserCreateRequest extends FormRequest
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
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            // Email is optional, but only because a mobile number can stand in for it: the desk
            // creates walk-in customers from a phone number alone, while the public sign-up form
            // still sends an email. One of the two has to be there or the account has no way to
            // be identified or recovered — `required_without` is what enforces that, not the
            // nullable in front of it.
            'email'         => ['nullable', 'required_without:mobile_number', 'email', 'unique:users'],
            'mobile_number' => ['nullable', 'required_without:email', 'string', 'max:20', 'unique:users'],
            'password' => ['required', 'string'],
            'shop_id' => ['nullable', 'exists:Marvel\Database\Models\Shop,id'],
            'profile'  => ['array'],
            'address'  => ['array'],
            // 'shop'  => ['array'],
        ];
    }

    /**
     * Get the error messages that apply to the request parameters.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'name.required'      => 'Name is required',
            'name.string'        => 'Name is not a valid string',
            'name.max:255'       => 'Name can not be more than 255 character',
            'email.required'     => 'email is required',
            'email.email'        => 'email is not a valid email address',
            'email.unique:users' => 'email must be unique',
            'password.required'  => 'password is required',
            'password.string'    => 'password is not a valid string',
            'address.array'      => 'address is not a valid json',
            'profile.array'      => 'profile is not a valid json',
        ];
    }

    public function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json($validator->errors(), 422));
    }
}
