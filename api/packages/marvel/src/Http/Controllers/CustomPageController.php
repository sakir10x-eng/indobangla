<?php

namespace Marvel\Http\Controllers;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Marvel\Database\Repositories\CustomPageRepository;
use Marvel\Exceptions\MarvelException;
use Illuminate\Support\Facades\Cache;
use Marvel\Database\Models\Category;
use Marvel\Http\Requests\CustomPageRequest;
use Prettus\Validator\Exceptions\ValidatorException;
use Marvel\Http\Resources\CustomPageResource;
use Marvel\Http\Resources\ViewHeaderCategoryResource;

class CustomPageController extends CoreController
{
    public $repository;

    public function __construct(CustomPageRepository $repository)
    {
        $this->repository = $repository;
    }


    /**
     * Display a listing of the resource.
     *
     * @param Request $request
     * @return Collection|mixed
     */
    public function index(Request $request)
    {
        $language = $request->language ? $request->language : DEFAULT_LANGUAGE;
        if ($request->request_form == 'sell_your_gear_page') {
            return Cache::rememberForever('cached_sell_your_gear_page_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language);

                $dynamicItems = [];
                if (!empty($pageOptions['page_options']['sell_your_gear_page']['items'])) {
                    foreach ($pageOptions['page_options']['sell_your_gear_page']['items'] as $item) {
                        $itemKey = $item['id'];
                        if (
                            !empty($pageOptions['page_options']['sell_your_gear_page'][$itemKey]['props']['id']) &&
                            $pageOptions['page_options']['sell_your_gear_page'][$itemKey]['props']['id'] == $itemKey
                        ) {
                            $dynamicItems[$itemKey] = $pageOptions['page_options']['sell_your_gear_page'][$itemKey];
                        }
                    }
                }
                return new CustomPageResource([
                    'page_options' => $pageOptions,
                    'dynamicItems' => $dynamicItems,
                ]);
            });
        }
        if ($request->request_form == 'add_your_listing') {
            return Cache::rememberForever('cached_add_your_listing_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language)->first();
                return $pageOptions['page_options']['add_your_listing'];
            });
        }
        if ($request->request_form == 'header') {
            return Cache::rememberForever('cached_header_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language)->first();
                if (isset($pageOptions['page_options']['header'])) {
                    $parent_category_ids = $childItems = [];
                    $children = $pageOptions['page_options']['header']['category_ids'];
                    foreach ($children as $item) {
                        if (isset($item['id'])) {
                            $parent_category_ids[] = $item['id'];
                        }
                        if (isset($item['child']) && is_array($item['child'])) {
                            foreach ($item['child'] as $child) {
                                $childItems[] = $child['id'];
                            }
                        }
                    }
                    $categories = Category::whereIn('id', $parent_category_ids)
                        ->with([
                            'children' => function ($query) use ($childItems) {
                                $query->orderByRaw("FIELD(id, " . implode(
                                    ',',
                                    $childItems
                                ) . ")");
                            }
                        ])
                        ->orderByRaw("FIELD(id, " . implode(',', $parent_category_ids) . ")")
                        ->get();

                    return ViewHeaderCategoryResource::collection($categories);
                }
            });
        }
        if ($request->request_form == 'about_us_page') {
            return Cache::rememberForever('cached_about_us_page_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language);
                $dynamicItems = [];
                if (!empty($pageOptions['page_options']['about_us_page']['items'])) {
                    foreach ($pageOptions['page_options']['about_us_page']['items'] as $item) {
                        $itemKey = $item['id'];
                        if (
                            !empty($pageOptions['page_options']['about_us_page'][$itemKey]['props']['id']) &&
                            $pageOptions['page_options']['about_us_page'][$itemKey]['props']['id'] == $itemKey
                        ) {
                            $dynamicItems[$itemKey] = $pageOptions['page_options']['about_us_page'][$itemKey];
                        }
                    }
                }
                return [
                    'items' => $pageOptions['page_options']['about_us_page']['items'] ?? [],
                    "builder" => [
                        "data" => [
                            'zones' => $pageOptions['page_options']['about_us_page']['builder']['data']['zones'] ?? ""
                        ],
                    ],
                    'dynamicItems' => $dynamicItems,
                ];
            });
        }
        if ($request->request_form == 'terms_and_conditions_page') {
            return Cache::rememberForever('cached_terms_and_conditions_page_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language);
                $dynamicItems = [];
                if (!empty($pageOptions['page_options']['terms_and_conditions_page']['items'])) {
                    foreach ($pageOptions['page_options']['terms_and_conditions_page']['items'] as $item) {
                        $itemKey = $item['id'];
                        if (
                            !empty($pageOptions['page_options']['terms_and_conditions_page'][$itemKey]['props']['id']) &&
                            $pageOptions['page_options']['terms_and_conditions_page'][$itemKey]['props']['id'] == $itemKey
                        ) {
                            $dynamicItems[$itemKey] = $pageOptions['page_options']['terms_and_conditions_page'][$itemKey];
                        }
                    }
                }
                return [
                    'items' => $pageOptions['page_options']['terms_and_conditions_page']['items'] ?? [],
                    "builder" => [
                        "data" => [
                            'zones' => $pageOptions['page_options']['terms_and_conditions_page']['builder']['data']['zones'] ?? ""
                        ],
                    ],
                    'dynamicItems' => $dynamicItems,
                ];
            });
        }
        if ($request->request_form == 'privacy_polity_page') {
            return Cache::rememberForever('cached_privacy_polity_page_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language);
                $dynamicItems = [];
                if (!empty($pageOptions['page_options']['privacy_polity_page']['items'])) {
                    foreach ($pageOptions['page_options']['privacy_polity_page']['items'] as $item) {
                        $itemKey = $item['id'];
                        if (
                            !empty($pageOptions['page_options']['privacy_polity_page'][$itemKey]['props']['id']) &&
                            $pageOptions['page_options']['privacy_polity_page'][$itemKey]['props']['id'] == $itemKey
                        ) {
                            $dynamicItems[$itemKey] = $pageOptions['page_options']['privacy_polity_page'][$itemKey];
                        }
                    }
                }
                return [
                    'items' => $pageOptions['page_options']['privacy_polity_page']['items'] ?? [],
                    "builder" => [
                        "data" => [
                            'zones' => $pageOptions['page_options']['privacy_polity_page']['builder']['data']['zones'] ?? ""
                        ],
                    ],
                    'dynamicItems' => $dynamicItems,
                ];
            });
        }
        if ($request->request_form == 'edit_profile_page') {
            return Cache::rememberForever('cached_edit_profile_page_' . $language, function () use ($request) {
                $pageOptions = $this->repository->getData($request->language);

                return [
                    ...$pageOptions['page_options']['edit_profile'] ?? []
                ];
            });
        }
        return Cache::rememberForever(
            'cached_custom_page_' . $language,
            function () use ($request) {
                return [
                    'page_options' => $this->repository->getData($request->language),
                ];
            }
        );
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param CustomPageRequest $request
     * @return mixed
     * @throws ValidatorException
     */

    public function store(CustomPageRequest $request)
    {
        $language = $request->language ? $request->language : DEFAULT_LANGUAGE;

        if (Cache::has('cached_custom_page_' . $language)) {
            Cache::forget('cached_custom_page_' . $language);
        }
        if (Cache::has('cached_sell_your_gear_page_' . $language)) {
            Cache::forget('cached_sell_your_gear_page_' . $language);
        }
        if (Cache::has('cached_add_your_listing_' . $language)) {
            Cache::forget('cached_add_your_listing_' . $language);
        }
        if (Cache::has('cached_header_' . $language)) {
            Cache::forget('cached_header_' . $language);
        }
        if (Cache::has('cached_about_us_page_' . $language)) {
            Cache::forget('cached_about_us_page_' . $language);
        }
        if (Cache::has('cached_terms_and_conditions_page_' . $language)) {
            Cache::forget('cached_terms_and_conditions_page_' . $language);
        }
        if (Cache::has('cached_privacy_polity_page_' . $language)) {
            Cache::forget('cached_privacy_polity_page_' . $language);
        }
        if (Cache::has('cached_edit_profile_page_' . $language)) {
            Cache::forget('cached_edit_profile_page_' . $language);
        }

        $request->merge([
            'page_options' => [
                ...$request->page_options,
            ]
        ]);

        $data = $this->repository->where('language', $request->language)->first();
        if ($data) {
            $aboutUsPage =  tap($data)->update($request->only(['page_options']));
        } else {
            $aboutUsPage =  $this->repository->create(['page_options' => $request['page_options'], 'language' => $language]);
        }
        return $aboutUsPage;
    }

    /**
     * Display the specified resource.
     *
     * @param $id
     * @return JsonResponse
     */
    public function show($id)
    {
        try {
            return $this->repository->first();
        } catch (\Exception $e) {
            throw new MarvelException(NOT_FOUND);
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param CustomPageRequest $request
     * @param int $id
     * @return JsonResponse
     * @throws ValidatorException
     */
    public function update(CustomPageRequest $request, $id)
    {
        $settings = $this->repository->first();
        $language = $request->language ? $request->language : DEFAULT_LANGUAGE;

        if (Cache::has('cached_custom_page_' . $language)) {
            Cache::forget('cached_custom_page_' . $language);
        }
        if (Cache::has('cached_sell_your_gear_page_' . $language)) {
            Cache::forget('cached_sell_your_gear_page_' . $language);
        }
        if (Cache::has('cached_add_your_listing_' . $language)) {
            Cache::forget('cached_add_your_listing_' . $language);
        }
        if (Cache::has('cached_header_' . $language)) {
            Cache::forget('cached_header_' . $language);
        }
        if (Cache::has('cached_about_us_page_' . $language)) {
            Cache::forget('cached_about_us_page_' . $language);
        }
        if (Cache::has('cached_terms_and_conditions_page_' . $language)) {
            Cache::forget('cached_terms_and_conditions_page_' . $language);
        }
        if (Cache::has('cached_privacy_polity_page_' . $language)) {
            Cache::forget('cached_privacy_polity_page_' . $language);
        }
        if (Cache::has('cached_edit_profile_page_' . $language)) {
            Cache::forget('cached_edit_profile_page_' . $language);
        }

        if (isset($settings->id)) {
            return $this->repository->update($request->only(['page_options']), $settings->id);
        } else {
            return $this->repository->create(['page_options' => $request['page_options']]);
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $id
     * @return array
     */
    public function destroy($id)
    {
        throw new MarvelException(ACTION_NOT_VALID);
    }
}