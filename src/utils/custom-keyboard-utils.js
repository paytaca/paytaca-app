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
