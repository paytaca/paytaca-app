
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
    path: '/select-token',
    component: () => import('layouts/Transaction.vue'),
    children: [
      { path: '', component: () => import('pages/transaction/select-token.vue') }
    ]
  },
  {
    path: '/send',
    component: () => import('layouts/Transaction.vue'),
    children: [
      { path: '', component: () => import('pages/transaction/send.vue') }
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
