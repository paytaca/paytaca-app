import { cardLogger } from 'src/utils/debug-logger.js'
import { loadCardUser } from "./user"
import Card from "./card"

export const CardActivationStatus = {
  NONE: -1,
  LINKING_TOKEN_REQUESTED: 0,
  LINKING_TOKEN_OBTAINED: 1,
  GENESIS_MINTED: 2,
  OWNERSHIP_UPDATED: 3,
  GLOBAL_AUTH_MINTED: 4,
  GLOBAL_AUTH_ISSUED: 5,
  VALIDATION_REQUESTED: 6,
}

export const CardMigrationStatus = {
  NONE: -1,
  STARTED: 0,
  TARGET_OWNERSHIP_SET: 1,
  POINTER_MINTED: 2,
  POINTER_ISSUED: 3,
  POINTER_COMMITTED: 4,
  BCH_SWEPT: 6,
  ACTIVATED: 8,
}

const CARD_ACTIVATION_STORAGE_KEY = 'card:activation-attempt'
const CARD_MIGRATION_STORAGE_KEY = 'card:migration-attempt'

/**
 * Persists per-card migration progress so a failed run (e.g. a pointer
 * mutation) can be resumed without re-minting or re-pointing blindly.
 * Keyed by card id/uid; the on-chain pointer remains authoritative.
 */
export async function saveCardMigrationAttempt(cardId, attempt) {
  if (!cardId) {
    throw new Error('Card id is required to save a migration attempt')
  }
  const storageKey = `${CARD_MIGRATION_STORAGE_KEY}:${cardId}`
  const nextValue = {
    cardId: String(cardId),
    sourceVersion: attempt.sourceVersion || null,
    targetVersion: attempt.targetVersion || null,
    status: attempt.status ?? CardMigrationStatus.NONE,
    pointerTxid: attempt.pointerTxid || null,
    pointerVout: attempt.pointerVout ?? null,
    pointerCommitment: attempt.pointerCommitment || null,
    pointerIssued: !!attempt.pointerIssued,
    createdAt: attempt.createdAt || Date.now(),
    updatedAt: Date.now(),
  }
  localStorage.setItem(storageKey, JSON.stringify(nextValue))
  return nextValue
}

export async function getCardMigrationAttempt(cardId) {
  if (!cardId) return null
  const storageKey = `${CARD_MIGRATION_STORAGE_KEY}:${cardId}`
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export async function updateCardMigrationAttempt(cardId, patch) {
  const current = await getCardMigrationAttempt(cardId)
  const nextValue = { ...(current || { cardId: String(cardId) }), ...patch, cardId: String(cardId), updatedAt: Date.now() }
  return saveCardMigrationAttempt(cardId, nextValue)
}

export async function clearCardMigrationAttempt(cardId) {
  if (!cardId) return
  localStorage.removeItem(`${CARD_MIGRATION_STORAGE_KEY}:${cardId}`)
}

export async function saveCardActivationAttempt(walletHash, attempt) {
  if (!walletHash) {
    const user = await loadCardUser()
    walletHash = user?.wallet?.walletHash
    if (!walletHash) {
      throw new Error('Wallet hash is required to save create card attempt')
    }
  }
  cardLogger.log('Saving card activation attempt for walletHash:', walletHash, 'attempt:', attempt)
  const storageKey = `${CARD_ACTIVATION_STORAGE_KEY}:${walletHash}`
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      idempotencyKey: attempt.idempotencyKey,
      walletHash: attempt.walletHash,
      ownershipCategory: attempt.ownershipCategory || null,
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
  const attempt = await getCardActivationAttempt(walletHash)
  const idempotencyKey = attempt?.idempotencyKey
  if (idempotencyKey) {
    await Card.deleteCardAttempt(idempotencyKey).catch(err => {
      cardLogger.warn(`Failed to delete card attempt from server: ${err.response?.data?.message || err.message}`)
    })
  }
  const storageKey = `${CARD_ACTIVATION_STORAGE_KEY}:${walletHash}`
  localStorage.removeItem(storageKey)
}