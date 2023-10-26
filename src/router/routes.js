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
          if (props.simpleNft === 'true') props.simpleNft = true
          else if (props.simpleNft === 'false') props.simpleNft = false
          return props
        },
        component: () => import('pages/transaction/send.vue')
      },
      {
        path: 'connect/',
        name: 'connect',
        props: route => route.query,
        component: () => import('pages/connect/connect.vue')
      },
      {
        path: 'signMessage/',
        name: 'sign-message',
        props: route => route.query,
        component: () => import('pages/sign/message.vue')
      },
      {
        path: 'signTransaction/',
        name: 'sign-transaction',
        props: route => route.query,
        component: () => import('pages/sign/transaction.vue')
      }
    ]
  },
  {
    path: '/accounts',
    component: () => import('layouts/Accounts.vue'),
    children: [
      { path: '', component: () => import('pages/registration/accounts.vue'), name: 'create-account', props: route => route.query }
    ]
  },
  {
    path: '/apps',
    component: () => import('layouts/Apps.vue'),
    children: [
      { path: '', component: () => import('pages/apps/index.vue'), name: 'apps-dashboard' },
      { path: 'map', component: () => import('src/pages/apps/map.vue'), name: 'app-map', props: route => route.query },
      { path: 'anyhedge', component: () => import('src/pages/apps/anyhedge.vue'), name: 'app-any-hedge', props: route => route.query },
      { path: 'point-of-sale', component: () => import('src/pages/apps/point-of-sale.vue'), name: 'app-point-of-sale', props: route => route.query },
      { path: 'wallet-connect', component: () => import('src/pages/apps/wallet-connect2.vue'), name: 'app-wallet-connect', props: route => route.query },
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
      // { path: 'deposit-coin', component: () => import('src/pages/apps/deposit/index.vue'), name: 'app-deposit-coin'},
      // { path: 'deposit-coin/deposit-info', props: route => route.query, component: () => import('src/pages/apps/deposit/deposit-info.vue'), name: 'deposit-info' },
      {
        path: 'ramp',
        name: 'ramp',
        component: () => import('src/pages/apps/ramp/index.vue'),
        children: [
          {
            path: 'login/',
            name: 'ramp-login',
            component: () => import('src/components/ramp/RampLogin.vue')
          },
          {
            path: 'fiat/',
            name: 'ramp-fiat',
            component: () => import('src/components/ramp/fiat/FiatIndex.vue'),
            children: [
              {
                path: 'store/',
                name: 'ramp-fiat-store',
                component: () => import('src/components/ramp/fiat/FiatStore.vue')
              },
              {
                path: 'ads/',
                name: 'ramp-fiat-ads',
                component: () => import('src/components/ramp/fiat/FiatAds.vue'),
                children: [
                  {
                    path: 'create/',
                    name: 'ads-create',
                    component: () => import('src/components/ramp/fiat/FiatAdsForm.vue')
                  }
                ]
              },
              {
                path: 'orders/',
                name: 'ramp-fiat-orders',
                component: () => import('src/components/ramp/fiat/FiatOrders.vue')
              },
              {
                path: 'profile/',
                name: 'ramp-fiat-profile',
                component: () => import('src/components/ramp/fiat/FiatProfileCard.vue')
              }
            ]
          },
          {
            path: 'crypto/',
            name: 'ramp-crypto',
            component: () => import('src/components/ramp/crypto/RampShiftForm.vue')
          },
          {
            path: 'appeal/',
            name: 'ramp-appeal',
            component: () => import('src/components/ramp/appeal/AppealIndex.vue')
          }
        ]
      }
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
