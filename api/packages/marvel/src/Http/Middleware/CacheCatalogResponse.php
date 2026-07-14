<?php

namespace Marvel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Caches read-only catalog responses (home rails, related books, listings). These are
 * hit on every page view, never depend on the visitor, and only change when the catalog
 * does — so serving them from cache is the single biggest page-speed win available.
 *
 * Usage: ->middleware('catalog.cache:600')   // seconds
 */
class CacheCatalogResponse
{
    public function handle(Request $request, Closure $next, $ttl = 600)
    {
        // Only plain GETs, and never for a signed-in admin (they need to see edits at once).
        if (!$request->isMethod('get') || $request->bearerToken()) {
            return $next($request);
        }

        $ttl = max(30, (int) $ttl);
        // Bumped whenever prices change, so a re-price is visible at once instead of
        // waiting out the TTL.
        $version = Cache::get('catalog:version', 1);
        $key = "catalog:v{$version}:" . sha1($request->path() . '?' . http_build_query($request->query()));

        $payload = Cache::remember($key, $ttl, function () use ($next, $request) {
            $response = $next($request);
            if ($response->getStatusCode() !== 200) {
                return null;   // never cache an error
            }
            return [
                'content' => $response->getContent(),
                'type'    => $response->headers->get('Content-Type', 'application/json'),
            ];
        });

        if (!$payload) {
            Cache::forget($key);
            return $next($request);
        }

        return response($payload['content'], 200)
            ->header('Content-Type', $payload['type'])
            // Let the browser/CDN reuse it too, and keep serving the stale copy while
            // it refreshes in the background — no visitor ever waits on a cold cache.
            ->header('Cache-Control', "public, max-age={$ttl}, stale-while-revalidate=" . ($ttl * 2));
    }
}
