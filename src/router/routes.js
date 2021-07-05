
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
        // this function handles how to pass props to the component given the route data
        props: route => route.query,
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
        props: route => route.query,
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
    path: '/seed',
    component: () => import('pages/seeder.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes
