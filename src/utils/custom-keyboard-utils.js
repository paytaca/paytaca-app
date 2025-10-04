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
  if (asset?.id?.startsWith('ct/')) {
    if (asset.decimals === 0) {
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
 * Parse the locale-formatted `amount` by removing the group/thousand separators
 * and setting the decimal separator to a dot (**.**). This is done in order to
 * properly format the amount when using the custom keyboard.
 * @param {number | string} amount the formatted amount to be parsed
 * @param {boolean} isDecimalClicked determined whether the key clicked previously
 * is a decimal; if it is, then it will add a decimal point to the parsed amount
 * @returns the parsed amount
 */
export function parseFormattedAmount (amount, isDecimalClicked) {
  const separators = getLocaleSeparators()

  let parsedAmount = String(amount)
  if (parsedAmount !== '') {
    // split decimal from amount
    const splittedAmount = parsedAmount.split(separators.decimal)

    // remove thousand separators
    parsedAmount = splittedAmount[0].replaceAll(separators.group, '')
  
    // if decimal separator is not '.', replace it with '.'
    if (parseInt(splittedAmount[1]) > 0) {
      // remove dangling zero in decimal
      const nonZeroDec = splittedAmount[1].replaceAll('0', '')
      parsedAmount = `${parsedAmount}.${nonZeroDec}`
    }

    if (isDecimalClicked) parsedAmount = `${parsedAmount}.`
  }


  return parsedAmount
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
  let parsedAmount = amount

  // if clicked decimal
  if (key === '.') {
    // check if decimal is already present in formattedAmount
    if (!formattedAmount.includes(decimalSeparator)) {
      // if not present, format amount and append decimal
      parsedAmount = formatWithLocale(amount, decimalObj) + decimalSeparator
    }
  }
  //  else if clicked zero
  else if (key === '0') {
    // check if decimal is already present in amount
    if (amount.includes('.')) {
      // if present, format amount and append zero (already appended from parseKey)
      // split decimal numbers for possible zeros
      const amountSplit = String(amount).split('.')
      const combinedDecimal = `${decimalSeparator}${amountSplit[1]}`
      parsedAmount = `${formatWithLocale(amountSplit[0], decimalObj)}${combinedDecimal}`
    } else parsedAmount = formatWithLocale(amount, decimalObj)
  }

  return parsedAmount
}