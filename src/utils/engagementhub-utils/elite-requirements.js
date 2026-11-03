function toFiniteNumber (value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function requirementState (balance, floor) {
  const balanceValue = toFiniteNumber(balance)
  const floorValue = toFiniteNumber(floor)

  if (balanceValue === null || floorValue === null || floorValue <= 0) return null

  const met = balanceValue >= floorValue

  return {
    met,
    progress: met ? 1 : Math.max(balanceValue / floorValue, 0),
    shortfall: met ? 0 : floorValue - balanceValue
  }
}
