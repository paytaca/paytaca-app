import { deriveNostrKeys, createUnsignedKind14, createNip17GiftWraps, computeRoomId, createKind10050 } from 'src/wallet/nostr'
import { getMnemonic } from 'src/wallet'
import { decode as nip19Decode } from 'nostr-tools/nip19'
import * as relayService from 'src/services/nostr-chat'

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

  // Restart relay subscription for the new identity
  relayService.stopStatusPolling()
  relayService.disconnect()
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

  // Set up NIP-42 auth signer so relays like damus.io accept our publishes
  relayService.setAuthKey(keys.privKeyHex)

  // Publish kind:10050 relay preferences so other NIP-17 clients know where to reach us
  // This is re-published every time to ensure it lands on all relays
  await dispatch('publishKind10050')

  // Fetch historical gift-wraps that might have been published before our subscription started
  await dispatch('fetchHistoricalMessages')
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
  const allMembers = [...new Set([myPubKey, ...members])]
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

export async function sendMessage ({ state }, { roomId, text, replyTo }) {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) throw new Error('Room not found')

  const senderPrivKey = state.keys.privKeyHex
  const senderPubKey = state.keys.pubKeyHex

  const unsignedKind14 = createUnsignedKind14({
    content: text,
    senderPubKey,
    members: room.members,
    replyTo,
  })

  const giftWraps = await createNip17GiftWraps(unsignedKind14, senderPrivKey, room.members)

  const message = {
    id: unsignedKind14.id,
    content: text,
    sender: senderPubKey,
    created_at: unsignedKind14.created_at,
    kind14Id: unsignedKind14.id,
    replyTo,
  }

  return { giftWraps, message, roomId }
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
  const pTags = rumor.tags.filter(t => t[0] === 'p').map(t => t[1])
  const roomMembers = [...new Set([myPubKey, rumor.pubkey, ...pTags])]
  const roomId = computeRoomId(roomMembers)

  let room = state.rooms.find(r => r.id === roomId)
  if (!room) {
    const contact = state.contacts.find(c => c.pubKeyHex === rumor.pubkey)
    room = {
      id: roomId,
      type: 'private',
      name: contact?.name || rumor.pubkey.slice(0, 12) + '...',
      members: roomMembers,
      subject: null,
      createdAt: rumor.created_at,
      updatedAt: rumor.created_at,
    }
    commit('ADD_ROOM', room)
  }

  const replyTo = rumor.tags.find(t => t[0] === 'e')?.[1] || null
  const subject = rumor.tags.find(t => t[0] === 'subject')?.[1] || null

  if (subject && room.subject !== subject) {
    commit('UPDATE_ROOM_SUBJECT', { roomId, subject })
  }

  const message = {
    id: rumor.id,
    content: rumor.content,
    sender: rumor.pubkey,
    created_at: rumor.created_at,
    kind14Id: rumor.id,
    replyTo,
  }

  commit('ADD_MESSAGE', { roomId, message })

  // Update sender's read receipt timestamp to when they sent this message.
  // This indicates they were last active at rumor.created_at, so any messages
  // we sent BEFORE that time can be considered read.
  commit('SET_READ_RECEIPT', {
    roomId,
    pubKey: rumor.pubkey,
    timestamp: rumor.created_at,
  })
}

export function markRoomAsRead ({ commit, state }, roomId) {
  const myPubKey = state.keys.pubKeyHex
  if (!myPubKey) return
  commit('SET_READ_RECEIPT', {
    roomId,
    pubKey: myPubKey,
    timestamp: Math.floor(Date.now() / 1000),
  })
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

  // Start polling relay connection status every 5s
  relayService.startStatusPolling(state.relays, (status) => {
    for (const url of state.relays) {
      const s = status[url] || 'disconnected'
      commit('SET_RELAY_STATUS', { url, status: s })
    }
  }, 5000)

  return sub
}

export function disconnectRelays () {
  relayService.stopStatusPolling()
  relayService.disconnect()
}
