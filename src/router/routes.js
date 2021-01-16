
const routes = [
  {
    path: '/',
    component: () => import('layouts/Transaction.vue'),
    children: [
      { path: '', component: () => import('pages/transaction/index.vue') }
    ]
  },
  {
    path: '/receive',
    component: () => import('layouts/Transaction.vue'),
    children: [
      { path: '', component: () => import('pages/transaction/receive.vue') }
    ]
  },
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
        path: 'receive',
        name: 'transaction-receive',
        component: () => import('pages/transaction/receive.vue')
      },
      {
        path: 'select-asset',
        name: 'transaction-send-select-asset',
        component: () => import('pages/transaction/select-asset.vue')
      },
      {
        path: 'send',
        name: 'transaction-send',
        // this function handles how to pass props to the component given the route data
        props: route => route.query,
        component: () => import('pages/transaction/send.vue')
      }
    ]
  },
  {
    path: '/get-started',
    component: () => import('layouts/Getstarted.vue'),
    children: [
      { path: '', component: () => import('pages/registration/index.vue') }
    ]
  },
  {
    path: '/mainlayout',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/Index.vue') }
    ]
  },
  {
    path: '/onboarding',
    component: () => import('layouts/Onboarding.vue'),
    children: [
      { path: 'register', component: () => import('pages/onboarding/Register.vue') }
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
