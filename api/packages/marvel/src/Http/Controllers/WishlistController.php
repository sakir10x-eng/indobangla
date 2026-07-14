<?php


namespace Marvel\Http\Controllers;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Marvel\Database\Models\Product;
use Marvel\Database\Models\Wishlist;
use Illuminate\Support\Facades\Auth;
use Marvel\Exceptions\MarvelException;
use Marvel\Database\Models\AbusiveReport;
use Illuminate\Database\Eloquent\Collection;
use Marvel\Http\Requests\WishlistCreateRequest;
use Marvel\Database\Repositories\WishlistRepository;
use Marvel\Http\Requests\AbusiveReportCreateRequest;
use Prettus\Validator\Exceptions\ValidatorException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WishlistController extends CoreController
{
    public $repository;

    public function __construct(WishlistRepository $repository)
    {
        $this->repository = $repository;
    }


    /**
     * Display a listing of the resource.
     *
     * @param Request $request
     * @return Collection|AbusiveReport[]
     */
    public function index(Request $request)
    {
        if (!$request->user()) {
            throw new AuthorizationException(NOT_AUTHORIZED);
        }
        $limit = $request->limit ? $request->limit : 15;
        // Scoped to the caller — an unscoped pluck() here returned every customer's
        // wishlisted products to any authenticated user.
        $wishlist = Wishlist::where('user_id', $request->user()->id)->pluck('product_id');
        return Product::whereIn('id', $wishlist)->paginate($limit);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param AbusiveReportCreateRequest $request
     * @return mixed
     * @throws ValidatorException
     */
    public function store(WishlistCreateRequest $request)
    {
        try {
            return $this->repository->storeWishlist($request);
        } catch (MarvelException $th) {
            throw new MarvelException(COULD_NOT_CREATE_THE_RESOURCE);
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param AbusiveReportCreateRequest $request
     * @return mixed
     * @throws ValidatorException
     */
    public function toggle(WishlistCreateRequest $request)
    {
        // Deliberately unwrapped: re-throwing SOMETHING_WENT_WRONG here erased the real
        // reason a save failed, and Marvel serves thrown exceptions with HTTP 200, so the
        // storefront lit the heart up as if the book had been saved.
        return $this->repository->toggleWishlist($request);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        try {
            $request->id = $id;
            return $this->delete($request);
        } catch (MarvelException $th) {
            throw new MarvelException(COULD_NOT_DELETE_THE_RESOURCE);
        }
    }

    public function delete(Request $request)
    {
        try {
            if (!$request->user()) {
                throw new AuthorizationException(NOT_AUTHORIZED);
            }
            $product = Product::where('id', $request->id)->first();
            $wishlist = $this->repository->where('product_id', $product->id)->where('user_id', auth()->user()->id)->first();
            if (!empty($wishlist)) {
                return $wishlist->delete();
            }
            throw new HttpException(404, NOT_FOUND);
        } catch (MarvelException $th) {
            throw new MarvelException(COULD_NOT_DELETE_THE_RESOURCE);
        }
    }

    /**
     * Check in wishlist product for authenticated user
     *
     * @param int $product_id
     * @return JsonResponse
     */
    public function in_wishlist(Request $request, $product_id)
    {
        $request->product_id = $product_id;
        return $this->inWishlist($request);
    }

    public function inWishlist(Request $request)
    {
        if (auth()->user() && !empty($this->repository->where('product_id', $request->product_id)->where('user_id', auth()->user()->id)->first())) {
            return true;
        }
        return false;
    }
}
