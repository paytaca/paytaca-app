import { castBooleanSafe, castNumberSafe, removeNullish } from './utils'

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
        props: route => route.query,
        component: () => import('pages/transaction/select-asset-send.vue')
      },
      {
        path: 'send/',
        name: 'transaction-send',
        props: route => {
          const props = Object.assign({}, route.query)
          props.tokenType = castNumberSafe(props.tokenType)
          props.amount = castNumberSafe(props.amount)
          props.fixed = castBooleanSafe(props.fixed)
          props.simpleNft = castBooleanSafe(props.simpleNft)
          props.vout = castBooleanSafe(props.vout)
          removeNullish(props)
          return props
        },
        component: () => import('pages/transaction/send.vue')
        // component: () => import('pages/sandbox/SendPage.vue'),
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
      },
      {
        path: 'push-notification-router',
        name: 'push-notification-router',
        props: route => route.query,
        component: () => import('src/pages/push-notification-router.vue')
      },
      {
        path: 'qr-reader',
        name: 'qr-reader',
        props: route => route.query,
        component: () => import('pages/qr/qr-reader.vue')
      },
      {
        path: 'generate-qr',
        name: 'generate-qr',
        component: () => import('pages/qr/generate-qr.vue')
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
      { path: 'stablehedge', component: () => import('src/pages/apps/stablehedge/StablehedgePage.vue'), name: 'app-stablehedge', props: route => route.query },
      { path: 'map', component: () => import('src/pages/apps/map.vue'), name: 'app-map', props: route => route.query },
      { path: 'anyhedge', component: () => import('src/pages/apps/anyhedge.vue'), name: 'app-any-hedge', props: route => route.query },
      { path: 'pos-admin', component: () => import('src/pages/apps/paytacapos-admin/index.vue'), name: 'app-pos-admin', props: route => route.query },
      { path: 'pos-admin/merchant', component: () => import('src/pages/apps/paytacapos-admin/merchant.vue'), name: 'app-pos-merchant', props: route => route.query },
      { path: 'pos-admin/merchant/cashout', component: () => import('src/pages/apps/paytacapos-admin/merchant-cashout/index.vue'), name: 'app-pos-cashout', props: route => route.query },
      { path: 'pos-admin/merchant/cashout/order', component: () => import('src/pages/apps/paytacapos-admin/merchant-cashout/order-form.vue'), name: 'app-pos-cashout-form', props: route => route.query },
      { path: 'wallet-connect', component: () => import('src/pages/apps/wallet-connect2.vue'), name: 'app-wallet-connect', props: route => route.query },
      { path: 'wallet-info', component: () => import('src/pages/apps/wallet-info.vue'), name: 'app-wallet-info' },
      { path: 'bridge', component: () => import('src/pages/apps/bridge.vue'), name: 'app-bridge' },
      { path: 'asset-swap', component: () => import('src/pages/apps/asset-swap.vue'), name: 'app-asset-swap' },
      { path: 'sweep', component: () => import('src/pages/apps/sweep.vue'), name: 'app-sweep', props: route => Object.assign({}, route.params, route.query) },
      { path: 'collectibles', component: () => import('src/pages/apps/collectibles.vue'), name: 'app-collectibles' },
      { path: 'settings', component: () => import('src/pages/apps/settings.vue'), name: 'app-settings' },
      { path: 'settings/ignored-tokens', component: () => import('src/pages/apps/ignored-tokens-list.vue'), name: 'ignored-tokens-list' },
      { path: 'connecta', component: () => import('src/pages/apps/connecta/index.vue'), name: 'connecta', props: route => route.query },
      { path: 'gifts', component: () => import('src/pages/apps/gifts/index.vue'), name: 'gifts' },
      { path: 'gifts/create', component: () => import('src/pages/apps/gifts/create-gift.vue'), name: 'create-gift' },
      { path: 'gifts/claim', props: route => route.query, component: () => import('src/pages/apps/gifts/claim-gift.vue'), name: 'claim-gift' },
      { path: 'wallet-backup', component: () => import('src/pages/apps/wallet-backup.vue'), name: 'app-wallet-backup' },
      {
        path: 'marketplace',
        component: () => import('src/layouts/MarketplaceLayout.vue'),
        children: [
          { path: '', component: () => import('src/pages/apps/marketplace/index.vue'), name: 'app-marketplace', meta: { hideCartBtn: true } },
          { path: 'storefront/:storefrontId', component: () => import('src/pages/apps/marketplace/storefront.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-storefront' },
          { path: 'colleciton/:collectionId', component: () => import('src/pages/apps/marketplace/collection.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-collection' },
          { path: 'product/:productId', component: () => import('src/pages/apps/marketplace/product.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-product' },
          { path: 'colleciton/:collectionId/product/:productId', component: () => import('src/pages/apps/marketplace/product.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-collection-product' },
          { path: 'checkout', component: () => import('src/pages/apps/marketplace/checkout.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-checkout' },
          { path: 'orders/:orderId', component: () => import('src/pages/apps/marketplace/order.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-order', meta: { hideCartBtn: true } },
          { path: 'orders/', component: () => import('src/pages/apps/marketplace/orders.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-orders', meta: { hideCartBtn: true } },
          { path: 'customer', component: () => import('src/pages/apps/marketplace/customer.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-customer', meta: { hideCartBtn: true } },
          { path: 'arbiter', component: () => import('src/pages/apps/marketplace/arbiter/index.vue'), props: route => Object.assign({}, route.params, route.query), name: 'app-marketplace-arbiter', meta: { hideCartBtn: true, skipInit: true } }
        ]
      },
      { path: 'ramp/crypto', component: () => import('src/pages/apps/ramp-crypto.vue'), name: 'ramp-crypto' },
      {
        path: 'exchange/',
        name: 'exchange',
        props: route => route.query,
        component: () => import('src/pages/apps/exchange/index.vue'),
        children: [
          {
            path: 'peer-to-peer/',
            name: 'exchange-p2p',
            props: route => route.query,
            component: () => import('src/pages/apps/exchange/peer_to_peer/index.vue'),
            children: [
              {
                path: 'store/',
                name: 'p2p-store',
                props: route => route.query,
                component: () => import('src/pages/apps/exchange/peer_to_peer/store.vue'),
                children: [
                  {
                    path: 'form/:ad',
                    name: 'p2p-store-form',
                    component: () => import('src/pages/apps/exchange/peer_to_peer/order-form.vue')
                  }
                ]
              },
              {
                path: 'ads/',
                name: 'p2p-ads',
                component: () => import('src/pages/apps/exchange/peer_to_peer/ads.vue'),
                children: [
                  {
                    path: 'form/:ad/edit',
                    name: 'p2p-ads-edit-form',
                    component: () => import('src/pages/apps/exchange/peer_to_peer/ad-form.vue')
                  },
                  {
                    path: 'form/create',
                    name: 'p2p-ads-create-form',
                    component: () => import('src/pages/apps/exchange/peer_to_peer/ad-form.vue')
                  }
                ]
              },
              {
                path: 'orders/',
                name: 'p2p-orders',
                component: () => import('src/pages/apps/exchange/peer_to_peer/orders.vue'),
                children: [
                  {
                    path: ':order/',
                    name: 'p2p-order',
                    component: () => import('src/pages/apps/exchange/peer_to_peer/order.vue')
                  },
                ]
              },
              {
                path: 'profile/',
                name: 'p2p-profile',
                component: () => import('src/pages/apps/exchange/peer_to_peer/profile.vue')
              }
            ]
          },
          {
            path: 'arbiter/',
            name: 'exchange-arbiter',
            component: () => import('src/pages/apps/exchange/arbiter/index.vue'),
            children: [
              {
                path: 'appeals/',
                name: 'arbiter-appeals',
                component: () => import('src/pages/apps/exchange/arbiter/appeals.vue'),
                children: [
                  {
                    path: ':order/',
                    name: 'appeal-detail',
                    component: () => import('src/pages/apps/exchange/arbiter/appeal.vue')
                  }
                ]
              },
              {
                path: 'profile/',
                name: 'arbiter-profile',
                component: () => import('src/pages/apps/exchange/arbiter/profile.vue')
              }
            ]
          }
        ]
      },
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
