<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Award extends Model
{
    protected $table = 'awards';

    public $guarded = [];

    protected $casts = [
        'image'     => 'json',
        'is_active' => 'boolean',
    ];

    /**
     * Books that hold this award.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'award_product');
    }
}
