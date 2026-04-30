import { loadCardUser } from "./user"
import Card from "./card"

export const CardCreateAttemptStatus = {
  CARD_INITIATED: -1,
  CARD_SAVED: 0,
  GENESIS_MINTED: 1,
  GENESIS_SAVED: 2,
  AUTH_ISSUED: 3
}

const CREATE_CARD_ATTEMPT_STORAGE_KEY = 'card:create-attempt'

export async function saveCreateCardAttempt(walletHash, attempt) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to save create card attempt')
    }
  }
  const storageKey = `${CREATE_CARD_ATTEMPT_STORAGE_KEY}:${walletHash}`
  localStorage.setItem(
    storageKey,
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

export async function getCreateCardAttempt(walletHash) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to get create card attempt')
    }
  }
  const storageKey = `${CREATE_CARD_ATTEMPT_STORAGE_KEY}:${walletHash}`
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export async function updateCreateCardAttempt(walletHash, patch) {
  const current = await getCreateCardAttempt(walletHash)
  if (!current) return null

  const nextValue = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }

  await saveCreateCardAttempt(walletHash, nextValue)
  return nextValue
}

export async function clearCreateCardAttempt(walletHash) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to clear create card attempt')
    }
  }
  await Card.deleteCardAttempt(walletHash).catch(err => {
    console.warn(`Failed to delete card attempt from server: ${err.response?.data?.message || err.message}`)
  })
  const storageKey = `${CREATE_CARD_ATTEMPT_STORAGE_KEY}:${walletHash}`
  localStorage.removeItem(storageKey)
}