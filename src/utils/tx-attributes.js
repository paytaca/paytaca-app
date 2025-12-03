import { ellipsisText } from "src/wallet/anyhedge/formatters"
import { capitalize } from "vue"
import { i18n } from 'src/boot/i18n'
import { parseFiatCurrency } from "./denomination-utils"
import { formatCauldronPoolAttribute, formatCauldronSwapAttribute } from "src/wallet/cauldron/utils"

const { t: $t } = i18n.global

const TxAttribute = Object.freeze({
  AnyhedgeFundingTx: 'anyhedge_funding_tx',
  AnyhedgeHedgeFundingUtxo: 'anyhedge_hedge_funding_utxo',
  AnyhedgeLongFundingUtxo: 'anyhedge_long_funding_utxo',
  AnyhedgeSettlementTx: 'anyhedge_settlement_tx',
  VaultPayment: /vault_payment_\d+/, // vault_payment_{pos_id}
  SpicebotTip: 'spicebot_tip',
  GiftClaim: 'gift_claim',
  Cashback: 'cashback',
  StablehedgeTransaction: 'stablehedge_transaction',
  MerchantCashout: 'merchant_cashout',
  CauldronSwap: 'cauldron-swap',
  CauldronPool: 'cauldron-pool',

  /**
   * @param {String} key the key in the attribute
   * @param {String | RegExp} name the value being matched on e.g. the values in this object
   */
  isMatch: (key, name) => {
    if (typeof name === 'string' && key === name) return true
    if (name instanceof RegExp && key.match(name)) return true
    return false
  }
})

export function formatKeyName(key='') {
  if (typeof key !== 'string') return
  
  return capitalize(key.replaceAll('_', ' ').replaceAll('-', ' '))
}


/**
 * @param {{ key:String, value:String, description?:String }} attribute
 */
export function parseAttributeToBadge(attribute) {
  const icons = {
    anyhedge: 'img:anyhedge-logo.png',
    vault_payment: 'mdi-ticket-confirmation',
    cashback: 'img:marketplace.png',
    cauldron: 'img:cauldron-logo.svg',
  }

  const key = attribute?.key
  const value = attribute?.value
  const description = attribute?.description
  if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeFundingTx)) {
    return {
      key,
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: description || 'Funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeHedgeFundingUtxo)) {
    return {
      key,
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: description || 'Short funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeLongFundingUtxo)) {
    return {
      key,
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: description || 'Long funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.VaultPayment)) {
    return {
      key,
      custom: true,
      text: value,
      icon: 'mdi-ticket-confirmation',
      description: description || 'Vault Payment',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.SpicebotTip)) {
    return {
      key,
      custom: true,
      text: 'Tip',
      description: description || 'Tip sent through Spicebot'
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.GiftClaim)) {
    return {
      key,
      custom: true,
      text: 'Gift',
      description: description || 'Gift Claim',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.Cashback)) {
    return {
      key,
      custom: true,
      text: 'Cashback',
      icon: icons.cashback,
      description: description || `Cashback from ${value}`
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.StablehedgeTransaction)) {
    const jsonValue = JSON.parse(value)
    const txType = jsonValue?.transaction_type
    const amount = jsonValue?.amount
    const currency = jsonValue?.currency

    const parsedAmount = parseFiatCurrency(amount, currency)
    let _description
    if (txType === 'inject' || txType === 'deposit') {
      _description = $t('StabilizeAmount', { amount: parsedAmount }, `Stabilize ${parsedAmount}`)
    } else {
      _description = $t('RedeemAmount', { amount: parsedAmount }, `Redeem ${parsedAmount}`)
    }

    return {
      key,
      custom: true,
      text: 'Stablehedge',
      // icon: icons.cashback,
      description: description || _description
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.MerchantCashout)) {
    return {
      key,
      custom: true,
      text: 'Cash out',
      icon: icons.cashback,
      description: description || `Merchant cash-out for ${value}`
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.CauldronSwap)) {
    const _description = formatCauldronSwapAttribute(value)
    return {
      key,
      custom: true,
      text: 'Cauldron DEX',
      icon: icons.cauldron,
      description: description || _description || 'Cauldron DEX Swap',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.CauldronPool)) {
    const _description = formatCauldronPoolAttribute(value)
    return {
      key,
      custom: true,
      text: 'Cauldron Pool',
      icon: icons.cauldron,
      description: description || _description,
    }
  }

  return {
    custom: false,
    text: formatKeyName(key),
    description: description || value,
  }
}

/**
 * @note The 'actions' prop in data is intended to be a list of buttons and their
 *        actions when clicked/pressed but the function must be implemented in the component
 *        since it might use functions/data that are accessible within the component only

 * @param {{ key:String, value:String, description?:String }} attribute 
 */
export function parseAttributeToDetails(attribute) {
  const DEFAULT_GROUP_NAME = "Other"
  const key = attribute?.key
  const value = attribute?.value
  const description = attribute?.description

  const anyhedgeActions = (address) => {
    return [
      { icon: 'content_copy', type: 'copy_to_clipboard', args: [address] },
      { icon: 'open_in_new', type: 'open_anyhedge_contract', args: [address] },
    ]
  }

  if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeFundingTx)) {
    return {
      key,
      groupName: 'AnyHedge',
      label: 'Funding transaction',
      tooltip: description,
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeHedgeFundingUtxo)) {
    return {
      key,
      groupName: 'AnyHedge',
      label: 'Short funding transaction',
      tooltip: description,
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeLongFundingUtxo)) {
    return {
      key,
      groupName: 'AnyHedge',
      label: 'Long funding transaction',
      tooltip: description,
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.VaultPayment)) {
    return {
      key,
      groupName: DEFAULT_GROUP_NAME,
      label: 'Vault Payment',
      tooltip: description,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.SpicebotTip)) {
    return {
      key,
      groupName: DEFAULT_GROUP_NAME,
      label: 'Spicebot Tip',
      tooltip: description,
      text: value,
      actions: [
        { icon: 'content_copy', type: 'copy_to_clipboard', args: [value] },
        { icon: 'open_in_new', type: 'open_jpp_invoice', args: [value] },
      ],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.GiftClaim)) {
    return {
      key,
      groupName: DEFAULT_GROUP_NAME,
      label: 'Gift Claim',
      tooltip: description,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.Cashback)) {
    return {
      key,
      groupName: 'Cashback',
      label: `${$t(
        'CashbackAttribute',
        'Cashback received for transacting with'
      )}:`,
      tooltip: description,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.StablehedgeTransaction)) {
    const jsonValue = JSON.parse(value)
    const txType = jsonValue?.transaction_type
    const amount = jsonValue?.amount
    const currency = jsonValue?.currency

    const parsedAmount = parseFiatCurrency(amount, currency)

    let description
    if (txType === 'inject' || txType === 'deposit') {
      description = $t('StabilizeAmount', { amount: parsedAmount }, `Stabilize ${parsedAmount}`)
    } else {
      description = $t('RedeemAmount', { amount: parsedAmount }, `Redeem ${parsedAmount}`)
    }

    return {
      key,
      groupName: 'Stablehedge',
      label: `${formatKeyName(txType)} transaction`,
      // icon: icons.cashback,
      tooltip: description,
      text: description, 
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.CauldronSwap)) {
    let description = formatCauldronSwapAttribute(value)
    return {
      key,
      groupName: 'Cauldron DEX',
      label: 'Cauldron DEX Swap',
      tooltip: description,
      text: description,
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.CauldronPool)) {
    let description = formatCauldronPoolAttribute(value)
    return {
      key,
      groupName: 'Cauldron',
      label: 'Cauldron Pool',
      tooltip: description,
      text: description,
    }
  }

  return {
    key,
    groupName: DEFAULT_GROUP_NAME,
    label: formatKeyName(key),
    tooltip: description,
    text: value,
    actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
  }
}

/**
 * 
 * @param {Object} opts
 * @param {{ key:String, value:String }[]} opts.attributes
 */
export function parseAttributesToGroups(opts) {
  const response = [].map(() => {
    return {
      name: '',
      items: [].map(parseAttributeToDetails)
    }
  })

  opts?.attributes?.forEach(attribute => {
    const parsedAttr = parseAttributeToDetails(attribute)

    const group = response.find(group => group?.name === parsedAttr?.groupName) || {
      name: parsedAttr?.groupName,
      items: [],
    }

    group.items.push(parsedAttr)
    if (!response.includes(group)) response.push(group)
  })
  return response
}
