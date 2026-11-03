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

export function eliteRequirements (thresholds, balances) {
  const bchThreshold = thresholds?.bch_min_threshold ?? null
  const liftThreshold = thresholds?.lift_min_threshold ?? null
  const bchBalance = balances?.bchBalance ?? null
  const liftBalance = balances?.liftBalance ?? null

  return {
    bchThreshold,
    liftThreshold,
    bchBalance,
    liftBalance,
    bch: requirementState(bchBalance, bchThreshold),
    lift: requirementState(liftBalance, liftThreshold)
  }
}
