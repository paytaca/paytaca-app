import getBalance from '../../utils/get-balance.js'

export function updateOnboardingStep (context, status) {
  context.commit('updateOnboardingStep', status)
}

export function updateAddresses (context, addresses) {
  context.commit('updateAddresses', addresses)
}

export function updatePrivateBalance (context) {
  console.log(context)
  if (!context.state.user.privateAddress) return Promise.reject()

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

export function updateEscrowBalance (context) {
  if (!context.state.user.escrowAddress) return Promise.reject()

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
