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
        props: route => route.query,
        component: () => import('pages/transaction/receive.vue')
      },
      {
        path: 'send/select-asset',
        name: 'transaction-send-select-asset',
        component: () => import('pages/transaction/select-asset-send.vue')
      },
      {
        path: 'send/',
        name: 'transaction-send',
        props: route => {
          const props = Object.assign({}, route.query)
          if (!isNaN(props.tokenType)) props.tokenType = Number(props.tokenType)
          if (!isNaN(props.amount)) props.amount = Number(props.amount)
          if (props.fixed === 'true') props.fixed = true
          else if (props.fixed === 'false') props.fixed = false
          return props
        },
        component: () => import('pages/transaction/send.vue')
      }
    ]
  },
  {
    path: '/accounts',
    component: () => import('layouts/Accounts.vue'),
    children: [
      { path: '', component: () => import('pages/registration/accounts.vue') }
    ]
  },
  {
    path: '/apps',
    component: () => import('layouts/Apps.vue'),
    children: [
      { path: '', component: () => import('pages/apps/index.vue'), name: 'apps-dashboard' },
      { path: 'wallet-connect', component: () => import('src/pages/apps/wallet-connect.vue'), name: 'app-wallet-connect', props: route => route.query },
      { path: 'wallet-info', component: () => import('src/pages/apps/wallet-info.vue'), name: 'app-wallet-info' },
      { path: 'bridge', component: () => import('src/pages/apps/bridge.vue'), name: 'app-bridge' },
      { path: 'asset-swap', component: () => import('src/pages/apps/asset-swap.vue'), name: 'app-asset-swap' },
      { path: 'sweep', component: () => import('src/pages/apps/sweep.vue'), name: 'app-sweep' },
      { path: 'collectibles', component: () => import('src/pages/apps/collectibles.vue'), name: 'app-collectibles' },
      { path: 'settings', component: () => import('src/pages/apps/settings.vue'), name: 'app-settings' },
      { path: 'settings/ignored-tokens', component: () => import('src/pages/apps/ignored-tokens-list.vue'), name: 'ignored-tokens-list' },
      { path: 'connecta', component: () => import('src/pages/apps/connecta/index.vue'), name: 'connecta', props: route => route.query },
      { path: 'gifts', component: () => import('src/pages/apps/gifts/index.vue'), name: 'gifts' },
      { path: 'gifts/create', component: () => import('src/pages/apps/gifts/createGift.vue'), name: 'create-gift' },
      { path: 'gifts/claim', component: () => import('src/pages/apps/gifts/claimGift.vue'), name: 'claim-gift' }
    ]
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes
