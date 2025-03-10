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
          path: 'account-settings',
          name: 'account-settings',
          component: () => import('@/pages/account-settings.vue'),
        },

      ],
    },
    {
      path: '/',
      component: () => import('@/layouts/blank.vue'),
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/login.vue'),
          meta: {
            pageTitle: "Login"
          },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/pages/register.vue'),
        },
        {
          path: '/:pathMatch(.*)*',
          name: 'error',
          component: () => import('@/pages/[...error].vue'),
        },
      ],
    },
  ];
  