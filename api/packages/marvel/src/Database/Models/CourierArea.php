<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One delivery area as the courier defines it. Synced from the provider's own
 * list; see IntegrationController::syncRedxAreas().
 */
class CourierArea extends Model
{
    protected $table = 'courier_areas';

    public $guarded = [];

    protected $casts = [
        'area_id' => 'integer',
        'zone_id' => 'integer',
    ];
}
