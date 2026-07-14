<?php

namespace Marvel\Database\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Marvel\Database\Models\Variation;
use Marvel\Database\Models\Wishlist;
use Marvel\Exceptions\MarvelException;
use Prettus\Repository\Criteria\RequestCriteria;
use Prettus\Repository\Exceptions\RepositoryException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WishlistRepository extends BaseRepository
{
    public function boot()
    {
        try {
            $this->pushCriteria(app(RequestCriteria::class));
        } catch (RepositoryException $e) {
            //
        }
    }

    /**
     * @var array[]
     */
    protected $dataArray = [
        'user_id',
        'product_id',
        'variation_option_id'
    ];

    /**
     * Configure the Model
     **/
    public function model()
    {
        return Wishlist::class;
    }

    /**
     * @param $request
     * @return LengthAwarePaginator|JsonResponse|Collection|mixed
     */
    public function storeWishlist($request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
        $productId = (int) $request['product_id'];

        return Wishlist::firstOrCreate(
            ['user_id' => $user->id, 'product_id' => $productId],
            ['variation_option_id' => $request['variation_option_id'] ?? null]
        );
    }

    /**
     * Add the product to the caller's wishlist, or take it off if it's already there.
     *
     * Writes straight through the model instead of the Prettus create/delete path, which
     * applies request criteria to the lookup, and lets exceptions bubble: the old version
     * caught every \Exception and rethrew SOMETHING_WENT_WRONG, which Marvel then renders
     * as HTTP 200 — so a failed write was indistinguishable from a successful one.
     *
     * @param $request
     * @return bool true when the product was added, false when it was removed
     */
    public function toggleWishlist($request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
        $productId = (int) $request['product_id'];

        $wishlist = Wishlist::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        if ($wishlist) {
            $wishlist->delete();
            return false;
        }

        Wishlist::create([
            'user_id'             => $user->id,
            'product_id'          => $productId,
            'variation_option_id' => $request['variation_option_id'] ?? null,
        ]);
        return true;
    }
}
