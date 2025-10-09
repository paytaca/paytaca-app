import { i18n } from 'src/boot/i18n'

const { t: $t } = i18n.global

const STABLEHEDGE_TX_ATTRIBUTE_META_KEY = 'stablehedge_transaction'

/**
 * @param {Object} txRecord 
 * @param {{ key:String, value:String, description?:String }[]} txRecord.attributes
 */
export function extractStablehedgeTxData(txRecord) {
  const attribute = txRecord?.attributes?.find(attr => {
    return attr.key === STABLEHEDGE_TX_ATTRIBUTE_META_KEY
  })
  if (!attribute) return

  return parseStablehedgeTxData(attribute.value)
}

/**
 * @param {String | Object} data 
 */
export function parseStablehedgeTxData(data) {
  const result = {
    id: 0,
    redemptionContract: '',
    transactionType: '',
    transactionTypeText: '',
    price: 0,
    currency: '',
    satoshis: 0,
    amount: 0,
    bch: 0,
  }
  let _parsedData = {}
  if (typeof data === 'string') {
    try {
      _parsedData = JSON.parse(data)
    } catch {
      return
    }
  } else {
    _parsedData = data
  }

  result.id = _parsedData?.id
  result.redemptionContract = _parsedData?.redemptionContract || _parsedData?.redemption_contract
  result.transactionType = _parsedData?.transactionType || _parsedData?.transaction_type
  result.transactionTypeText = parseTransactionTypeText(result.transactionType)
  result.price = _parsedData?.price
  result.currency = _parsedData?.currency
  result.satoshis = _parsedData?.satoshis
  result.amount = _parsedData?.amount
  result.bch = result.satoshis / 10 ** 8

  const txType = result.transactionType
  if (txType === 'inject' || txType === 'deposit') {
    result.satoshis = Math.abs(result.satoshis) * -1
    result.bch = Math.abs(result.bch) * -1
  } else if (txType === 'redeem') {
    result.amount = Math.abs(result.amount) * -1
  }

  return result
}


export function parseTransactionTypeText(transactionType='') {
  switch(transactionType) {
    case('inject'):
      return $t('Inject')
    case('deposit'):
      return $t('Deposit')
    case('redeem'):
      return $t('Redeem')
  }
}

/**
 * @param {Object} data 
 * @param {Number} data.id
 * @param {String} data.redemption_contract_address
 * @param {'pending' | 'success' | 'failed'} data.status
 * @param {'inject' | 'deposit' | 'redeem'} data.transaction_type
 * @param {String} data.category
 * @param {Number} data.price_value
 * @param {Number} data.satoshis
 * @param {Number} data.amount
 * @param {Number} data.fee_sats
 * @param {String} data.txid
 * @param {String} data.result_message
 * @param {String} data.resolved_at
 * @param {String} data.created_at
 */
export function parseStablehedgeHistory(data) {
  const timestamp = new Date(data?.resolved_at || data?.created_at) * 1
  const txType = data?.transaction_type
  const bch = data?.satoshis / 10 ** 8
  const fee = data?.fee_sats / 10 ** 8

  return {
    id: data?.id,
    redemptionContractAddress: data?.redemption_contract_address,
    status: data?.status,
    txType: txType,
    txTypeText: parseTransactionTypeText(txType) || txType,
    category: data?.category,
    priceValue: data?.price_value,
    bch: bch,
    amount: data?.amount,
    fee: fee,
    txid: data?.txid,
    resultMessage: data?.result_message,
    timestamp: timestamp,
  }
}
