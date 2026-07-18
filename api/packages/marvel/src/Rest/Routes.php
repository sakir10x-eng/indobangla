<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;
use Marvel\Database\Models\Commission;
use Marvel\Enums\Permission;
use Marvel\Http\Controllers\AbusiveReportController;
use Marvel\Http\Controllers\AddressController;
use Marvel\Http\Controllers\AiController;
use Marvel\Http\Controllers\AiExtractController;
use Marvel\Http\Controllers\IntegrationController;
use Marvel\Http\Controllers\LibraryController;
use Marvel\Http\Controllers\AwardController;
use Marvel\Http\Controllers\CommunityController;
use Marvel\Http\Controllers\AnalyticsController;
use Marvel\Http\Controllers\AttachmentController;
use Marvel\Http\Controllers\AttributeController;
use Marvel\Http\Controllers\AttributeValueController;
use Marvel\Http\Controllers\AuthorController;
use Marvel\Http\Controllers\BecameSellerController;
use Marvel\Http\Controllers\CategoryController;
use Marvel\Http\Controllers\CheckoutController;
use Marvel\Http\Controllers\ConversationController;
use Marvel\Http\Controllers\CouponController;
use Marvel\Http\Controllers\DeliveryTimeController;
use Marvel\Http\Controllers\DownloadController;
use Marvel\Http\Controllers\FaqsController;
use Marvel\Http\Controllers\FeedbackController;
use Marvel\Http\Controllers\FlashSaleController;
use Marvel\Http\Controllers\FlashSaleVendorRequestController;
use Marvel\Http\Controllers\ManufacturerController;
use Marvel\Http\Controllers\MessageController;
use Marvel\Http\Controllers\OrderController;
use Marvel\Http\Controllers\PaymentIntentController;
use Marvel\Http\Controllers\PaymentMethodController;
use Marvel\Http\Controllers\ProductController;
use Marvel\Http\Controllers\QuestionController;
use Marvel\Http\Controllers\RefundController;
use Marvel\Http\Controllers\ResourceController;
use Marvel\Http\Controllers\ReviewController;
use Marvel\Http\Controllers\SettingsController;
use Marvel\Http\Controllers\ShippingController;
use Marvel\Http\Controllers\ShopController;
use Marvel\Http\Controllers\TagController;
use Marvel\Http\Controllers\TaxController;
use Marvel\Http\Controllers\TypeController;
use Marvel\Http\Controllers\UserController;
use Marvel\Http\Controllers\WebHookController;
use Marvel\Http\Controllers\WishlistController;
use Marvel\Http\Controllers\WithdrawController;
use Marvel\Http\Controllers\LanguageController;
use Marvel\Http\Controllers\NotifyLogsController;
use Marvel\Http\Controllers\OwnershipTransferController;
use Marvel\Http\Controllers\RefundPolicyController;
use Marvel\Http\Controllers\RefundReasonController;
use Marvel\Http\Controllers\StoreNoticeController;
use Marvel\Http\Controllers\TermsAndConditionsController;
use Marvel\Http\Controllers\CustomPageController;

// use Illuminate\Support\Facades\Auth;

/**
 * ******************************************
 * Available Public Routes
 * ******************************************
 */

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::get('/email/verify/{id}/{hash}', [UserController::class, 'verifyEmail'])->name('verification.verify');

Route::post('/register', [UserController::class, 'register']);
Route::post('/token', [UserController::class, 'token']);
// Admin login 2FA: (re)send + verify the SMS OTP for a half-finished admin login. Public but
// guarded by a short-lived server-side ticket, and throttled so the code can't be brute-forced.
Route::post('/admin-login-otp/request', [UserController::class, 'adminOtpRequest'])->middleware('throttle:8,1');
Route::post('/admin-login-otp/verify', [UserController::class, 'adminOtpVerify'])->middleware('throttle:15,1');
Route::post('/logout', [UserController::class, 'logout']);
Route::post('/forget-password', [UserController::class, 'forgetPassword']);
Route::post('/verify-forget-password-token', [UserController::class, 'verifyForgetPasswordToken']);
Route::post('/reset-password', [UserController::class, 'resetPassword']);
Route::post('/contact-us', [UserController::class, 'contactAdmin']);
Route::post('/social-login-token', [UserController::class, 'socialLogin']);
Route::post('/send-otp-code', [UserController::class, 'sendOtpCode']);
Route::post('/verify-otp-code', [UserController::class, 'verifyOtpCode']);
Route::post('/otp-login', [UserController::class, 'otpLogin']);
Route::get('top-authors', [AuthorController::class, 'topAuthor']);
Route::get('top-manufacturers', [ManufacturerController::class, 'topManufacturer']);
Route::get('popular-products', [ProductController::class, 'popularProducts']);
Route::get('best-selling-products', [ProductController::class, 'bestSellingProducts']);
Route::get('check-availability', [ProductController::class, 'checkAvailability']);
Route::get("products/calculate-rental-price", [ProductController::class, 'calculateRentalPrice']);
Route::post('import-products', [ProductController::class, 'importProducts']);
Route::post('import-variation-options', [ProductController::class, 'importVariationOptions']);
Route::get('export-products/{shop_id}', [ProductController::class, 'exportProducts']);
Route::get('export-variation-options/{shop_id}', [ProductController::class, 'exportVariableOptions']);
Route::post('generate-description', [ProductController::class, 'generateDescription']);
Route::post('import-attributes', [AttributeController::class, 'importAttributes']);
Route::get('export-attributes/{shop_id}', [AttributeController::class, 'exportAttributes']);
Route::get('download_url/token/{token}', [DownloadController::class, 'downloadFile'])->name('download_url.token');
Route::get('export-order/token/{token}', [OrderController::class, 'exportOrder'])->name('export_order.token');
Route::post('subscribe-to-newsletter', [UserController::class, 'subscribeToNewsletter'])->name('subscribeToNewsletter');
Route::get('download-invoice/token/{token}', [OrderController::class, 'downloadInvoice'])->name('download_invoice.token');
Route::post('webhooks/razorpay', [WebHookController::class, 'razorpay']);
Route::post('webhooks/stripe', [WebHookController::class, 'stripe']);
Route::post('webhooks/paypal', [WebHookController::class, 'paypal']);
Route::post('webhooks/mollie', [WebHookController::class, 'mollie']);
Route::post('webhooks/sslcommerz', [WebHookController::class, 'sslcommerz'])->name('sslc.sslcommerz');
Route::post('webhooks/paystack', [WebHookController::class, 'paystack']);
Route::post('webhooks/paymongo', [WebHookController::class, 'paymongo']);
Route::post('webhooks/xendit', [WebHookController::class, 'xendit']);
Route::post('webhooks/iyzico', [WebHookController::class, 'iyzico']);
Route::post('webhooks/bkash', [WebHookController::class, 'bkash']);
Route::post('webhooks/flutterwave', [WebHookController::class, 'flutterwave']);

Route::post('license-key/verify', [UserController::class, 'verifyLicenseKey']);

Route::get('callback/flutterwave', [WebHookController::class, 'callback'])->name('callback.flutterwave');

Route::get('near-by-shop/{lat}/{lng}', [ShopController::class, 'nearByShop']);

Route::get('store-notices', [StoreNoticeController::class, 'index'])->name('store-notices.index');

Route::apiResource('products', ProductController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('types', TypeController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('attachments', AttachmentController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('categories', CategoryController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('delivery-times', DeliveryTimeController::class, [
    'only' => ['index', 'show']
]);
Route::apiResource('languages', LanguageController::class, [
    'only' => ['index', 'show']
]);
Route::apiResource('tags', TagController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('refund-reasons', RefundReasonController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('resources', ResourceController::class, [
    'only' => ['index', 'show']
]);
Route::apiResource('coupons', CouponController::class, [
    'only' => ['index', 'show'],
]);
Route::post('coupons/verify', [CouponController::class, 'verify']);
Route::apiResource('attributes', AttributeController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('shops', ShopController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('settings', SettingsController::class, [
    'only' => ['index'],
]);
Route::apiResource('reviews', ReviewController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('questions', QuestionController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('feedbacks', FeedbackController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('authors', AuthorController::class, [
    'only' => ['index', 'show'],
]);
Route::apiResource('manufacturers', ManufacturerController::class, [
    'only' => ['index', 'show'],
]);
Route::post('orders/checkout/verify', [CheckoutController::class, 'verify']);
Route::apiResource('orders', OrderController::class, [
    'only' => ['show', 'store'],
]);

Route::post('/email/verification-notification', [UserController::class, 'sendVerificationEmail'])
    ->middleware(['auth:sanctum', 'throttle:6,1'])
    ->name('verification.send');

Route::post('orders/payment', [OrderController::class, 'submitPayment']);
// #9 — description generator now uses the admin's OpenRouter/AI-Settings key+model.
Route::post('generate-descriptions', [AiExtractController::class, 'generateDescription']);

// IndoBangla public product search API (for ReplyGenie / FB bots)
Route::get('product-search-api', [IntegrationController::class, 'productSearch']);
// Cart price-change check (current prices for a set of ids)
Route::get('price-check', [IntegrationController::class, 'priceCheck']);
// Admin product list with derived metrics (sold / wishlist / velocity)
Route::get('product-admin-list', [IntegrationController::class, 'productAdminList']);
// Recycle bin: restore / permanently delete a soft-deleted product (super-admin).
Route::post('products/{id}/restore', [IntegrationController::class, 'restoreTrashedProduct'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
Route::delete('products/{id}/force', [IntegrationController::class, 'forceDeleteProduct'])->middleware('permission:' . Permission::SUPER_ADMIN);
// Pay-by-link: public info + confirm (token-authed), admin link generation
Route::get('pay-info', [IntegrationController::class, 'payInfo']);
Route::post('pay-confirm', [IntegrationController::class, 'payConfirm']);
// Public read-only invoice behind /invoice/{token}. Guarded by a stable per-order token.
Route::get('invoice-info', [IntegrationController::class, 'invoiceInfo']);
// Manual bank transfer: buyer uploads the counter slip. Public but pay-token guarded, and
// it only parks the file for review — an admin credits the payment via order-ops.
Route::post('pay-bank-proof', [IntegrationController::class, 'payBankProof']);
// bKash sends the customer's browser here after they authorise. Must be public and GET —
// it carries no auth, so the paymentID is re-verified against bKash before anything is
// credited. This is where /execute (the actual capture) happens.
Route::get('bkash-callback', [IntegrationController::class, 'bkashCallback']);
// Visitor heartbeat for the admin's live-visitor counter. Public and unauthenticated because
// most shoppers browse logged out — and it swallows its own errors, so it can never cost a page.
Route::post('presence-ping', [IntegrationController::class, 'presencePing']);
// Hourly cron (guarded by ?key=<connect token>): reverts an expired scheduled rate.
Route::get('conversion-cron', [IntegrationController::class, 'conversionCron']);
Route::post('checkout-intent', [IntegrationController::class, 'checkoutIntent']);
Route::get('courier-areas', [IntegrationController::class, 'courierAreas']);
Route::get('exchange-window', [IntegrationController::class, 'exchangeWindowInfo']);
Route::post('exchange-request', [IntegrationController::class, 'exchangeRequest']);
// Reader's Club: public info + paid-membership start (pay to activate)
Route::get('club-info', [IntegrationController::class, 'clubInfo']);
Route::post('club-start', [IntegrationController::class, 'clubStart']);
// Order-amount bulk discount tiers (public info for cart progress)
Route::get('order-discount-info', [IntegrationController::class, 'orderDiscountInfo']);
// ReplyGenie order creation — authenticated by the X-Connect-Token header (no login)
Route::post('replygenie/order', [IntegrationController::class, 'replygenieOrder']);
// ReplyGenie unified agent — create / modify / status / courier (X-Connect-Token authed)
Route::post('replygenie/agent', [IntegrationController::class, 'replygenieAgent']);
// IndoBangla home real sections
Route::get('deal-of-the-day', [IntegrationController::class, 'dealOfTheDay'])->middleware('catalog.cache:600');
Route::get('popular-books', [IntegrationController::class, 'popularBooks'])->middleware('catalog.cache:600');
Route::get('home-categories', [IntegrationController::class, 'homeCategories']);
Route::get('books-listing', [IntegrationController::class, 'booksListing'])->middleware('catalog.cache:300');
Route::get('related-books', [IntegrationController::class, 'relatedBooks'])->middleware('catalog.cache:900');
Route::get('image-sizes', [IntegrationController::class, 'imageSizes']);
Route::get('featured-books', [IntegrationController::class, 'featuredBooks'])->middleware('catalog.cache:900');
Route::get('rotating-banners', [IntegrationController::class, 'rotatingBanners']);
Route::get('prehome', [IntegrationController::class, 'prehome']);
// Public so the home-page banner can advertise the challenge to guests too.
Route::get('challenge-info', [IntegrationController::class, 'challengeInfo']);
Route::get('bundle-coupons', [IntegrationController::class, 'bundleCoupons'])->middleware('catalog.cache:900');
Route::post('club-join', [IntegrationController::class, 'clubJoin']);
// Per-product landing pages (public read: single page + list of live pages)
Route::get('landing-page', [IntegrationController::class, 'landingPage']);
Route::get('landing-pages', [IntegrationController::class, 'landingList']);

// My Library — public reads: book awards showcase + comments on a review.
Route::apiResource('awards', AwardController::class, [
    'only' => ['index', 'show'],
]);
Route::get('reviews/{id}/comments', [LibraryController::class, 'reviewComments']);

// Reader community (Phase 2) — public reads (feed + a post's comments).
// Feed reads the bearer token when present to fill each post's `my_liked`.
Route::get('community/feed', [CommunityController::class, 'feed']);
Route::get('community/posts/{id}/comments', [CommunityController::class, 'comments']);

/**
 * IndoBangla AI product ingestion (settings super-admin only; extract for staff+).
 */
Route::middleware(['auth:sanctum'])->group(function () {
    // My Library — reader dashboard + review reads/comments.
    Route::get('my-library', [LibraryController::class, 'myLibrary']);
    Route::post('reviews/{id}/comments', [LibraryController::class, 'storeReviewComment']);
    Route::post('reviews/{id}/view', [LibraryController::class, 'markReviewViewed']);
    // Book awards — admin-managed (super-admin writes).
    Route::post('awards', [AwardController::class, 'store'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('awards/{id}', [AwardController::class, 'update'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::delete('awards/{id}', [AwardController::class, 'destroy'])->middleware('can:' . Permission::SUPER_ADMIN);

    // Reader community (Phase 2) — reader actions.
    Route::post('community/posts', [CommunityController::class, 'storePost']);
    Route::delete('community/posts/{id}', [CommunityController::class, 'deletePost']);
    Route::post('community/posts/{id}/like', [CommunityController::class, 'toggleLike']);
    Route::post('community/posts/{id}/comments', [CommunityController::class, 'storeComment']);
    Route::post('community/posts/{id}/report', [CommunityController::class, 'report']);
    // Community moderation — super-admin.
    Route::get('community/reported', [CommunityController::class, 'adminReported'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('community/posts/{id}/status', [CommunityController::class, 'adminSetStatus'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::delete('community/admin/posts/{id}', [CommunityController::class, 'adminDeletePost'])->middleware('can:' . Permission::SUPER_ADMIN);

    // Support tickets (#10) + restock requests (#12) — customer side.
    Route::post('tickets', [IntegrationController::class, 'ticketCreate']);
    Route::get('tickets', [IntegrationController::class, 'ticketList']);
    Route::post('ticket-reply', [IntegrationController::class, 'ticketReply']);
    Route::post('restock-request', [IntegrationController::class, 'restockRequest']);
    Route::get('restock-mine', [IntegrationController::class, 'restockMine']);

    // ReplyGenie / bot order creation
    Route::post('bot-order-create', [IntegrationController::class, 'createOrderApi'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    // order line-item edit, courier shipment, bKash payment
    Route::post('order-edit-items', [IntegrationController::class, 'editOrderItems'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('courier-shipment/{provider}', [IntegrationController::class, 'createShipment'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::get('courier-track/{provider}', [IntegrationController::class, 'courierTrack'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    // Courier "hisab": what RedX billed (delivery + COD charge) and the net it will
    // settle to the merchant account, plus RedX-status → order-status mapping.
    Route::get('courier-transaction/{provider}', [IntegrationController::class, 'courierTransaction'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('bkash-create', [IntegrationController::class, 'bkashCreate'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    // ReplyGenie connection settings (super-admin)
    Route::get('replygenie-settings', [IntegrationController::class, 'getReplygenieSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('replygenie-settings', [IntegrationController::class, 'updateReplygenieSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Courier + payment integration settings (super-admin)
    // Pull RedX's area list into courier_areas so checkout never depends on their API.
    Route::post('courier-areas-sync', [IntegrationController::class, 'syncCourierAreas'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('courier-settings', [IntegrationController::class, 'getCourierSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('courier-settings', [IntegrationController::class, 'updateCourierSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('courier-test/{provider}', [IntegrationController::class, 'testCourier'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('payment-settings-ib', [IntegrationController::class, 'getPaymentSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('payment-settings-ib', [IntegrationController::class, 'updatePaymentSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('payment-test/{gateway}', [IntegrationController::class, 'testPayment'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('replygenie-test', [IntegrationController::class, 'testReplygenie'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Telegram / WhatsApp admin notifications (super-admin)
    Route::get('notify-settings', [IntegrationController::class, 'getNotifySettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('notify-settings', [IntegrationController::class, 'updateNotifySettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('notify-test', [IntegrationController::class, 'testNotify'])->middleware('can:' . Permission::SUPER_ADMIN);
    // custom sub-admin roles (create moderators / assign section-scoped roles)
    Route::get('admin-roles', [IntegrationController::class, 'adminRoles'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('admin-roles', [IntegrationController::class, 'adminRoles'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('create-admin', [IntegrationController::class, 'createAdmin'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('admin-role-assign', [IntegrationController::class, 'assignAdminRole'])->middleware('can:' . Permission::SUPER_ADMIN);
    // online payments (bKash / bank) ledger + re-check
    Route::get('payments-list', [IntegrationController::class, 'paymentsList'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('payment-recheck', [IntegrationController::class, 'paymentRecheck'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::get('ai/settings', [AiExtractController::class, 'getSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('ai/settings', [AiExtractController::class, 'updateSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ai/product-extract', [AiExtractController::class, 'extractProduct'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('ai/product-batch', [AiExtractController::class, 'batchExtract'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ai/fetch-image', [AiExtractController::class, 'fetchImage'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('ai/list-crawl', [AiExtractController::class, 'listCrawl'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ai/create-product', [AiExtractController::class, 'createProduct'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ai/duplicate-check', [AiExtractController::class, 'duplicateCheck'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ai/test', [AiExtractController::class, 'testConnection'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('ai/models', [AiExtractController::class, 'listModels'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ai/update-product', [AiExtractController::class, 'updateExisting'])->middleware('can:' . Permission::SUPER_ADMIN);

    // IndoBangla order manual adjustment (discount / delivery / adjustment / note).
    Route::post('order-adjust', [IntegrationController::class, 'adjustOrder'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    // IndoBangla pay-by-link generation (admin).
    Route::post('order-pay-link', [IntegrationController::class, 'orderPayLink'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    // IndoBangla shareable invoice-link generation (admin).
    Route::post('order-invoice-link', [IntegrationController::class, 'orderInvoiceLink'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    // Reader's Club settings (fee / discount %) — super-admin.
    Route::get('club-settings', [IntegrationController::class, 'clubSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('club-settings', [IntegrationController::class, 'clubSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Order-amount discount tiers — super-admin.
    Route::get('order-discount-settings', [IntegrationController::class, 'orderDiscountSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('dispatch-settings', [IntegrationController::class, 'dispatchSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('invoice-settings', [IntegrationController::class, 'invoiceSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('invoice-settings', [IntegrationController::class, 'invoiceSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('dispatch-settings', [IntegrationController::class, 'dispatchSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('order-discount-settings', [IntegrationController::class, 'orderDiscountSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Coupon analytics — real per-coupon redemption/sales aggregation (super-admin).
    Route::get('coupon-analytics', [IntegrationController::class, 'couponAnalytics'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Command-center dashboard summary — real DB aggregates (super-admin).
    Route::get('dashboard-summary', [IntegrationController::class, 'dashboardSummary'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Book resell (Mode A) — customer: list eligible books, create listing, my listings.
    Route::get('resell/eligible', [IntegrationController::class, 'resellEligibleBooks']);
    Route::post('resell/create', [IntegrationController::class, 'resellCreate']);
    Route::get('resell/my-books', [IntegrationController::class, 'resellMyBooks']);
    // Book resell — admin moderation (super-admin).
    Route::get('resell/admin/list', [IntegrationController::class, 'resellAdminList'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('resell/admin/moderate', [IntegrationController::class, 'resellModerate'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('resell/admin/mark-sold', [IntegrationController::class, 'resellMarkSold'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Reseller business (Mode B) — customer.
    Route::get('reseller/status', [IntegrationController::class, 'resellerStatus']);
    Route::post('reseller/open', [IntegrationController::class, 'resellerOpen']);
    Route::post('reseller/topup', [IntegrationController::class, 'resellerTopup']);
    // Product info reports (#12). The controller methods existed but were never routed, so the
    // shop's report button got "route not found". productReport does its own login check.
    Route::post('product-report', [IntegrationController::class, 'productReport']);
    Route::post('reseller/add-product', [IntegrationController::class, 'resellerAddProduct']);
    Route::post('reseller/remove-product', [IntegrationController::class, 'resellerRemoveProduct']);
    Route::post('reseller/request-payout', [IntegrationController::class, 'resellerRequestPayout']);
    // Reseller business — admin (super-admin).
    Route::match(['get', 'put'], 'reseller/admin/config', [IntegrationController::class, 'resellerConfigAdmin'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('reseller/admin/list', [IntegrationController::class, 'resellerAdminList'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('reseller/admin/record-sale', [IntegrationController::class, 'resellerRecordSale'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('reseller/admin/release', [IntegrationController::class, 'resellerRelease'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('reseller/admin/payouts', [IntegrationController::class, 'resellerPayouts'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('reseller/admin/payout-action', [IntegrationController::class, 'resellerPayoutAction'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Storefront image-size controls — super-admin.
    Route::get('image-sizes-settings', [IntegrationController::class, 'imageSizesSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('image-sizes-settings', [IntegrationController::class, 'imageSizesSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Featured book selection for banner + FBT — super-admin.
    Route::get('featured-books-settings', [IntegrationController::class, 'featuredBooksSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::put('featured-books-settings', [IntegrationController::class, 'featuredBooksSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Per-product landing pages — super-admin (GET list / POST upsert one).
    Route::match(['get', 'post'], 'landing-settings', [IntegrationController::class, 'landingSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Product copy / move across shops — super-admin.
    Route::get('product-shops', [IntegrationController::class, 'productShops'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('product-copy', [IntegrationController::class, 'productCopy'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('product-move', [IntegrationController::class, 'productMove'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Rotating hero banners — super-admin.
    Route::match(['get', 'put'], 'rotating-banners-settings', [IntegrationController::class, 'rotatingBannersSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Pre-home intro page toggle — super-admin.
    Route::match(['get', 'put'], 'prehome-settings', [IntegrationController::class, 'prehomeSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Purchased-before check for the product page — any logged-in user.
    Route::get('purchase-check', [IntegrationController::class, 'purchaseCheck']);
    // Vendors report — super-admin.
    Route::get('vendor-report', [IntegrationController::class, 'vendorReport'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Conversion-rate pricing — super-admin.
    Route::match(['get', 'put'], 'conversion-settings', [IntegrationController::class, 'conversionSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('conversion-apply', [IntegrationController::class, 'conversionApply'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('conversion-preview', [IntegrationController::class, 'conversionPreview'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('conversion-status', [IntegrationController::class, 'conversionStatus'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('admin-tickets', [IntegrationController::class, 'ticketList'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('ticket-status', [IntegrationController::class, 'ticketStatus'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('restock-list', [IntegrationController::class, 'restockList'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('restock-action', [IntegrationController::class, 'restockAction'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('order-move-item', [IntegrationController::class, 'orderMoveItem'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('exchange-list', [IntegrationController::class, 'exchangeList'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('exchange-action', [IntegrationController::class, 'exchangeAction'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('feature-registry', [IntegrationController::class, 'featureRegistry'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('abandoned-checkouts', [IntegrationController::class, 'abandonedCheckouts'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('abandoned-contacted', [IntegrationController::class, 'abandonedContacted'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('preorder-summary', [IntegrationController::class, 'preorderSummary'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('order-board', [IntegrationController::class, 'orderBoard'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('order-lifecycle', [IntegrationController::class, 'orderLifecycle'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::get('feature-checks', [IntegrationController::class, 'featureChecks'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('feature-check', [IntegrationController::class, 'featureCheckSet'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::match(['get', 'put'], 'pay-link-settings', [IntegrationController::class, 'payLinkSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('preorder-products', [IntegrationController::class, 'preorderProducts'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('preorder-update', [IntegrationController::class, 'preorderUpdate'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Manual pre-order desk — admin creates the order, the customer pays the advance.
    Route::get('customers-overview', [IntegrationController::class, 'customersOverview'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::match(['get', 'put'], 'challenge-settings', [IntegrationController::class, 'challengeSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::match(['get', 'put'], 'preorder-settings', [IntegrationController::class, 'preorderSettings'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('preorder-quote', [IntegrationController::class, 'preorderQuote'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('preorder-create', [IntegrationController::class, 'preorderCreate'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('conversion-coupon', [IntegrationController::class, 'conversionCoupon'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::match(['get', 'put'], 'membership-tiers', [IntegrationController::class, 'membershipTiers'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::get('membership-search', [IntegrationController::class, 'membershipSearch'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('membership-assign', [IntegrationController::class, 'membershipAssign'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('membership-card-action', [IntegrationController::class, 'membershipCardAction'])->middleware('can:' . Permission::SUPER_ADMIN);
    // Saved-books (wishlist) insights + quick price edit — super-admin.
    Route::get('wishlist-insights', [IntegrationController::class, 'wishlistInsights'])->middleware('can:' . Permission::SUPER_ADMIN);
    Route::post('product-quick-price', [IntegrationController::class, 'productQuickPrice'])->middleware('can:' . Permission::SUPER_ADMIN);
    // IndoBangla order-management board: operational tracking + customer tier stats
    Route::post('order-ops', [IntegrationController::class, 'orderOps']);
    Route::get('live-users', [IntegrationController::class, 'liveUsers'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::get('product-reports', [IntegrationController::class, 'productReports'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::put('product-reports/{id}', [IntegrationController::class, 'productReportUpdate'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::post('admin-create-customer', [IntegrationController::class, 'adminCreateCustomer']);
    Route::post('order-customer-stats', [IntegrationController::class, 'orderCustomerStats'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
    Route::get('order-search', [IntegrationController::class, 'orderSearch'])->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);

    // IndoBangla order dashboard summary (counts per order status).
    Route::get('orders-summary', function () {
        $db = \Illuminate\Support\Facades\DB::table('orders')->whereNull('deleted_at');
        $byStatus = (clone $db)
            ->select('order_status', \Illuminate\Support\Facades\DB::raw('count(*) as c'))
            ->groupBy('order_status')
            ->pluck('c', 'order_status');
        return [
            'total'     => (clone $db)->count(),
            'by_status' => $byStatus,
        ];
    })->middleware('permission:' . Permission::SUPER_ADMIN . '|' . Permission::STORE_OWNER . '|' . Permission::STAFF);
});
Route::get('/payment-intent', [PaymentIntentController::class, 'getPaymentIntent']);

Route::apiResource('faqs', FaqsController::class, [
    'only' => ['index', 'show'],
]);

Route::apiResource('terms-and-conditions', TermsAndConditionsController::class, [
    'only' => ['index', 'show'],
]);

Route::apiResource('flash-sale', FlashSaleController::class, [
    'only' => ['index', 'show'],
]);

Route::resource('refund-policies', RefundPolicyController::class, [
    'only' => ['index', 'show'],
]);


Route::post('shop-maintenance-event', [ShopController::class, 'shopMaintenanceEvent']);
Route::apiResource('custom-page', CustomPageController::class, [
    'only' => ['index'],
]);
Route::get('latest-products', [ProductController::class, 'latestProducts']);

/**
 * ******************************************
 * Authorized Route for Customers only
 * ******************************************
 */

Route::group(['middleware' => ['can:' . Permission::CUSTOMER, 'auth:sanctum', 'email.verified']], function () {
    Route::post('/update-email', [UserController::class, 'updateUserEmail']);
    Route::get('me', [UserController::class, 'me']);
    Route::apiResource('orders', OrderController::class, [
        'only' => ['index'],
    ]);
    Route::apiResource('reviews', ReviewController::class, [
        'only' => ['store', 'update']
    ]);
    Route::apiResource('questions', QuestionController::class, [
        'only' => ['store'],
    ]);
    Route::apiResource('feedbacks', FeedbackController::class, [
        'only' => ['store'],
    ]);
    Route::apiResource('abusive_reports', AbusiveReportController::class, [
        'only' => ['store'],
    ]);
    Route::apiResource('conversations', ConversationController::class, [
        'only' => ['index', 'store'],
    ]);
    Route::get('conversations/{conversation_id}', [ConversationController::class, 'show']);
    Route::get('messages/conversations/{conversation_id}', [MessageController::class, 'index']);
    Route::post('messages/conversations/{conversation_id}', [MessageController::class, 'store']);
    Route::post('messages/seen/{conversation_id}', [MessageController::class, 'seen']);
    Route::get('my-questions', [QuestionController::class, 'myQuestions']);
    Route::get('my-reports', [AbusiveReportController::class, 'myReports']);
    // 1-minute book challenge — the clock and the book count live on the server.
    Route::get('challenge/status', [IntegrationController::class, 'challengeStatus']);
    Route::post('challenge/start', [IntegrationController::class, 'challengeStart']);
    Route::post('challenge/add', [IntegrationController::class, 'challengeAdd']);
    Route::post('challenge/finish', [IntegrationController::class, 'challengeFinish']);

    Route::post('wishlists/toggle', [WishlistController::class, 'toggle']);
    Route::apiResource('wishlists', WishlistController::class, [
        'only' => ['index', 'store', 'destroy'],
    ]);
    Route::get('wishlists/in_wishlist/{product_id}', [WishlistController::class, 'in_wishlist']);
    Route::get('my-wishlists', [ProductController::class, 'myWishlists']);
    Route::get('orders/tracking-number/{tracking_number}', 'Marvel\Http\Controllers\OrderController@findByTrackingNumber');
    Route::apiResource('attachments', AttachmentController::class, [
        'only' => ['store', 'update', 'destroy'],
    ]);

    Route::put('users/{id}', [UserController::class, 'update']);
    Route::post('/change-password', [UserController::class, 'changePassword']);
    Route::post('/update-contact', [UserController::class, 'updateContact']);
    Route::apiResource('address', AddressController::class, [
        'only' => ['destroy'],
    ]);
    Route::apiResource(
        'refunds',
        RefundController::class,
        [
            'only' => ['index', 'store', 'show'],
        ]
    );
    Route::get('downloads', [DownloadController::class, 'fetchDownloadableFiles']);
    Route::post('downloads/digital_file', [DownloadController::class, 'generateDownloadableUrl']);
    Route::get('/followed-shops-popular-products', [ShopController::class, 'followedShopsPopularProducts']);
    Route::get('/followed-shops', [ShopController::class, 'userFollowedShops']);
    Route::get('/follow-shop', [ShopController::class, 'userFollowedShop']);
    Route::post('/follow-shop', [ShopController::class, 'handleFollowShop']);
    Route::apiResource('cards', PaymentMethodController::class, [
        'only' => ['index', 'store', 'update', 'destroy'],
    ]);
    Route::post('/set-default-card', [PaymentMethodController::class, 'setDefaultCard']);
    Route::post('/save-payment-method', [PaymentMethodController::class, 'savePaymentMethod']);
    // Route::apiResource('faqs', FaqsController::class, [
    //     'only' => ['index', 'show'],
    // ]);
    Route::apiResource('notify-logs', NotifyLogsController::class, [
        'only' => ['index', 'show'],
    ]);
    Route::post('notify-log-seen', [NotifyLogsController::class, 'readNotifyLogs']);
    Route::post('notify-log-read-all', [NotifyLogsController::class, 'readAllNotifyLogs']);
});

/**
 * ******************************************
 * Authorized Route for Staff & Store Owner
 * ******************************************
 */

Route::group(
    ['middleware' => ['permission:' . Permission::STAFF . '|' . Permission::STORE_OWNER, 'auth:sanctum', 'email.verified']],
    function () {
        Route::apiResource('products', ProductController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);
        Route::apiResource('resources', ResourceController::class, [
            'only' => ['store']
        ]);
        Route::apiResource('attributes', AttributeController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);
        Route::apiResource('attribute-values', AttributeValueController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);
        Route::apiResource('orders', OrderController::class, [
            'only' => ['update', 'destroy'],
        ]);

        // Route::get('shop-notification/{id}', [ShopNotificationController::class, 'show']);
        // Route::put('shop-notification/{id}', [ShopNotificationController::class, 'update']);
        // Route::get('popular-products', [AnalyticsController::class, 'popularProducts']);
        // Route::get('shops/refunds', 'Marvel\Http\Controllers\ShopController@refunds');
        Route::apiResource('questions', QuestionController::class, [
            'only' => ['update'],
        ]);
        Route::apiResource('authors', AuthorController::class, [
            'only' => ['store'],
        ]);
        Route::apiResource('manufacturers', ManufacturerController::class, [
            'only' => ['store'],
        ]);
        Route::get('store-notices/getStoreNoticeType', [StoreNoticeController::class, 'getStoreNoticeType']);
        Route::get('store-notices/getUsersToNotify', [StoreNoticeController::class, 'getUsersToNotify']);
        Route::post('store-notices/read/', [StoreNoticeController::class, 'readNotice']);
        Route::post('store-notices/read-all', [StoreNoticeController::class, 'readAllNotice']);
        Route::apiResource('store-notices', StoreNoticeController::class, [
            'only' => ['show', 'store', 'update', 'destroy']
        ]);

        Route::get('export-order-url/{shop_id?}', 'Marvel\Http\Controllers\OrderController@exportOrderUrl');
        Route::post('download-invoice-url', 'Marvel\Http\Controllers\OrderController@downloadInvoiceUrl');
        Route::apiResource('faqs', FaqsController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);
        Route::get('analytics', [AnalyticsController::class, 'analytics']);
        Route::get('low-stock-products', [AnalyticsController::class, 'lowStockProducts']);
        Route::get('category-wise-product', [AnalyticsController::class, 'categoryWiseProduct']);
        Route::get('category-wise-product-sale', [AnalyticsController::class, 'categoryWiseProductSale']);
        Route::get('draft-products', [ProductController::class, 'draftedProducts']);
        Route::get('products-stock', [ProductController::class, 'productStock']);
        Route::get('products-by-flash-sale', [FlashSaleController::class, 'getProductsByFlashSale']);
        Route::get('top-rate-product', [AnalyticsController::class, 'topRatedProducts']);
        Route::apiResource('coupons', CouponController::class, [
            'only' => ['update'],
        ]);
        // Route::get('products-requested-for-flash-sale-by-vendor', [FlashSaleVendorRequestController::class, 'getProductsByFlashSaleVendorRequest']);
        Route::get('requested-products-for-flash-sale', [FlashSaleVendorRequestController::class, 'getRequestedProductsForFlashSale']);
        Route::apiResource('vendor-requests-for-flash-sale', FlashSaleVendorRequestController::class, [
            'only' => ['index', 'show', 'store', 'destroy'],
        ]);
    }
);


/**
 * *****************************************
 * Authorized Route for Store owner Only
 * *****************************************
 */

Route::group(
    ['middleware' => ['permission:' . Permission::STORE_OWNER, 'auth:sanctum', 'email.verified']],
    function () {
        Route::apiResource('shops', ShopController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);
        // Route::get('analytics', [AnalyticsController::class, 'analytics']);
        Route::apiResource('withdraws', WithdrawController::class, [
            'only' => ['store', 'index', 'show'],
        ]);
        Route::post('staffs', [ShopController::class, 'addStaff']);
        Route::delete('staffs/{id}', [ShopController::class, 'deleteStaff']);
        Route::get('staffs', [UserController::class, 'staffs']);
        Route::get('my-shops', [ShopController::class, 'myShops']);
        Route::post('transfer-shop-ownership', [ShopController::class, 'transferShopOwnership']);

        // Route::get('/admin/list', [UserController::class, 'admins']);
        // Route::apiResource('notify-logs', NotifyLogsController::class, [
        //     'only' => ['index'],
        // ]);

        // Route::post('notify-log-seen', [NotifyLogsController::class, 'readNotifyLogs']);
        // Route::post('notify-log-read-all', [NotifyLogsController::class, 'readAllNotifyLogs']);

        // Route::apiResource('faqs', FaqsController::class, [
        //     'only' => ['store', 'update', 'destroy'],
        // ]);

        Route::apiResource('flash-sale', FlashSaleController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);

        Route::get('product-flash-sale-info', [FlashSaleController::class, 'getFlashSaleInfoByProductID']);

        Route::apiResource('terms-and-conditions', TermsAndConditionsController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);

        Route::apiResource('coupons', CouponController::class, [
            'only' => ['store', 'destroy'],
        ]);

        Route::apiResource('terms-and-conditions', TermsAndConditionsController::class, [
            'only' => ['store', 'update', 'destroy'],
        ]);
        Route::get('/vendors/list', [UserController::class, 'vendors']);
        // Route::post('products-request-for-flash-sale', [FlashSaleVendorRequestController::class, 'productsRequestForFlashSale']);

        Route::apiResource('ownership-transfer', OwnershipTransferController::class, [
            'only' => ['index', 'show'],
        ]);
    }
);

/**
 * *****************************************
 * Authorized Route for Super Admin only
 * *****************************************
 */

Route::group(['middleware' => ['permission:' . Permission::SUPER_ADMIN, 'auth:sanctum']], function () {
    // Route::get('messages/get-conversations/{shop_id}', [ConversationController::class, 'getConversationByShopId']);
    // Route::get('analytics', [AnalyticsController::class, 'analytics']);
    Route::apiResource('types', TypeController::class, [
        'only' => ['store', 'update', 'destroy'],
    ]);
    Route::apiResource('withdraws', WithdrawController::class, [
        'only' => ['update', 'destroy'],
    ]);
    Route::apiResource('categories', CategoryController::class, [
        'only' => ['store', 'update', 'destroy'],
    ]);
    Route::apiResource('delivery-times', DeliveryTimeController::class, [
        'only' => ['store', 'update', 'destroy']
    ]);
    Route::apiResource('languages', LanguageController::class, [
        'only' => ['store', 'update', 'destroy']
    ]);
    Route::apiResource('tags', TagController::class, [
        'only' => ['store', 'update', 'destroy'],
    ]);
    Route::apiResource('refund-reasons', RefundReasonController::class, [
        'only' => ['store', 'update', 'destroy'],
    ]);
    Route::apiResource('resources', ResourceController::class, [
        'only' => ['update', 'destroy']
    ]);
    // Route::apiResource('coupons', CouponController::class, [
    //     'only' => ['store', 'update', 'destroy'],
    // ]);
    // Route::apiResource('order-status', OrderStatusController::class, [
    //     'only' => ['store', 'update', 'destroy'],
    // ]);
    Route::apiResource('reviews', ReviewController::class, [
        'only' => ['destroy']
    ]);
    Route::apiResource('questions', QuestionController::class, [
        'only' => ['destroy'],
    ]);
    Route::apiResource('feedbacks', FeedbackController::class, [
        'only' => ['update', 'destroy'],
    ]);
    Route::apiResource('abusive_reports', AbusiveReportController::class, [
        'only' => ['index', 'show', 'update', 'destroy'],
    ]);
    Route::post('abusive_reports/accept', [AbusiveReportController::class, 'accept']);
    Route::post('abusive_reports/reject', [AbusiveReportController::class, 'reject']);
    Route::apiResource('settings', SettingsController::class, [
        'only' => ['store'],
    ]);
    Route::apiResource('users', UserController::class);
    Route::apiResource('authors', AuthorController::class, [
        'only' => ['update', 'destroy'],
    ]);
    Route::apiResource('manufacturers', ManufacturerController::class, [
        'only' => ['update', 'destroy'],
    ]);
    Route::post('users/block-user', [UserController::class, 'banUser']);
    Route::post('users/unblock-user', [UserController::class, 'activeUser']);
    Route::apiResource('taxes', TaxController::class);
    Route::apiResource('shippings', ShippingController::class);
    Route::post('approve-shop', [ShopController::class, 'approveShop']);
    Route::post('disapprove-shop', [ShopController::class, 'disApproveShop']);
    Route::post('approve-withdraw', [WithdrawController::class, 'approveWithdraw']);
    Route::post('add-points', [UserController::class, 'addPoints']);
    Route::post('users/make-admin', [UserController::class, 'makeOrRevokeAdmin']);
    Route::apiResource(
        'refunds',
        RefundController::class,
        [
            'only' => ['destroy', 'update'],
        ]
    );
    Route::apiResource('notify-logs', NotifyLogsController::class, [
        'only' => ['destroy'],
    ]);
    // Route::apiResource('faqs', FaqsController::class, [
    //     'only' => ['store', 'update', 'destroy'],
    // ]);
    Route::get('new-shops', [ShopController::class, 'newOrInActiveShops']);
    Route::post('approve-terms-and-conditions', [TermsAndConditionsController::class, 'approveTerm']);
    Route::post('disapprove-terms-and-conditions', [TermsAndConditionsController::class, 'disApproveTerm']);
    Route::get('/admin/list', [UserController::class, 'admins']);

    Route::get('/customers/list', [UserController::class, 'customers']);
    Route::get('my-staffs', [UserController::class, 'myStaffs']);
    Route::get('all-staffs', [UserController::class, 'allStaffs']);
    Route::resource('refund-policies', RefundPolicyController::class, [
        'only' => ['store', 'update', 'destroy'],
    ]);
    Route::post('approve-coupon', [CouponController::class, 'approveCoupon']);
    Route::post('disapprove-coupon', [CouponController::class, 'disApproveCoupon']);
    // Route::get('requested-products-for-flash-sale', [FlashSaleVendorRequestController::class, 'getRequestedProductsForFlashSale']);
    Route::post('approve-flash-sale-requested-products', [FlashSaleVendorRequestController::class, 'approveFlashSaleProductsRequest']);
    Route::post('disapprove-flash-sale-requested-products', [FlashSaleVendorRequestController::class, 'disapproveFlashSaleProductsRequest']);
    Route::apiResource('vendor-requests-for-flash-sale', FlashSaleVendorRequestController::class, [
        'only' => ['update'],
    ]);

    Route::apiResource('ownership-transfer', OwnershipTransferController::class, [
        'only' => ['update', 'destroy'],
    ]);
});
Route::apiResource('became-seller', BecameSellerController::class);
Route::apiResource('custom-page', CustomPageController::class, [
    'only' => ['store', 'update', 'destroy'],
]);