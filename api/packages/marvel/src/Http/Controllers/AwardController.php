<?php

namespace Marvel\Http\Controllers;

use Illuminate\Http\Request;
use Marvel\Database\Models\Award;

/**
 * Admin-managed book awards. Writes are gated to super admin at the route
 * layer; the public GET is used by the shop's My Library award showcase.
 */
class AwardController extends CoreController
{
    /** Public list (also used by admin table; includes attached books for editing). */
    public function index(Request $request)
    {
        $query = Award::query()
            ->withCount('products')
            ->with(['products:id,name,slug,image']);
        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }
        return $query->orderBy('sort_order')->orderByDesc('year')->get();
    }

    public function show($id)
    {
        return Award::with(['products' => function ($q) {
            $q->select('products.id', 'name', 'slug', 'image');
        }])->findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $award = Award::create($data['award']);
        $award->products()->sync($data['product_ids']);
        return $award->load('products:id,name,slug,image');
    }

    public function update(Request $request, $id)
    {
        $award = Award::findOrFail($id);
        $data = $this->validated($request);
        $award->update($data['award']);
        if ($request->has('product_ids')) {
            $award->products()->sync($data['product_ids']);
        }
        return $award->load('products:id,name,slug,image');
    }

    public function destroy($id)
    {
        $award = Award::findOrFail($id);
        $award->products()->detach();
        $award->delete();
        return ['status' => 'success'];
    }

    private function validated(Request $request): array
    {
        $v = $request->validate([
            'title'       => 'required|string|max:255',
            'year'        => 'nullable|integer|min:1900|max:2100',
            'description' => 'nullable|string',
            'image'       => 'nullable|array',
            'sort_order'  => 'nullable|integer',
            'is_active'   => 'nullable|boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        return [
            'award' => [
                'title'       => $v['title'],
                'year'        => $v['year'] ?? null,
                'description' => $v['description'] ?? null,
                'image'       => $v['image'] ?? null,
                'sort_order'  => $v['sort_order'] ?? 0,
                'is_active'   => $v['is_active'] ?? true,
            ],
            'product_ids' => $v['product_ids'] ?? [],
        ];
    }
}
