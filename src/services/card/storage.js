export const CardCreateAttemptStatus = {
  CARD_INITIATED: -1,
  CARD_SAVED: 0,
  GENESIS_MINTED: 1,
  GENESIS_SAVED: 2,
  AUTH_ISSUED: 3
}

const CREATE_CARD_ATTEMPT_STORAGE_KEY = 'card:create-attempt'

export function saveCreateCardAttempt(attempt) {
  localStorage.setItem(
    CREATE_CARD_ATTEMPT_STORAGE_KEY,
    JSON.stringify({
      idempotencyKey: attempt.idempotencyKey,
      alias: attempt.alias || '',
      walletHash: attempt.walletHash,
      cardId: attempt.cardId || null,
      category: attempt.category || null,
      status: attempt.status || CardCreateAttemptStatus.CARD_SAVED,
      createdAt: attempt.createdAt || Date.now(),
      updatedAt: Date.now(),
    })
  )
}

export function getCreateCardAttempt() {
  const raw = localStorage.getItem(CREATE_CARD_ATTEMPT_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(CREATE_CARD_ATTEMPT_STORAGE_KEY)
    return null
  }
}

export function updateCreateCardAttempt(patch) {
  const current = getCreateCardAttempt()
  if (!current) return null

  const nextValue = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }

  saveCreateCardAttempt(nextValue)
  return nextValue
}

export function clearCreateCardAttempt() {
  localStorage.removeItem(CREATE_CARD_ATTEMPT_STORAGE_KEY)
}