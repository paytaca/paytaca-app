export function updateMnemonic (state, encryptedMnemonic) {
  state.vault.mnemonic = encryptedMnemonic
}

export function updateAddresses (state, addresses) {
  state.accounts.escrow.address = addresses.escrow.address

  state.vault.privateKeys[addresses.escrow.address] = addresses.escrow.privateKey

  state.accounts.private.address = addresses.private.address
  state.vault.privateKeys[addresses.private.address] = addresses.private.privateKey
}

export function updatePrivateAddress (state, privateAddress) {
  state.accounts.private.address = privateAddress.address
  state.vault.privateKeys[privateAddress.address] = privateAddress.privateKey
}

export function updatePublicAddress (state, escrow) {
  state.accounts.escrow.address = escrow.address
  state.vault.privateKeys[escrow.address] = escrow.privateKey
}

export function updateOnboardingStep (state, status) {
  state.user.onboardingStep = status
}

export function updatePrivateBalance (state, balance) {
  console.log(balance.tokens)
  // const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)

  // const bchBalance = {
  //   id: '',
  //   balance: bchjs.BitcoinCash.toBitcoinCash(balance.confirmed + balance.unconfirmed),
  // }
  // const index = state.accounts.private.balances.map(i => i.id).indexOf('')
  // if (index < 0) state.accounts.private.balances.push(bchBalance)
  // else state.accounts.private.balances[index] = bchBalance

  // if (Array.isArray(balance.tokens)) {
  //   for (var i = 0; i < balance.tokens.length; i++) {
  //     const thisToken = balance.tokens[i]
  //     const index = state.accounts.private.balances.map(i => i.id).indexOf(thisToken.tokenId)

  //     const tokenBalance = {
  //       id: thisToken.tokenId,
  //       balance: tknBalance.balance,
  //     }

  //     if (index < 0) state.accounts.private.balances.push(tokenBalance)
  //     else state.accounts.private.balances[index] = tokenBalance
  //   }
  // }
}

export function updateEscrowBalance (state, balance) {
  // console.log(balance.tokens)
  // const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)

  // const bchBalance = {
  //   id: '',
  //   balance: bchjs.BitcoinCash.toBitcoinCash(balance.confirmed + balance.unconfirmed),
  // }
  // const index = state.accounts.escrow.balances.map(i => i.id).indexOf('')
  // if (index < 0) state.accounts.escrow.balances.push(bchBalance)
  // else state.accounts.escrow.balances[index] = bchBalance

  // if (Array.isArray(balance.tokens)) {
  //   for (var i = 0; i < balance.tokens.length; i++) {
  //     const thisToken = balance.tokens[i]
  //     const index = state.accounts.escrow.balances.map(i => i.id).indexOf(thisToken.tokenId)

  //     const tokenBalance = {
  //       id: thisToken.tokenId,
  //       balance: thisToken.balance
  //     }

  //     if (index < 0) state.accounts.escrow.balances.push(tokenBalance)
  //     else state.accounts.escrow.balances[index] = tokenBalance
  //   }
  // }
}

export function setPrivateMode (state, privateMode) {
  state.privateMode = Boolean(privateMode)
}

export function updateTransactions (state, data) {
  state.accounts[data.accountType].transactions[''] = data.transactions
  state.accounts[data.accountType].balances[0].balance = data.balance
}
