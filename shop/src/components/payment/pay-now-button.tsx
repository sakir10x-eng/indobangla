import Button from "@/components/ui/button";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { Order } from "@/types";

interface Props {
  trackingNumber?: string;
  order: Order;
  buttonSize?: "big" | "medium" | "small";
  isFetching?: boolean;
}

// Send the customer to the SAME hosted pay page the admin payment link uses (/pay/{token} ->
// pay-info + pay-confirm -> bkashCreate). The old useGetPaymentIntent flow hit Marvel's
// payment_intents table, which does not exist on this install, so customer "Pay now" always
// failed while the admin link (custom flow) worked.
const PayNowButton: React.FC<Props> = ({
  order,
  buttonSize = "small",
  isFetching,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const payToken = (order as any)?.ops_meta?.pay_token as string | undefined;

  function handlePayNow() {
    if (payToken) {
      router.push(`/pay/${payToken}`);
    }
  }

  return (
    <Button
      className="w-full"
      onClick={handlePayNow}
      size={buttonSize}
      disabled={!payToken || isFetching}
      loading={isFetching}
    >
      {t("text-pay-now")}
    </Button>
  );
};

export default PayNowButton;
