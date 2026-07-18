<?php

namespace Marvel\Otp\Gateways;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Marvel\Otp\OtpInterface;
use Marvel\Otp\Result;

/**
 * SMS gateway for https://portal.sms.net.bd (a Bangladeshi SMS provider).
 *
 * Activate by setting ACTIVE_OTP_GATEWAY=smsnetbd and SMS_NET_BD_API_KEY in .env.
 * (SMS_NET_BD_SENDER_ID is optional — only if you have an approved masking sender.)
 *
 * sms.net.bd has no hosted OTP service, so verification is done here: a 6-digit
 * code is generated, texted, and cached for 5 minutes.
 */
class SmsnetbdGateway implements OtpInterface
{
    private string $endpoint = 'https://api.sms.net.bd/sendsms';

    private function apiKey(): string
    {
        return (string) config('sms.smsnetbd.api_key', '');
    }

    private function senderId(): ?string
    {
        $sender = config('sms.smsnetbd.sender_id');
        return $sender ?: null;
    }

    /**
     * Send a plain SMS. Returns Result(request_id) on success, Result([error]) on failure.
     */
    public function sendSms($phone_number, $messageBody): Result
    {
        try {
            if ($this->apiKey() === '') {
                return new Result(['SMS not sent: SMS_NET_BD_API_KEY is not configured']);
            }
            // sms.net.bd wants a local msisdn like 8801XXXXXXXXX (no leading +).
            $to = ltrim(preg_replace('/[^\d]/', '', (string) $phone_number), '+');

            $payload = [
                'api_key' => $this->apiKey(),
                'to'      => $to,
                'msg'     => $messageBody,
            ];
            if ($this->senderId()) {
                $payload['sender_id'] = $this->senderId();
            }

            $response = Http::asForm()->timeout(20)->post($this->endpoint, $payload);
            $json = $response->json();

            if (is_array($json) && (int) ($json['error'] ?? 1) === 0) {
                // request_id comes back as an integer; Result only accepts string|array, so a
                // raw int would throw InvalidArgumentException and be misreported as a failure.
                return new Result((string) ($json['data']['request_id'] ?? 'sent'));
            }

            return new Result(['SMS failed: ' . ($json['msg'] ?? $response->body())]);
        } catch (\Throwable $e) {
            return new Result(['SMS failed: ' . $e->getMessage()]);
        }
    }

    public function startVerification($phone_number)
    {
        $code = (string) random_int(1000, 9999);
        $id   = 'smsnetbd_' . bin2hex(random_bytes(8));
        // Send first — if the SMS API rejects it (bad key, no balance, bad number), surface
        // that as a failure so /send-otp-code returns success:false instead of pretending the
        // code was delivered. (Note: sms.net.bd "error:0" only means accepted for delivery.)
        $sent = $this->sendSms($phone_number, "Your IndoBangla verification code is $code");
        if (!$sent->isValid()) {
            return $sent;
        }
        Cache::put("otp:$id", ['code' => $code, 'phone' => (string) $phone_number], now()->addMinutes(5));
        return new Result($id);
    }

    /** Wrong guesses allowed against one code before it is thrown away. */
    private const MAX_ATTEMPTS = 5;

    public function checkVerification($id, $code, $phone_number)
    {
        $stored = Cache::get("otp:$id");
        if (!$stored) {
            return new Result(['Invalid or expired verification code']);
        }

        // The code is four digits — ten thousand possibilities, which an unthrottled loop walks
        // through in minutes. Since the caller is handed the otp_id when the code is sent, anyone
        // could request a code for someone else's number and then guess their way into that
        // account. Five wrong tries and the code is burnt; they have to request a new one, and
        // that path is rate-limited.
        $tries = (int) Cache::get("otp_tries:$id", 0);
        if ($tries >= self::MAX_ATTEMPTS) {
            Cache::forget("otp:$id");
            Cache::forget("otp_tries:$id");
            return new Result(['Too many incorrect attempts — please request a new code']);
        }

        $ok = (string) $stored['code'] === (string) $code
            && (string) $stored['phone'] === (string) $phone_number;

        if ($ok) {
            Cache::forget("otp:$id");
            Cache::forget("otp_tries:$id");
            return new Result('approved');
        }

        // Expires with the code itself, so the counter can't outlive what it protects.
        Cache::put("otp_tries:$id", $tries + 1, now()->addMinutes(5));
        return new Result(['Invalid or expired verification code']);
    }
}
