import { deriveNostrKeys, createUnsignedKind14, createNip17GiftWraps, computeRoomId, createKind10050, createReadReceiptGiftWrap } from 'src/wallet/nostr'
import { getMnemonic } from 'src/wallet'
import { decode as nip19Decode } from 'nostr-tools/nip19'
import * as relayService from 'src/services/nostr-chat'
import Watchtower from 'watchtower-cash-js'
import { Capacitor } from '@capacitor/core'

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

  // Register this wallet's Nostr pubkey for push notifications
  // (additive — other devices with the same wallet keep receiving pushes)
  await dispatch('registerForPushNotifications')

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

  // Register this wallet's Nostr pubkey for push notifications
  await dispatch('registerForPushNotifications')
}

export async function registerForPushNotifications ({ state, rootGetters }) {
  if (!state.keys.pubKeyHex) return

  // Only register on mobile (push notifications are not available on web/PWA)
  const platform = Capacitor.getPlatform()
  if (platform !== 'ios' && platform !== 'android') return

  // Use the existing push notification manager's token and device ID
  const pushManager = this._vm?.$pushNotifications
  if (!pushManager?.registrationToken || !pushManager?.deviceId) {
    // Token not ready yet — retry after a delay
    setTimeout(() => {
      this.dispatch('nostrChat/registerForPushNotifications')
    }, 5000)
    return
  }

  const walletIndex = rootGetters['global/getWalletIndex']
  const walletHash = rootGetters['global/getWalletHashByIndex']?.(walletIndex)
  if (!walletHash) return

  const watchtower = new Watchtower(rootGetters['global/isChipnet'])
  const data = {
    pubkey: state.keys.pubKeyHex,
    wallet_hash: walletHash,
    multi_wallet_index: walletIndex,
    device_id: pushManager.deviceId,
    registration_id: pushManager.registrationToken,
    platform,
  }

  try {
    await watchtower.BCH._api.post('/push-notifications/nostr-register/', data)
  } catch (err) {
    console.warn('[Nostr] Failed to register for push notifications:', err?.message || err)
  }
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
    localSentAt: Date.now(), // Exact local send time — used for read receipts
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

  // Handle Kind 7 read receipts (👀 reactions)
  if (rumor.kind === 7 && rumor.content === '👀') {
    const eTag = rumor.tags.find(t => t[0] === 'e')
    if (!eTag) return

    const messageId = eTag[1]
    // The Kind 7 was created by the reader (rumor.pubkey) and sent to
    // the original message sender.  The room is between those two.
    const readerPubKey = rumor.pubkey

    if (messageId && readerPubKey) {
      const roomId = computeRoomId([myPubKey, readerPubKey])
      commit('SET_MESSAGE_READ_BY', {
        roomId,
        messageId,
        readerPubKey,
      })
    }
    return
  }

  // Only process Kind 14 chat messages
  if (rumor.kind !== 14) return

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

  // Start polling relay connection status every 5s
  relayService.startStatusPolling(state.relays, (status) => {
    for (const url of state.relays) {
      const s = status[url] || 'disconnected'
      commit('SET_RELAY_STATUS', { url, status: s })
    }
  }, 5000)

  return sub
}

export function ensureSubscribed ({ dispatch, getters }) {
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

export function disconnectRelays () {
  relayService.stopStatusPolling()
  relayService.disconnect()
}
