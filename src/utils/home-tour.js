export const HOME_TOUR_SEEN_KEY = 'homeTourSeen_v1'

/**
 * @param {(key: string, params?: any, fallback?: string) => string} t
 */
export function buildHomeTourSteps(t) {
  return [
    {
      id: 'wallet-opener',
      selector: '[data-tour="wallet-opener"]',
      title: t('HomeTour.WalletOpener.Title', {}, 'Wallets'),
      body: t(
        'HomeTour.WalletOpener.Body',
        {},
        'Tap here to open the wallet list and switch between wallets.'
      ),
      prefer: 'bottom',
    },
    {
      id: 'notifications',
      selector: '[data-tour="notifications"]',
      title: t('HomeTour.Notifications.Title', {}, 'Notifications'),
      body: t(
        'HomeTour.Notifications.Body',
        {},
        'Tap here to view your notifications.'
      ),
      prefer: 'bottom',
    },
    {
      id: 'bch-card',
      selector: '[data-tour="bch-card"], #bch-card',
      title: t('HomeTour.BchCard.Title', {}, 'Bitcoin Cash card'),
      body: t(
        'HomeTour.BchCard.Body',
        {},
        'This card shows your BCH balance. Tap to view your full transaction history. Long-press or double-click for more details and actions.'
      ),
      prefer: 'bottom',
    },
    {
      id: 'quick-actions',
      selector: '[data-tour="quick-actions"], .asset-option',
      title: t('HomeTour.QuickActions.Title', {}, 'Quick actions'),
      body: t(
        'HomeTour.QuickActions.Body',
        {},
        'Use these buttons to quickly Send, Receive, Get BCH, or Spend BCH.'
      ),
      prefer: 'top',
    },
    {
      id: 'token-cards',
      selector: '[data-tour="token-cards"], #asset-container',
      title: t('HomeTour.TokenCards.Title', {}, 'Token cards'),
      body: t(
        'HomeTour.TokenCards.Body',
        {},
        'These are your token cards. Tap a token card to view the token\'s full transaction history. Long-press or double-click for more details and actions.'
      ),
      prefer: 'top',
    },
    {
      id: 'transactions',
      selector: '[data-tour="transactions"], .latest-transactions-section',
      title: t('HomeTour.Transactions.Title', {}, 'Transactions'),
      body: t(
        'HomeTour.Transactions.Body',
        {},
        'Your recent transactions appear here. Tap a transaction to view details.'
      ),
      prefer: 'top',
    },
    {
      id: 'main-menus',
      selector: '[data-tour="main-menus"], .fixed-footer',
      scroll: 'top',
      title: t('HomeTour.MainMenus.Title', {}, 'Main menus'),
      body: t(
        'HomeTour.MainMenus.Body',
        {},
        'Use these menus to navigate Home, Transactions, Apps, Settings, and QR tools.'
      ),
      prefer: 'top',
    },
  ]
}

