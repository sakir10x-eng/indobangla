<?php

namespace Marvel\Support;

/**
 * The list of things worth testing, and where to go to test them.
 *
 * This is code, not data, on purpose: a feature is listed in the same commit that ships it, and
 * nobody can quietly delete a row to make the board look finished. The verdicts live in the
 * feature_checks table; a feature with no row there has simply never been checked.
 *
 * `where` is the whole point of the human column — a checklist you cannot act on gets ignored.
 * Write the exact click path, not the feature name again.
 */
final class FeatureChecks
{
    public const AREAS = [
        'orders'   => '📦 অর্ডার বোর্ড',
        'lifecycle' => '🔒 অর্ডার লাইফসাইকেল',
        'preorder' => '📖 প্রি-অর্ডার',
        'payment'  => '💳 পেমেন্ট',
        'users'    => '👤 ব্যবহারকারী',
        'shop'     => '🛒 শপ',
        'admin'    => '⚙️ অ্যাডমিন টুল',
    ];

    /**
     * key, area, title, where (the click path), and what the assistant verified on each site.
     *
     * Two assistant columns because work is proved on staging and then promoted: "passed on
     * staging" and "passed on live" are different claims, and a staging tick must never be read
     * as a live one. They live in code rather than being written across the network because
     * staging and live have separate databases — this file is deployed to both, so both boards
     * show the same history.
     *
     * `untested` with a note saying so is the honest answer, and far more useful than a tick
     * the run never earned.
     */
    public const REGISTRY = [
        // ---- order board
        ['key' => 'board-summary-all-orders', 'area' => 'orders',
         'title' => 'সামারি সব অর্ডারের (১ পাতার নয়)',
         'where' => '/admin/orders — উপরের ৪টা কার্ড মোট অর্ডারের সংখ্যা দেখাবে, ১০টার নয়',
         'ai_staging' => 'passed', 'ai_staging_note' => 'staging-এ counts/summary যাচাই: all=8185, badge==list',
         'ai_live' => 'passed', 'ai_live_note' => 'লাইভে: all=8203, summary 8203 অর্ডার / 15,925 বই / ৳15,358,641'],

        ['key' => 'board-tab-counts-match', 'area' => 'orders',
         'title' => 'ট্যাব ব্যাজ = ক্লিক করলে যে তালিকা আসে',
         'where' => '/admin/orders — যেকোনো ট্যাবে ক্লিক করে সংখ্যা মিলিয়ে দেখুন',
         'ai_staging' => 'passed', 'ai_staging_note' => '১১টা ট্যাবেই badge == paginator.total; bucket যোগ করলে all-এর সমান',
         'ai_live' => 'passed', 'ai_live_note' => 'লাইভে counts যাচাই — pending 72 / ready 31 / delivered 6080 / returned 2009'],

        ['key' => 'board-server-side-filter', 'area' => 'orders',
         'title' => 'ট্যাব ফিল্টার সার্ভার-সাইড (পেজিনেশনসহ)',
         'where' => '/admin/orders — ট্যাব বদলে পরের পাতায় যান',
         'ai_staging' => 'passed', 'ai_staging_note' => 'HTTP: tab=pending → paginator.total 92 = badge 92',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে ট্যাব বদলে পেজিনেশন চালিয়ে দেখা হয়নি'],

        ['key' => 'board-search', 'area' => 'orders',
         'title' => 'নাম/ফোন/অর্ডার নম্বর দিয়ে খোঁজা',
         'where' => '/admin/orders — উপরের সার্চ বাক্সে লিখুন',
         'ai_staging' => 'untested', 'ai_staging_note' => 'বোর্ড রিফ্যাক্টরের পর সার্চ পথটা চালানো হয়নি',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভেও চালানো হয়নি'],

        // ---- lifecycle
        ['key' => 'order-void', 'area' => 'lifecycle',
         'title' => 'Void — স্টকে বই ফেরত, অটো-আর্কাইভ, হিসাবের বাইরে',
         'where' => '/admin/orders — যেকোনো কার্ডে 🚫 Void',
         'ai_staging' => 'passed', 'ai_staging_note' => 'স্টক ৪→৫, archived_at বসেছে, মূল তালিকা থেকে বাদ, void ট্যাবে এসেছে',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে কোনো অর্ডার void করা হয়নি (আসল অর্ডার নষ্ট করতে চাইনি)'],

        ['key' => 'order-unvoid', 'area' => 'lifecycle',
         'title' => 'Unvoid — স্ট্যাটাস ফেরে, স্টক আবার নেয়',
         'where' => '/admin/orders → 🚫 Void ট্যাব → ↩ Unvoid',
         'ai_staging' => 'passed', 'ai_staging_note' => 'স্টক ৫→৪ (কোনো লিক নেই), স্ট্যাটাস order-pending-এ ফিরেছে',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে চালানো হয়নি'],

        ['key' => 'order-archive', 'area' => 'lifecycle',
         'title' => 'আর্কাইভ / ফেরানো',
         'where' => '/admin/orders — কার্ডে 🗄 আর্কাইভ, তারপর 🗄 Archive ট্যাব → 📤 ফেরান',
         'ai_staging' => 'untested', 'ai_staging_note' => 'void-এর অটো-আর্কাইভ যাচাই করা, কিন্তু হাতে আর্কাইভ/ফেরানো বোতাম চালানো হয়নি',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে চালানো হয়নি'],

        ['key' => 'order-lock-completed', 'area' => 'lifecycle',
         'title' => 'সম্পন্ন 🔒 — ডেলিভারির ৭ দিন পর অটো লক',
         'where' => '/admin/orders → Delivered ট্যাব — পুরনো অর্ডারে 🔒 সম্পন্ন ব্যাজ',
         'ai_staging' => 'passed', 'ai_staging_note' => 'সুইপে ১১,৪৬৯টা লক হয়েছে',
         'ai_live' => 'passed', 'ai_live_note' => 'লাইভে ১২,৮৮৯টা লক; ডেলিভার্ড নয় এমন ০টা; আয় অপরিবর্তিত ৳25,910,170'],

        ['key' => 'order-lock-guard', 'area' => 'lifecycle',
         'title' => 'লক করা অর্ডার staff বদলাতে পারে না',
         'where' => 'staff অ্যাকাউন্টে লগইন করে একটা 🔒 সম্পন্ন অর্ডার বদলানোর চেষ্টা করুন',
         'ai_staging' => 'passed', 'ai_staging_note' => 'নন-super-admin প্রত্যাখ্যাত; super admin ও সিস্টেম (কলব্যাক) অনুমোদিত; আনলক করা অর্ডার এখনো সম্পাদনযোগ্য',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে staff অ্যাকাউন্টে চেষ্টা করা হয়নি'],

        ['key' => 'order-unlock', 'area' => 'lifecycle',
         'title' => 'Super admin লক খুলতে পারে (লগসহ)',
         'where' => '/admin/orders → Delivered → 🔓 খুলুন',
         'ai_staging' => 'passed', 'ai_staging_note' => 'locked_at=null; ops_meta.unlocks-এ কে/কখন/কেন লেখা হয়েছে',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে চালানো হয়নি'],

        ['key' => 'order-lock-cron', 'area' => 'lifecycle',
         'title' => 'অটো-লক cron প্রতি ঘণ্টায় চলে',
         'where' => 'নতুন কোনো অর্ডার ডেলিভার্ড করে ৭ দিন পর দেখুন 🔒 এসেছে কিনা',
         'ai_staging' => 'passed', 'ai_staging_note' => 'orders:lock-delivered চলেছে; ৭ দিনের কম পুরনো অর্ডার ছোঁয়নি',
         'ai_live' => 'passed', 'ai_live_note' => 'cron চলছে (syslog ১০৮ এন্ট্রি); সুইপ চালিয়ে "locked 0" — অর্থাৎ idempotent'],

        // ---- preorder
        ['key' => 'preorder-card-filter', 'area' => 'preorder',
         'title' => 'প্রি-অর্ডার কার্ডে ক্লিক → ওই অর্ডারগুলো',
         'where' => '/admin/orders — ⏳ অগ্রিমের অপেক্ষায় কার্ডে ক্লিক',
         'ai_staging' => 'passed', 'ai_staging_note' => 'চারটে কার্ডেরই সংখ্যা = তার তালিকা (একই preorderClock)',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে কার্ডে ক্লিক করা হয়নি'],

        ['key' => 'preorder-admin-badge', 'area' => 'preorder',
         'title' => 'কোনটা "preorder create" থেকে এসেছে বোঝা যায়',
         'where' => '/admin/orders — প্রি-অর্ডার কার্ডে 📖 প্রি-অর্ডার · অ্যাডমিন ব্যাজ',
         'ai_staging' => 'untested', 'ai_staging_note' => 'ব্যাজটা চোখে দেখা হয়নি — শুধু বান্ডেলে আছে যাচাই করা',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে ১টা এমন অর্ডার আছে, দেখা হয়নি'],

        ['key' => 'preorder-no-double-count', 'area' => 'preorder',
         'title' => 'ভাগ হওয়া অর্ডার দুবার গোনে না',
         'where' => '/admin/orders — প্রি-অর্ডার মোট সংখ্যা',
         'ai_staging' => 'passed', 'ai_staging_note' => 'parent-only করার পর স্টেজিংয়ে ৩→২ ঠিক হয়েছে',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে child প্রি-অর্ডার নেই (০), তাই পার্থক্য দেখা যায়নি'],

        // ---- payment
        ['key' => 'bkash-live-payment', 'area' => 'payment',
         'title' => 'bKash দিয়ে আসল টাকা দেওয়া',
         'where' => 'Settings → Couriers & Payments → bKash mode=live, তারপর ছোট একটা আসল অর্ডার',
         'ai_staging' => 'untested', 'ai_staging_note' => '⚠️ কখনো চলেনি',
         'ai_live' => 'untested', 'ai_live_note' => '⚠️ mode এখনো sandbox। আসল টাকায় শুরু-থেকে-শেষ পরীক্ষা বাকি'],

        ['key' => 'bank-transfer-slip', 'area' => 'payment',
         'title' => 'ব্যাংক স্লিপ আপলোড → অ্যাডমিন কনফার্ম',
         'where' => 'একটা pay-link খুলে ব্যাংক বেছে স্লিপ দিন, তারপর /admin/orders-এ ✓ Money received',
         'ai_staging' => 'untested', 'ai_staging_note' => 'এন্ডপয়েন্ট আছে, আপলোড→কনফার্ম চক্র চালানো হয়নি',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে চালানো হয়নি'],

        ['key' => 'invoice-coupon-toggle', 'area' => 'payment',
         'title' => 'ইনভয়েসে কুপন লাইন on/off',
         'where' => '/admin/orders — উপরে 🎁 Coupon line on invoice, তারপর একটা স্লিপ প্রিন্ট করুন',
         'ai_staging' => 'untested', 'ai_staging_note' => 'সেটিংস সেভ হয়, ছাপা স্লিপে লাইনটা দেখা হয়নি',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে স্লিপ ছেপে দেখা হয়নি'],

        // ---- users
        ['key' => 'user-create-mobile-only', 'area' => 'users',
         'title' => 'শুধু নাম + মোবাইল + পাসওয়ার্ডে ব্যবহারকারী তৈরি',
         'where' => '/admin/users/create — ইমেইল খালি রেখে সেভ করুন',
         'ai_staging' => 'passed', 'ai_staging_note' => 'mobile-only তৈরি হয় ও নম্বর সেভ হয়; email-only চলে; দুটোর একটাও না দিলে আটকায়',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে ব্যবহারকারী তৈরি করা হয়নি'],

        ['key' => 'user-login-by-mobile', 'area' => 'users',
         'title' => 'মোবাইল দিয়ে তৈরি ব্যবহারকারী লগইন করতে পারে',
         'where' => 'উপরে তৈরি করা অ্যাকাউন্ট দিয়ে লগইন করে দেখুন',
         'ai_staging' => 'untested', 'ai_staging_note' => '⚠️ অ্যাকাউন্ট তৈরি যাচাই করা, কিন্তু ওই অ্যাকাউন্টে লগইন করা হয়নি',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে চেষ্টা করা হয়নি'],

        // ---- admin tools
        ['key' => 'live-visitor-count', 'area' => 'admin',
         'title' => 'এখন কতজন সাইটে আছে',
         'where' => '/admin/command-center — উপরের live pill',
         'ai_staging' => 'untested', 'ai_staging_note' => 'এন্ডপয়েন্ট চলে',
         'ai_live' => 'untested', 'ai_live_note' => 'দিনের ট্রাফিকে আসল সংখ্যা দেখা বাকি'],

        ['key' => 'settings-search', 'area' => 'admin',
         'title' => 'সেটিংস সার্চ (যেমন "free shipping")',
         'where' => '/admin/settings — উপরের সার্চে লিখুন',
         'ai_staging' => 'untested', 'ai_staging_note' => 'চালানো হয়নি',
         'ai_live' => 'untested', 'ai_live_note' => 'লাইভে গেছে, কিন্তু সার্চ করে ফলাফল দেখা হয়নি'],

        ['key' => 'anandamela-landing', 'area' => 'shop',
         'title' => 'আনন্দমেলা ল্যান্ডিং পেজ — বানান ও গিফট ব্যানার',
         'where' => '/landing/anandamela-1433',
         'ai_staging' => 'untested', 'ai_staging_note' => '—',
         'ai_live' => 'untested', 'ai_live_note' => '⚠️ ৪টে বইয়ের নাম যাচাই বাকি (ঝুনঝুন, ক্যাপ্টেন অভিমন্যুর অভিযান, ভুবনডাঙার চিতা, হারানো সাইকেল)'],

        ['key' => 'wishlist-button-cards', 'area' => 'shop',
         'title' => 'বইয়ের কার্ডে উইশলিস্ট বোতাম',
         'where' => '/books/search?text= বা হোম পেজ — লেখকের নামের ডানে ❤',
         'ai_staging' => 'untested', 'ai_staging_note' => '—',
         'ai_live' => 'untested', 'ai_live_note' => 'রং ঠিক করে লাইভে গেছে, কিন্তু ক্লিক করে সেভ হয় কিনা দেখা হয়নি'],
    ];

    /** Every registry key, for validating what the API is asked to mark. */
    public static function keys(): array
    {
        return array_column(self::REGISTRY, 'key');
    }
}
