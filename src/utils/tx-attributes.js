import { ellipsisText } from "src/wallet/anyhedge/formatters"
import { capitalize } from "vue"

const TxAttribute = Object.freeze({
  AnyhedgeFundingTx: 'anyhedge_funding_tx',
  AnyhedgeHedgeFundingUtxo: 'anyhedge_hedge_funding_utxo',
  AnyhedgeLongFundingUtxo: 'anyhedge_long_funding_utxo',
  AnyhedgeSettlementTx: 'anyhedge_settlement_tx',
  VoucherClaim: /voucher_claim_\d+/,
  SpicebotTip: 'spicebot_tip',
  GiftClaim: 'gift_claim',

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
 * @param {{ key:String, value:String }} attribute
 */
export function parseAttributeToBadge(attribute) {
  const icons = {
    anyhedge: 'img:anyhedge-logo.png',
    voucher_claim: 'mdi-ticket-confirmation',
  }

  const key = attribute?.key
  const value = attribute?.value
  if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeFundingTx)) {
    return {
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: 'Funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeHedgeFundingUtxo)) {
    return {
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: 'Short funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeLongFundingUtxo)) {
    return {
      custom: true,
      text: 'AnyHedge',
      icon: icons.anyhedge,
      description: 'Long funding transaction',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.VoucherClaim)) {
    return {
      custom: true,
      text: value,
      icon: 'mdi-ticket-confirmation',
      description: 'Voucher claim',
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.SpicebotTip)) {
    return {
      custom: true,
      text: 'Tip',
      description: 'Tip sent through Spicebot'
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.GiftClaim)) {
    return {
      custom: true,
      text: 'Gift',
      description: 'Gift Claim',
    }
  }

  return {
    custom: false,
    text: formatKeyName(key),
    description: value,
  }
}

/**
 * @note The 'actions' prop in data is intended to be a list of buttons and their
 *        actions when clicked/pressed but the function must be implemented in the component
 *        since it might use functions/data that are accessible within the component only

 * @param {{ key:String, value:String }} attribute 
 */
export function parseAttributeToDetails(attribute) {
  const key = attribute?.key
  const value = attribute?.value

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
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeHedgeFundingUtxo)) {
    return {
      groupName: 'AnyHedge',
      label: 'Short funding transaction',
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.AnyhedgeLongFundingUtxo)) {
    return {
      groupName: 'AnyHedge',
      label: 'Long funding transaction',
      text: ellipsisText(value, { end: 5 }),
      actions: anyhedgeActions(value),
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.VoucherClaim)) {
    return {
      groupName: value,
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.SpicebotTip)) {
    return {
      groupName: 'Spicebot Tip',
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  } else if (TxAttribute.isMatch(key, TxAttribute.GiftClaim)) {
    return {
      groupName: 'Gift Claim',
      label: '',
      text: value,
      actions: [{ icon: 'content_copy', type: 'copy_to_clipboard', args: [value] }],
    }
  }

  return {
    groupName: 'Other Details',
    label: formatKeyName(key),
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
