<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Marvel\Exceptions\MarvelException;
use Symfony\Component\HttpFoundation\Response;

class ApiRequestMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {

        //   TODO this is for only redq demo site postman git protection

        // $allowedDomain = str_replace('http://', '', config('shop.app_url'));
        // if ($request->header('Host') !== $allowedDomain) {
        //     return response()->json(['error' => 'Access forbidden.'], 403);
        // }

        if ($request->header('User-Agent') && stripos($request->header('User-Agent'), 'Mozilla') === false) {
            throw new AuthorizationException(MUTATION_TURNED_OFF_DEMO_PURPOSE);
        }
        return $next($request);
    }
}
