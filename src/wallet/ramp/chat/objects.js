
export class ChatSession {
  static parse (data) {
    return new ChatSession(data)
  }

  constructor (data) {
    this.raw = data
  }

  get raw () {
    return this.$raw
  }

  /**
     * @param {Object} data
     * @param {String} data.ref
     * @param {String} data.title
     * @param {String} data.first_message_at
     * @param {String} data.last_message_at
     * @param {String} data.created_at
     */
  set raw (data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.ref = data?.ref
    this.title = data?.title
    if (data?.first_message_at) this.firstMessageAt = new Date(data?.first_message_at)
    else if (this.firstMessageAt) delete this.firstMessageAt

    if (data?.last_message_at) this.lastMessageAt = new Date(data?.last_message_at)
    else if (this.lastMessageAt) delete this.lastMessageAt

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
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
    this.user = {
      id: data?.user?.id,
      firstName: data?.user?.first_name,
      lastName: data?.user?.last_name
    }
    this.customer = Customer.parse(data?.customer)
  }

  get name () {
    if (this?.user?.id) {
      return [this.user.firstName, this.user.lastName].filter(Boolean).join(' ')
    }
    return this?.customer?.fullName
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

export class ChatMember {
  static parse (data) {
    return new ChatMember(data)
  }

  constructor (data) {
    this.raw = data
  }

  get raw () {
    return this.$raw
  }

  /**
     * @param {Object} data
     * @param {String} data.chat_session_ref
     * @param {Number} data.unread_count
     * @param {String} data.last_read_timestamp
     * @param {String} data.created_at
     * @param {Object} data.chat_identity
     */
  set raw (data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.chatSessionRef = data?.chat_session_ref
    this.unreadCount = data?.unread_count
    if (data?.last_read_timestamp) this.lastReadTimestamp = new Date(data?.last_read_timestamp)
    else if (this.lastReadTimestamp) delete this.lastReadTimestamp

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt

    this.chatIdentity = ChatIdentity.parse(data?.chat_identity)
  }

  get name () {
    if (this?.chatIdentity?.user?.id) {
      return [this.chatIdentity.user.firstName, this.chatIdentity.user.lastName].filter(Boolean).join(' ')
    }
    return this?.chatIdentity?.customer?.fullName
  }
}

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
     * @param {{ pubkey:String, device_id:String }[]} data.pubkeys
     * @param {{ id:Number, first_name: String, last_name:String }} [data.user]
     * @param {{ id:Number, first_name: String, last_name:String }} [data.customer]
     */
  set raw (data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.pubkeys = (Array.isArray(data?.pubkeys) ? data?.pubkeys : [])
      .map(pubkeyData => {
        return { pubkey: pubkeyData?.pubkey, deviceId: pubkeyData?.device_id }
      })

    this.user = {
      id: data?.user?.id,
      firstName: data?.user?.first_name,
      lastName: data?.user?.last_name
    }
    this.customer = Customer.parse(data?.customer)
  }
}
