import getBalance from '../../utils/get-balance.js'

const DEFAULT_BALANCE_MAX_AGE = 60 * 1000

export function updateOnboardingStep (context, status) {
  context.commit('updateOnboardingStep', status)
}

export function updateAddresses (context, addresses) {
  context.commit('updateAddresses', addresses)
}

export function updatePrivateBalance (context, options={ maxAge: DEFAULT_BALANCE_MAX_AGE }) {
  if (!context.state.accounts.private.address) return Promise.reject()

  const maxAge = Number.isSafeInteger(options && options.maxAge) ? Number(options && options.maxAge) : DEFAULT_BALANCE_MAX_AGE
  if (
    context.state.accounts &&
    context.state.accounts.private &&
    context.state.accounts.private.lastBalanceUpdate &&
    Number.isSafeInteger(context.state.accounts.private.lastBalanceUpdate) &&
    context.state.accounts.private.lastBalanceUpdate > Date.now() - Math.abs(maxAge)
  ) {
    return Promise.resolve(context.state.accounts.private.balances)
  }

  return getBalance(context.state.accounts.private.address)
    .then(balance => {
      context.commit('updatePrivateBalance', balance)
      if (Array.isArray(balance.tokens)) {
        balance.tokens.forEach(tknBalance => {
          context.dispatch('assets/getTokenStats', tknBalance, { root: true })
        })
      }

      return Promise.resolve(balance)
    })
}

export function updateEscrowBalance (context, options={ maxAge: DEFAULT_BALANCE_MAX_AGE }) {
  if (!context.state.accounts.escrow.address) return Promise.reject()

  const maxAge = Number.isSafeInteger(options && options.maxAge) ? Number(options && options.maxAge) : DEFAULT_BALANCE_MAX_AGE
  if (
    context.state.accounts &&
    context.state.accounts.escrow &&
    context.state.accounts.escrow.lastBalanceUpdate &&
    Number.isSafeInteger(context.state.accounts.private.lastBalanceUpdate) &&
    context.state.accounts.escrow.lastBalanceUpdate > Date.now() - Math.abs(maxAge)
  ) {
    return Promise.resolve(context.state.accounts.escrow.balances)
  }

  return getBalance(context.state.accounts.escrow.address)
    .then(balance => {
      context.commit('updateEscrowBalance', balance)
      if (Array.isArray(balance.tokens)) {
        balance.tokens.forEach(tknBalance => {
          context.dispatch('assets/getTokenStats', tknBalance, { root: true })
        })
      }

      return Promise.resolve(balance)
    })
}

export function setPrivateMode (context, { privateMode }) {
  const val = Boolean(privateMode)
  context.commit('setPrivateMode', val)
  return Promise.resolve(val)
}
