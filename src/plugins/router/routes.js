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
            path: 'repacking',
            name: 'repacking',
            component: () => import('@/pages/manualRepacking/index.vue'),
            meta: {
              pageTitle: "Repacking",
              breadcrumbs: [
                  { label: "Repacking", link: "/repacking" },
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
            path: 'shipments',
            name: 'shipments',
            component: () => import('@/pages/shipments/index.vue'),
            meta: {
              pageTitle: "Shipments",
              breadcrumbs: [
                  { label: "Shipments", link: "/shipments" },
              ],
            },
        },
        {
            path: 'shipments/:shipmentNumber',
            name: 'shipments.show',
            component: () => import('@/pages/shipments/show.vue'),
            meta: {
                pageTitle: "Shipment Details",
                breadcrumbs: (route) => [
                    { label: "Shipments", link: "/shipments" },
                    { label: `${route.params.shipmentNumber}`, link: `/shipments/${route.params.shipmentNumber}` }
                ],
            },
        },
        {
            path: 'deliveries',
            name: 'deliveries',
            component: () => import('@/pages/deliveries/index.vue'),
            meta: {
              pageTitle: "Deliveries",
              breadcrumbs: [
                  { label: "Deliveries", link: "/deliveries" },
              ],
            },
        },
        {
            path: 'transfer-orders',
            name: 'transfer-orders',
            component: () => import('@/pages/transfers/index.vue'),
            meta: {
              pageTitle: "Transfer Orders",
              breadcrumbs: [
                  { label: "Transfer Orders", link: "/transfer-orders" },
              ],
            },
        },
        {
            path: 'sto-outbound',
            name: 'sto-outbound',
            component: () => import('@/pages/transfersOutbound/index.vue'),
            meta: {
              pageTitle: "Transfer Orders Outbound",
              breadcrumbs: [
                  { label: "Transfer Orders Outbound", link: "/sto-outbound" },
              ],
            },
        },
        {
            path: 'sto-inbound',
            name: 'sto-inbound',
            component: () => import('@/pages/transfersInbound/index.vue'),
            meta: {
              pageTitle: "Transfer Orders Inbound",
              breadcrumbs: [
                  { label: "Transfer Orders Inbound", link: "/sto-inbound" },
              ],
            },
        },
        {
            path: 'warehouse',
            name: 'warehouse',
            component: () => import('@/pages/warehouse/index.vue'),
            meta: {
              pageTitle: "Storage Location",
              breadcrumbs: [
                  { label: "Storage Location", link: "/warehouse" },
              ],
            },
        },
        {
            path: 'rfid/pallets',
            name: 'rfid-pallets',
            component: () => import('@/pages/rfid-pallets/index.vue'),
            meta: {
                pageTitle: "Pallets - RFID Master",
                breadcrumbs: [
                    { label: "Pallets", link: "/rfid/pallets" },
                ],
            },
        },
        {
            path: 'rfid/tonner-bags',
            name: 'rfid-tonner-bags',
            component: () => import('@/pages/rfid-tonner-bags/index.vue'),
            meta: {
              pageTitle: "Tonner Bags - RFID Master",
              breadcrumbs: [
                  { label: "Tonner Bags", link: "/rfid/tonner-bags" },
              ],
            },
        },
        // Used for pallets
        {
            path: 'rfid/pallets/:physicalId',
            name: 'rfid.pallet.show.',
            component: () => import('@/pages/rfid-pallets/show.vue'),
            meta: {
                pageTitle: "Pallets - RFID Master",
                breadcrumbs: (route) => [
                    { label: "Pallets", link: "/rfid/pallets" },
                    { label: `${route.params.physicalId}`, link: `/rfid/${route.params.type}/${route.params.physicalId}` }
                ],
            },
        },
        // Used for tonner bags
        {
            path: 'rfid/tonner-bags/:physicalId',
            name: 'rfid.tonner-bag.show',
            component: () => import('@/pages/rfid-tonner-bags/show.vue'),
            meta: {
                pageTitle: "Tonner Bags - RFID Master",
                breadcrumbs: (route) => [
                    { label: "Tonner Bags", link: "/rfid/tonner-bags" },
                    { label: `${route.params.physicalId}`, link: `/rfid/${route.params.type}/${route.params.physicalId}` }
                ],
            },
        },

        {
            path: 'monitoring/pallets',
            name: 'rfid-monitoring-pallets',
            component: () => import('@/pages/rfid-monitoring-pallets/index.vue'),
            meta: {
                pageTitle: "RFID Monitoring - Pallets",
                breadcrumbs: [
                    { label: "RFID Monitoring - Pallets", link: "/monitoring/pallets" },
                ],
            },
        },
        {
            path: 'monitoring/tonner-bags',
            name: 'rfid-monitoring-tonner-bags',
            component: () => import('@/pages/rfid-monitoring-tonner-bags/index.vue'),
            meta: {
              pageTitle: "RFID Monitoring - Tonner Bags",
              breadcrumbs: [
                  { label: "RFID Monitoring - Tonner Bags", link: "/monitoring/tonner-bags" },
              ],
            },
        },

        // {
        //     path: 'rfid-monitoring',
        //     name: 'rfid-monitoring',
        //     component: () => import('@/pages/rfidMonitoring/index.vue'),
        //     meta: {
        //       pageTitle: "RFID Monitoring",
        //       breadcrumbs: [
        //           { label: "RFID Monitoring", link: "/rfid-monitoring" },
        //       ],
        //     },
        // },
        {
            path: 'reports/weak-pallets',
            name: 'weak-pallets-report',
            component: () => import('@/pages/reports/weakPalletsIndex.vue'),
            meta: {
              pageTitle: "Weak Pallets",
              breadcrumbs: [
                  { label: "Weak Pallets", link: "/weak-pallets" },
              ],
            },
        },
        {
            path: 'reports/readers-report',
            name: 'readers-report',
            component: () => import('@/pages/reports/readersReport.vue'),
            meta: {
              pageTitle: "Readers Report",
              breadcrumbs: [
                  { label: "Readers Report", link: "/readers-report" },
              ],
            },
        },
        {
            path: 'view-inversions',
            name: 'view-inversions',
            component: () => import('@/pages/palletInverter/index.vue'),
            meta: {
              pageTitle: "View Inversion",
              breadcrumbs: [
                  { label: "View Inversion", link: "/view-inversions" },
              ],
            }
        },
        {
            path: 'new-inversion',
            name: 'new-inversion',
            component: () => import('@/pages/palletInverter/feed.vue'),
            meta: {
                pageTitle: "New Inversion",
                breadcrumbs: [
                  { label: "New Inversion", link: "/new-inversion" },
              ],
            },
        },

        {
            path: 'fumigations/:id',
            name: 'fumigations.show',
            component: () => import('@/pages/fumigation/show.vue'),
            meta: {
                pageTitle: "Fumigations",
                breadcrumbs: (route) => [
                    { label: "Fumigations", link: `/fumigations/${route.params.id}` }
                ],
            },
        },

        {
            path: 'application-requests',
            name: 'application-requests',
            component: () => import('@/pages/applicationRequest/index.vue'),
            meta: {
                pageTitle: "Application Requests",
                breadcrumbs: [
                  { label: "Application Requests", link: "/application-requests" },
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
        path: '/shipment-picklist/:shipmentNumber',
        component: () => import('@/pages/picklist.vue'),
        meta: {
            pageTitle: "Checker Picklist Screen"
        },
        props: (route) => ({ 
            shipmentNumber: route.params.shipmentNumber,
            readerId: route.query.reader_id,
            bayNo: route.query.bay_no
        })
    },
    {
        path: '/loading-latest/:reader/:bay',
        component: () => import('@/pages/curtain.vue'), 
        meta: {
            pageTitle: "Loading Curtain"
        },
    },
    {
        path: '/reader/picklist/:reader/:bay',
        component: () => import('@/pages/readers/picklist.vue'), 
        meta: {
            pageTitle: "Picklist"
        },
    },
    {
        path: '/reader/depot-picklist/:reader/:bay',
        component: () => import('@/pages/readers/depotPicklist.vue'), 
        meta: {
            pageTitle: "Depot Picklist"
        },
    },
    {
        path: '/rfid-registration/:type/:plant/:location?',
        component: () => import('@/pages/rfid-registration.vue'), 
        meta: {
            middleware: "auth",
            pageTitle: "RFID Registration"
        },
    }, {
        path: '/rfid-registration-handheld/:type/:plant/:location?',
        component: () => import('@/pages/rfid-registration-handheld.vue'), 
        meta: {
            middleware: "auth",
            pageTitle: "RFID Registration Handheld"
        },
    },
    {
        path: '/inventory-recon/:type/:plant/:location?',
        component: () => import('@/pages/inventory-recon.vue'), 
        meta: {
            middleware: "auth",
            pageTitle: "Inventory Recon"
        },
    },
    {
        path: '/warehouse-map/:plant/:location',
        name: 'warehouse-map',
        component: () => import('@/pages/warehouse/showMap.vue'), 
        meta: {
            pageTitle: "Warehouse Map"
        }
    },
    {
        path: '/warehouse-map/:plant/:location/edit',
        name: 'warehouse-map.edit',
        component: () => import('@/pages/warehouse/editMap.vue'), 
        meta: {
            pageTitle: "Edit - Warehouse Map"
        },
    },
    {
        path: '/operator/:plant/:location/movement',
        component: () => import('@/pages/operator/movement.vue'), 
        meta: {
            pageTitle: "Warehouse Movement"
        },
    },
    {
        path: '/operator-screen',
        name: 'operator-screen',
        component: () => import('@/pages/operator/operatorScreen.vue'),
        meta: {
            pageTitle: "Operator Screen"
        }
    },
    {
        path: '/sso-login',
        name: 'sso-callback',
        component: () => import('@/pages/sso-callback.vue'),
        meta: {
            pageTitle: "SSO Callback"
        },
    },
    {
        path: '/batch-picking/:do_number/',
        component: () => import('@/pages/batch-picking/index.vue'), 
        meta: {
            pageTitle: "Batch Picking"
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
  