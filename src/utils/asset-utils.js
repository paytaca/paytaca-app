import { getWalletByNetwork } from 'src/wallet/chipnet'

const balanceFetchMap = { /** `${id}:${walletHash}`: Promise */ }
export async function updateAssetBalanceOnLoad(id, wallet, store) {
  const walletHash = getWalletByNetwork(wallet, 'bch')?.walletHash || 'unknown'
  const key = `${id}:${walletHash}`
  if (!balanceFetchMap[key]) {
    balanceFetchMap[key] = _updateAssetBalanceOnLoad(id, wallet, store)
      .finally(() => delete balanceFetchMap[key])
  }
  return balanceFetchMap[key]
}

async function _updateAssetBalanceOnLoad (id, wallet, store) {
  const tokenId = id.split('/')[1]
  const updateAssetBalance = 'assets/updateAssetBalance'

  if (id.indexOf('slp/') > -1) {
    return getWalletByNetwork(wallet, 'slp').getBalance(tokenId).then(function (response) {
      store.commit(updateAssetBalance, { id, balance: response.balance })
    })
  } else if (id.indexOf('ct/') > -1) {
    return getWalletByNetwork(wallet, 'bch').getBalance(tokenId).then(response => {
      store.commit(updateAssetBalance, { id, balance: response.balance })
    })
  } else {
    return getWalletByNetwork(wallet, 'bch').getBalance().then(function (response) {
      store.commit(updateAssetBalance, {
        id,
        balance: response.balance,
        spendable: response.spendable,
        yield: response.yield
      })
    })
  }
}
