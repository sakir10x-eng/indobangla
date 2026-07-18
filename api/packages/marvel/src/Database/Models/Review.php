<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    use SoftDeletes;

    protected $table = 'reviews';

    public $guarded = [];

    protected $casts = [
        'photos' => 'json',
    ];

    protected $appends = [
        'positive_feedbacks_count',
        'negative_feedbacks_count',
        'my_feedback',
        'abusive_reports_count',
        'comments_count'
    ];

    /**
     * @return BelongsTo
     */
    public function product(): BelongsTo
    {
        return $this->BelongsTo(Product::class, 'product_id');
    }

    /**
     * @return belongsTo
     */
    public function user(): belongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get all of the reviews feedbacks.
     */
    public function feedbacks()
    {
        return $this->morphMany(Feedback::class, 'model');
    }

    public function abusive_reports()
    {
        return $this->morphMany(AbusiveReport::class, 'model');
    }

    /**
     * Threaded comments left on this review ("kotojon comment korlo").
     */
    public function comments()
    {
        return $this->hasMany(ReviewComment::class, 'review_id');
    }

    /**
     * Positive feedback count of review .
     * @return int
     */
    public function getPositiveFeedbacksCountAttribute()
    {
        return $this->feedbacks()->wherePositive(1)->count();
    }

    /**
     * Negative feedback count of review .
     * @return int
     */
    public function getNegativeFeedbacksCountAttribute()
    {
        return $this->feedbacks()->whereNegative(1)->count();
    }

    /**
     * Get authenticated user feedback
     * @return object | null
     */
    public function getMyFeedbackAttribute()
    {
        if(auth()->user()) {
            return $this->feedbacks()->where('user_id', auth()->user()->id)->first();
        }
        return null;
    }

    /**
     * Count no of abusive reports in the review.
     * @return int
     */
    public function getAbusiveReportsCountAttribute() {
        return $this->abusive_reports()->count();
    }

    /**
     * How many comments this review has ("kotojon comment korlo").
     * @return int
     */
    public function getCommentsCountAttribute()
    {
        return $this->comments()->count();
    }

}
