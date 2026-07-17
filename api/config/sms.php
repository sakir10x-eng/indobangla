<?php

return [
    // https://portal.sms.net.bd — set the api key in .env (SMS_NET_BD_API_KEY).
    // Then set ACTIVE_OTP_GATEWAY=smsnetbd to route all app SMS/OTP through it.
    'smsnetbd' => [
        'api_key'   => env('SMS_NET_BD_API_KEY', ''),
        'sender_id' => env('SMS_NET_BD_SENDER_ID', ''),
    ],
];
