import { decompressEncryptedMessage, decryptMessage, decompressEncryptedImage, decryptImage } from 'src/marketplace/chat/encryption'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import { updateSignerData, signRequestData } from 'src/exchange/chat/backend'
import { getKeypair, getDeviceId } from 'src/exchange/chat/keys'
import * as chatUtils from 'src/exchange/chat'

export class ChatIdentity {
  static parse (data) {
    return new ChatIdentity(data)
  }

  constructor (data) {
    this.raw = data
  }

  get raw () {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.name
   * @param {String} data.ref
   * @param {{ pubkey:String, device_id:String }[]} data.pubkeys
   */
  set raw (data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.name = data?.name
    this.ref = data?.ref
    this.pubkeys = (Array.isArray(data?.pubkeys) ? data?.pubkeys : [])
      .map(pubkeyData => {
        return { pubkey: pubkeyData?.pubkey, deviceId: pubkeyData?.device_id }
      })
  }
}

export class ChatMessage {
  static parse (data) {
    return new ChatMessage(data)
  }

  constructor (data) {
    this.raw = data
    this.$state = {
      fetchingAttachment: false,
      decryptingAttachment: false
    }
  }

  get raw () {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.chat_session_ref
   * @param {Boolean} data.encrypted
   * @param {String} data.message
   * @param {String} data.attachment_url
   * @param {String} data.encrypted_attachment_url
   * @param {String} data.created_at
   * @param {{ id:Number, first_name: String, last_name:String }} [data.user]
   * @param {{ id:Number, first_name: String, last_name:String }} [data.customer]
   */
  set raw (data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.chatSessionRef = data?.chat_session_ref
    this.encrypted = data?.encrypted
    this.message = data?.message
    this.attachmentUrl = data?.attachment_url
    this.encryptedAttachmentUrl = data?.encrypted_attachment_url
    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
    this.chatIdentity = ChatIdentity.parse(data?.chat_identity)
  }

  get user () {
    return this.chatIdentity?.user
  }

  get customer () {
    return this.chatIdentity?.customer
  }

  get name () {
    if (this?.user?.id) {
      return [this.user.firstName, this.user.lastName].filter(Boolean).join(' ')
    }
    if (this?.customer?.fullName) return this?.customer?.fullName
    return this.chatIdentity?.name
  }

  get decryptedMessage () {
    if (!this.encrypted) return this.message
    return this._decryptedMessage
  }

  get hasAttachment () {
    return Boolean(this.attachmentUrl || this.encryptedAttachmentUrl)
  }

  get decryptedAttachmentFile () {
    return this._decryptedAttachmentFile
  }

  set decryptedAttachmentFile (value) {
    try { URL.revokeObjectURL(this._decryptedAttachmentFile) } catch {}
    this._decryptedAttachmentFile = value
    if (this._decryptedAttachmentFile) {
      this._decryptedAttachmentFile.url = URL.createObjectURL(this._decryptedAttachmentFile)
    }
  }

  /**
   * @param {String} value
   */
  set decryptedMessage (value) {
    this._decryptedMessage = value
  }

  async decryptMessage (privkey, tryAllKeys = false) {
    if (!this.encrypted) return
    const parsedEncryptedMessage = decompressEncryptedMessage(this.message)
    const opts = { privkey, tryAllKeys, ...parsedEncryptedMessage }
    this.decryptedMessage = decryptMessage(opts)
    return this
  }

  async fetchEncryptedAttachment () {
    if (this.fetchEncryptedAttachmentPromise) return this.fetchEncryptedAttachmentPromise
    this.fetchEncryptedAttachmentPromise = this._fetchEncryptedAttachment()
    return this.fetchEncryptedAttachmentPromise
      .finally(() => {
        delete this.fetchEncryptedAttachmentPromise
      })
  }

  async _fetchEncryptedAttachment () {
    this.$state.fetchingAttachment = true
    try {
      if (!this.encryptedAttachmentUrl) return
      if (this.encryptedAttachmentFile) return
      const response = await fetch(this.encryptedAttachmentUrl, { headers: { Accept: 'image/* application/*' } })
      const blob = await response.blob()
      this.encryptedAttachmentFile = new File([blob], this.encryptedAttachmentUrl)
      return this.encryptedAttachmentFile
    } finally {
      this.$state.fetchingAttachment = false
    }
  }

  async decryptAttachment (privkey, tryAllKeys = false) {
    if (this.decryptAttachmentPromise) return this.decryptAttachmentPromise
    this.decryptAttachmentPromise = this._decryptAttachment(privkey, tryAllKeys)
    return this.decryptAttachmentPromise
      .finally(() => {
        delete this.decryptAttachmentPromise
      })
  }

  async _decryptAttachment (privkey, tryAllKeys = false) {
    try {
      if (this?.decryptedAttachmentFile?.url) return this.decryptedAttachmentFile
      if (!this.encryptedAttachmentFile) await this.fetchEncryptedAttachment()
      if (!this.encryptedAttachmentFile) return
      this.$state.decryptingAttachment = true
      const decryptOpts = await decompressEncryptedImage(this.encryptedAttachmentFile)
      const opts = { privkey, tryAllKeys, ...decryptOpts }
      this.decryptedAttachmentFile = await decryptImage(opts)
      return this.decryptedAttachmentFile
    } finally {
      this.$state.decryptingAttachment = false
    }
  }
}

export class ChatIdentityManager {
  constructor (chatIdentity) {
    this.chatIdentity = new ChatIdentity(chatIdentity)
  }

  setIdentity (data) {
    this.chatIdentity = new ChatIdentity(data)
    return this.chatIdentity
  }

  async create (params) {
    if (!params || !params.name || !params.ref) return
    const data = {
      ref: params.ref,
      name: params.name
    }
    const payload = await this._buildPayload(data)
    this.chatIdentity = await chatUtils.createChatIdentity(payload)
    return this.chatIdentity
  }

  async _buildPayload (data) {
    if (!wallet) await loadRampWallet()
    let encryptingPubkey = (await getKeypair()).pubkey
    // Handle null encrypting pubkey
    if (!encryptingPubkey) {
      console.error(`Error: getKeypair returned pubkey: "${encryptingPubkey}". Recreating keypair without updating server pubkey..`)
      encryptingPubkey = (await chatUtils.updateOrCreateKeypair(false)).pubkey
    }
    const deviceId = await getDeviceId()
    const verifyingPubkey = wallet.pubkey('0/0')
    const hexRef = Buffer.from(String(data.ref)).toString('hex')
    const signatureData = await signRequestData(hexRef)

    const payload = {
      ref: data.ref,
      name: data.name,
      pubkey: {
        pubkey: encryptingPubkey, // the pubkey used by other users when encrypting messages sent to you
        device_id: deviceId // device id of your app
      },
      verifying_pubkey: verifyingPubkey, // pubkey used for authentication
      signature: signatureData.signature // signature generated by signing `ref` using private key of `verifying_pubkey`
    }
    return payload
  }

  async _updateSignerData () {
    await updateSignerData()
  }

  async _updateEncryptionKeypair (update) {
    await chatUtils.updateOrCreateKeypair(update)
  }
}
