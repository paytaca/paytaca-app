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
      { path: 'anyhedge', component: () => import('src/pages/apps/anyhedge.vue'), name: 'app-any-hedge', props: route => route.query },
      { path: 'point-of-sale', component: () => import('src/pages/apps/point-of-sale.vue'), name: 'app-point-of-sale', props: route => route.query },
      { path: 'wallet-connect', component: () => import('src/pages/apps/wallet-connect.vue'), name: 'app-wallet-connect', props: route => route.query },
      { path: 'wallet-info', component: () => import('src/pages/apps/wallet-info.vue'), name: 'app-wallet-info' },
      { path: 'bridge', component: () => import('src/pages/apps/bridge.vue'), name: 'app-bridge' },
      { path: 'asset-swap', component: () => import('src/pages/apps/asset-swap.vue'), name: 'app-asset-swap' },
      { path: 'sweep', component: () => import('src/pages/apps/sweep.vue'), name: 'app-sweep' },
      { path: 'collectibles', component: () => import('src/pages/apps/collectibles.vue'), name: 'app-collectibles' },
      { path: 'chat', component: () => import('src/pages/apps/chat/index.vue'), name: 'app-chats-list' },
      { path: 'chat/conversation', component: () => import('src/pages/apps/chat/chat.vue'), name: 'app-chat-conversation', props: route => route.query },
      { path: 'settings', component: () => import('src/pages/apps/settings.vue'), name: 'app-settings' },
      { path: 'settings/ignored-tokens', component: () => import('src/pages/apps/ignored-tokens-list.vue'), name: 'ignored-tokens-list' },
      { path: 'connecta', component: () => import('src/pages/apps/connecta/index.vue'), name: 'connecta', props: route => route.query },
      { path: 'gifts', component: () => import('src/pages/apps/gifts/index.vue'), name: 'gifts' },
      { path: 'gifts/create', component: () => import('src/pages/apps/gifts/create-gift.vue'), name: 'create-gift' },
      { path: 'gifts/claim', props: route => route.query, component: () => import('src/pages/apps/gifts/claim-gift.vue'), name: 'claim-gift' },
      { path: 'gifts/show-qr', props: route => route.query, component: () => import('src/pages/apps/gifts/show-qr.vue'), name: 'show-qr' },
      { path: 'deposit-coin', component: () => import('src/pages/apps/deposit/index.vue'), name: 'app-deposit-coin'},
      { path: 'deposit-coin/deposit-info', props: route => route.query, component: () => import('src/pages/apps/deposit/deposit-info.vue'), name: 'deposit-info'}
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
