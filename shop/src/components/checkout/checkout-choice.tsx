import { useModalAction } from "@/components/ui/modal/modal.context";
import { useRouter } from "next/router";
import { useCart } from "@/store/quick-cart/cart.context";
import { Routes } from "@/config/routes";

// Shown when a NOT-logged-in shopper clicks "checkout" from the cart. Lets them pick how they
// want to order instead of silently forcing either login or guest. Regular customers go to the
// login panel (saved addresses, wallet, coupons); everyone else continues as a guest.
const CheckoutChoice: React.FC = () => {
  const { closeModal, openModal } = useModalAction();
  const router = useRouter();
  const { language } = useCart();

  const goGuest = () => {
    closeModal();
    router.push(Routes.checkoutGuest, undefined, { locale: language });
  };
  const goLogin = () => openModal("LOGIN_VIEW");

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 sm:p-7 text-center">
      <h2 className="text-lg font-bold text-[#333132]">কীভাবে চেকআউট করবেন?</h2>
      <p className="mt-1 text-sm text-gray-500">আপনার অর্ডারটি সম্পূর্ণ করার একটি উপায় বেছে নিন</p>

      <button
        onClick={goLogin}
        className="mt-5 flex w-full flex-col items-start rounded-xl bg-[#e63946] px-4 py-3 text-left text-white transition hover:opacity-90"
      >
        <span className="font-semibold">লগইন করে চেকআউট করুন</span>
        <span className="text-xs opacity-90">সেভ করা ঠিকানা, ওয়ালেট ও কুপন ব্যবহার করুন</span>
      </button>

      <button
        onClick={goGuest}
        className="mt-3 flex w-full flex-col items-start rounded-xl border border-[#e4e1dc] px-4 py-3 text-left text-[#333132] transition hover:bg-gray-50"
      >
        <span className="font-semibold">গেস্ট হিসেবে চেকআউট করুন</span>
        <span className="text-xs text-gray-500">লগইন ছাড়াই দ্রুত অর্ডার করুন</span>
      </button>

      <button onClick={closeModal} className="mt-4 text-sm text-gray-400 hover:text-gray-600">
        বাতিল করুন
      </button>
    </div>
  );
};

export default CheckoutChoice;
