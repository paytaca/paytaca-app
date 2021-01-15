import getBalance from '../../utils/get-balance.js'

const DEFAULT_BALANCE_MAX_AGE = 60 * 1000

export function updateOnboardingStep (context, status) {
  context.commit('updateOnboardingStep', status)
}

export function updateAddresses (context, addresses) {
  context.commit('updateAddresses', addresses)
}

export function updatePrivateBalance (context, options={ maxAge: DEFAULT_BALANCE_MAX_AGE }) {
  if (!context.state.user.privateAddress) return Promise.reject()

  const maxAge = Number.isSafeInteger(options && options.maxAge) ? Number(options && options.maxAge) : DEFAULT_BALANCE_MAX_AGE
  if (
    context.state.user &&
    context.state.user.privateBalance &&
    Number.isSafeInteger(context.state.user.privateBalance.lastUpdate) &&
    context.state.user.privateBalance.lastUpdate > Date.now() - Math.abs(maxAge)
  ) {
    return Promise.resolve(context.state.user.privateBalance)
  }

  return getBalance(context.state.user.privateAddress)
    .then(balance => {
      context.commit('updatePrivateBalance', balance)
      if (Array.isArray(balance.tokens)) {
        balance.tokens.forEach(tknBalance => {
          context.dispatch('tokenStats/getTokenStats', tknBalance, { root: true })
        })
      }

      return Promise.resolve(balance)
    })
}

export function updateEscrowBalance (context, options={ maxAge: DEFAULT_BALANCE_MAX_AGE }) {
  if (!context.state.user.escrowAddress) return Promise.reject()

  const maxAge = Number.isSafeInteger(options && options.maxAge) ? Number(options && options.maxAge) : DEFAULT_BALANCE_MAX_AGE
  if (
    context.state.user &&
    context.state.user.escrowBalance &&
    Number.isSafeInteger(context.state.user.escrowBalance.lastUpdate) &&
    context.state.user.escrowBalance.lastUpdate > Date.now() - Math.abs(maxAge)
  ) {
    return Promise.resolve(context.state.user.escrowBalance)
  }

  return getBalance(context.state.user.escrowAddress)
    .then(balance => {
      context.commit('updateEscrowBalance', balance)
      if (Array.isArray(balance.tokens)) {
        balance.tokens.forEach(tknBalance => {
          context.dispatch('tokenStats/getTokenStats', tknBalance, { root: true })
        })
      }

      return Promise.resolve(balance)
    })
}

export function setPrivateMode(context, { privateMode }) {
  const val = Boolean(privateMode)
  context.commit('setPrivateMode', val)
  return Promise.resolve(val)
}