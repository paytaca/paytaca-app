/**
 * v-bch-amount directive
 * 
 * Automatically applies gray styling to trailing zeros in BCH amounts for better readability.
 * 
 * Usage:
 *   <span v-bch-amount>0.91801000 BCH</span>
 *   <div v-bch-amount="{ denomination: 'BCH' }">{{ formattedAmount }}</div>
 * 
 * The directive:
 * - Detects trailing zeros after the decimal point
 * - Wraps them in a span with reduced opacity (40%)
 * - Only applies to BCH denomination (not mBCH or sats)
 * - Updates automatically when element content changes
 */

export default {
  mounted(el, binding) {
    applyGrayZeros(el, binding);
  },

  updated(el, binding) {
    applyGrayZeros(el, binding);
  }
};

function applyGrayZeros(el, binding) {
  // Get options from binding value
  const options = binding.value || {};
  const denomination = options.denomination || 'BCH';
  
  // Only apply to BCH denomination (not mBCH or sats or tokens)
  const normalizedDenom = denomination.toString().toUpperCase().replace(/[ΜμµÎœ]/gi, 'M');
  if (normalizedDenom !== 'BCH') {
    return;
  }

  // Get the text content
  const text = el.textContent || '';
  
  // Pattern to match BCH amounts with trailing zeros AFTER the decimal point
  // The zeros must be at the very end of the number (before optional symbol/text)
  // Matches: "0.91801000 BCH" -> gray the "000"
  // Matches: "0.91801000" -> gray the "000" (no BCH symbol)
  // Matches: "1,234.56780000" -> gray the "000"
  // Does NOT match: "100 BCH" (no decimal)
  // Does NOT match: "1000.12345678" (no trailing zeros)
  // Does NOT match: "1.09453099" (the 0 is not trailing, there's a 9 after it)
  
  // First, check if there's a decimal point
  if (!text.includes('.')) {
    return; // No decimal point, nothing to do
  }
  
  // Split on spaces to separate number from symbol
  const parts = text.split(/(\s+)/); // Keep the spaces
  const numberPart = parts[0];
  const rest = parts.slice(1).join('');
  
  // Check if the number ends with zeros after decimal point
  const pattern = /^([\d,\s]*\.\d*?[1-9])(0+)$/;
  const match = numberPart.match(pattern);
  
  if (!match) {
    return; // No trailing zeros found after decimal point
  }

  const [, mainPart, trailingZeros] = match;
  
  // Only apply if there are actually trailing zeros
  if (!trailingZeros || trailingZeros.length === 0) {
    return;
  }

  // Create the styled HTML  
  const styledHTML = `${mainPart}<span style="opacity: 0.4;">${trailingZeros}</span>${rest}`;
  
  // Apply to element
  el.innerHTML = styledHTML;
}
