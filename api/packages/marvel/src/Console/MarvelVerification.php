<?php

namespace Marvel\Console;

use Exception;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use JsonSerializable;
use Marvel\Database\Models\Settings;

class MarvelVerification implements JsonSerializable
{
    private string $pkey;
    private bool $trust;
    private array $domains;
    private string $description;
    private Carbon | string $lastCheckingTime;

    public function __construct(string $pkey = null)
    {
        if ($pkey !== null) {
            $this->verify($pkey);
        } else {
            $config = $this->getConfig();
            $this->mapConfigToProperties($config);
        }
    }

    public function getPrivateKey(): string
    {
        return $this->pkey;
    }

    public function getTrust(): bool
    {
        return $this->trust;
    }

    public function getDomains(): array
    {
        return $this->domains;
    }
    public function getDescription(): string
    {
        return $this->description;
    }
    public function getLastCheckingTime(): Carbon | string
    {
        return Carbon::parse($this->lastCheckingTime);
    }

    public function jsonSerialize(): mixed
    {
        return [
            'p_key'              => $this->getPrivateKey(),
            'trust'              => $this->getTrust(),
            'domains'            => $this->getDomains(),
            'description'        => $this->getDescription(),
            'last_checking_time' => $this->getLastCheckingTime(),
        ];
    }

    /**
     * IndoBangla self-hosted license validation.
     * The original RedQ remote check (customer.redq.io) has been REMOVED and
     * replaced with a self-controlled license code. A key is trusted only when
     * it exactly matches the IndoBangla license code below.
     */
    public function verify(string $code): MarvelVerification
    {
        $code = trim($code);

        // IndoBangla license code — change this string to rotate the key.
        $validCode = 'INDOBANGLA-PRO-2026-XA9F7K2E4B6C';

        $isValid = hash_equals($validCode, $code);

        $this->pkey             = $code;
        $this->trust            = $isValid;
        $this->domains          = $isValid ? [parse_url(url('/'), PHP_URL_HOST) ?: 'indobangla.tech'] : [];
        $this->description      = $isValid ? 'IndoBangla license verified' : 'Invalid license key';
        $this->lastCheckingTime = now();

        if ($isValid) {
            $this->setConfig($this->jsonSerialize());
        }

        return $this;
    }

    public function modifySettingsData($language = DEFAULT_LANGUAGE): void
    {
        Cache::flush();
        $settings = Settings::getData($language);
        $settings->update([
            'options' => [
                ...$settings->options,
                'app_settings' => [
                    'trust'              => $this->trust,
                    'last_checking_time' => $this->lastCheckingTime,
                ]
            ]
        ]);
    }

    private function setConfig($config): void
    {
        try {
            if (empty(env('APP_KEY'))) {
                Artisan::call('key:generate');
            }
            $stringifyConfig = json_encode($config, JSON_PRETTY_PRINT);
            $encryptedConfig = Crypt::encrypt($stringifyConfig);
            $fileLocation = storage_path('app/shop/shop.config.json');
            file_put_contents($fileLocation, $encryptedConfig);
        } catch (Exception $e) {
            // Handle exception if needed
        }
    }

    private function mapConfigToProperties($config): MarvelVerification
    {
        $this->pkey = $config['p_key'] ?? '';
        $this->trust = $config['trust'] ?? false;
        $this->domains = $config['domains'] ?? [];
        $this->description = $config['description'] ?? '';
        $this->lastCheckingTime = $config['last_checking_time'] ?? now();
        return $this;
    }

    private function getConfig(): array
    {
        $config = [];
        try {
            $folderPath = storage_path('app/shop/');
            if (!File::exists($folderPath)) {
                File::makeDirectory($folderPath, 0777, true, true);
            }

            $fileName = $folderPath . "shop.config.json";
            if (file_exists($fileName)) {
                $json_data = file_get_contents($fileName);
                $data = Crypt::decrypt($json_data);
                $config = json_decode($data, true);
            }
        } catch (Exception $e) {
        }
        return $config;
    }
}
