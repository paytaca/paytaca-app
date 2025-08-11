import { SignatureTemplate } from "cashscript";
import { binToHex, lockingBytecodeToCashAddress } from "@bitauth/libauth";
import { getTxid, toTokenAddress } from "src/utils/crypto";
import { watchtowerUtxoToCashscript } from "src/utils/utxo-utils";
import { calculateInputSize, mockSignatureTemplate, TransactionBalancer } from "./transaction-utils";
import { StablehedgeRPC } from "./rpc";
import { getStablehedgeBackend } from "./api";
import { getTreasuryContractInstance } from "./treasury-contract";
import { getRedemptionContractInstance } from "./redemption-contract";

import { i18n } from "src/boot/i18n";

const { t: $t } = i18n.global
/**
 * @param {Object} opts 
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {Number} [opts.locktime]
 * @param {{satoshis:Number, category:?String, tokenAmount:?Number}[]} opts.amounts
 */
export async function prepareUtxos(opts) {
  const wallet = opts?.wallet
  /** @type {import("./wallet").WatchtowerUtxo[]} */
  const utxoSearchResults = await Promise.all(
    opts.amounts.map(async (amountData) => {
      const utxo = await searchUtxo({
        wallet: opts?.wallet,
        ...amountData,
      })

      if (utxo) return utxo

      return {
        txid: '',
        vout: -1,
        address_path: '0/0',
        value: amountData?.satoshis,
        tokenid: amountData?.category,
        amount: amountData?.tokenAmount,
      }
    })
  )

  if (utxoSearchResults.every(result => result.txid && result.vout >= 0)) {
    return {
      success: true,
      utxos: utxoSearchResults,
    }
  }

  const txBuilder = new TransactionBalancer()

  for(const utxo of utxoSearchResults) {
    if (utxo.txid && utxo.vout >= 0) continue

    const address = wallet.getAddressAt({ path: utxo.address_path, token: Boolean(utxo.tokenid) })
    utxo.vout = txBuilder.outputs.length
    txBuilder.outputs.push({
      to: address,
      amount: BigInt(utxo.value),
      token: !utxo.tokenid ? undefined : {
        category: utxo.tokenid,
        amount: BigInt(utxo.amount),
      }
    })
  }

  const tokenCategories = utxoSearchResults
    .map(result => result?.tokenid)
    .filter(Boolean)
    .filter((element, index, list) => list.indexOf(element) === index)

  const tokenUtxos = await Promise.all(
    tokenCategories.map(category => {
      return wallet.getUtxos(category)
        .then(result => {
          return { utxos: result, category: category }
        })
    })
  )

  for (const tokenUtxo of tokenUtxos) {
    const category = tokenUtxo.category
    for (const utxo of tokenUtxo.utxos) {
      const changeTokens = txBuilder.tokenChange(category)
      if (changeTokens >= 0n) break

      const wif = wallet.getPrivateKeyWifAt(utxo?.address_path)
      const cashscriptUtxo = watchtowerUtxoToCashscript(utxo)
      console.log({ cashscriptUtxo })

      cashscriptUtxo.template = new SignatureTemplate(wif)
      txBuilder.inputs.push(cashscriptUtxo)
    }

    const changeTokens = txBuilder.tokenChange(category)
    if (changeTokens < 0n) return { success: false, error: 'insufficient-tokens', category: category }
    if (changeTokens > 0n) {
      txBuilder.outputs.push({
        to: wallet.getAddressAt({ path: '1/0', token: true }),
        amount: 1000n,
        token: { category: category, amount: changeTokens }
      })
    }
  }

  const bchUtxos = txBuilder.excessSats < 0n ? await wallet.getUtxos() : []
  for(const utxo of bchUtxos) {
    if (txBuilder.excessSats >= 0n) break
    const wif = wallet.getPrivateKeyWifAt(utxo?.address_path)
    const cashscriptUtxo = watchtowerUtxoToCashscript(utxo)
    cashscriptUtxo.template = new SignatureTemplate(wif)
    console.log({ cashscriptUtxo })
    txBuilder.inputs.push(cashscriptUtxo)
  }

  if (txBuilder.excessSats < 0n) {
    return { success: false, error: 'insufficient-funds' }
  }

  if (txBuilder.excessSats > 546n) {
    const changeOutput = {
      to: wallet.getAddressAt({ path: '1/0', token: false }),
      amount: txBuilder.excessSats,
    }

    txBuilder.outputs.push(changeOutput)

    changeOutput.amount += txBuilder.excessSats
  }

  txBuilder.locktime = Number.isSafeInteger(opts?.locktime)
    ? opts?.locktime
    : await wallet.getBlockheight()

  const transaction = txBuilder.build()
  const txid = getTxid(transaction)

  const utxos = utxoSearchResults.map(utxo => {
    if (utxo.txid) return utxo

    utxo.txid = txid
    return utxo
  })

  return {
    success: true,
    transaction: transaction,
    utxos: utxos,
  }
}

/**
 * @param {Object} opts 
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {Number} opts.satoshis
 * @param {String} [opts.category]
 * @param {Number} [opts.tokenAmount]
 */
export async function searchUtxo(opts) {
  const wallet = opts?.wallet
  const utxos = await wallet.getUtxos(opts?.category || undefined)
  const utxo = utxos.find(utxo => {
    if (opts?.category) {
      if (opts?.category != utxo?.tokenid) return false
      if (parseFloat(opts?.tokenAmount) != parseFloat(utxo?.amount)) return false
    }
    return parseInt(opts?.satoshis) === parseInt(utxo?.value)
  })
  return utxo
}


/**
 * @param {Object} opts 
 * @param {Number} opts.id
 * @param {Boolean} opts.chipnet
 * @returns {Promise<{ id: Number, status: String, txid: String, message: String }>}
 */
export function getRedemptionContractTxStatus(opts) {
  const backend = getStablehedgeBackend(opts?.chipnet)
  return backend.get(`stablehedge/redemption-contract-transactions/${opts?.id}/history_detail/`)
    .then(response => {
      const data = response?.data
      return {
        ...data,
        id: data?.id,
        status: data?.status,
        txid: data?.txid,
        message: data?.result_message,
      }
    })
    .catch(error => {
      if (error?.response?.status === 404) return Promise.resolve()
        return Promise.reject(error)
    })
}

/**
 * @param {Object} opts 
 * @param {Number} opts.id
 * @param {Boolean} opts.chipnet
 * @param {Number} opts.timeout
 * @returns {Promise<{ id: Number, status: String, txid: String, message: String }>}
 */
export async function waitRedemptionContractTx(opts) {
  const results = await waitRedemptionContractTxs({
    ids: [opts?.id],
    chipnet: opts?.chipnet,
    timeout: opts?.timeout,
  })
  const result = results[0]
  if (result === 'timeout') throw result

  if (['success', 'failed'].includes(result?.status)) return result
}


/**
 * @param {Object} opts 
 * @param {Number[]} opts.ids
 * @param {Boolean} opts.chipnet
 * @param {Number} opts.timeout
 * @returns {Promise<{ id: Number, status: String, txid: String, message: String }[]>}
 */
export async function waitRedemptionContractTxs(opts) {
  /**
   * @type {Function[]} resolve or reject functions of manually created promises,
   *  will call them all at the end of function to handle unresolved promises
   *  which might cause memory leaks */
  const promiseCleanupCallbacks = []

  try {
    const txStatusResults = opts?.ids.map(id => {
      return { id: id, data: null }
    })
    const allResolved = () => txStatusResults.every(result => Boolean(result.data?.id))
  
    const timeoutDuration = parseInt(opts?.timeout) || 60 * 1000
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(resolve, timeoutDuration)
      promiseCleanupCallbacks.push(reject)
    })
  
    const stablehedgeRpc = new StablehedgeRPC({ chipnet: opts?.chipnet })
    const eventName = 'redemption_contract_tx_result'

    stablehedgeRpc.connect()

    const connectPromise = new Promise((resolve, reject) => {
      stablehedgeRpc.client.onOpen(async () => {
        txStatusResults.map(async result => {
          const eventParams = { id: parseInt(result.id) }
          await stablehedgeRpc.client.call('subscribe', [eventName, eventParams])
            .catch(console.error)
          resolve()
        })
      })
    })
  
    const websocketListenerPromise = new Promise((resolve, reject) => {
      promiseCleanupCallbacks.push(reject)
      const notificationHandler = (notification) => {
        const eventName = notification?.event
        const data = notification?.data
        if (eventName !== eventName) return
  
        const parseEventData = {
          ...data,
          id: data?.id,
          status: data?.status,
          txid: data?.txid,
          message: data?.message,
        }
        txStatusResults.forEach(result => {
          if (result?.id != result?.id) return
          result.data = parseEventData
        })
  
        if (allResolved()) resolve()
      }
  
      stablehedgeRpc.client.onNotification = [notificationHandler]
      stablehedgeRpc.client.onOpen(() => {
        txStatusResults.forEach(result => {
          const eventParams = { id: parseInt(result.id) }
          stablehedgeRpc.client.call('subscribe', [eventName, eventParams])
        })
      })
    })

    const apiFetch = () => new Promise(async (resolve, reject) => {
      promiseCleanupCallbacks.push(reject)

      const apiFetchPromises = txStatusResults.map(async result => {
        const id = result?.id
        const apiResult = await getRedemptionContractTxStatus({ id, chipnet: opts?.chipnet })
        if (!['success', 'failed'].includes(apiResult?.status)) return
        txStatusResults.forEach(result => {
          if (result?.id != id) return
          result.data = apiResult
        })
      })
      await Promise.allSettled(apiFetchPromises)
      if (allResolved()) resolve()
    })

    /**
     * We do fetch only after the websocket listener has finished subscribing.
     * 
     * This is to prevent cases where the fetch finishes and server fires the event
     * all before the websocket has finished event subscription.
     * 
     * When this happens the fetch result is outdated
     * while the websocket listener has missed the event being fired.
     */
    const connectAndApiFetchPromise = connectPromise.catch(console.error).then(() => apiFetch())

    console.log('Racing promises')
    console.log([
      timeoutPromise,
      websocketListenerPromise,
      connectAndApiFetchPromise,
    ])
    await Promise.race([
      timeoutPromise,
      websocketListenerPromise,
      connectAndApiFetchPromise,
    ])

    return txStatusResults.map(result => result?.data || 'timeout')
  } finally {
    promiseCleanupCallbacks?.forEach(func => func?.())
  }
}

/**
 * @callback UpdateLoadingCallback
 * @param {import("quasar").QLoadingUpdateOptions} opts
 * @returns {UpdateLoadingCallback}
 */

/**
 * 
 * @param {Object} opts 
 * @param {Number} [opts.locktime]
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} opts.redemptionContract
 * @param {UpdateLoadingCallback} [opts.updateLoading]
 */
export async function consolidateToReserveUtxo(opts) {
  const updateLoading = typeof opts?.updateLoading === 'function'
    ? opts?.updateLoading
    : () => {}

  const wallet = opts?.wallet
  const apiBackend = wallet.apiBackend
  const redemptionContract = opts?.redemptionContract
  const tokenCategory = redemptionContract.fiat_token.category

  updateLoading({ message: $t('FetchingLocktime') })
  const locktime = Number.isSafeInteger(opts?.locktime)
    ? opts?.locktime
    : await wallet.getBlockheight()

  updateLoading({ message: $t('FetchingContractArtifact') })
  const contract = await getRedemptionContractInstance({ redemptionContract })

  updateLoading({ message: $t('FetchingUtxos') })
  const addressParam = encodeURIComponent(contract.address)
  const tokenAddressParam = encodeURIComponent(contract.tokenAddress)

  const bchUtxosResp = await apiBackend.get(`utxo/bch/${addressParam}/`)
  /** @type {import("src/wallet/stablehedge/wallet").WatchtowerUtxo[]} */
  const bchUtxos = bchUtxosResp.data?.utxos

  const fiatTokenUtxosResp = await apiBackend.get(`utxo/ct/${tokenAddressParam}/${tokenCategory}/`)
  /** @type {import("src/wallet/stablehedge/wallet").WatchtowerUtxo[]} */
  const fiatTokenUtxos = fiatTokenUtxosResp.data?.utxos.filter(utxo => utxo?.tokenid === tokenCategory)
  if (!bchUtxos.length || !fiatTokenUtxos.length) throw $t('NoUtxoFound')

  updateLoading({ message: $t('FetchingAndSigningAuthToken') })
  const signedAuthKey = await wallet.fetchSignedAuthkey({
    locktime: locktime,
    authTokenId: redemptionContract?.auth_token_id,
  })
  if (typeof signedAuthKey === 'string') throw signedAuthKey
  const signedAuthKeyTokenDetails = {
    category: binToHex(signedAuthKey.source.token.category),
    amount: signedAuthKey.source.token.amount,
    nft: {
      capability: signedAuthKey.source.token.nft.capability,
      commitment: binToHex(signedAuthKey.source.token.nft.commitment),
    }
  }
  const mockAuthkeySignatureTemplate = mockSignatureTemplate(signedAuthKey.signatureData)

  const cashscriptTx = contract.functions.unlockWithNft(false)
  const inputSize = calculateInputSize(cashscriptTx)
  const txBuilder = new TransactionBalancer({ inputSizeCalculator: () => inputSize })
  txBuilder.inputs.push(
    ...bchUtxos.map(watchtowerUtxoToCashscript),
    ...fiatTokenUtxos.map(watchtowerUtxoToCashscript),
  )
  txBuilder.outputs.push({
    to: contract.tokenAddress,
    amount: 1000n,
    token: { category: redemptionContract.fiat_token.category, amount: 0n },
  })

  txBuilder.inputs.splice(1, 0, {
    txid: binToHex(signedAuthKey.input.outpointTransactionHash),
    vout: signedAuthKey.input.outpointIndex,
    satoshis: signedAuthKey.source.valueSatoshis,
    token: signedAuthKeyTokenDetails,
    template: mockAuthkeySignatureTemplate,
  });
  txBuilder.outputs.splice(1, 0, {
    to: lockingBytecodeToCashAddress(
      signedAuthKey.output.lockingBytecode,
      wallet.isChipnet ? 'bchtest' : 'bitcoincash',
      { tokenSupport: true },
    ),
    amount: signedAuthKey.source.valueSatoshis,
    token: signedAuthKeyTokenDetails,
  });

  if (txBuilder.excessSats < 0) throw $t('InsufficientBalance')

  txBuilder.outputs[0].amount += txBuilder.excessSats

  const tokenChange = txBuilder.tokenChange(redemptionContract.fiat_token.category)
  txBuilder.outputs[0].token.amount += tokenChange

  const transaction = cashscriptTx
    .from(txBuilder.inputs)
    .to(txBuilder.outputs)
    .withTime(locktime)

  console.log({ transaction, locktime })

  return transaction
}

/**
 * Only supports BCH for now
 * 
 * @param {Object} opts 
 * @param {Number} [opts.locktime]
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {import("src/wallet/stablehedge/interfaces").TreasuryContractApiData} opts.treasuryContract
 * @param {import("cashscript").Recipient[]} opts.recipients
 * @param {UpdateLoadingCallback} [opts.updateLoading]
 */
export async function createTreasuryContractTransaction(opts) {
  const updateLoading = typeof opts?.updateLoading === 'function'
    ? opts?.updateLoading
    : () => {}

  const wallet = opts?.wallet
  const treasuryContract = opts?.treasuryContract

  updateLoading({ message: $t('FetchingLocktime') })
  const locktime = Number.isSafeInteger(opts?.locktime)
    ? opts?.locktime
    : await wallet.getBlockheight()

  updateLoading({ message: $t('FetchingContractArtifact') })
  const contract = await getTreasuryContractInstance({ treasuryContract })

  updateLoading({ message: $t('FetchingAndSigningAuthToken') })
  const signedAuthKey = await wallet.fetchSignedAuthkey({
    locktime: locktime,
    authTokenId: treasuryContract?.auth_token_id,
  })
  if (typeof signedAuthKey === 'string') throw signedAuthKey
  const signedAuthKeyTokenDetails = {
    category: binToHex(signedAuthKey.source.token.category),
    amount: signedAuthKey.source.token.amount,
    nft: {
      capability: signedAuthKey.source.token.nft.capability,
      commitment: binToHex(signedAuthKey.source.token.nft.commitment),
    }
  }
  const mockAuthkeySignatureTemplate = mockSignatureTemplate(signedAuthKey.signatureData)

  if (opts?.recipients?.find(output => output?.token)) {
    throw $t('Sending tokens not supported')
  }

  const addressParam = encodeURIComponent(treasuryContract?.address)
  updateLoading({ message: $t('FetchingUtxos') })
  const utxosResp = await wallet.apiBackend.get(`utxo/bch/${addressParam}/`)
  /** @type {import('src/wallet/stablehedge/wallet').WatchtowerUtxo[]} */
  const utxos = utxosResp?.data?.utxos
  const bchUtxos = utxos.filter(utxo => !utxo?.tokenid)

  if (!bchUtxos.length) throw $t('NoUtxoFound')

  updateLoading({ message: $t('BuildingTransaction') })
  const cashscriptTx = contract.functions.unlockWithNft(false)
  const inputSize = calculateInputSize(cashscriptTx)
  const txBuilder = new TransactionBalancer({ inputSizeCalculator: () => inputSize })
  txBuilder.outputs.push(...opts?.recipients)

  for(var i = 0; i < bchUtxos?.length; i++) {
    const utxo = bchUtxos[i]
    if (txBuilder.excessSats > 0) break
    txBuilder.inputs.push({ txid: utxo?.txid, vout: utxo?.vout, satoshis: BigInt(utxo?.value) })
  }

  txBuilder.inputs.splice(1, 0, {
    txid: binToHex(signedAuthKey.input.outpointTransactionHash),
    vout: signedAuthKey.input.outpointIndex,
    satoshis: signedAuthKey.source.valueSatoshis,
    token: signedAuthKeyTokenDetails,
    template: mockAuthkeySignatureTemplate,
  });
  txBuilder.outputs.splice(1, 0, {
    to: lockingBytecodeToCashAddress(
      signedAuthKey.output.lockingBytecode,
      wallet.isChipnet ? 'bchtest' : 'bitcoincash',
      { tokenSupport: true },
    ),
    amount: signedAuthKey.source.valueSatoshis,
    token: signedAuthKeyTokenDetails,
  });

  if (txBuilder.excessSats < 0n) {
    console.error('Not enough balance', txBuilder)
    throw $t('NotEnoughForSendAmount')
  }
  if (txBuilder.excessSats > 546n) {
    const changeOutput = {
      to: contract.address,
      amount: txBuilder.excessSats,
    }

    txBuilder.outputs.push(changeOutput)

    changeOutput.amount += txBuilder.excessSats
  }

  const transaction = cashscriptTx
    .from(txBuilder.inputs)
    .to(txBuilder.outputs)
    .withTime(locktime)
  console.log({ locktime, transaction, txBuilder })

  return transaction
}


/**
 * Only supports BCH for now
 * 
 * @param {Object} opts 
 * @param {Number} [opts.locktime]
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {String} opts.recipientAddress
 * @param {import("src/wallet/stablehedge/interfaces").TreasuryContractApiData} [opts.treasuryContract]
 * @param {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} [opts.redemptionContract]
 * @param {import("cashscript").Recipient[]} opts.recipients
 * @param {UpdateLoadingCallback} [opts.updateLoading]
 */
export async function sweepContractWithAuthToken(opts) {
  console.log({opts}, opts?.redemptionContract)
  const updateLoading = typeof opts?.updateLoading === 'function'
  ? opts?.updateLoading
  : () => {}

  const wallet = opts?.wallet
  const apiBackend = wallet.apiBackend
  const recipientAddress = opts?.recipientAddress
  const recipientTokenAddress = toTokenAddress(opts?.recipientAddress)

  let contract, authTokenId
  if (opts?.treasuryContract) {
    contract = await getTreasuryContractInstance(opts)
    authTokenId = opts?.treasuryContract?.auth_token_id
  } else if (opts?.redemptionContract) {
    contract = await getRedemptionContractInstance(opts)
    authTokenId = opts?.redemptionContract?.auth_token_id
  } else {
    throw 'No contract data provided'
  }

  updateLoading({ message: $t('FetchingLocktime') })
  const locktime = Number.isSafeInteger(opts?.locktime)
    ? opts?.locktime
    : await wallet.getBlockheight()

  updateLoading({ message: $t('FetchingAndSigningAuthToken') })
  const signedAuthKey = await wallet.fetchSignedAuthkey({
    locktime: locktime,
    authTokenId: authTokenId,
  })
  if (typeof signedAuthKey === 'string') throw signedAuthKey
  const signedAuthKeyTokenDetails = {
    category: binToHex(signedAuthKey.source.token.category),
    amount: signedAuthKey.source.token.amount,
    nft: {
      capability: signedAuthKey.source.token.nft.capability,
      commitment: binToHex(signedAuthKey.source.token.nft.commitment),
    }
  }
  const mockAuthkeySignatureTemplate = mockSignatureTemplate(signedAuthKey.signatureData)
  

  updateLoading({ message: $t('FetchingUtxos') })
  const addressParam = encodeURIComponent(contract.address)
  const tokenAddressParam = encodeURIComponent(contract.tokenAddress)

  const bchUtxosResp = await apiBackend.get(`utxo/bch/${addressParam}/`)
  /** @type {import("src/wallet/stablehedge/wallet").WatchtowerUtxo[]} */
  const bchUtxos = bchUtxosResp.data?.utxos

  const fiatTokenUtxosResp = await apiBackend.get(`utxo/ct/${tokenAddressParam}/`)
  /** @type {import("src/wallet/stablehedge/wallet").WatchtowerUtxo[]} */
  const tokenUtxos = fiatTokenUtxosResp.data?.utxos

  if (!bchUtxos?.length && !tokenUtxos?.length) throw $t('NoUtxoFound')
  const nftUtxos = tokenUtxos.filter(utxo => utxo?.tokenid && utxo?.capability)
  const ftUtxos = tokenUtxos.filter(utxo => utxo?.tokenid && !utxo?.capability)

  updateLoading({ message: $t('BuildingTransaction') })
  const cashscriptTx = contract.functions.unlockWithNft(false)
  const inputSize = calculateInputSize(cashscriptTx)
  const txBuilder = new TransactionBalancer({ inputSizeCalculator: () => inputSize })

  txBuilder.inputs.push(...bchUtxos.map(watchtowerUtxoToCashscript))
  txBuilder.inputs.push(...ftUtxos.map(watchtowerUtxoToCashscript))
  const ftUtxoCategories = ftUtxos.map(utxo => utxo?.tokenid)
    .filter((element, index, list) => list.indexOf(element) === index)

  for (const tokenid of ftUtxoCategories) {
    const tokenChange = txBuilder.tokenChange(tokenid)
    if (tokenChange <= 0n) continue

    txBuilder.outputs.push({
      to: recipientTokenAddress,
      amount: 1000n,
      token: { category: tokenid, amount: tokenChange }
    })
  }

  for(const nftUtxo in nftUtxos) {
    const cashscriptUtxo = watchtowerUtxoToCashscript(nftUtxo)
    txBuilder.inputs.push(cashscriptUtxo)
    txBuilder.outputs.push({
      to: recipientTokenAddress,
      amount: cashscriptUtxo.satoshis,
      token: cashscriptUtxo.token,
    })
  }

  const authTokenInput = {
    txid: binToHex(signedAuthKey.input.outpointTransactionHash),
    vout: signedAuthKey.input.outpointIndex,
    satoshis: signedAuthKey.source.valueSatoshis,
    token: signedAuthKeyTokenDetails,
    template: mockAuthkeySignatureTemplate,
  }
  const authTokenOutput = {
    to: lockingBytecodeToCashAddress(
      signedAuthKey.output.lockingBytecode,
      wallet.isChipnet ? 'bchtest' : 'bitcoincash',
      { tokenSupport: true },
    ),
    amount: signedAuthKey.source.valueSatoshis,
    token: signedAuthKeyTokenDetails,
  }

  txBuilder.inputs.splice(1, 0, authTokenInput);
  txBuilder.outputs.splice(1, 0, authTokenOutput);

  if (txBuilder.excessSats < 0n) throw $t('InsufficientBalance')

  if (txBuilder.excessSats > 546n) {
    const changeOutput = {
      to: recipientAddress,
      amount: txBuilder.excessSats,
    }

    txBuilder.outputs.push(changeOutput)

    changeOutput.amount += txBuilder.excessSats
  }

  /**
   * In cases where only BCH is swept and no cashtokens,
   * there are no outputs when the authtoken output is added in the list
   * since the change output is always all the BCH swept.
   * 
   * This results in the auth token being added before the change output
   * causing it to be in index 0 when it's supposed to be in index 1
   */
  if (txBuilder.outputs.indexOf(authTokenOutput) != 1) {
    txBuilder.outputs = txBuilder.outputs.filter(output => output !== authTokenOutput)
    txBuilder.outputs.splice(1, 0, authTokenOutput);
  }

  const transaction = cashscriptTx
    .from(txBuilder.inputs)
    .to(txBuilder.outputs)
    .withTime(locktime)

  console.log({ transaction, locktime })
  return transaction
}