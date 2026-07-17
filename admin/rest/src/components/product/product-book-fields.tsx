import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { useFormContext } from 'react-hook-form';

/**
 * IndoBangla book specification fields. Stored as a single "book_meta"
 * product meta entry (see form-utils getProductInputValues / Product model).
 */
export default function ProductBookFields() {
  const { register } = useFormContext();

  return (
    <div className="flex flex-wrap pb-8 border-b border-dashed border-border-base my-5 sm:my-8">
      <Description
        title="Book specification"
        details="ISBN, language, print type and other book details. These show on the product page and can be auto-filled by AI above."
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />

      <Card className="w-full sm:w-8/12 md:w-2/3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <Label>Printed Country</Label>
            <select
              {...register('book.printed_country')}
              className="mt-1 h-12 w-full rounded border border-border-base px-4 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">— select —</option>
              <option value="Bangladesh">Bangladesh</option>
              <option value="India">India</option>
              <option value="China">China</option>
              <option value="UK">UK</option>
              <option value="USA">USA</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <Input label="Language" {...register('book.language')} />
          <Input label="Print Type" {...register('book.print_type')} placeholder="hardcover / paperback" />

          <Input label="Condition" {...register('book.condition')} placeholder="New / Used" />
          <Input label="Reading level" {...register('book.reading_level')} />
          <Input label="Edition" {...register('book.edition')} />

          <Input label="ISBN-10" {...register('book.isbn10')} />
          <Input label="ISBN-13" {...register('book.isbn13')} />
          <Input label="Item Weight" {...register('book.item_weight')} />
        </div>

        <div className="mt-5">
          <Label>Dimensions</Label>
          <div className="grid grid-cols-3 gap-4">
            <Input placeholder="Height" {...register('book.height')} />
            <Input placeholder="Width" {...register('book.width')} />
            <Input placeholder="Length" {...register('book.length')} />
          </div>
        </div>

        <div className="mt-5">
          <Input label="Page Number" type="number" {...register('book.page_number')} />
        </div>
      </Card>
    </div>
  );
}
