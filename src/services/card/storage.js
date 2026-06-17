import { loadCardUser } from "./user"
import Card from "./card"

export const CardLinkAttemptStatus = {
  CARD_INITIATED: -1,
  CARD_SAVED: 0,
  GENESIS_MINTED: 1,
  GENESIS_SAVED: 2,
  CONTRACT_CREATED: 3,
  AUTH_ISSUED: 4
}

const LINK_CARD_ATTEMPT_STORAGE_KEY = 'card:create-attempt'

export async function saveLinkCardAttempt(walletHash, attempt) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to save link card attempt')
    }
  }
  const storageKey = `${LINK_CARD_ATTEMPT_STORAGE_KEY}:${walletHash}`
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      idempotencyKey: attempt.idempotencyKey,
      alias: attempt.alias || '',
      uid: attempt.uid || '',
      walletHash: attempt.walletHash,
      cardId: attempt.cardId || null,
      category: attempt.category || null,
      status: attempt.status || CardLinkAttemptStatus.CARD_SAVED,
      createdAt: attempt.createdAt || Date.now(),
      updatedAt: Date.now(),
    })
  )
}

export async function getLinkCardAttempt(walletHash) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to get link card attempt')
    }
  }
  const storageKey = `${LINK_CARD_ATTEMPT_STORAGE_KEY}:${walletHash}`
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export async function updateLinkCardAttempt(walletHash, patch) {
  const current = await getLinkCardAttempt(walletHash)
  if (!current) return null

  const nextValue = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }

  await saveLinkCardAttempt(walletHash, nextValue)
  return nextValue
}

export async function clearLinkCardAttempt(walletHash) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to clear link card attempt')
    }
  }
  await Card.deleteCardAttempt(walletHash).catch(err => {
    console.warn(`Failed to delete card attempt from server: ${err.response?.data?.message || err.message}`)
  })
  const storageKey = `${LINK_CARD_ATTEMPT_STORAGE_KEY}:${walletHash}`
  localStorage.removeItem(storageKey)
}