<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Model;

class ChallengeRun extends Model
{
    protected $table = 'challenge_runs';

    public $guarded = [];

    protected $casts = [
        'product_ids' => 'array',
        'page_hits'   => 'array',
        'started_at'  => 'datetime',
        'expires_at'  => 'datetime',
    ];

    /** Books allowed from any one product page. */
    public const MAX_PER_PAGE = 2;

    public const RUNNING   = 'running';
    public const CHECKOUT  = 'checkout';
    public const COMPLETED = 'completed';
    public const FORFEITED = 'forfeited';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Still inside the 60-second window? */
    public function isLive(): bool
    {
        return $this->status === self::RUNNING && $this->expires_at->isFuture();
    }

    /**
     * The order that used this run's coupon just landed — the customer finished what they
     * started, so give the staked points back.
     *
     * Points are taken up front (see ChallengeTrait::stakePoints), which is what makes an
     * abandoned run self-settling: nothing has to run later to punish it.
     */
    public static function settleForOrder(Order $order): void
    {
        if (empty($order->coupon_id) || empty($order->customer_id)) {
            return;
        }

        $run = static::where('user_id', $order->customer_id)
            ->where('coupon_id', $order->coupon_id)
            ->where('status', self::CHECKOUT)
            ->latest('id')
            ->first();

        if (!$run) {
            return;
        }

        $run->status = self::COMPLETED;
        $run->order_id = $order->id;
        $run->save();

        if ($run->points_staked > 0) {
            $wallet = Wallet::where('customer_id', $run->user_id)->first();
            if ($wallet) {
                $wallet->available_points += $run->points_staked;
                $wallet->points_used = max(0, $wallet->points_used - $run->points_staked);
                $wallet->save();
            }
        }
    }
}
