import { useAtom } from 'jotai';
import {
  manualDiscountAtom,
  adjustmentAtom,
  advancePaidAtom,
  orderNoteAtom,
} from '@/contexts/checkout';
import Input from '@/components/ui/input';
import TextArea from '@/components/ui/text-area';

interface Props {
  className?: string;
  label?: string;
  count?: number;
}

const num = (v: string) => (v === '' ? 0 : Number(v) || 0);

const ManualAdjustments: React.FC<Props> = ({ className, label, count }) => {
  const [discount, setDiscount] = useAtom(manualDiscountAtom);
  const [adjustment, setAdjustment] = useAtom(adjustmentAtom);
  const [advance, setAdvance] = useAtom(advancePaidAtom);
  const [note, setNote] = useAtom(orderNoteAtom);

  return (
    <div className={className}>
      <div className="mb-5 flex items-center gap-4">
        {count ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-base text-light lg:text-xl">
            {count}
          </span>
        ) : null}
        <p className="text-lg font-semibold capitalize text-heading">
          {label || 'Manual adjustments & note'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Discount (৳)"
          type="number"
          min={0}
          value={discount ? String(discount) : ''}
          onChange={(e) => setDiscount(num(e.target.value))}
          placeholder="0"
        />
        <Input
          label="Extra charge / adjustment (৳)"
          type="number"
          value={adjustment ? String(adjustment) : ''}
          onChange={(e) => setAdjustment(num(e.target.value))}
          placeholder="0"
          note="Use a negative value to subtract."
        />
        <Input
          label="Advance paid (৳)"
          type="number"
          min={0}
          value={advance ? String(advance) : ''}
          onChange={(e) => setAdvance(num(e.target.value))}
          placeholder="0"
          note="Rest becomes COD/payable."
        />
      </div>

      <TextArea
        label="Order note"
        className="mt-4"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Any note for this order (visible on the order page)…"
      />
    </div>
  );
};

export default ManualAdjustments;
