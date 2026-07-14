<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Model;

class CustomPage extends Model
{
    protected $table = 'custom_pages';

    public $guarded = [];

    protected $casts = [
        'page_options' => 'json',
    ];

    public static function getData($language = DEFAULT_LANGUAGE)
    {
        $data = static::where('language', $language)->first();

        if (!$data) {
            $data = static::where('language', DEFAULT_LANGUAGE)->first();
        }

        return $data;
    }
}