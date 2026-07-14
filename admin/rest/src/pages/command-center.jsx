import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "react-query";
import { adminOnly } from "../utils/auth-utils";
import { HttpClient } from "../data/client/http-client";
import {
  LayoutDashboard, Store, Users, ShoppingCart, AlertTriangle, ShieldAlert,
  TrendingUp, TrendingDown, Package, Wallet, Search, Bell, Flag, Ban,
  ChevronRight, CircleDollarSign, CheckCircle2, Boxes, Receipt, Settings,
  Menu, ArrowUpRight, ArrowDownRight, Sun, Moon, Star, Target, Truck, Clock,
  LifeBuoy, MessageSquare, RotateCcw, XOctagon, ThumbsUp, ThumbsDown,
  Timer, Activity, MessageCircle, Undo2, CornerUpLeft, ShieldCheck, Shield,
  Lock, Globe, Smartphone, Tablet, Monitor, MapPin, UserPlus, Eye, Zap,
  Gauge, TrendingUp as TU, BookOpen, Layers, UserCog, Award, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  LineChart, Line,
} from "recharts";

/* ============================================================
   Indo Bangla — Superadmin Command Center (Full)
   Brand teal #0f766e (from indobangla.tech theme-color).
   Thesis: problems + performance + security, all in one glance.
   ============================================================ */

const tk = (n) => "৳" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// ---------- CORE / SALES ----------
const sampleSalesData = [
  { m: "জান", sales: 412000, orders: 320, last: 380000 },
  { m: "ফেব", sales: 388000, orders: 298, last: 360000 },
  { m: "মার্চ", sales: 521000, orders: 401, last: 410000 },
  { m: "এপ্রিল", sales: 498000, orders: 372, last: 430000 },
  { m: "মে", sales: 605000, orders: 455, last: 470000 },
  { m: "জুন", sales: 712000, orders: 528, last: 520000 },
  { m: "জুলাই", sales: 689000, orders: 501, last: 560000 },
];
const sampleOrderStatus = [
  { name: "Completed", value: 5120, color: "#0f766e" },
  { name: "Processing", value: 890, color: "#0284c7" },
  { name: "Pending", value: 640, color: "#d97706" },
  { name: "Cancelled", value: 423, color: "#dc2626" },
];
const todayHourly = [
  { h: "6a", o: 2 }, { h: "9a", o: 8 }, { h: "12p", o: 14 }, { h: "3p", o: 11 },
  { h: "6p", o: 19 }, { h: "9p", o: 23 }, { h: "12a", o: 6 },
];

// ---------- ALERTS ----------
const sampleAlerts = [
  { id: 1, type: "critical", icon: ShieldAlert, title: "Brute-force login চেষ্টা", detail: "১টি IP থেকে ৩৪০ বার ব্যর্থ login — সাময়িক block করা হয়েছে", action: "Security দেখুন", tag: "Security" },
  { id: 2, type: "critical", icon: MessageSquare, title: "৮টি ticket ২৪ ঘণ্টার বেশি pending", detail: "reply দেওয়া হয়নি — SLA breach", action: "Reply দিন", tag: "Support" },
  { id: 3, type: "warning", icon: Activity, title: "৫ জন vendor activity কমিয়েছে", detail: "Habib Store সহ কয়েকজন ৩০ দিনে product upload প্রায় বন্ধ", action: "Vendor দেখুন", tag: "Churn risk" },
  { id: 4, type: "warning", icon: Receipt, title: "১৪টি Payment আটকে আছে", detail: "COD order গুলো Total ৳0.00 দেখাচ্ছে — reconcile দরকার", action: "দেখুন", tag: "৳48,200" },
];

// ---------- VENDORS ----------
const flaggedVendors = [
  { id: 3603, name: "baba01hacker", reason: "Hate symbol logo", risk: "high" },
  { id: 3541, name: "wku8owbccn@…", reason: "Spam pattern email", risk: "medium" },
  { id: 3508, name: "overthrash1337", reason: "Throwaway domain", risk: "medium" },
];
const sampleTopVendors = [
  { name: "শ্রী - dhee", sales: 1284000, orders: 467, trend: 12.4 },
  { name: "Indo Bangla Book", sales: 982000, orders: 388, trend: 8.1 },
  { name: "Habib Store", sales: 641000, orders: 245, trend: -3.2 },
  { name: "Bangladeshi Book", sales: 512000, orders: 198, trend: 5.6 },
];
const sampleVendorActivity = [
  { name: "Habib Store", now: 2, prev: 34, lastSeen: "১২ দিন আগে", status: "declining" },
  { name: "Boi Bazar", now: 5, prev: 28, lastSeen: "৮ দিন আগে", status: "declining" },
  { name: "Kotha Prokash", now: 0, prev: 19, lastSeen: "২৬ দিন আগে", status: "dormant" },
  { name: "শ্রী - dhee", now: 41, prev: 30, lastSeen: "আজ", status: "growing" },
  { name: "Indo Bangla Book", now: 33, prev: 31, lastSeen: "আজ", status: "steady" },
];

// ---------- MODERATOR PERFORMANCE ----------
const moderators = [
  { name: "Rakib Hasan", role: "Senior Mod", sales: 284000, hours: 168, tickets: 142, approvals: 88, orders: 210, score: 92, trend: 6.4, tasks: ["Vendor approval", "Ticket reply", "Refund review", "Product moderation"] },
  { name: "Nusrat Jahan", role: "Moderator", sales: 176000, hours: 132, tickets: 98, approvals: 54, orders: 141, score: 78, trend: 2.1, tasks: ["Ticket reply", "Order tracking", "Feedback review"] },
  { name: "Tanvir Ahmed", role: "Moderator", sales: 88000, hours: 96, tickets: 41, approvals: 22, orders: 63, score: 54, trend: -8.3, tasks: ["Ticket reply", "Product moderation"] },
];

// ---------- SUPPORT ----------
const ticketStats = { open: 42, waitingReply: 8, resolvedToday: 17, avgReply: "৪ ঘণ্টা" };
const ticketBreakdown = [
  { name: "Product", value: 18, color: "#0f766e" }, { name: "Delivery", value: 14, color: "#0284c7" },
  { name: "Refund", value: 7, color: "#dc2626" }, { name: "Payment", value: 3, color: "#d97706" },
];
const recentTickets = [
  { id: "T-1042", subject: "বই ছেঁড়া এসেছে, refund চাই", type: "Refund", cust: "Afia Jannat", age: "২৬ ঘণ্টা", urgent: true },
  { id: "T-1041", subject: "Delivery ৭ দিন হয়ে গেছে, আসেনি", type: "Delivery", cust: "Tamal Das", age: "১৯ ঘণ্টা", urgent: true },
  { id: "T-1039", subject: "ভুল বই পেয়েছি", type: "Product", cust: "Ariful Islam", age: "৫ ঘণ্টা", urgent: false },
  { id: "T-1037", subject: "bKash কেটেছে order হয়নি", type: "Payment", cust: "Robayet", age: "২ ঘণ্টা", urgent: false },
];

// ---------- CANCEL/RETURN/REFUND ----------
const sampleIssueFlow = [
  { m: "মার্চ", cancel: 38, return: 12, refund: 9 }, { m: "এপ্রিল", cancel: 44, return: 15, refund: 11 },
  { m: "মে", cancel: 41, return: 13, refund: 10 }, { m: "জুন", cancel: 52, return: 18, refund: 14 }, { m: "জুলাই", cancel: 47, return: 16, refund: 12 },
];
const sampleIssueCards = [
  { label: "Order Cancelled", value: 47, rate: "৮.৯%", trend: 1.4, icon: XOctagon, tone: "red" },
  { label: "Return এসেছে", value: 16, rate: "৩.০%", trend: -0.8, icon: Undo2, tone: "amber" },
  { label: "Refund Issue", value: 12, rate: "২.৩%", trend: 2.1, icon: RotateCcw, tone: "red" },
  { label: "Refund সমাধান", value: 9, rate: "৭৫%", trend: 5.0, icon: CheckCircle2, tone: "teal" },
];

// ---------- DELIVERY + FEEDBACK ----------
const deliveryStats = { avgDays: "৩.৪ দিন", onTime: 86, late: 14, fastest: "১ দিন" };
const sampleFeedback = { positive: 78, neutral: 14, negative: 8, avgRating: 4.3, totalReviews: 1284 };
const feedbackThemes = [
  { theme: "বই এর মান ভালো", count: 312, tone: "pos" }, { theme: "দ্রুত delivery", count: 208, tone: "pos" },
  { theme: "packaging দুর্বল", count: 94, tone: "neg" }, { theme: "delivery দেরি", count: 76, tone: "neg" },
];

// ---------- CUSTOMER BEHAVIOUR ----------
const sampleCategorySales = [
  { name: "উপন্যাস", value: 2840, color: "#0f766e" }, { name: "কমিক্স", value: 1920, color: "#0284c7" },
  { name: "একাডেমিক", value: 1610, color: "#7c3aed" }, { name: "রহস্য/থ্রিলার", value: 1280, color: "#d97706" },
  { name: "শিশুতোষ", value: 940, color: "#db2777" },
];
const areaOrders = [
  { area: "ঢাকা", orders: 3120, pct: 44 }, { area: "চট্টগ্রাম", orders: 1180, pct: 17 },
  { area: "সিলেট", orders: 720, pct: 10 }, { area: "রাজশাহী", orders: 610, pct: 9 },
  { area: "খুলনা", orders: 540, pct: 8 }, { area: "অন্যান্য", orders: 903, pct: 12 },
];
const deviceRatio = [
  { name: "Mobile", value: 68, color: "#0f766e", icon: Smartphone },
  { name: "Desktop", value: 24, color: "#0284c7", icon: Monitor },
  { name: "Tablet", value: 8, color: "#7c3aed", icon: Tablet },
];
const behaviourStats = {
  avgOrderValue: 745, newAccounts: 128, newAccountTrend: 14.2,
  avgSessionTime: "৬ মি ৪০ সে", regularUsers: 62, purchaseRatio: 3.8, repeatBuyers: 41,
};
const trafficSource = [
  { src: "Facebook", pct: 46, color: "#0f766e" }, { src: "Direct", pct: 22, color: "#0284c7" },
  { src: "Google", pct: 19, color: "#7c3aed" }, { src: "YouTube", pct: 8, color: "#d97706" },
  { src: "অন্যান্য", pct: 5, color: "#94a3b8" },
];

// ---------- WEBSITE PERFORMANCE ----------
const perfStats = { loadTime: "১.৮ সে", todayVisitors: 4210, todayTrend: 8.4, liveNow: 63, bounce: 38 };
const trafficWeek = [
  { d: "শনি", v: 3800 }, { d: "রবি", v: 4100 }, { d: "সোম", v: 3950 }, { d: "মঙ্গল", v: 4600 },
  { d: "বুধ", v: 4300 }, { d: "বৃহঃ", v: 5100 }, { d: "শুক্র", v: 4210 },
];
const topPages = [
  { page: "/ (হোম)", views: 12400, health: "good" },
  { page: "/product/immune", views: 8200, health: "good" },
  { page: "/checkout", views: 3100, health: "warn", note: "৮% drop-off বেশি" },
  { page: "/search", views: 2800, health: "warn", note: "ধীর load" },
  { page: "/cart", views: 2400, health: "bad", note: "error report এসেছে" },
];

// ---------- SECURITY ----------
const securityScore = 82;
const securityChecks = [
  { label: "SSL Certificate", status: "ok", note: "বৈধ · ৬২ দিন বাকি" },
  { label: "Firewall (WAF)", status: "ok", note: "সক্রিয়" },
  { label: "Failed Logins", status: "warn", note: "১টি IP block করা হয়েছে" },
  { label: "Software Update", status: "warn", note: "Laravel patch বাকি" },
  { label: "Malware Scan", status: "ok", note: "পরিষ্কার · ২ ঘণ্টা আগে" },
  { label: "Backup", status: "ok", note: "প্রতিদিন · সর্বশেষ আজ" },
];
const securityEvents = [
  { icon: ShieldAlert, text: "Brute-force login (৩৪০ চেষ্টা)", ip: "45.134.x.x", when: "২ ঘণ্টা আগে", level: "high" },
  { icon: Globe, text: "সন্দেহজনক bot crawling", ip: "191.96.x.x", when: "৫ ঘণ্টা আগে", level: "medium" },
  { icon: Lock, text: "Admin password পরিবর্তন", ip: "internal", when: "১ দিন আগে", level: "info" },
];

// ---------- style maps ----------
const riskStyle = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
};
const alertStyle = {
  critical: { bar: "bg-red-500", chip: "bg-red-500/10 text-red-600 dark:text-red-400", btn: "bg-red-600 hover:bg-red-700" },
  warning: { bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", btn: "bg-amber-600 hover:bg-amber-700" },
  info: { bar: "bg-sky-500", chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400", btn: "bg-sky-600 hover:bg-sky-700" },
};
const toneMap = {
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};
const vendorActStyle = {
  declining: { cls: "text-amber-600 dark:text-amber-400", label: "কমছে" },
  dormant: { cls: "text-red-600 dark:text-red-400", label: "নিষ্ক্রিয়" },
  growing: { cls: "text-teal-600 dark:text-teal-400", label: "বাড়ছে" },
  steady: { cls: "text-slate-500 dark:text-slate-400", label: "স্থির" },
};
const secStatus = {
  ok: { dot: "bg-teal-500", cls: "text-teal-600 dark:text-teal-400", icon: CheckCircle2 },
  warn: { dot: "bg-amber-500", cls: "text-amber-600 dark:text-amber-400", icon: AlertTriangle },
  bad: { dot: "bg-red-500", cls: "text-red-600 dark:text-red-400", icon: XOctagon },
};
const pageHealth = { good: "bg-teal-500", warn: "bg-amber-500", bad: "bg-red-500" };

// ---------- reusable ----------
function Card({ children, className = "" }) {
  return <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>{children}</div>;
}
function SectionBanner({ icon: Icon, color, title, note }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
      {note && <span className="text-xs text-slate-500 dark:text-slate-400">— {note}</span>}
    </div>
  );
}
function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5"><span className="w-1 h-5 bg-teal-600 rounded-full" /><h3 className="font-bold text-slate-900 dark:text-white">{children}</h3></div>
      {action}
    </div>
  );
}
function StatCard({ icon: Icon, label, value, sub, trend, accent }) {
  const up = trend >= 0;
  return (
    <Card className="p-5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl grid place-items-center ${accent}`}><Icon className="w-5 h-5" /></div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${up ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(trend)}%</span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>}
      </div>
    </Card>
  );
}
function MiniStat({ icon: Icon, label, value, tone = "teal" }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${toneMap[tone]}`}><Icon className="w-[18px] h-[18px]" /></div>
      <div><div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div></div>
    </div>
  );
}
function Bar2({ pct, color }) {
  return <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>;
}

// ================= MAIN =================
export default function IndoBanglaDashboard() {
  const [dark, setDark] = useState(false);
  const [nav, setNav] = useState("overview");
  const [modRange, setModRange] = useState("Monthly");
  const [dismissed, setDismissed] = useState([]);

  // ---- LIVE DATA (real DB aggregates) — falls back to sample when a block is absent ----
  const { data: summary } = useQuery(
    ["dashboard-summary"],
    () => HttpClient.get("dashboard-summary"),
    { staleTime: 60000, refetchOnWindowFocus: false, retry: 1 },
  );

  const salesData = summary?.sales?.length
    ? summary.sales.map((r) => ({ m: r.m, sales: r.sales, orders: r.orders, last: null }))
    : sampleSalesData;

  const orderStatus = summary?.orderStatus
    ? [
        { name: "Completed", value: summary.orderStatus.completed || 0, color: "#0f766e" },
        { name: "Processing", value: summary.orderStatus.processing || 0, color: "#0284c7" },
        { name: "Pending", value: summary.orderStatus.pending || 0, color: "#d97706" },
        { name: "Cancelled", value: summary.orderStatus.cancelled || 0, color: "#dc2626" },
      ]
    : sampleOrderStatus;

  const feedback = summary?.feedback ?? sampleFeedback;

  const topVendors = summary?.topVendors?.length
    ? summary.topVendors.map((v, i) => ({
        name: v.name,
        sales: (sampleTopVendors[i] && sampleTopVendors[i].sales) || 0,
        orders: v.orders,
        trend: (sampleTopVendors[i] && sampleTopVendors[i].trend) || 0,
        _real: true,
      }))
    : sampleTopVendors;

  const categorySales = summary?.categorySales?.length
    ? summary.categorySales.map((c, i) => ({
        name: c.name,
        value: c.value,
        color: (sampleCategorySales[i] && sampleCategorySales[i].color) || "#0f766e",
      }))
    : sampleCategorySales;

  // today snapshot (real)
  const tOrders = summary?.today?.orders;
  const tRevenue = summary?.today?.revenue;
  const tYdayOrders = summary?.today?.yesterdayOrders;
  const tYdayRevenue = summary?.today?.yesterdayRevenue;
  const tNewAcc = summary?.newAccounts;
  const pct = (now, prev) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : 0);

  // real alerts from live signals (fallback to sample when none returned)
  const alerts = (summary?.alerts && summary.alerts.length)
    ? summary.alerts.map((a, i) => ({ id: 900 + i, icon: AlertTriangle, action: 'দেখুন', ...a }))
    : (summary?.alerts ? [] : sampleAlerts);
  const issueFlow = summary?.issueFlow?.length ? summary.issueFlow : sampleIssueFlow;
  const vendorActivity = summary?.vendorActivity?.length
    ? summary.vendorActivity.map((v) => ({ lastSeen: '—', ...v }))
    : sampleVendorActivity;
  const issueCards = summary?.issues
    ? sampleIssueCards.map((c) =>
        c.label === 'Order Cancelled' ? { ...c, value: summary.issues.cancelled }
          : c.label === 'Refund Issue' ? { ...c, value: summary.issues.refunded }
            : c)
    : sampleIssueCards;

  const liveAlerts = alerts.filter((a) => !dismissed.includes(a.id));
  const criticalCount = liveAlerts.filter((a) => a.type === "critical").length;
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "vendors", label: "Vendors", icon: Store, href: "/shops" },
    { id: "products", label: "Books", icon: BookOpen, href: "/products" },
    { id: "orders", label: "Orders", icon: ShoppingCart, href: "/orders" },
    { id: "customers", label: "Customers", icon: Users, href: "/users" },
    { id: "coupons", label: "Coupons", icon: Award, href: "/coupons" },
    { id: "reviews", label: "Reviews", icon: Star, href: "/reviews" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ];
  const tipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, background: dark ? "#0f172a" : "#fff", color: dark ? "#fff" : "#0f172a" };
  const grid = dark ? "#1e293b" : "#f1f5f9";

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-200" style={{ fontFamily: "'Inter', 'Hind Siliguri', system-ui, sans-serif" }}>

        {/* Sidebar */}
        <aside className="hidden lg:flex w-60 flex-col bg-[#0b1220] text-slate-300 sticky top-0 h-screen">
          <div className="px-5 py-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500 grid place-items-center font-bold text-white">ইব</div>
              <div><div className="text-white font-bold text-sm leading-tight">Indo Bangla</div><div className="text-[11px] text-slate-400">Superadmin</div></div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((it) => it.href ? (
              <Link key={it.id} href={it.href} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 text-slate-400">
                <it.icon className="w-[18px] h-[18px]" /><span className="flex-1 text-left">{it.label}</span>
                {it.badge ? <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{it.badge}</span> : null}
              </Link>
            ) : (
              <button key={it.id} onClick={() => setNav(it.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${nav === it.id ? "bg-teal-500/15 text-white" : "hover:bg-white/5 text-slate-400"}`}>
                <it.icon className="w-[18px] h-[18px]" /><span className="flex-1 text-left">{it.label}</span>
                {it.badge ? <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{it.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-600 grid place-items-center text-white text-xs font-bold">SA</div>
            <div className="text-xs"><div className="text-white font-medium">Sazzad</div><div className="text-slate-500">Owner</div></div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <div className="px-5 lg:px-8 py-3.5 flex items-center gap-4">
              <button className="lg:hidden"><Menu className="w-5 h-5" /></button>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">স্বাগতম, Sazzad 👋</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">আজ {criticalCount} টি জরুরি বিষয়ে আপনার নজর দরকার</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 w-56">
                  <Search className="w-4 h-4 text-slate-400" /><input placeholder="খুঁজুন…" className="bg-transparent text-sm outline-none flex-1 dark:text-white" />
                </div>
                <button onClick={() => setDark(!dark)} className="w-9 h-9 grid place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                  {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
                <button className="relative w-9 h-9 grid place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                  <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  {liveAlerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
                </button>
              </div>
            </div>
          </header>

          <main className="px-5 lg:px-8 py-6 space-y-8 max-w-[1400px]">

            {/* live/sample notice */}
            <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-500/5 px-4 py-3 text-xs text-teal-800 dark:text-teal-300">
              <Activity className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <b>লাইভ ডেটা:</b> আজকের অর্ডার/রেভিনিউ, নতুন অ্যাকাউন্ট, সেলস হিস্ট্রি, অর্ডার স্ট্যাটাস, ক্যাটাগরি, রিভিউ, টপ ভেন্ডর, alert, cancel/return/refund ও vendor activity — আসল ডেটাবেজ থেকে।{" "}
                <b>নমুনা (demo):</b> ভিজিটর/ট্রাফিক, মডারেটর পারফরম্যান্স, সাপোর্ট টিকেট, সিকিউরিটি ও ডিভাইস — এগুলোর জন্য আলাদা tracking লাগবে, বললে যোগ করে দেব।
              </span>
            </div>

            {/* ===== TODAY SNAPSHOT ===== */}
            <section>
              <SectionBanner icon={Calendar} color="text-teal-500" title="আজকের সারসংক্ষেপ" note="লাইভ" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={ShoppingCart} label="আজকের Order" value={tOrders ?? "—"} sub={tYdayOrders != null ? `গতকাল ${tYdayOrders}` : ""} trend={tOrders != null ? pct(tOrders, tYdayOrders) : undefined} accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
                <StatCard icon={CircleDollarSign} label="আজকের Revenue" value={tRevenue != null ? tk(tRevenue) : "—"} sub={tYdayRevenue != null ? `গতকাল ${tk(tYdayRevenue)}` : ""} trend={tRevenue != null ? pct(tRevenue, tYdayRevenue) : undefined} accent="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
                <StatCard icon={Eye} label="আজকের Visitor" value="4,210" sub="live এখন ৬৩ জন · নমুনা" trend={8.4} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
                <StatCard icon={UserPlus} label="নতুন Account" value={tNewAcc ?? "—"} sub="৭ দিনে" trend={tNewAcc != null ? pct(tNewAcc, summary?.newAccountsPrev) : undefined} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
              </div>
              <Card className="p-5 mt-4">
                <SectionTitle action={<span className="text-xs text-slate-400">ঘণ্টা অনুযায়ী</span>}>আজকের order flow</SectionTitle>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={todayHourly} margin={{ left: -20, right: 10, top: 5 }}>
                    <defs><linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.3} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                    <XAxis dataKey="h" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [v, "order"]} contentStyle={tipStyle} />
                    <Area type="monotone" dataKey="o" stroke="#0f766e" strokeWidth={2.5} fill="url(#gt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </section>

            {/* ===== ATTENTION ===== */}
            <section>
              <SectionBanner icon={AlertTriangle} color="text-amber-500" title="Attention Needed" note="সমস্যাগুলো আগে" />
              {liveAlerts.length === 0 ? (
                <Card className="p-8 text-center"><CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-2" /><p className="font-semibold text-slate-700 dark:text-slate-200">সব ঠিক আছে</p></Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {liveAlerts.map((a) => {
                    const s = alertStyle[a.type];
                    return (
                      <Card key={a.id} className="overflow-hidden flex">
                        <div className={`w-1.5 ${s.bar}`} />
                        <div className="p-4 flex-1"><div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${s.chip}`}><a.icon className="w-[18px] h-[18px]" /></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{a.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{a.detail}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <button className={`text-xs font-semibold text-white px-3 py-1.5 rounded-lg ${s.btn}`}>{a.action}</button>
                              <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${s.chip}`}>{a.tag}</span>
                              <button onClick={() => setDismissed([...dismissed, a.id])} className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Dismiss</button>
                            </div>
                          </div>
                        </div></div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ===== SALES + ORDER STATUS ===== */}
            <section className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 p-5">
                <SectionTitle action={<span className="text-xs text-slate-400">এ বছর vs গত বছর</span>}>Sales History</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={salesData} margin={{ left: -10, right: 10, top: 10 }}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.25} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v / 1000 + "k"} />
                    <Tooltip formatter={(v, n) => [tk(v), n === "sales" ? "এ বছর" : "গত বছর"]} contentStyle={tipStyle} />
                    <Area type="monotone" dataKey="last" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                    <Area type="monotone" dataKey="sales" stroke="#0f766e" strokeWidth={2.5} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionTitle>Order Status</SectionTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={orderStatus} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={2}>{orderStatus.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={tipStyle} /></PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {orderStatus.map((o) => (<div key={o.name} className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full" style={{ background: o.color }} /><span className="text-slate-600 dark:text-slate-400 flex-1">{o.name}</span><span className="font-semibold text-slate-900 dark:text-white">{o.value.toLocaleString()}</span></div>))}
                </div>
              </Card>
            </section>

            {/* ===== MODERATOR PERFORMANCE ===== */}
            <section>
              <SectionBanner icon={UserCog} color="text-violet-500" title="Moderator Performance" note="কে কতটা contribute করছে" />
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5"><span className="w-1 h-5 bg-teal-600 rounded-full" /><h3 className="font-bold text-slate-900 dark:text-white">Team overview</h3></div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
                    {["Daily", "Monthly", "Yearly", "Lifetime"].map((r) => (
                      <button key={r} onClick={() => setModRange(r)} className={`px-2.5 py-1.5 rounded-md transition ${modRange === r ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {moderators.map((m) => (
                    <div key={m.name} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 grid place-items-center text-white font-bold shrink-0">{m.name.split(" ").map((x) => x[0]).join("")}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white">{m.name}</span>
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{m.role}</span>
                            {m.score < 60 && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">⚠ performance কম</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {m.tasks.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">{t}</span>)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-2xl font-bold ${m.score >= 80 ? "text-teal-600 dark:text-teal-400" : m.score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{m.score}</div>
                          <div className="text-[11px] text-slate-400">score / 100</div>
                        </div>
                      </div>
                      {/* progress bar */}
                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${m.score >= 80 ? "bg-teal-500" : m.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${m.score}%` }} />
                        </div>
                      </div>
                      {/* metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-center">
                        <div><div className="text-sm font-bold text-slate-900 dark:text-white">{tk(m.sales)}</div><div className="text-[11px] text-slate-400">এ মাসে sale</div></div>
                        <div><div className="text-sm font-bold text-slate-900 dark:text-white">{m.hours} ঘণ্টা</div><div className="text-[11px] text-slate-400">সময় দিয়েছে</div></div>
                        <div><div className="text-sm font-bold text-slate-900 dark:text-white">{m.tickets}</div><div className="text-[11px] text-slate-400">ticket handled</div></div>
                        <div><div className="text-sm font-bold text-slate-900 dark:text-white">{m.approvals}</div><div className="text-[11px] text-slate-400">approval</div></div>
                        <div>
                          <div className={`text-sm font-bold flex items-center justify-center gap-0.5 ${m.trend >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>{m.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(m.trend)}%</div>
                          <div className="text-[11px] text-slate-400">trend</div>
                        </div>
                      </div>
                      {m.score < 60 && (
                        <div className="mt-3 flex items-center gap-2">
                          <button className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-1"><Bell className="w-3 h-3" /> Alert পাঠান</button>
                          <span className="text-xs text-slate-400">activity ও sale কমেছে — nudge দরকার</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* ===== SUPPORT / TICKETS ===== */}
            <section>
              <SectionBanner icon={LifeBuoy} color="text-rose-500" title="Support & Tickets" />
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <MiniStat icon={MessageSquare} label="খোলা ticket" value={ticketStats.open} tone="teal" />
                    <MiniStat icon={CornerUpLeft} label="Reply বাকি" value={ticketStats.waitingReply} tone="red" />
                    <MiniStat icon={CheckCircle2} label="আজ সমাধান" value={ticketStats.resolvedToday} tone="teal" />
                    <MiniStat icon={Timer} label="গড় reply" value={ticketStats.avgReply} tone="amber" />
                  </div>
                  <div className="text-xs font-medium text-slate-400 mb-2">ticket এর ধরন</div>
                  <div className="space-y-2">
                    {ticketBreakdown.map((t) => { const total = ticketBreakdown.reduce((a, b) => a + b.value, 0);
                      return (<div key={t.name}><div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-400">{t.name}</span><span className="font-semibold text-slate-900 dark:text-white">{t.value}</span></div><Bar2 pct={(t.value / total) * 100} color={t.color} /></div>);
                    })}
                  </div>
                </Card>
                <Card className="lg:col-span-2 p-5">
                  <SectionTitle action={<button className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-0.5">সব ticket <ChevronRight className="w-3 h-3" /></button>}>Reply দেওয়া বাকি</SectionTitle>
                  <div className="space-y-2">
                    {recentTickets.map((t) => (
                      <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl transition ${t.urgent ? "bg-red-500/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-400">{t.id}</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{t.type}</span>
                            {t.urgent && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">SLA breach</span>}
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">{t.subject}</div>
                          <div className="text-xs text-slate-400">{t.cust} · {t.age} আগে</div>
                        </div>
                        <button className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg shrink-0">Reply</button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            {/* ===== CANCEL/RETURN/REFUND ===== */}
            <section>
              <SectionBanner icon={RotateCcw} color="text-amber-500" title="Cancel · Return · Refund" />
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="p-5 grid grid-cols-2 gap-5 content-start">
                  {issueCards.map((c) => (
                    <div key={c.label}>
                      <div className={`w-9 h-9 rounded-lg grid place-items-center mb-2 ${toneMap[c.tone]}`}><c.icon className="w-[18px] h-[18px]" /></div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{c.value}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.label}</div>
                      <div className="flex items-center gap-1 mt-1 text-[11px]"><span className="text-slate-400">{c.rate}</span><span className={c.trend >= 0 ? "text-red-500" : "text-teal-500"}>{c.trend >= 0 ? "▲" : "▼"} {Math.abs(c.trend)}%</span></div>
                    </div>
                  ))}
                </Card>
                <Card className="lg:col-span-2 p-5">
                  <SectionTitle action={<span className="text-xs text-slate-400">গত ৫ মাস</span>}>Cancel/Return/Refund trend</SectionTitle>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={issueFlow} margin={{ left: -15, right: 10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: dark ? "#1e293b55" : "#f1f5f955" }} contentStyle={tipStyle} />
                      <Bar dataKey="cancel" name="Cancel" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={18} />
                      <Bar dataKey="return" name="Return" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={18} />
                      <Bar dataKey="refund" name="Refund" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center text-xs mt-1">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" /> Cancel</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" /> Return</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> Refund</span>
                  </div>
                </Card>
              </div>
            </section>

            {/* ===== DELIVERY + FEEDBACK ===== */}
            <section className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionTitle><span className="flex items-center gap-2"><Truck className="w-4 h-4 text-sky-500" /> Delivery Performance</span></SectionTitle>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><div className="text-xl font-bold text-slate-900 dark:text-white">{deliveryStats.avgDays}</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1">গড় সময়</div></div>
                  <div className="text-center p-3 rounded-xl bg-teal-500/5"><div className="text-xl font-bold text-teal-600 dark:text-teal-400">{deliveryStats.onTime}%</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1">সময়মতো</div></div>
                  <div className="text-center p-3 rounded-xl bg-red-500/5"><div className="text-xl font-bold text-red-600 dark:text-red-400">{deliveryStats.late}%</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1">দেরি</div></div>
                </div>
                <div className="text-xs font-medium text-slate-400 mb-2">সময়মতো delivery</div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex"><div className="h-full bg-teal-500" style={{ width: `${deliveryStats.onTime}%` }} /><div className="h-full bg-red-500" style={{ width: `${deliveryStats.late}%` }} /></div>
                <p className="text-xs text-slate-400 mt-3">সবচেয়ে দ্রুত: {deliveryStats.fastest} · দেরির কারণ courier pickup delay</p>
              </Card>
              <Card className="p-5">
                <SectionTitle action={<span className="text-xs text-slate-400">{feedback.totalReviews} review</span>}><span className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-teal-500" /> Customer Feedback</span></SectionTitle>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center"><div className="text-3xl font-bold text-slate-900 dark:text-white">{feedback.avgRating}</div><div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= Math.round(feedback.avgRating) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />)}</div></div>
                  <div className="flex-1 space-y-1.5">
                    {[{ l: "ইতিবাচক", v: feedback.positive, c: "#0f766e" }, { l: "মাঝামাঝি", v: feedback.neutral, c: "#d97706" }, { l: "নেতিবাচক", v: feedback.negative, c: "#dc2626" }].map((r) => (
                      <div key={r.l} className="flex items-center gap-2 text-xs"><span className="w-14 text-slate-500 dark:text-slate-400">{r.l}</span><div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.v}%`, background: r.c }} /></div><span className="w-8 text-right font-semibold text-slate-900 dark:text-white">{r.v}%</span></div>
                    ))}
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-400 mb-2">যা নিয়ে সবচেয়ে বেশি কথা</div>
                <div className="flex flex-wrap gap-2">{feedbackThemes.map((t) => (<span key={t.theme} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${t.tone === "pos" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>{t.theme} · {t.count}</span>))}</div>
              </Card>
            </section>

            {/* ===== CUSTOMER BEHAVIOUR ===== */}
            <section>
              <SectionBanner icon={Users} color="text-teal-500" title="Customer Behaviour" note="কে, কোথা থেকে, কী কিনছে" />
              {/* behaviour KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard icon={Receipt} label="গড় order value" value={tk(behaviourStats.avgOrderValue)} accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
                <StatCard icon={UserPlus} label="নতুন account" value={behaviourStats.newAccounts} sub="এ সপ্তাহে" trend={behaviourStats.newAccountTrend} accent="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
                <StatCard icon={Clock} label="গড় session" value={behaviourStats.avgSessionTime} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
                <StatCard icon={TU} label="Purchase ratio" value={behaviourStats.purchaseRatio + "%"} sub={`repeat buyer ${behaviourStats.repeatBuyers}%`} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                {/* category */}
                <Card className="p-5">
                  <SectionTitle><span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-teal-500" /> Category বিক্রি</span></SectionTitle>
                  <div className="space-y-3">
                    {categorySales.map((c) => { const total = categorySales.reduce((a, b) => a + b.value, 0);
                      return (<div key={c.name}><div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-400">{c.name}</span><span className="font-semibold text-slate-900 dark:text-white">{c.value.toLocaleString()}</span></div><Bar2 pct={(c.value / total) * 100} color={c.color} /></div>);
                    })}
                  </div>
                </Card>
                {/* area */}
                <Card className="p-5">
                  <SectionTitle><span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-sky-500" /> এলাকা অনুযায়ী order</span></SectionTitle>
                  <div className="space-y-2.5">
                    {areaOrders.map((a) => (
                      <div key={a.area} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400 w-20 shrink-0">{a.area}</span>
                        <div className="flex-1"><Bar2 pct={a.pct * 2} color="#0284c7" /></div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white w-16 text-right">{a.orders.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                {/* device + source */}
                <Card className="p-5">
                  <SectionTitle><span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-violet-500" /> Device</span></SectionTitle>
                  <div className="space-y-2.5 mb-5">
                    {deviceRatio.map((d) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <d.icon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 w-16 shrink-0">{d.name}</span>
                        <div className="flex-1"><Bar2 pct={d.value} color={d.color} /></div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white w-8 text-right">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-medium text-slate-400 mb-2">Traffic কোথা থেকে</div>
                  <div className="space-y-2">
                    {trafficSource.map((s) => (
                      <div key={s.src} className="flex items-center gap-2 text-xs"><span className="w-16 text-slate-600 dark:text-slate-400">{s.src}</span><div className="flex-1"><Bar2 pct={s.pct * 2} color={s.color} /></div><span className="w-8 text-right font-semibold text-slate-900 dark:text-white">{s.pct}%</span></div>
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            {/* ===== WEBSITE PERFORMANCE ===== */}
            <section>
              <SectionBanner icon={Gauge} color="text-sky-500" title="Website Performance" note="load, traffic, page health" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard icon={Zap} label="গড় load time" value={perfStats.loadTime} sub="ভালো (< ২.৫ সে)" accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
                <StatCard icon={Eye} label="আজকের traffic" value={perfStats.todayVisitors.toLocaleString()} trend={perfStats.todayTrend} accent="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
                <StatCard icon={Activity} label="এখন live" value={perfStats.liveNow} sub="জন browsing করছে" accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
                <StatCard icon={ArrowDownRight} label="Bounce rate" value={perfStats.bounce + "%"} sub="মাঝারি" accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 p-5">
                  <SectionTitle action={<span className="text-xs text-slate-400">এ সপ্তাহ</span>}>Visitor traffic</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trafficWeek} margin={{ left: -15, right: 10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis dataKey="d" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => [v.toLocaleString(), "visitor"]} contentStyle={tipStyle} />
                      <Line type="monotone" dataKey="v" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: "#0284c7" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                  <SectionTitle>Page health</SectionTitle>
                  <div className="space-y-2.5">
                    {topPages.map((p) => (
                      <div key={p.page} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${pageHealth[p.health]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.page}</div>
                          {p.note && <div className="text-[11px] text-amber-600 dark:text-amber-400">{p.note}</div>}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{(p.views / 1000).toFixed(1)}k</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3">🔴 /cart এ error report এসেছে — check করুন</p>
                </Card>
              </div>
            </section>

            {/* ===== SECURITY ===== */}
            <section>
              <SectionBanner icon={Shield} color="text-red-500" title="Security & Health" note="আক্রমণ, risk, health check" />
              <div className="grid lg:grid-cols-3 gap-4">
                {/* score */}
                <Card className="p-5 flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: securityScore, fill: securityScore >= 80 ? "#0f766e" : securityScore >= 60 ? "#d97706" : "#dc2626" }]} startAngle={90} endAngle={-270}>
                        <RadialBar background dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 grid place-items-center"><div><div className="text-3xl font-bold text-slate-900 dark:text-white">{securityScore}</div><div className="text-[11px] text-slate-400">/ 100</div></div></div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-500" /><span className="font-semibold text-slate-900 dark:text-white">মোটামুটি নিরাপদ</span></div>
                  <p className="text-xs text-slate-400 mt-1">২টি বিষয়ে নজর দিলে score বাড়বে</p>
                </Card>
                {/* checks */}
                <Card className="p-5">
                  <SectionTitle>Health checklist</SectionTitle>
                  <div className="space-y-2.5">
                    {securityChecks.map((c) => { const s = secStatus[c.status];
                      return (<div key={c.label} className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} /><div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-900 dark:text-white">{c.label}</div><div className="text-[11px] text-slate-400">{c.note}</div></div><s.icon className={`w-4 h-4 shrink-0 ${s.cls}`} /></div>);
                    })}
                  </div>
                </Card>
                {/* events */}
                <Card className="p-5">
                  <SectionTitle action={<span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">১ high</span>}>সাম্প্রতিক ঘটনা</SectionTitle>
                  <div className="space-y-3">
                    {securityEvents.map((e, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${e.level === "high" ? "bg-red-500/10 text-red-600 dark:text-red-400" : e.level === "medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}><e.icon className="w-[18px] h-[18px]" /></div>
                        <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-900 dark:text-white">{e.text}</div><div className="text-[11px] text-slate-400">{e.ip} · {e.when}</div></div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 py-2 rounded-lg">Security log দেখুন</button>
                </Card>
              </div>
            </section>

            {/* ===== VENDOR ACTIVITY + FLAGGED ===== */}
            <section>
              <SectionBanner icon={Activity} color="text-violet-500" title="Vendor Activity" note="কে upload কমিয়েছে" />
              <Card className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2 font-medium">Vendor</th><th className="pb-2 font-medium text-center">এ মাসে</th><th className="pb-2 font-medium text-center hidden sm:table-cell">গত মাসে</th><th className="pb-2 font-medium text-center">পরিবর্তন</th><th className="pb-2 font-medium hidden sm:table-cell">শেষ সক্রিয়</th><th className="pb-2 font-medium text-right">অবস্থা</th>
                    </tr></thead>
                    <tbody>
                      {vendorActivity.map((v) => { const change = v.prev === 0 ? 0 : Math.round(((v.now - v.prev) / v.prev) * 100); const st = vendorActStyle[v.status]; const bad = v.status === "declining" || v.status === "dormant";
                        return (<tr key={v.name} className={`border-b border-slate-50 dark:border-slate-800/50 ${bad ? "bg-amber-500/5" : ""}`}>
                          <td className="py-3 font-medium text-slate-900 dark:text-white">{v.name}</td>
                          <td className="py-3 text-center font-semibold text-slate-900 dark:text-white">{v.now}</td>
                          <td className="py-3 text-center text-slate-400 hidden sm:table-cell">{v.prev}</td>
                          <td className="py-3 text-center"><span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>{change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(change)}%</span></td>
                          <td className="py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{v.lastSeen}</td>
                          <td className="py-3 text-right"><span className={`text-xs font-semibold ${st.cls}`}>{st.label}</span>{bad && <button className="ml-2 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline">Nudge</button>}</td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="grid lg:grid-cols-2 gap-4 mt-4">
                <Card className="p-5">
                  <SectionTitle action={<span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">{flaggedVendors.length} flagged</span>}><span className="flex items-center gap-2"><Flag className="w-4 h-4 text-red-500" /> Flagged Vendors</span></SectionTitle>
                  <div className="space-y-2">
                    {flaggedVendors.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-700 text-white grid place-items-center text-xs font-bold shrink-0">{v.name.slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{v.name}</div><div className="text-xs text-slate-400 truncate">{v.reason}</div></div>
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${riskStyle[v.risk]}`}>{v.risk}</span>
                        <button className="w-8 h-8 grid place-items-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" title="Ban"><Ban className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <SectionTitle action={<button className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-0.5">সব <ChevronRight className="w-3 h-3" /></button>}>Top Vendors</SectionTitle>
                  <div className="space-y-1">
                    {topVendors.map((v, i) => (
                      <div key={v.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className="w-6 text-center text-sm font-bold text-slate-300 dark:text-slate-600">{i + 1}</span>
                        <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{v.name}</div><div className="text-xs text-slate-400">{v.products != null ? `${v.products} বই` : `${v.orders} orders`}</div></div>
                        <div className="text-right">{v._real ? (<div className="text-sm font-bold text-slate-900 dark:text-white">{v.orders} <span className="text-xs font-normal text-slate-400">order</span></div>) : (<><div className="text-sm font-bold text-slate-900 dark:text-white">{tk(v.sales)}</div><div className={`text-xs font-medium flex items-center justify-end gap-0.5 ${v.trend >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>{v.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(v.trend)}%</div></>)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            {/* ===== NEXT STEPS ===== */}
            <section>
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-white/60 rounded-full" /><h3 className="font-bold">পরবর্তী পদক্ষেপ</h3><span className="text-xs text-teal-50/70">— data থেকে suggest করা priority</span></div>
                <div className="grid md:grid-cols-2 gap-2.5">
                  {[
                    { t: "Brute-force IP স্থায়ীভাবে block করুন", d: "৩৪০ failed login — security risk", n: "1" },
                    { t: "৮টি SLA-breach ticket reply দিন", d: "২৪ ঘণ্টার বেশি pending", n: "2" },
                    { t: "Tanvir কে alert করুন", d: "performance ৫৪, sale -৮.৩%", n: "3" },
                    { t: "Habib Store কে nudge করুন", d: "upload ৩৪ → ২, churn risk", n: "4" },
                    { t: "baba01hacker vendor ban করুন", d: "নীতিমালা লঙ্ঘন", n: "5" },
                    { t: "/cart page error ঠিক করুন", d: "user report + checkout drop-off", n: "6" },
                  ].map((s) => (
                    <div key={s.n} className="flex items-start gap-3 bg-white/10 rounded-xl p-3 hover:bg-white/15 transition cursor-pointer">
                      <span className="w-6 h-6 rounded-lg bg-white/20 grid place-items-center text-xs font-bold shrink-0">{s.n}</span>
                      <div className="flex-1"><div className="text-sm font-semibold">{s.t}</div><div className="text-xs text-teal-50/70">{s.d}</div></div>
                      <ChevronRight className="w-4 h-4 text-white/60 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <footer className="text-center text-xs text-slate-400 dark:text-slate-600 py-4">Indo Bangla Superadmin · sample data · Laravel API connect করলে live হবে</footer>
          </main>
        </div>
      </div>
    </div>
  );
}

// Superadmin-only. No `.Layout` so the dashboard renders standalone with its own
// sidebar/header chrome (Layout falls back to Noop in _app).
IndoBanglaDashboard.authenticate = {
  permissions: adminOnly,
};
