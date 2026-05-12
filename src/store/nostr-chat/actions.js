import { deriveNostrKeys, createUnsignedKind14, createNip17GiftWraps, computeRoomId, createKind10050, createReadReceiptGiftWrap, createReactionGiftWraps, createKind5DeletionGiftWraps } from 'src/wallet/nostr'
import { finalizeEvent, verifyEvent } from 'nostr-tools'
import { getMnemonic } from 'src/wallet'
import { decode as nip19Decode } from 'nostr-tools/nip19'
import * as relayService from 'src/services/nostr-chat'
import Watchtower from 'watchtower-cash-js'
import { getAuthHeaders, clearToken } from 'src/utils/watchtower-oauth'
import {
  encryptFile,
  decryptFile,
  createKind15FileMessage,
  wrapKind15FileMessage,
  uploadToBlossom,
  downloadFromBlossom,
  parseKind15FileMessage,
} from 'src/wallet/nostr-media'

const DISCOVERY_RELAYS = [
  'wss://relay.paytaca.com',
]

export async function reinitialize ({ commit, dispatch, state, rootGetters }) {
  const walletIndex = rootGetters['global/getWalletIndex']
  const mnemonic = await getMnemonic(walletIndex)
  if (!mnemonic) return

  const keys = deriveNostrKeys(mnemonic)
  if (state.keys.pubKeyHex === keys.pubKeyHex) return

  commit('SET_KEYS', keys)
  relayService.setAuthKey(keys.privKeyHex)

  // Register this wallet's Nostr pubkey in Watchtower
  await dispatch('registerNostrPubkey')

  // Restart relay subscription for the new identity
  relayService.stopStatusPolling()
  relayService.disconnect()
  commit('SET_SUBSCRIBED', false)
  dispatch('subscribeToRelays')
}

export async function initialize ({ commit, dispatch, state, rootGetters }) {
  const walletIndex = rootGetters['global/getWalletIndex']
  const mnemonic = await getMnemonic(walletIndex)
  if (!mnemonic) throw new Error('No mnemonic available')

  const keys = deriveNostrKeys(mnemonic)
  commit('SET_KEYS', keys)
  commit('SET_READY', true)
  commit('SET_INITIALIZED', true)
  commit('DEDUPLICATE_ROOMS')

  // Set up NIP-42 auth signer so relays like damus.io accept our publishes
  relayService.setAuthKey(keys.privKeyHex)

  // Publish kind:10050 relay preferences so other NIP-17 clients know where to reach us
  // This is re-published every time to ensure it lands on all relays
  await dispatch('publishKind10050')

  // Fetch historical gift-wraps that might have been published before our subscription started
  await dispatch('fetchHistoricalMessages')

  // Register this wallet's Nostr pubkey in Watchtower
  dispatch('registerNostrPubkey')
}

export async function registerNostrPubkey ({ state, rootGetters }) {
  if (!state.keys.pubKeyHex) {
    console.log('[Nostr] Skip pubkey registration: no pubkey')
    return
  }

  const walletIndex = rootGetters['global/getWalletIndex']
  const walletHash = rootGetters['global/getWalletHashByIndex']?.(walletIndex)
  if (!walletHash) {
    console.log('[Nostr] Skip pubkey registration: no wallet hash')
    return
  }

  const watchtower = new Watchtower(rootGetters['global/isChipnet'])

  // Check if already registered
  try {
    const checkResponse = await watchtower.BCH._api.get(`/nostr/check/${state.keys.pubKeyHex}/`)
    if (checkResponse?.data?.registered) {
      console.log('[Nostr] Pubkey already registered')
      return
    }
  } catch {
    // Check failed, proceed with registration attempt
  }

  const data = {
    pubkey: state.keys.pubKeyHex,
    wallet_hash: walletHash,
  }

  console.log('[Nostr] Registering pubkey...', data)

  try {
    const headers = await getAuthHeaders()
    const response = await watchtower.BCH._api.post('/nostr/register/', data, { headers })
    console.log('[Nostr] Pubkey registration successful:', response.data)
  } catch (err) {
    const status = err?.response?.status
    
    // If token expired (401), clear it and retry once
    if (status === 401) {
      console.log('[Nostr] Token expired, clearing and retrying...')
      await clearToken()
      try {
        const headers = await getAuthHeaders()
        const response = await watchtower.BCH._api.post('/nostr/register/', data, { headers })
        console.log('[Nostr] Pubkey registration successful (retry):', response.data)
        return
      } catch (retryErr) {
        console.warn('[Nostr] Retry failed:', retryErr?.response?.status, retryErr?.response?.data, retryErr?.message || retryErr)
        return
      }
    }
    
    console.warn('[Nostr] Failed to register pubkey:', status, err?.response?.data, err?.message || err)
  }
}

/**
 * Publish the user's BCH address as a NIP-78 replaceable event (kind:30078).
 * Signed by the user's Nostr key so any client can verify authenticity.
 */
export async function publishBchAddress ({ state, commit }, { address }) {
  if (!state.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = Uint8Array.from(Buffer.from(state.keys.privKeyHex, 'hex'))
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:bch-address'],
      ['p', state.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca BCH Address', data: { address } }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    console.warn('[Nostr] Publish failed:', errorDetails)
    throw new Error(`No relay accepted the event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('SET_PROFILE_BCH_ADDRESS', {
    address,
    publishedAt: event.created_at,
  })
  console.log('[Nostr] Published BCH address:', address)
}

/**
 * Remove the published BCH address by publishing an empty kind:30078 event.
 */
export async function removeBchAddress ({ state, commit }) {
  if (!state.keys.privKeyHex) {
    throw new Error('No Nostr private key available')
  }
  const privKeyBytes = Uint8Array.from(Buffer.from(state.keys.privKeyHex, 'hex'))
  const event = finalizeEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'paytaca:bch-address'],
      ['p', state.keys.pubKeyHex],
    ],
    content: JSON.stringify({ name: 'Paytaca BCH Address', data: {} }),
  }, privKeyBytes)

  const { accepted, errors } = await relayService.publishEvent(state.relays, event)
  if (accepted.length === 0) {
    const errorDetails = errors.map(e => `${e.relay}: ${e.reason}`).join('; ')
    console.warn('[Nostr] Removal publish failed:', errorDetails)
    throw new Error(`No relay accepted the removal event. ${errorDetails || 'Check console for details.'}`)
  }

  commit('CLEAR_PROFILE_BCH_ADDRESS')
  console.log('[Nostr] Removed published BCH address')
}

/**
 * Fetch a user's published BCH address from relays.
 * Returns the address string or null if not found.
 */
export async function fetchPublishedBchAddress ({ state }, { pubKeyHex }) {
  if (!pubKeyHex) {
    throw new Error('pubKeyHex is required')
  }

  const event = await relayService.fetchBchAddress(state.relays, pubKeyHex)

  if (!event) {
    console.log('[Nostr] No BCH address event found on relay')
    return null
  }

  if (!verifyEvent(event)) {
    console.warn('[Nostr] BCH address event failed signature verification')
    return null
  }

  // Parse JSON content — kind:30078 content is a JSON object
  let parsed
  try {
    parsed = JSON.parse(event.content || '{}')
  } catch {
    console.warn('[Nostr] BCH address event has invalid JSON content')
    return null
  }

  const address = parsed?.data?.address?.trim()
  if (!address) {
    console.log('[Nostr] BCH address event has no address — was removed or empty')
    return null
  }

  console.log('[Nostr] Found BCH address:', address)
  return address
}

export async function publishKind10050 ({ state }) {
  if (!state.keys.privKeyHex) return
  try {
    const kind10050 = createKind10050(state.relays, state.keys.privKeyHex)
    const accepted = await relayService.publishEvent(state.relays, kind10050)
    if (accepted.length === 0) {
      console.warn('[Nostr] kind:10050 was not accepted by any relay — other clients may not be able to reply')
    }
  } catch (err) {
    console.warn('[Nostr] Failed to publish kind:10050 relay preferences:', err)
  }
}

export async function fetchHistoricalMessages ({ state, dispatch }) {
  if (!state.keys.pubKeyHex) return
  try {
    await relayService.fetchHistoricalGiftWraps(DISCOVERY_RELAYS, state.keys.pubKeyHex, {
      async onEvent(event) {
        try {
          const { unwrapGiftWrap } = await import('src/wallet/nostr')
          const { rumor, sealPubkey } = unwrapGiftWrap(event, state.keys.privKeyHex)
          dispatch('receiveMessage', { rumor, sealPubkey })
        } catch (err) {
          console.warn('[Nostr] Failed to unwrap historical gift-wrap:', err)
        }
      },
    })
  } catch (err) {
    console.warn('[Nostr] Failed to fetch historical messages:', err)
  }
}

export function addContact ({ commit }, { name, npub }) {
  const decoded = nip19Decode(npub)
  if (decoded.type !== 'npub') throw new Error('Invalid npub')
  const pubKeyHex = decoded.data
  commit('ADD_CONTACT', { name, npub, pubKeyHex, addedAt: Date.now() })
}

export function updateContact ({ commit }, contact) {
  commit('UPDATE_CONTACT', contact)
}

export function removeContact ({ commit }, npub) {
  commit('REMOVE_CONTACT', npub)
}

export function createPrivateRoom ({ commit, getters, state }, contactNpub) {
  const contact = getters.getContactByNpub(contactNpub)
  if (!contact) throw new Error('Contact not found')

  const myPubKey = state.keys.pubKeyHex
  const roomId = computeRoomId([myPubKey, contact.pubKeyHex])

  const room = {
    id: roomId,
    type: 'private',
    name: contact.name || contact.npub.slice(0, 12) + '...',
    members: [myPubKey, contact.pubKeyHex],
    subject: null,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }

  commit('ADD_ROOM', room)
  return room
}

export async function createGroupRoom ({ commit, state }, { name, members, subject }) {
  const myPubKey = state.keys.pubKeyHex
  // Convert any npubs to hex pubkeys
  const memberHexes = members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })
  const allMembers = [...new Set([myPubKey, ...memberHexes])]
  const roomId = computeRoomId(allMembers)

  const room = {
    id: roomId,
    type: 'group',
    name: name || subject || 'Group Chat',
    members: allMembers,
    subject: subject || null,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }

  commit('ADD_ROOM', room)
  return room
}

export async function addMembersToRoom ({ state, commit }, { roomId, newMemberNpubs }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const myPubKey = state.keys.pubKeyHex
  const myPrivKey = state.keys.privKeyHex

  // Convert npubs → hex, deduplicate against existing members
  const newHexes = newMemberNpubs.map(npub => {
    if (npub.startsWith('npub1')) return nip19Decode(npub).data
    return npub
  }).filter(hex => !room.members.includes(hex))

  if (!newHexes.length) return

  // Resolve new member names for the system message text
  const contacts = state.contacts || []
  const newNames = newHexes.map(hex => {
    const c = contacts.find(c => c.pubKeyHex === hex)
    return c?.name || hex.slice(0, 8) + '...'
  })
  const text = newNames.length === 1
    ? `${newNames[0]} was added to the group`
    : `${newNames.slice(0, -1).join(', ')} and ${newNames[newNames.length - 1]} were added to the group`

  // Build the kind:14 rumor using the ORIGINAL member list so that
  // computeRoomId on the receiver side still matches the existing room.
  // New members are included only as gift-wrap recipients, not as p-tags.
  const originalMemberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) return nip19Decode(m).data
    return m
  })
  const allRecipients = [...new Set([...originalMemberHexes, ...newHexes])]

  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey: myPubKey,
    members: originalMemberHexes, // p-tags: original members only → roomId stays the same
    subject: room.subject || room.name,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, myPrivKey, allRecipients)

  const message = {
    id: unsignedKind14.id,
    content: text,
    sender: myPubKey,
    created_at: unsignedKind14.created_at,
    roomId,
    replyTo: null,
    subject: room.subject || room.name,
  }

  // Update members locally AFTER building the message so the p-tags are correct
  const updatedMembers = [...new Set([...room.members, ...newHexes])]
  commit('UPDATE_ROOM_MEMBERS', { roomId, members: updatedMembers })
  commit('ADD_MESSAGE', { roomId, message })

  for (const giftWrap of giftWraps) {
    await relayService.publishEvent(state.relays, giftWrap)
  }
}

export async function sendMessage ({ state }, { roomId, text, replyTo, subject }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = state.keys.privKeyHex
  const senderPubKey = state.keys.pubKeyHex

  // Ensure members are hex pubkeys (convert any npubs)
  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey,
    members: memberHexes,
    replyTo,
    subject,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, senderPrivKey, memberHexes)

  const message = {
    id: unsignedKind14.id,
    content: text,
    sender: senderPubKey,
    created_at: unsignedKind14.created_at,
    kind14Id: unsignedKind14.id,
    replyTo,
    localSentAt: Date.now(),
  }

  return { giftWraps, message, roomId }
}

export async function sendEditMessage ({ state }, { roomId, text, editOf }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = state.keys.privKeyHex
  const senderPubKey = state.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey,
    members: memberHexes,
    editOf,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, senderPrivKey, memberHexes)

  const message = {
    id: unsignedKind14.id,
    content: text,
    sender: senderPubKey,
    created_at: unsignedKind14.created_at,
    kind14Id: unsignedKind14.id,
    editOf,
    localSentAt: Date.now(),
  }

  return { giftWraps, message, roomId }
}

export async function sendDeleteMessage ({ state }, { roomId, messageId }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = state.keys.privKeyHex
  const senderPubKey = state.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  const giftWraps = await createKind5DeletionGiftWraps({
    messageId,
    senderPubKey,
    members: memberHexes,
    senderPrivKey,
  })

  return { giftWraps, messageId, roomId }
}

/**
 * Send an encrypted file (image, video, document) to a chat room.
 * Implements NIP-17 kind:15 file message with Blossom upload.
 * @param {Object} context
 * @param {Object} payload
 * @param {string} payload.roomId - Room ID
 * @param {File} payload.file - File to upload
 * @param {string} [payload.replyTo] - Optional message ID being replied to
 * @returns {Promise<{ giftWraps: any[], message: any, roomId: string }>}
 */
export async function sendFileMessage ({ state }, { roomId, file, replyTo, onProgress, signal }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = state.keys.privKeyHex
  const senderPubKey = state.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })

  if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')

  if (onProgress) onProgress(0.05)
  const { encrypted, aesKeyHex, nonceHex, hash, originalHash, mimeType, size: encryptedSize, imageWidth, imageHeight } = await encryptFile(file)

  if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')

  if (onProgress) onProgress(0.1)
  const blossomServer = 'https://blossom.paytaca.com'
  const { url: fileUrl } = await uploadToBlossom(encrypted, blossomServer, senderPrivKey, senderPubKey, {
    onProgress: (p) => {
      if (onProgress) onProgress(0.1 + p * 0.8)
    },
    signal,
  })

  if (onProgress) onProgress(0.9)
  const kind15Event = createKind15FileMessage({
    senderPubKey,
    members: memberHexes,
    fileUrl,
    mimeType,
    aesKeyHex,
    nonceHex,
    hash,
    originalHash,
    size: encryptedSize,
    fileName: file.name,
    imageWidth,
    imageHeight,
    replyTo,
  })

  const giftWraps = await wrapKind15FileMessage(kind15Event, senderPrivKey, memberHexes)

  if (onProgress) onProgress(0.95)
  const message = {
    id: kind15Event.id,
    content: fileUrl,
    sender: senderPubKey,
    created_at: kind15Event.created_at,
    kind15Id: kind15Event.id,
    fileType: mimeType,
    fileName: file.name,
    fileSize: file.size,
    encryptedSize,
    hash,
    originalHash,
    aesKeyHex,
    nonceHex,
    imageWidth,
    imageHeight,
    replyTo,
    localSentAt: Date.now(),
    isFile: true,
  }

  if (onProgress) onProgress(1)
  return { giftWraps, message, roomId }
}

export async function sendReaction ({ state, commit }, { roomId, messageId, emoji }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const reactorPrivKey = state.keys.privKeyHex
  const reactorPubKey = state.keys.pubKeyHex

  // Convert npubs to hex and find other members (for group chats)
  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })
  const otherMembers = memberHexes.filter(m => m !== reactorPubKey)
  const senderPubKey = otherMembers[0] || reactorPubKey

  const giftWraps = await createReactionGiftWraps({
    messageId,
    senderPubKey,
    recipientPubKeys: memberHexes,
    emoji,
    reactorPubKey,
    reactorPrivKey,
  })

  commit('ADD_MESSAGE_REACTION', {
    roomId,
    messageId,
    reactorPubKey,
    emoji,
    createdAt: Date.now(),
  })

  for (const giftWrap of giftWraps) {
    await relayService.publishEvent(state.relays, giftWrap)
  }
}

export async function removeReaction ({ state, commit }, { roomId, messageId, emoji }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const reactorPrivKey = state.keys.privKeyHex
  const reactorPubKey = state.keys.pubKeyHex

  const memberHexes = room.members.map(m => {
    if (m.startsWith('npub1')) {
      const decoded = nip19Decode(m)
      return decoded.data
    }
    return m
  })
  const otherMembers = memberHexes.filter(m => m !== reactorPubKey)
  const senderPubKey = otherMembers[0] || reactorPubKey

  commit('REMOVE_MESSAGE_REACTION', {
    roomId,
    messageId,
    reactorPubKey,
    emoji,
  })

  const giftWraps = await createReactionGiftWraps({
    messageId,
    senderPubKey,
    recipientPubKeys: memberHexes,
    emoji: `-${emoji}`,
    reactorPubKey,
    reactorPrivKey,
  })

  for (const giftWrap of giftWraps) {
    await relayService.publishEvent(state.relays, giftWrap)
  }
}

export async function publishGiftWraps ({ state }, { giftWraps }) {
  // Start with our own relays as fallback
  let targetRelays = new Set(state.relays)

  // Try to fetch each recipient's kind:10050 and add their preferred relays
  for (const gw of giftWraps) {
    const recipient = gw.tags.find(t => t[0] === 'p')?.[1]
    if (!recipient || recipient === state.keys.pubKeyHex) continue
    try {
      const event = await relayService.fetchKind10050(state.relays, recipient)
      if (event?.tags) {
        for (const tag of event.tags) {
          if (tag[0] === 'relay' && tag[1]) targetRelays.add(tag[1])
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch kind:10050 for ${recipient}:`, err)
    }
  }

  await relayService.publish(Array.from(targetRelays), giftWraps)
}

export function receiveMessage ({ commit, state }, { rumor, sealPubkey }) {
  // Verify sender pubkey consistency (NIP-17 requirement)
  if (rumor.pubkey !== sealPubkey) {
    console.warn('[Nostr] Pubkey mismatch in received message: seal says', sealPubkey, 'but rumor says', rumor.pubkey)
    return
  }

  const myPubKey = state.keys.pubKeyHex

  // Handle Kind 7 read receipts (👀 reactions)
  if (rumor.kind === 7 && rumor.content === '👀') {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return

    const messageId = eTag[1]
    const readerPubKey = rumor.pubkey

    if (messageId && readerPubKey) {
      // Find the room that contains this message — avoids assuming a 2-person room,
      // which breaks for group chats where computeRoomId needs all member pubkeys.
      const roomId = Object.keys(state.messages).find(
        rid => state.messages[rid]?.some(m => m.id === messageId)
      )
      if (roomId) {
        commit('SET_MESSAGE_READ_BY', {
          roomId,
          messageId,
          readerPubKey,
        })
      }
    }
    return
  }

  // Handle Kind 7 emoji reactions (NIP-25)
  if (rumor.kind === 7 && rumor.content !== '👀') {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return

    const messageId = eTag[1]
    const reactorPubKey = rumor.pubkey
    const content = rumor.content
    const isDeletion = content.startsWith('-')

    if (messageId && reactorPubKey && content) {
      // Find the room that contains this message — avoids assuming a 2-person room,
      // which breaks for group chats where computeRoomId needs all member pubkeys.
      const roomId = Object.keys(state.messages).find(
        rid => state.messages[rid]?.some(m => m.id === messageId)
      )
      if (!roomId) return

      if (isDeletion) {
        const emoji = content.slice(1)
        commit('REMOVE_MESSAGE_REACTION', {
          roomId,
          messageId,
          reactorPubKey,
          emoji,
        })
      } else {
        commit('ADD_MESSAGE_REACTION', {
          roomId,
          messageId,
          reactorPubKey,
          emoji: content,
          createdAt: rumor.created_at * 1000,
        })
      }
    }
    return
  }

  // Handle Kind 5 deletion events
  if (rumor.kind === 5) {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return
    const messageId = eTag[1]
    const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => t[1])
    const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
    const roomId = computeRoomId(roomMembers)

    commit('DELETE_MESSAGE', { roomId, messageId })
    return
  }

  // Handle Kind 15 file messages
  if (rumor.kind === 15) {
    const parsed = parseKind15FileMessage(rumor)
    if (!parsed) return

    const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => t[1])
    const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
    const roomId = computeRoomId(roomMembers)

    let room = state.rooms.find(r => r.id === roomId)
    if (!room) {
      if (state.blockedContacts?.includes(rumor.pubkey)) return
      const isGroup = roomMembers.length > 2
      const contact = state.contacts.find(c => c.pubKeyHex === rumor.pubkey)
      room = {
        id: roomId,
        type: isGroup ? 'group' : 'private',
        name: contact?.name || rumor.pubkey.slice(0, 12) + '...',
        members: roomMembers,
        subject: null,
        createdAt: rumor.created_at,
        updatedAt: rumor.created_at,
      }
      commit('ADD_ROOM', room)
    } else if (room.type !== 'group' && roomMembers.length > 2) {
      commit('UPDATE_ROOM_TYPE', { roomId, type: 'group' })
    }

    const replyTo = rumor.tags.find(t => t[0] === 'e')?.[1] || null

    const message = {
      id: rumor.id,
      content: parsed.fileUrl,
      sender: rumor.pubkey,
      created_at: rumor.created_at,
      kind15Id: rumor.id,
      fileType: parsed.mimeType,
      fileName: parsed.fileName,
      fileSize: parsed.size,
      encryptedSize: parsed.size,
      hash: parsed.hash,
      originalHash: parsed.originalHash,
      aesKeyHex: parsed.aesKeyHex,
      nonceHex: parsed.nonceHex,
      imageWidth: parsed.imageWidth,
      imageHeight: parsed.imageHeight,
      replyTo,
      localReceivedAt: Date.now(),
      isFile: true,
    }

    commit('ADD_MESSAGE', { roomId, message })
    return
  }

  // Only process Kind 14 chat messages
  if (rumor.kind !== 14) return

  const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => t[1])
  const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
  const roomId = computeRoomId(roomMembers)

  let room = state.rooms.find(r => r.id === roomId)
  if (!room) {
    // Before creating a new room, check if an existing room has the same member set
    // (handles the case where a room was previously stored under a different ID)
    const memberKey = roomMembers.slice().sort().join(',')
    const existingByMembers = state.rooms.find(r =>
      (r.members || []).slice().sort().join(',') === memberKey
    )
    if (existingByMembers) {
      // Reuse the existing room — store the message under its ID
      room = existingByMembers
      const replyTo = rumor.tags.find(t => t[0] === 'e')?.[1] || null
      const subject = rumor.tags.find(t => t[0] === 'subject')?.[1] || null
      if (subject && room.subject !== subject) {
        commit('UPDATE_ROOM_SUBJECT', { roomId: room.id, subject })
      }
      const msg = {
        id: rumor.id,
        content: rumor.content,
        sender: rumor.pubkey,
        created_at: rumor.created_at,
        roomId: room.id,
        replyTo,
        subject,
      }
      commit('ADD_MESSAGE', { roomId: room.id, message: msg })
      return
    }

    // Skip auto-creation if the sender is blocked
    if (state.blockedContacts?.includes(rumor.pubkey)) return

    const isGroup = roomMembers.length > 2
    const contact = state.contacts.find(c => c.pubKeyHex === rumor.pubkey)
    room = {
      id: roomId,
      type: isGroup ? 'group' : 'private',
      name: contact?.name || rumor.pubkey.slice(0, 12) + '...',
      members: roomMembers,
      subject: null,
      createdAt: rumor.created_at,
      updatedAt: rumor.created_at,
    }
    commit('ADD_ROOM', room)
  } else if (room.type !== 'group' && roomMembers.length > 2) {
    // Upgrade existing private room to group if we discover it has more than 2 members
    commit('UPDATE_ROOM_TYPE', { roomId, type: 'group' })
  }

  const replyTo = rumor.tags.find(t => t[0] === 'e')?.[1] || null
  const editOf = rumor.tags.find(t => t[0] === 'edit')?.[1] || null
  const subject = rumor.tags.find(t => t[0] === 'subject')?.[1] || null

  if (subject && room.subject !== subject) {
    commit('UPDATE_ROOM_SUBJECT', { roomId, subject })
  }

  if (editOf) {
    const originalMsg = (state.messages[roomId] || []).find(m => m.id === editOf)
    if (originalMsg) {
      commit('UPDATE_MESSAGE', { roomId, messageId: editOf, newContent: rumor.content })
      return
    }
  }

  const message = {
    id: rumor.id,
    content: rumor.content,
    sender: rumor.pubkey,
    created_at: rumor.created_at,
    kind14Id: rumor.id,
    replyTo,
    editOf,
    localReceivedAt: Date.now(),
  }

  commit('ADD_MESSAGE', { roomId, message })
}

export async function markRoomAsRead ({ commit, state }, roomId) {
  const myPubKey = state.keys.pubKeyHex
  const myPrivKey = state.keys.privKeyHex
  if (!myPubKey || !myPrivKey) return

  const messages = state.messages[roomId] || []
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) return

  // Find messages sent by the OTHER person that we haven't read yet
  const readIds = state.readMessageIds?.[roomId] || {}
  const unreadMessages = messages.filter(
    m => m.sender !== myPubKey && !readIds[m.id]
  )

  // Mark them as read locally
  if (unreadMessages.length) {
    commit('MARK_MESSAGES_AS_READ', {
      roomId,
      messageIds: unreadMessages.map(m => m.id),
    })
  }

  // Send Kind 7 "👀" read receipt gift-wraps back to each sender.
  // This lets the sender's client know we've read their messages.
  const senderMap = new Map()
  for (const msg of unreadMessages) {
    if (!senderMap.has(msg.sender)) {
      senderMap.set(msg.sender, [msg.id])
    } else {
      senderMap.get(msg.sender).push(msg.id)
    }
  }

  for (const [senderPubKey, messageIds] of senderMap) {
    for (const messageId of messageIds) {
      try {
        const giftWrap = await createReadReceiptGiftWrap({
          messageId,
          senderPubKey,
          receiverPubKey: myPubKey,
          receiverPrivKey: myPrivKey,
        })
        await relayService.publishEvent(state.relays, giftWrap)
      } catch (err) {
        console.warn('[Nostr] Failed to send read receipt:', err)
      }
    }
  }
}

export function subscribeToRelays ({ state, dispatch, commit }) {
  const myPubKey = state.keys.pubKeyHex
  if (!myPubKey) return

  const sub = relayService.subscribeGiftWraps(state.relays, myPubKey, {
    async onEvent(event) {
      try {
        const { unwrapGiftWrap } = await import('src/wallet/nostr')
        const { rumor, sealPubkey } = unwrapGiftWrap(event, state.keys.privKeyHex)
        dispatch('receiveMessage', { rumor, sealPubkey })
      } catch (err) {
        console.warn('[Nostr] Failed to unwrap gift-wrap:', err)
      }
    },
  })

  commit('SET_SUBSCRIBED', relayService.isSubscribed())

  // Only start status polling if not already running
  if (!relayService.isSubscribed()) {
    relayService.startStatusPolling(state.relays, (status) => {
      for (const url of state.relays) {
        const s = status[url] || 'disconnected'
        commit('SET_RELAY_STATUS', { url, status: s })
      }
    }, 15000)
  }

  return sub
}

let _lastEnsureTime = 0
const ENSURE_COOLDOWN_MS = 2000

export function ensureSubscribed ({ dispatch, getters }) {
  const now = Date.now()

  // Debounce: skip if we ensured recently
  if ((now - _lastEnsureTime) < ENSURE_COOLDOWN_MS) return
  _lastEnsureTime = now

  // Always re-register pubkey-to-wallet mapping when chat opens
  // This ensures the pubkey stays registered in Watchtower
  dispatch('registerNostrPubkey')

  // Skip if already subscribed and not stale
  if (relayService.isSubscribed() && getters['isInitialized']) return

  // Ensure we have an active relay subscription,
  // especially after the app has been backgrounded or a push arrives.
  if (!getters['isInitialized']) {
    dispatch('initialize').then(() => {
      dispatch('subscribeToRelays')
    })
  } else {
    dispatch('subscribeToRelays')
  }
}

export function disconnectRelays ({ commit }) {
  relayService.stopStatusPolling()
  relayService.disconnect()
  commit('SET_SUBSCRIBED', false)
}
