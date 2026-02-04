import { formatWithLocale, getLocaleSeparators } from "./denomination-utils"

/**
 * Parses the key clicked in the custom keyboard and inserts
 * it into the text from the currently-focused input textfield.
 * @param {String} key the key pressed in the custom keyboard
 * @param {String} inputText the current text in the input textfield
 * @param {number} caret the current position of the caret in the focused input textfield
 * @param {Object} asset the selected asset
 * @returns the adjusted text with the inserted key
 */
export function parseKey (key, inputText, caret, asset) {
  let amount = inputText.toString()

  if (key === '.' && (inputText === '' || Number(amount) === 0)) {
    amount = '0.'
  } else if (key === '.') {
    // Handle decimal point insertion
    const hasPeriod = amount.indexOf('.')
    if (hasPeriod === -1) {
      // No decimal point yet, append it to the end
      amount = amount + '.'
    }
    // If decimal already exists, do nothing (prevent multiple decimals)
  } else {
    const hasPeriod = amount.indexOf('.')
    if (hasPeriod < 1) {
      if (Number(amount) === 0 && Number(amount) === Number(key)) {
        amount = '0'
      } else if (Number(amount) === 0 && Number(amount) !== Number(key)) {
        amount = key
      } else {
        amount = adjustSplicedAmount(amount, caret, key.toString())
      }
    } else {
      const tbaKey = key !== '.' ? key.toString() : ''
      amount = adjustSplicedAmount(amount, caret, tbaKey)
    }
  }

  amount = parseCtKey(amount, asset)

  return amount
}

/**
 * Parses the `amount` string to adhere to selected `asset` decimal rules.
 * @param {String} amount the given string
 * @param {Object} asset the selected asset
 * @returns the adjusted string if asset is a cashtoken; the unchanged string otherwise
 */
function parseCtKey (amount, asset) {
  // Validate decimals for both tokens and BCH
  if (asset?.decimals !== undefined && asset.decimals !== null) {
    if (asset.decimals === 0) {
      // Remove decimal point for tokens with 0 decimals
      amount = amount.toString().replace('.', '')
    } else {
      const parts = amount.toString().split('.')

      if (parts.length > 1) { // Ensure there's a decimal part
        // Truncate the decimal part to the desired length
        parts[1] = parts[1].slice(0, asset.decimals)
        amount = parts.join('.') // Recombine the integer and decimal parts
      }
    }
  }

  return amount
}

/**
 * Converts the given `text` string into an array then either inserts an
 * item to or deletes an element in the given `caretPosition` index. Mainly
 * used by the custom keyboard for the input textfield.
 * @param {String} text the given string
 * @param {number} caretPosition the position of the caret in the input field
 * @param {String | null} addedItem the item to add
 * @returns the adjusted text String
 */
export function adjustSplicedAmount (text, caretPosition, addedItem = null) {
  if (addedItem) {
    return text.split('').toSpliced(caretPosition, 0, addedItem).join('')
  }
  return text.split('').toSpliced(caretPosition, 1).join('')
}

/**
 * Selective locale formatting when either the decimal or zero key is clicked.
 * Since **Number.toLocaleString** does not handle numbers/number strings with
 * multiple zeros (for BCH amounts) properly, a custom logic is applied.
 * @param {String} amount the unformatted amount (no locale formatting applied)
 * @param {String} formattedAmount the formatted amount (locale formatting is applied)
 * @param {String} key the key pressed in the custom keyboard
 * @param {Object} decimalObj contains the min and max options for locale formatting
 * @returns the formatted amount as a **string**
 */
export function formatWithLocaleSelective (amount, formattedAmount, key, decimalObj) {
  const decimalSeparator = getLocaleSeparators().decimal
  // Ensure amount is a string
  const amountStr = String(amount || '')
  let parsedAmount = amountStr

  // if clicked decimal
  if (key === '.') {
    // check if decimal is already present in formattedAmount
    if (!formattedAmount.includes(decimalSeparator)) {
      // if not present, format amount and append decimal
      parsedAmount = formatWithLocale(amountStr, decimalObj) + decimalSeparator
    }
  }
  //  else if clicked zero
  else if (key === '0') {
    // check if decimal is already present in amount
    if (amountStr.includes('.')) {
      // if present, format amount and append zero (already appended from parseKey)
      // split decimal numbers for possible zeros
      const amountSplit = amountStr.split('.')
      const combinedDecimal = `${decimalSeparator}${amountSplit[1]}`
      parsedAmount = `${formatWithLocale(amountSplit[0], decimalObj)}${combinedDecimal}`
    } else parsedAmount = formatWithLocale(amountStr, decimalObj)
  }

  return parsedAmount
}