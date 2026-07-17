<?php

namespace Marvel\Traits;

use Marvel\Database\Models\Settings;
use Marvel\Enums\Permission;

/**
 * Custom sub-admin roles.
 *
 * A "role" is a named set of admin-panel *sections* the sub-admin may see and
 * use. Roles are stored in settings.options.admin_roles as:
 *     [ { "id": "...", "name": "Order desk", "sections": ["orders","customers"] }, ... ]
 *
 * A user carries `admin_role_id`:
 *   - empty  => a FULL super-admin: managed_sections = null (everything).
 *   - set    => restricted to that role's sections (unknown role => [] = nothing).
 *
 * Sub-admins still hold the Spatie `super_admin` permission so every existing
 * backend route keeps working; the section list is what the admin UI enforces.
 * The escalation-sensitive endpoints (create-admin, edit-roles, assign-role,
 * make-admin) additionally require a *full* super-admin — a restricted
 * sub-admin can never mint or promote another admin.
 */
trait AdminRolesTrait
{
    /** Canonical catalogue of admin-panel sections a role can grant. */
    public function adminSectionsCatalog(): array
    {
        return [
            ['key' => 'dashboard', 'label' => 'Dashboard'],
            ['key' => 'orders',    'label' => 'Orders & fulfilment'],
            ['key' => 'products',  'label' => 'Products & catalog'],
            ['key' => 'coupons',   'label' => 'Coupons & promotions'],
            ['key' => 'customers', 'label' => 'Customers'],
            ['key' => 'reviews',   'label' => 'Reviews & questions'],
            ['key' => 'shops',     'label' => 'Shops & vendors'],
            ['key' => 'finance',   'label' => 'Withdraws, tax & refunds'],
            ['key' => 'pages',     'label' => 'Pages (FAQ, terms)'],
            ['key' => 'messages',  'label' => 'Messages & notices'],
            ['key' => 'reports',   'label' => 'Reports & tools'],
            ['key' => 'admins',    'label' => 'User & admin management'],
            ['key' => 'settings',  'label' => 'Site settings'],
        ];
    }

    protected function adminSectionKeys(): array
    {
        return array_column($this->adminSectionsCatalog(), 'key');
    }

    /** All roles defined by the super-admin (from settings.options). */
    public function adminRolesList(): array
    {
        $settings = Settings::first();
        $options  = $settings ? ($settings->options ?? []) : [];
        $roles    = $options['admin_roles'] ?? [];
        return is_array($roles) ? array_values($roles) : [];
    }

    /**
     * Sections a user may access.
     *   null  => full super-admin (no restriction).
     *   array => exactly these section keys.
     */
    public function resolveManagedSections($user): ?array
    {
        if (!$user || empty($user->admin_role_id)) {
            return null; // full super-admin
        }
        $role = collect($this->adminRolesList())->firstWhere('id', $user->admin_role_id);
        if (!$role) {
            return []; // role was deleted -> no access until reassigned
        }
        $sections = (array) ($role['sections'] ?? []);
        // keep only known keys
        return array_values(array_intersect($sections, $this->adminSectionKeys()));
    }

    /** True only for an unrestricted super-admin. */
    public function isFullSuperAdmin($user): bool
    {
        if (!$user || !empty($user->admin_role_id)) {
            return false;
        }
        try {
            return (bool) $user->hasPermissionTo(Permission::SUPER_ADMIN);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** Sanitise a role payload coming from the admin UI. */
    protected function sanitizeAdminRole($role): ?array
    {
        if (!is_array($role)) {
            return null;
        }
        $name = trim((string) ($role['name'] ?? ''));
        if ($name === '') {
            return null;
        }
        $id = (string) ($role['id'] ?? '');
        if ($id === '') {
            $id = 'role_' . bin2hex(random_bytes(6));
        }
        $sections = array_values(array_intersect(
            array_map('strval', (array) ($role['sections'] ?? [])),
            $this->adminSectionKeys()
        ));
        return ['id' => $id, 'name' => $name, 'sections' => $sections];
    }
}
