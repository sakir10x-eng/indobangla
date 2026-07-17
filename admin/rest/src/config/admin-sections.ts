/**
 * Custom sub-admin roles — client side.
 *
 * A "role" grants a set of admin-panel SECTIONS. The catalogue below MUST mirror
 * `AdminRolesTrait::adminSectionsCatalog()` on the backend. Each section maps to
 * the route prefixes it owns; both the sidebar filter and the route guard use
 * `isPathAllowed()` to decide what a restricted sub-admin may see.
 *
 * A user's `managed_sections` is:
 *   - null / undefined  => full super-admin, everything allowed (no restriction).
 *   - string[]          => exactly these section keys are allowed.
 */

export type AdminSection = { key: string; label: string };

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'orders', label: 'Orders & fulfilment' },
  { key: 'products', label: 'Products & catalog' },
  { key: 'coupons', label: 'Coupons & promotions' },
  { key: 'customers', label: 'Customers' },
  { key: 'reviews', label: 'Reviews & questions' },
  { key: 'shops', label: 'Shops & vendors' },
  { key: 'finance', label: 'Withdraws, tax & refunds' },
  { key: 'pages', label: 'Pages (FAQ, terms)' },
  { key: 'messages', label: 'Messages & notices' },
  { key: 'reports', label: 'Reports & tools' },
  { key: 'admins', label: 'User & admin management' },
  { key: 'settings', label: 'Site settings' },
];

/**
 * Paths every logged-in admin can always reach (profile, auth plumbing, dashboard).
 * Matched by exact path or `${path}` prefix.
 */
export const ALWAYS_ALLOWED_PATHS = [
  '/',
  '/profile',
  '/logout',
  '/verify-license',
  '/verify-email',
  '/access-denied',
  '/500',
  '/404',
];

/**
 * Route-prefix -> section rules. First matching prefix wins, so put the more
 * specific groups (settings, users) before broad ones.
 */
const SECTION_ROUTE_RULES: { section: string; prefixes: string[] }[] = [
  { section: 'settings', prefixes: ['/settings'] },
  { section: 'admins', prefixes: ['/users'] },
  {
    section: 'orders',
    prefixes: [
      '/orders',
      '/transactions',
      '/preorder',
      '/abandoned',
      '/exchanges',
      '/tickets',
      '/restock',
    ],
  },
  {
    section: 'products',
    prefixes: [
      '/products',
      '/inventory',
      '/categories',
      '/tags',
      '/attributes',
      '/manufacturers',
      '/authors',
      '/groups',
      '/indo-bangla',
    ],
  },
  { section: 'coupons', prefixes: ['/coupons', '/flash-sale', '/vendor-request-for-flash-sale'] },
  { section: 'customers', prefixes: ['/customers'] },
  { section: 'reviews', prefixes: ['/reviews', '/questions'] },
  {
    section: 'shops',
    prefixes: ['/shops', '/my-shops', '/vendors', '/pending-vendors', '/staffs', '/ownership-transfer-request'],
  },
  {
    section: 'finance',
    prefixes: ['/taxes', '/shippings', '/withdraws', '/refunds', '/refund-policies', '/refund-reasons'],
  },
  { section: 'pages', prefixes: ['/faqs', '/terms-and-conditions', '/become-seller'] },
  { section: 'messages', prefixes: ['/messages', '/store-notices'] },
  {
    section: 'reports',
    prefixes: ['/vendors-report', '/resell', '/reseller', '/saved-books', '/features', '/command-center'],
  },
];

function normalize(path: string): string {
  if (!path) return '';
  // strip locale prefix & query, keep the pathname
  const clean = path.split('?')[0].split('#')[0];
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix);
}

/** Which section a path belongs to (null = unmapped -> treated as allowed). */
export function sectionForPath(path: string): string | null {
  const p = normalize(path);
  for (const rule of SECTION_ROUTE_RULES) {
    if (rule.prefixes.some((pre) => matchesPrefix(p, pre))) {
      return rule.section;
    }
  }
  return null;
}

/**
 * Can a user with the given `sections` reach `path`?
 * `sections == null` means full super-admin => always true.
 */
export function isPathAllowed(path: string, sections: string[] | null | undefined): boolean {
  if (sections == null) return true; // full admin
  const p = normalize(path);
  if (ALWAYS_ALLOWED_PATHS.some((a) => (a === '/' ? p === '/' : matchesPrefix(p, a)))) {
    return true;
  }
  const section = sectionForPath(p);
  if (!section) return true; // unmapped page -> don't accidentally lock out
  return sections.includes(section);
}
