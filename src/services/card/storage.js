import { loadCardUser } from "./user"
import Card from "./card"

export const CardActivationStatus = {
  NONE: -1,
  GENESIS_MINTED: 0,
  OWNERSHIP_UPDATED: 1,
  VALIDATION_REQUESTED: 2,
  GLOBAL_AUTH_MINTED: 3,
  GLOBAL_AUTH_ISSUED: 4
}

const CARD_ACTIVATION_STORAGE_KEY = 'card:activation-attempt'

export async function saveCardActivationAttempt(walletHash, attempt) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to save create card attempt')
    }
  }
  const storageKey = `${CARD_ACTIVATION_STORAGE_KEY}:${walletHash}`
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      idempotencyKey: attempt.idempotencyKey,
      alias: attempt.alias || '',
      uid: attempt.uid || '',
      walletHash: attempt.walletHash,
      cardId: attempt.cardId || null,
      category: attempt.category || null,
      status: attempt.status || CardActivationStatus.CARD_SAVED,
      createdAt: attempt.createdAt || Date.now(),
      updatedAt: Date.now(),
    })
  )
}

export async function getCardActivationAttempt(walletHash) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to get create card attempt')
    }
  }
  const storageKey = `${CARD_ACTIVATION_STORAGE_KEY}:${walletHash}`
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export async function updateCardActivationAttempt(walletHash, patch) {
  const current = await getCardActivationAttempt(walletHash)
  if (!current) return null

  const nextValue = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }

  await saveCardActivationAttempt(walletHash, nextValue)
  return nextValue
}

export async function clearCardActivationAttempt(walletHash) {
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
  const storageKey = `${CARD_ACTIVATION_STORAGE_KEY}:${walletHash}`
  localStorage.removeItem(storageKey)
}