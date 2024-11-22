import { SignatureTemplate } from "cashscript";
import { getTxid } from "src/utils/crypto";
import { TransactionBalancer, watchtowerUtxoToCashscript } from "./transaction-utils";
import { StablehedgeRPC } from "./rpc";
import { getStablehedgeBackend } from "./api";

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
  return backend.get(`stablehedge/redemption-contract-transactions/${opts?.id}/`)
    .then(response => {
      const data = response?.data
      return {
        ...data,
        id: data?.id,
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
  const txStatusResults = await Promise.all(
    opts?.ids.map(async (id) => {
      return {
        id: id,
        data: await getRedemptionContractTxStatus({ id, chipnet: opts?.chipnet})
          .then(result => {
            if (['success', 'failed'].includes(result?.status)) return result
          })
          .catch(console.error)
      }
    })
  )
  const allResolved = () => txStatusResults.every(result => Boolean(result.data?.id))

  if (allResolved()) return txStatusResults.map(result => result?.data)

  const stablehedgeRpc = new StablehedgeRPC({ chipnet: opts?.chipnet })
  const eventName = 'redemption_contract_tx_result'
  return new Promise(resolve => {
    const resolveResults = () => resolve(txStatusResults.map(result => result?.data || 'timeout'))
    const onTimeout = () => resolveResults()
    const timeoutId = setTimeout(onTimeout, parseInt(opts?.timeout) || 60 * 1000)

    /**
     * @param {{ event: String, data: any }} notification 
     */
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

      if (allResolved()) {
        clearTimeout(timeoutId)
        resolveResults()
      }
    }

    stablehedgeRpc.client.onNotification = [notificationHandler]
    stablehedgeRpc.client.onOpen(() => {
      txStatusResults.forEach(result => {
        const eventParams = { id: parseInt(result.id) }
        stablehedgeRpc.client.call('subscribe', [eventName, eventParams])
      })
    })
    stablehedgeRpc.connect()
  })
  .finally(() => {
    stablehedgeRpc.disconnect()
  })
}
