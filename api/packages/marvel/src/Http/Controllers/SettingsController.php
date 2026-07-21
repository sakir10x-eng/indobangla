<?php

namespace Marvel\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Marvel\Database\Models\Address;
use Marvel\Database\Repositories\SettingsRepository;
use Marvel\Events\Maintenance;
use Marvel\Exceptions\MarvelException;
use Illuminate\Support\Facades\Cache;
use Marvel\Http\Requests\SettingsRequest;
use Prettus\Validator\Exceptions\ValidatorException;

class SettingsController extends CoreController
{
    public $repository;

    public function __construct(SettingsRepository $repository)
    {
        $this->repository = $repository;
    }


    /**
     * Display a listing of the resource.
     *
     * @param Request $request
     * @return Collection|Address[]
     */
    public function index(Request $request)
    {
        $language = $request->language ? $request->language : DEFAULT_LANGUAGE;

        $data = Cache::rememberForever(
            'cached_settings_' . $language,
            function () use ($request) {
                return $this->repository->getData($request->language);
            }
        );

        // Format maintenance start and until data
        $maintenanceStart = Carbon::parse($data['options']['maintenance']['start'])->format('F j, Y h:i A');
        $maintenanceUntil = Carbon::parse($data['options']['maintenance']['until'])->format('F j, Y h:i A');

        $formattedMaintenance = [
            "start" => $maintenanceStart,
            "until" => $maintenanceUntil,
        ];

        // Add formatted maintenance data to the existing data
        $data['maintenance'] = $formattedMaintenance;

        // SECURITY: never expose integration secrets through the public settings
        // endpoint (courier tokens, AI/ReplyGenie API keys, payment credentials,
        // notify/telegram tokens). Admins manage these via dedicated, permission-
        // gated endpoints — the shop never needs them.
        $options = $data['options'] ?? [];
        if (is_array($options)) {
            foreach (['couriers', 'replygenie', 'ai_settings', 'payments', 'notify', 'server_info'] as $secretKey) {
                unset($options[$secretKey]);
            }
            $data['options'] = $options;
        }

        return $data;
    }

    // public function fetchSettings(Request $request)
    // {
    //     $language = $request->language ? $request->language : DEFAULT_LANGUAGE;
    //     return $this->repository->getData($language);
    // }

    /**
     * Store a newly created resource in storage.
     *
     * @param SettingsRequest $request
     * @return mixed
     * @throws ValidatorException
     */
    public function store(SettingsRequest $request)
    {
        $language = $request->language ? $request->language : DEFAULT_LANGUAGE;

        $data = $this->repository->where('language', $language)->first();

        // Integration secrets (courier tokens, bKash creds, AI/ReplyGenie keys, notify tokens)
        // are REDACTED out of the settings we return to the admin, so the save payload never
        // carries them. A plain overwrite of `options` therefore WIPES them — which is exactly
        // how the RedX/bKash config vanished. Carry each stored secret forward whenever the
        // incoming payload doesn't include it (the dedicated courier/payment endpoints still
        // update them normally, since those payloads DO carry the key).
        $incoming = (array) $request->options;
        $stored   = $data ? (array) $data->options : [];
        foreach (['couriers', 'replygenie', 'ai_settings', 'payments', 'notify'] as $secretKey) {
            if (!array_key_exists($secretKey, $incoming) && array_key_exists($secretKey, $stored)) {
                $incoming[$secretKey] = $stored[$secretKey];
            }
        }

        $request->merge([
            'options' => [
                ...$incoming,
                ...$this->repository->getApplicationSettings(),
                'server_info' => server_environment_info(),
            ]
        ]);

        if ($data) {
            if (Cache::has('cached_settings_' . $language)) {
                Cache::forget('cached_settings_' . $language);
            }
            $settings =  tap($data)->update($request->only(['options']));
        } else {
            // Cache::flush();
            $settings =  $this->repository->create(['options' => $request['options'], 'language' => $language]);
        }
        event(new Maintenance($language));
        return $settings;
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
     * @param SettingsRequest $request
     * @param int $id
     * @return JsonResponse
     * @throws ValidatorException
     */
    public function update(SettingsRequest $request, $id)
    {
        $settings = $this->repository->first();
        if (isset($settings->id)) {
            // Same secret-preservation as store(): the redacted secrets aren't in the payload,
            // so carry them forward instead of overwriting `options` and wiping them.
            $incoming = (array) $request->options;
            $stored   = (array) $settings->options;
            foreach (['couriers', 'replygenie', 'ai_settings', 'payments', 'notify'] as $secretKey) {
                if (!array_key_exists($secretKey, $incoming) && array_key_exists($secretKey, $stored)) {
                    $incoming[$secretKey] = $stored[$secretKey];
                }
            }
            return $this->repository->update(['options' => $incoming], $settings->id);
        } else {
            return $this->repository->create(['options' => $request['options']]);
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
