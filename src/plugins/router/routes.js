export const routes = [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/',
      component: () => import('@/layouts/default.vue'),
      meta: {
        middleware: "auth",
      },
      children: [
        {
            path: 'dashboard',
            name: 'dashboard',
            component: () => import('@/pages/dashboard.vue'),
            meta: {
                pageTitle: "Dashboard",
                breadcrumbs: [
                    { label: "Dashboard", link: "/dashboard" },
                ],
            },
        },
        {
            path: 'readers',
            name: 'readers',
            component: () => import('@/pages/readers/index.vue'),
            meta: {
              pageTitle: "Readers",
              breadcrumbs: [
                  { label: "Readers", link: "/readers" },
              ],
            },
        },
        {
            path: 'users',
            name: 'users',
            component: () => import('@/pages/users/index.vue'),
            meta: {
              pageTitle: "Users",
              breadcrumbs: [
                  { label: "Users", link: "/users" },
              ],
            },
        },
        {
            path: 'roles',
            name: 'roles',
            component: () => import('@/pages/roles/index.vue'),
            meta: {
              pageTitle: "Roles",
              breadcrumbs: [
                  { label: "Roles", link: "/roles" },
              ],
            },
        },
        {
            path: 'permissions',
            name: 'permissions',
            component: () => import('@/pages/permissions/index.vue'),
            meta: {
              pageTitle: "Permissions",
              breadcrumbs: [
                  { label: "Permissions", link: "/permissions" },
              ],
            },
        },
        {
            path: 'materials',
            name: 'materials',
            component: () => import('@/pages/materials/index.vue'),
            meta: {
              pageTitle: "Materials",
              breadcrumbs: [
                  { label: "Materials", link: "/materials" },
              ],
            },
        },
        {
            path: 'production-lines',
            name: 'production-lines',
            component: () => import('@/pages/productionLines/index.vue'),
            meta: {
              pageTitle: "Production Lines",
              breadcrumbs: [
                  { label: "Production Lines", link: "/production-lines" },
              ],
            },
        },
        {
            path: 'production-runs',
            name: 'production-runs',
            component: () => import('@/pages/productionRuns/index.vue'),
            meta: {
              pageTitle: "Production Runs",
              breadcrumbs: [
                  { label: "Production Runs", link: "/production-runs" },
              ],
            },
        },
        {
            path: 'inventories',
            name: 'inventories',
            component: () => import('@/pages/inventories/index.vue'),
            meta: {
              pageTitle: "Inventories",
              breadcrumbs: [
                  { label: "Inventories", link: "/inventories" },
              ],
            },
        },
        {
          path: 'account-settings',
          name: 'account-settings',
          component: () => import('@/pages/account-settings.vue'),
        },

      ],
    },
    {
        path: '/picklist',
        component: () => import('@/pages/picklist.vue'), // Temporarily use the page directly
        meta: {
            middleware: "auth",
            pageTitle: "Picklist"
        },
    },
    {
      path: '/',
      component: () => import('@/layouts/blank.vue'),
      children: [
        {
            path: 'register',
            name: 'register',
            component: () => import('@/pages/register.vue'),
        },
        {
            path: 'login',
            name: 'login',
            component: () => import('@/pages/login.vue'),
            meta: {
                pageTitle: "Login"
            },
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'error',
            component: () => import('@/pages/[...error].vue'),
        },
       

      ],
    },
  ];
  