import { ellipsisText } from "src/wallet/anyhedge/formatters"
import { capitalize } from "vue"
import { i18n } from 'src/boot/i18n'

const { t: $t } = i18n.global

const TxAttribute = Object.freeze({
  AnyhedgeFundingTx: 'anyhedge_funding_tx',
  AnyhedgeHedgeFundingUtxo: 'anyhedge_hedge_funding_utxo',
  AnyhedgeLongFundingUtxo: 'anyhedge_long_funding_utxo',
  AnyhedgeSettlementTx: 'anyhedge_settlement_tx',
  VoucherClaim: /voucher_claim_\d+/,
  SpicebotTip: 'spicebot_tip',
  GiftClaim: 'gift_claim',
  Cashback: 'cashback',

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
    voucher_claim: 'mdi-ticket-confirmation',
    cashback: 'img:marketplace.png'
  }

  const key = attribute?.key
  const value = attribute?.value
  const description = attribute?.description
  if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeFundingTx)) {
    return {
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: description || 'Funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeHedgeFundingUtxo)) {
    return {
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: description || 'Short funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeLongFundingUtxo)) {
    return {
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: description || 'Long funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.VoucherClaim)) {
    return {
      custom: true,
      text: value,
      icon: 'mdi-ticket-confirmation',
      description: description || 'Voucher claim',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.SpicebotTip)) {
    return {
      custom: true,
      text: 'Tip',
      description: description || 'Tip sent through Spicebot'
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.GiftClaim)) {
    return {
      custom: true,
      text: 'Gift',
      description: description || 'Gift Claim',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.Cashback)) {
    return {
      custom: true,
      text: 'Cashback',
      icon: icons.cashback,
      description: description || `Cashback from ${value}`
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
      groupName: 'AnyHedge',
      label: 'Funding transaction',
      tooltip: description,
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeHedgeFundingUtxo)) {
    return {
      groupName: 'AnyHedge',
      label: 'Short funding transaction',
      tooltip: description,
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeLongFundingUtxo)) {
    return {
      groupName: 'AnyHedge',
      label: 'Long funding transaction',
      tooltip: description,
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.VoucherClaim)) {
    return {
      groupName: DEFAULT_GROUP_NAME,
      label: 'Voucher claim',
      tooltip: description,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.SpicebotTip)) {
    return {
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
      groupName: DEFAULT_GROUP_NAME,
      label: 'Gift Claim',
      tooltip: description,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.Cashback)) {
    return {
      groupName: 'Cashback',
      label: `${$t(
        'CashbackAttribute',
        'Cashback received for transacting with'
      )}:`,
      tooltip: description,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  }

  return {
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
