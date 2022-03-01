const routes = [
  {
    path: '/',
    component: () => import('layouts/Transaction.vue'),
    children: [
      {
        path: '',
        name: 'transaction-index',
        component: () => import('pages/transaction/index.vue')
      },
      {
        path: 'receive/select-asset',
        name: 'transaction-receive-select-asset',
        component: () => import('pages/transaction/select-asset-receive.vue')
      },
      {
        path: 'receive',
        name: 'transaction-receive',
        props: true,
        component: () => import('pages/transaction/receive.vue')
      },
      {
        path: 'send/select-asset',
        name: 'transaction-send-select-asset',
        component: () => import('pages/transaction/select-asset-send.vue')
      },
      {
        path: 'send',
        name: 'transaction-send',
        props: true,
        component: () => import('pages/transaction/send.vue')
      }
    ]
  },
  {
    path: '/registration',
    component: () => import('layouts/Registration.vue'),
    children: [
      { path: '', component: () => import('pages/registration/index.vue') },
      { path: 'accounts', component: () => import('pages/registration/accounts.vue') }
    ]
  },
  {
    path: '/apps',
    component: () => import('layouts/Apps.vue'),
    children: [
      { path: '', component: () => import('pages/apps/index.vue'), name: 'apps-dashboard' },
      { path: 'wallet-info', component: () => import('src/pages/apps/wallet-info.vue'), name: 'app-wallet-info' },
      { path: 'collectibles', component: () => import('src/pages/apps/collectibles.vue'), name: 'app-collectibles' },
      { path: 'settings', component: () => import('src/pages/apps/settings.vue'), name: 'app-settings' },
      { path: 'connecta', component: () => import('src/pages/apps/connecta/index.vue'), name: 'connecta', props: route => route.query }
    ]
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes
