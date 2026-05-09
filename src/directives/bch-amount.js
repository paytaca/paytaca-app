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
  
  // Only apply to BCH denomination (not mBCH or sats)
  const normalizedDenom = denomination.toString().toUpperCase().replace(/[ΜμµÎœ]/gi, 'M');
  if (normalizedDenom !== 'BCH') {
    return;
  }

  // Get the text content
  const text = el.textContent || '';
  
  // Pattern to match BCH amounts with trailing zeros
  // Matches: "0.91801000" or "0.91801000 BCH" or "1,234.56780000"
  const pattern = /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d*?))(0+)(\s*(?:BCH)?)/i;
  const match = text.match(pattern);
  
  if (!match) {
    return; // No trailing zeros found
  }

  const [, mainPart, trailingZeros, symbolPart] = match;
  
  // Only apply if there are actually trailing zeros
  if (!trailingZeros || trailingZeros.length === 0) {
    return;
  }

  // Create the styled HTML
  const styledHTML = `${mainPart}<span style="opacity: 0.4;">${trailingZeros}</span>${symbolPart}`;
  
  // Apply to element
  el.innerHTML = styledHTML;
}
