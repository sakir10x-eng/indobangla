import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useOrderAdjustMutation } from '@/data/order-adjust';

type Props = { order: any };

/**
 * IndoBangla manual order adjustment: discount, delivery charge, an arbitrary
 * +/- adjustment amount and an order note. Recomputes the order total server-side.
 */
export default function OrderAdjust({ order }: Props) {
  const { mutate, isLoading } = useOrderAdjustMutation();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      discount: order?.discount ?? 0,
      delivery_fee: order?.delivery_fee ?? 0,
      adjustment: 0,
      note: order?.note ?? '',
      mark_paid: false,
    },
  });

  function onSubmit(v: any) {
    mutate({
      order_id: order?.id,
      discount: Number(v.discount) || 0,
      delivery_fee: Number(v.delivery_fee) || 0,
      adjustment: Number(v.adjustment) || 0,
      note: v.note,
      mark_paid: !!v.mark_paid,
    });
  }

  return (
    <Card className="mb-8">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-heading">Adjust order</h3>
        <p className="mt-1 text-sm text-body">
          Manually set discount, delivery charge or an extra +/- adjustment, and
          add a note. The total is recalculated automatically.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Discount amount" type="number" step="any" {...register('discount')} />
          <Input label="Delivery charge" type="number" step="any" {...register('delivery_fee')} />
          <Input
            label="Advanced / Adjustment (+/-)"
            type="number"
            step="any"
            {...register('adjustment')}
            placeholder="e.g. -50 or 100"
          />
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-body-dark">Order note</label>
          <textarea
            {...register('note')}
            rows={2}
            className="w-full rounded border border-border-base bg-white px-4 py-2 text-sm text-heading focus:border-accent focus:outline-none"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-body-dark">
          <input type="checkbox" {...register('mark_paid')} className="h-4 w-4" />
          Mark paid total = new total
        </label>
        <div className="mt-4 text-end">
          <Button loading={isLoading} disabled={isLoading}>
            Save adjustment
          </Button>
        </div>
      </form>
    </Card>
  );
}
