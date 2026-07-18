<?php

namespace Marvel\Traits;

use Illuminate\Support\Facades\App;
use Marvel\Database\Models\Order;
use Marvel\Enums\EventType;

trait OrderSmsTrait
{
    use SmsTrait;
    
    public function sendOrderCancelSms(Order $order): void
    {
        $language = $order->language;
        App::setLocale($language);
        $customerName = $this->getCustomerName($order);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_CANCELLED,
            'adminMessage'      => __('sms.order.cancelOrder.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number, 'customer_name' => $customerName]),
            'customerMessage'   => __('sms.order.cancelOrder.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number, 'customer_name' => $customerName]),
            'storeOwnerMessage' => __('sms.order.cancelOrder.storeOwner.message'),
        ];
        $this->sendSmsOnOrderEvent($smsArray);
    }

    public function sendOrderCreationSms(Order $order): void
    {
        $language = $order->language;
        App::setLocale($language);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_CREATED,
            'adminMessage'      => __('sms.order.orderCreated.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'customerMessage'   => __('sms.order.orderCreated.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'storeOwnerMessage' => __('sms.order.orderCreated.storeOwner.message'),
        ];
        $this->sendSmsOnOrderEvent($smsArray);
    }

    public function sendPaymentDoneSuccessfullySms(Order $order): void
    {
        $language = $order->language;
        App::setLocale($language);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_PAYMENT_SUCCESS,
            'adminMessage'      => __('sms.order.paymentSuccessOrder.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'customerMessage'   => __('sms.order.paymentSuccessOrder.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'storeOwnerMessage' => __('sms.order.paymentSuccessOrder.storeOwner.message'),
        ];
        $this->sendSmsOnOrderEvent($smsArray);
    }

    /**
     * Customer status SMS, fully admin-driven — no dev needed to change wording.
     * Settings → each order status carries its own on/off + template under
     * `settings.options.orderStatusSms[<order_status>] = ['enabled'=>bool,'template'=>str]`.
     * A status with no enabled template sends nothing, so turning it on for just a
     * few statuses (e.g. pending / ready-to-ship / delivered) never spams the rest.
     * Placeholders in the template: {order} {name} {brand} {status} {total} {paid}
     * {due} {courier} {tracking}.
     */
    public function sendOrderStatusChangeSms(Order $order): void
    {
        try {
            App::setLocale($order->language ?? DEFAULT_LANGUAGE);
            // Only the parent order represents the buyer; child (per-shop) rows must not text.
            if ($order->parent_id !== null) {
                return;
            }
            $settings = \Marvel\Database\Models\Settings::first();
            $options  = $settings ? (array) $settings->options : [];
            $cfg = (array) (($options['orderStatusSms'] ?? [])[$order->order_status] ?? []);
            if (empty($cfg['enabled']) || trim((string) ($cfg['template'] ?? '')) === '') {
                return; // admin has not turned SMS on for this status
            }
            $contact = $order->customer_contact ?: optional(optional($order->customer)->profile)->contact;
            if (!$contact) {
                return;
            }
            $ops   = (array) ($order->ops_meta ?? []);
            $total = (float) $order->total;
            $paid  = (float) $order->paid_total;
            $text = strtr((string) $cfg['template'], [
                '{order}'    => (string) $order->tracking_number,
                '{name}'     => $this->getCustomerName($order) ?: 'গ্রাহক',
                '{brand}'    => (string) ($options['siteTitle'] ?? config('app.name', 'IndoBangla')),
                '{status}'   => ucfirst(str_replace('-', ' ', (string) $order->order_status)),
                '{total}'    => (string) (int) round($total),
                '{paid}'     => (string) (int) round($paid),
                '{due}'      => (string) (int) round(max(0, $total - $paid)),
                '{courier}'  => (string) ($ops['courier'] ?? ''),
                '{tracking}' => (string) ($ops['courier_tracking_id'] ?? ''),
            ]);
            $this->getOtpGateway()->sendSms($contact, $text);
        } catch (\Throwable $e) {
            // never block a status update on an SMS failure
        }
    }

    public function sendOrderDeliveredSms($order): void
    {
        $language = $order->language;
        App::setLocale($language);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_DELIVERED,
            'adminMessage'      => __('sms.order.deliverOrder.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'customerMessage'   => __('sms.order.deliverOrder.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'storeOwnerMessage' => __('sms.order.deliverOrder.storeOwner.message'),
        ];
        $this->sendSmsOnOrderEvent($smsArray, false);
    }


    public function sendPaymentFailedSms($order): void
    {
        $language = $order->language;
        App::setLocale($language);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_PAYMENT_FAILED,
            'adminMessage'      => __('sms.order.paymentFailedOrder.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'customerMessage'   => __('sms.order.paymentFailedOrder.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'storeOwnerMessage' => __('sms.order.paymentFailedOrder.storeOwner.message'),
        ];
        $this->sendSmsOnOrderEvent($smsArray, false);
    }
    protected function getCustomerName($order)
    {
        $customerName = $order->customer;
        if (!$customerName) {
            $customerName = "Guest Customer";
        } else {
            $customerName = $order->customer->name;
        }
        return $customerName;
    }
    public function sendRefundRequestedSms($refund): void
    {
        $order = $refund->order;
        $language = $order->language;
        App::setLocale($language);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_REFUND,
            'adminMessage'      => __('sms.order.refundRequested.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
            'customerMessage'   => __('sms.order.refundRequested.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number]),
        ];
        $this->sendSmsOnRefund($smsArray);
    }
    public function sendRefundUpdateSms($refund): void
    {
        $order = $refund->order;
        $language = $order->language;
        App::setLocale($language);
        $smsArray = [
            'order'             => $order,
            'language'          => $order->language ?? DEFAULT_LANGUAGE,
            'smsEventName'      => EventType::ORDER_REFUND,
            'adminMessage'      => __('sms.order.refundUpdated.admin.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number, ':refund_status' => $refund->status]),
            'customerMessage'   => __('sms.order.refundUpdated.customer.message', ['ORDER_TRACKING_NUMBER' => $order->tracking_number, ':refund_status' => $refund->status]),
        ];
        $this->sendSmsOnRefund($smsArray);
    }
}
