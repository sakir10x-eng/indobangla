<?php

namespace Marvel\Helpers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Marvel\Database\Models\Settings;

/**
 * Sends admin-facing notifications (new orders, agent actions, courier changes)
 * to Telegram now and WhatsApp when a provider is configured. Configuration is
 * read from settings.options['notify'] with an env fallback, so it can be turned
 * on without a code change.
 *
 * settings.options['notify'] = [
 *   'telegram' => ['enabled'=>true, 'bot_token'=>'...', 'chat_id'=>'...'],
 *   'whatsapp' => ['enabled'=>false, 'provider'=>'twilio', ...creds],
 * ]
 */
class AdminNotifier
{
    /** Fire-and-forget: never throw, never block the caller. */
    public static function send(string $text): void
    {
        try {
            $cfg = self::config();
            self::telegram($cfg['telegram'] ?? [], $text);
            self::whatsapp($cfg['whatsapp'] ?? [], $text);
        } catch (\Throwable $e) {
            Log::warning('AdminNotifier failed: ' . $e->getMessage());
        }
    }

    protected static function config(): array
    {
        $opts = [];
        try {
            $opts = (array) (optional(Settings::first())->options['notify'] ?? []);
        } catch (\Throwable $e) {
            $opts = [];
        }
        // env fallback for Telegram so it works before settings are saved
        if (empty($opts['telegram']['bot_token']) && env('TELEGRAM_BOT_TOKEN')) {
            $opts['telegram'] = [
                'enabled'   => true,
                'bot_token' => env('TELEGRAM_BOT_TOKEN'),
                'chat_id'   => env('TELEGRAM_CHAT_ID'),
            ];
        }
        return $opts;
    }

    protected static function telegram(array $tg, string $text): void
    {
        if (empty($tg['enabled']) || empty($tg['bot_token']) || empty($tg['chat_id'])) {
            return;
        }
        Http::timeout(6)->asForm()->post(
            'https://api.telegram.org/bot' . $tg['bot_token'] . '/sendMessage',
            [
                'chat_id'    => $tg['chat_id'],
                'text'       => $text,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]
        );
    }

    protected static function whatsapp(array $wa, string $text): void
    {
        if (empty($wa['enabled'])) {
            return; // pluggable — off until a provider + credentials are supplied
        }
        $provider = $wa['provider'] ?? 'twilio';
        if ($provider === 'twilio'
            && !empty($wa['sid']) && !empty($wa['token'])
            && !empty($wa['from']) && !empty($wa['to'])) {
            Http::timeout(8)
                ->withBasicAuth($wa['sid'], $wa['token'])
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$wa['sid']}/Messages.json", [
                    'From' => 'whatsapp:' . $wa['from'],
                    'To'   => 'whatsapp:' . $wa['to'],
                    'Body' => strip_tags($text),
                ]);
        }
        // Meta WhatsApp Cloud API
        if ($provider === 'meta'
            && !empty($wa['phone_id']) && !empty($wa['token']) && !empty($wa['to'])) {
            Http::timeout(8)
                ->withToken($wa['token'])
                ->post("https://graph.facebook.com/v19.0/{$wa['phone_id']}/messages", [
                    'messaging_product' => 'whatsapp',
                    'to'   => $wa['to'],
                    'type' => 'text',
                    'text' => ['body' => strip_tags($text)],
                ]);
        }
    }
}
