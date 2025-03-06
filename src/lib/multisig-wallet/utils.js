/**
 *
 * // Example usage:
 * const m = 2 // Cosigners to select
 * const n = 3 // Total cosigners
 * const combinations = groupCosigners(m, n)
 * // Output:
 * [
 *  [1, 2],
 *  [1, 3],
 *  [2, 3]
 * ]
 */
export const groupCosigners = ({ m, n }) /*: str[][] */ => {
  const result = []

  const combine = (start, currentCombination) => {
    // If the current combination has m elements, add it to the result
    if (currentCombination.length === m) {
      result.push([...currentCombination])
      return
    }

    // Iterate over the remaining elements to form combinations
    for (let i = start; i <= n; i++) {
      currentCombination.push(i)
      combine(i + 1, currentCombination)
      currentCombination.pop()
    }
  }

  combine(1, [])
  return result
}
