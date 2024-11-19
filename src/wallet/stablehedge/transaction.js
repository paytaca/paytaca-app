import { SignatureTemplate } from "cashscript";
import { getTxid } from "src/utils/crypto";
import { TransactionBalancer, watchtowerUtxoToCashscript } from "./transaction-utils";
import { StablehedgeRPC } from "./rpc";
import { getStablehedgeBackend } from "./api";

/**
 * Creates a utxo with the specified amount of satoshis.
 * also supports fungible cashtoken if category and tokenAmount is provided
 * 
 * @param {Object} opts 
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {Number} opts.satoshis
 * @param {String} [opts.category]
 * @param {Number} [opts.tokenAmount]
 * @param {Number} [opts.locktime]
 * @returns {{success: Boolean, error?: String, utxo: import("./wallet").WatchtowerUtxo, transaction?: String }}
 */
export async function prepareUtxo(opts) {
  const wallet = opts?.wallet

  const utxo = await searchUtxo(opts)
  console.log({ utxo })
  if (utxo) return {
    success: true,
    utxo: utxo,
  }

  const txBuilder = new TransactionBalancer()
  txBuilder.outputs.push({
    to: wallet.getAddressAt({ path: '0/0', token: Boolean(opts?.category) }),
    amount: BigInt(opts?.satoshis),
    token: !opts?.category ? undefined : {
      category: opts?.category,
      amount: BigInt(opts?.tokenAmount),
    }
  })

  if (opts?.category && opts?.tokenAmount) {
    const tokenUtxos = await wallet.getUtxos(opts?.category)
    for(var index = 0; index < tokenUtxos.length; index++) {
      const changeTokens = txBuilder.tokenChange(opts?.category)
      if (changeTokens >= 0) break

      const utxo = tokenUtxos[index]
      const wif = wallet.getPrivateKeyWifAt(utxo?.address_path)
      const cashscriptUtxo = watchtowerUtxoToCashscript(utxo)

      cashscriptUtxo.template = new SignatureTemplate(wif)
      txBuilder.inputs.push(cashscriptUtxo)
    }
  }

  const changeTokens = txBuilder.tokenChange(opts?.category)
  if (changeTokens < 0n) {
    return { success: false, error: 'insufficient-tokens' }
  }

  if (changeTokens > 0n) {
    txBuilder.outputs.push({
      to: wallet.getAddressAt({ path: '1/0', token: true }),
      amount: 1000n,
      token: {
        category: opts?.category,
        amount: changeTokens,
      }
    })
  }

  const bchUtxos = txBuilder.excessSats < 0n ? await wallet.getUtxos() : []
  for(var index = 0; index < bchUtxos.length; index++) {
    if (txBuilder.excessSats >= 0n) break
    const utxo = bchUtxos[index];
    const wif = wallet.getPrivateKeyWifAt(utxo?.address_path)
    const cashscriptUtxo = watchtowerUtxoToCashscript(utxo)
    cashscriptUtxo.template = new SignatureTemplate(wif)
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
  
  const output = txBuilder.outputs[0]
  return {
    success: true,
    transaction: txBuilder.build(),
    utxo: {
      address_path: '0/0',
      txid: txid,
      vout: 0,
      value: Number(output.amount),
      is_cashtoken: Boolean(output?.token),
      tokenid: output?.token?.category || undefined,
      amount: Number(output?.token?.amount) || undefined,
      decimals: 0,
    }
  }
}

/**
 * @param {Object} opts 
 * @param {import("./wallet").StablehedgeWallet} opts.wallet
 * @param {Number} opts.satoshis
 * @param {String} [opts.category]
 * @param {Number} [opts.tokenAmount]
 * @param {Number} [opts.locktime]
 */
export async function searchUtxo(opts) {
  const wallet = opts?.wallet
  const utxos = await wallet.getUtxos(opts?.category || undefined)
  const utxo = utxos.find(utxo => {
    if (opts?.category) {
      if (!opts?.category != utxo?.tokenid) return false
      if (opts?.tokenAmount != parseFloat(utxo?.amount)) return false
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
  const txResultData = await getRedemptionContractTxStatus(opts).catch(console.error)
  if (['success', 'failed'].includes(txResultData?.status)) return txResultData

  const stablehedgeRpc = new StablehedgeRPC({ chipnet: opts?.chipnet })
  const eventName = 'redemption_contract_tx_result'
  const eventParams = { id: parseInt(opts.id) }
  return new Promise((resolve, reject) => {
    const onTimeout = () => reject('timeout')
    const timeoutId = setTimeout(onTimeout, parseInt(opts?.timeout) || 60 * 1000)

    /**
     * @param {{ event: String, data: any }} notification 
     */
    const notificationHandler = (notification) => {
      const eventName = notification?.event
      const data = notification?.data
      if (eventName !== eventName) return

      const result = {
        ...data,
        id: data?.id,
        status: data?.status,
        txid: data?.txid,
        message: data?.message,
      }
      clearTimeout(timeoutId)
      resolve(result)
    }

    stablehedgeRpc.client.onNotification = [notificationHandler]

    stablehedgeRpc.client.onOpen(() => {
      stablehedgeRpc.client.call('subscribe', [eventName, eventParams])
      getRedemptionContractTxStatus(opts)
        .then(response => {
          if (['success', 'failed'].includes(response?.status)) return response
        })
    })
    stablehedgeRpc.connect()
  }).finally(() => {
    stablehedgeRpc.disconnect()
  })
}
