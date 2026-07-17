import Link from 'next/link';

/**
 * Small "+ Add" link shown beside a Group & Categories dropdown so the admin can
 * create a missing option. Navigates to the entity's create page in the same tab.
 */
const AddOptionLink = ({
  href,
  label = 'যোগ করুন',
}: {
  href: string;
  label?: string;
}) => (
  <Link href={href} passHref>
    <a
      title="নতুন যোগ করুন"
      className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover focus:outline-none"
    >
      <span className="text-sm leading-none">＋</span>
      {label}
    </a>
  </Link>
);

export default AddOptionLink;
