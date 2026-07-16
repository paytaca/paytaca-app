import { loadCardUser } from "./user"
import Card from "./card"

export const CardActivationStatus = {
  NONE: -1,
  LINKING_TOKEN_REQUESTED: 0,
  LINKING_TOKEN_OBTAINED: 1,
  GENESIS_MINTED: 2,
  OWNERSHIP_UPDATED: 3,
  VALIDATION_REQUESTED: 4,
  GLOBAL_AUTH_MINTED: 5,
  GLOBAL_AUTH_ISSUED: 6
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
  console.log('Saving card activation attempt for walletHash:', walletHash, 'attempt:', attempt)
  const storageKey = `${CARD_ACTIVATION_STORAGE_KEY}:${walletHash}`
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      idempotencyKey: attempt.idempotencyKey,
      walletHash: attempt.walletHash,
      ownerCategory: attempt.ownerCategory || null,
      linkingCategory: attempt.linkingCategory || null,
      authCategory: attempt.authCategory || null,
      linkingTxid: attempt.linkingTxid || null,
      status: attempt.status,
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