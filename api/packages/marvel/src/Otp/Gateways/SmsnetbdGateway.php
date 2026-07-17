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
                return new Result($json['data']['request_id'] ?? 'sent');
            }

            return new Result(['SMS failed: ' . ($json['msg'] ?? $response->body())]);
        } catch (\Throwable $e) {
            return new Result(['SMS failed: ' . $e->getMessage()]);
        }
    }

    public function startVerification($phone_number)
    {
        $code = (string) random_int(100000, 999999);
        $id   = 'smsnetbd_' . bin2hex(random_bytes(8));
        Cache::put("otp:$id", ['code' => $code, 'phone' => (string) $phone_number], now()->addMinutes(5));
        $this->sendSms($phone_number, "Your IndoBangla verification code is $code");
        return new Result($id);
    }

    public function checkVerification($id, $code, $phone_number)
    {
        $stored = Cache::get("otp:$id");
        $ok = $stored
            && (string) $stored['code'] === (string) $code
            && (string) $stored['phone'] === (string) $phone_number;
        if ($ok) {
            Cache::forget("otp:$id");
        }
        return new Result($ok ? 'approved' : ['Invalid or expired verification code']);
    }
}
