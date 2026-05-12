<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <div
      id="app-container"
      class="sticky-header-container text-bow"
      :class="getDarkModeClass(darkMode)"
    >
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="$t('Chat')"
    />

    <div class="chat-body">
      <!-- User identity header -->
      <div
        class="identity-section"
        :class="getDarkModeClass(darkMode)"
        :style="{ background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}0a)` }"
      >
        <q-avatar
          size="48px"
          class="identity-avatar"
          :style="avatarStyle"
        >
          <img v-if="profileAvatar" :src="profileAvatar" />
          <q-icon v-else name="account_circle" size="40px" />
        </q-avatar>
        <div class="identity-info">
          <div class="identity-label">{{ $t('YourChatID', {}, 'Your Chat ID') }}</div>
          <div class="identity-npub" @click="copyNpub">
            <span class="npub-text">{{ displayNpub }}</span>
            <q-icon name="content_copy" size="14px" class="copy-icon" />
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="qr_code"
          class="qr-btn"
          @click="showQrDialog = true"
        />
        <q-btn
          flat
          round
          dense
          icon="settings"
          class="profile-btn"
          @click="$router.push('/apps/chat/profile')"
        />
      </div>

      <!-- Rooms list -->
      <div class="rooms-section" :class="getDarkModeClass(darkMode)">
        <q-tabs
          v-model="chatTab"
          dense
          class="text-grey-7 tabs-header"
          active-color="primary"
          indicator-color="primary"
          align="left"
          narrow-indicator
        >
          <q-tab name="active" :label="$t('Active', {}, 'Active')" />
          <q-tab name="archived" :label="$t('Archived', {}, 'Archived')" />
        </q-tabs>

        <q-tab-panels v-model="chatTab" animated>
          <q-tab-panel name="active" class="q-pa-none">
            <div class="section-header">
              <span class="section-title">{{ $t('Conversations', {}, 'Conversations') }}</span>
              <span v-if="rooms.length" class="section-count">{{ rooms.length }}</span>
            </div>
            <room-list
              :rooms="rooms"
              :messages="messages"
              @select-room="openRoom"
              @archive-room="confirmArchiveRoom"
              @block-room="confirmBlockRoom"
              @unblock-room="confirmUnblockRoom"
            />
          </q-tab-panel>
          <q-tab-panel name="archived" class="q-pa-none">
            <div class="section-header">
              <span class="section-title">{{ $t('ArchivedConversations', {}, 'Archived Conversations') }}</span>
              <span v-if="archivedRooms.length" class="section-count">{{ archivedRooms.length }}</span>
            </div>
            <room-list
              :rooms="archivedRooms"
              :messages="messages"
              archived
              @select-room="openRoom"
              @unarchive-room="unarchiveRoom"
              @delete-room="confirmDeleteRoom"
            />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>

    <!-- FAB for new chat -->
    <q-btn
      fab
      icon="chat"
      color="primary"
      class="fab-btn"
      @click="showNewChatDialog = true"
    />

    <!-- Nostr footer -->
    <div class="nostr-footer" :class="getDarkModeClass(darkMode)">
      <span class="footer-text">
        {{ $t('PoweredBy', {}, 'Powered by') }}
        <a
          href="https://nostr.com"
          target="_blank"
          rel="noopener noreferrer"
          class="nostr-link"
        >Nostr</a>
      </span>
    </div>

    <!-- QR code display dialog -->
    <q-dialog v-model="showQrDialog">
      <q-card style="min-width: 300px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6" :class="getDarkModeClass(darkMode)">{{ $t('YourChatID', {}, 'Your Chat ID') }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="flex flex-center q-pt-none">
          <div class="qr-display-box">
            <qr-code
              :text="`nostr:${myNpub}`"
              border-width="3px"
              border-color="#3b82f6"
              :size="240"
            />
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none text-center">
          <div class="npub-full-text">{{ myNpub }}</div>
          <q-btn
            flat
            dense
            icon="content_copy"
            :label="$t('Copy', {}, 'Copy')"
            color="primary"
            class="q-mt-sm"
            @click="copyNpub"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- New chat / add contact dialog -->
    <q-dialog v-model="showNewChatDialog" persistent>
      <q-card style="min-width: 320px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ $t('NewChat', {}, 'New Chat') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-tabs
            v-model="dialogTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
          >
            <q-tab name="contacts" :label="$t('Contacts', {}, 'Contacts')" />
            <q-tab name="add" :label="$t('AddContact', {}, 'Add Contact')" />
            <q-tab name="group" :label="$t('NewGroup', {}, 'New Group')" />
          </q-tabs>

          <q-tab-panels v-model="dialogTab" animated>
            <q-tab-panel name="contacts" class="q-px-none">
              <q-list v-if="contacts.length" separator>
                <q-item
                  v-for="contact in contacts"
                  :key="contact.npub"
                  clickable
                  class="contact-item"
                  @click="startChatWith(contact)"
                >
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white" size="44px">
                      {{ contactInitial(contact) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ contact.name }}</q-item-label>
                    <q-item-label caption class="npub-caption">{{ contact.npub.slice(0, 18) }}...</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="text-grey text-center q-pa-lg">
                <q-icon name="person_off" size="40px" class="q-mb-sm" style="opacity: 0.4;" />
                <div>{{ $t('NoContactsYet', {}, 'No contacts yet. Add one below.') }}</div>
              </div>
            </q-tab-panel>

            <q-tab-panel name="add" class="q-px-none">
              <q-input
                v-model="newContactNpub"
                :label="$t('Npub', {}, 'npub...')"
                outlined
                dense
                rounded
                class="q-mb-md"
                :error="!!npubError"
                :error-message="npubError"
                autofocus
              >
                <template #append>
                  <q-btn
                    flat
                    round
                    dense
                    icon="qr_code_scanner"
                    color="primary"
                    @click="openScannerFromDialog"
                  />
                </template>
              </q-input>

              <q-input
                v-model="newContactName"
                :label="$t('Name', {}, 'Name')"
                outlined
                dense
                rounded
                class="q-mb-md"
              />

              <div v-if="fetchedContactDisplayName" class="fetched-name-hint q-mb-md">
                <q-icon name="badge" size="16px" color="primary" />
                <span class="fetched-name-text">
                  {{ $t('UsingPublishedDisplayName', {}, 'Using published display name') }}
                </span>
              </div>

              <q-btn
                :label="$t('AddContact', {}, 'Add Contact')"
                color="primary"
                rounded
                unelevated
                class="full-width"
                :disable="!canAddContact"
                @click="addContactAndChat"
              />
            </q-tab-panel>

            <q-tab-panel name="group" class="q-px-none">
              <q-input
                v-model="groupName"
                :label="$t('GroupName', {}, 'Group name')"
                outlined
                dense
                rounded
                class="q-mb-sm"
                autofocus
              />
              <div class="group-members-label q-mb-xs">{{ $t('SelectMembers', {}, 'Select members') }}</div>
              <q-list v-if="contacts.length" separator class="group-members-list">
                <q-item
                  v-for="contact in contacts"
                  :key="contact.npub"
                  clickable
                  class="group-member-item"
                  @click="toggleMember(contact.npub)"
                >
                  <q-item-section avatar>
                    <q-checkbox
                      :model-value="selectedMemberNpubs.includes(contact.npub)"
                      @click.stop
                      @update:model-value="toggleMember(contact.npub)"
                    />
                  </q-item-section>
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white" size="36px">
                      {{ contactInitial(contact) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ contact.name }}</q-item-label>
                    <q-item-label caption class="npub-caption">{{ contact.npub.slice(0, 18) }}...</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="text-grey text-center q-pa-md">
                <q-icon name="person_off" size="32px" class="q-mb-sm" style="opacity: 0.4;" />
                <div>{{ $t('NoContactsToAdd', {}, 'No contacts to add. Add contacts first.') }}</div>
              </div>
              <q-btn
                :label="$t('CreateGroup', {}, 'Create Group')"
                color="primary"
                rounded
                unelevated
                class="full-width q-mt-sm"
                :disable="!canCreateGroup"
                @click="createGroup"
              />
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel', {}, 'Cancel')" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import RoomList from 'src/components/chat/RoomList.vue'
import QrScanner from 'src/components/qr-scanner.vue'
import { copyToClipboard } from 'quasar'
import { decode as nip19Decode, npubEncode } from 'nostr-tools/nip19'

export default {
  name: 'ChatApp',
  components: { HeaderNav, RoomList, QrScanner },
  data () {
    return {
      chatTab: 'active',
      showNewChatDialog: false,
      showQrDialog: false,
      showQrScanner: false,
      reopenDialogAfterScan: false,
      dialogTab: 'contacts',
      newContactName: '',
      newContactNpub: '',
      npubError: '',
      groupName: '',
      selectedMemberNpubs: [],
      fetchedContactDisplayName: null,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    myNpub () {
      return this.$store.getters['nostrChat/myNpub']
    },
    displayNpub () {
      const npub = this.myNpub || ''
      if (!npub) return '...'
      if (npub.length <= 24) return npub
      return npub.slice(0, 12) + '...' + npub.slice(-8)
    },
    rooms () {
      return this.$store.getters['nostrChat/getRooms']
    },
    archivedRooms () {
      return this.$store.getters['nostrChat/getArchivedRooms']
    },
    messages () {
      return this.$store.state.nostrChat.messages
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
    canAddContact () {
      return this.newContactName.trim() && this.newContactNpub.trim().startsWith('npub')
    },
    canCreateGroup () {
      return this.groupName.trim() && this.selectedMemberNpubs.length > 0
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
    profileAvatar () {
      return this.$store.state.nostrChat.profile?.avatar || null
    },
    avatarStyle () {
      if (this.profileAvatar) {
        return { background: 'transparent' }
      }
      return { background: `linear-gradient(135deg, ${this.themeColor}, ${this.themeColor}dd)` }
    },
  },
  watch: {
    showQrScanner (val) {
      if (!val && this.reopenDialogAfterScan) {
        this.reopenDialogAfterScan = false
        this.dialogTab = 'add'
        this.showNewChatDialog = true
      }
    },
    showNewChatDialog (val) {
      if (!val) {
        this.groupName = ''
        this.selectedMemberNpubs = []
        this.newContactName = ''
        this.newContactNpub = ''
        this.npubError = ''
        this.fetchedContactDisplayName = null
        this.dialogTab = 'contacts'
      }
    },
    async newContactNpub (val) {
      this.fetchedContactDisplayName = null
      const trimmed = val?.trim()
      if (trimmed && trimmed.startsWith('npub')) {
        try {
          const decoded = nip19Decode(trimmed)
          if (decoded.type === 'npub' && decoded.data) {
            const displayName = await this.$store.dispatch('nostrChat/fetchPublishedDisplayName', {
              pubKeyHex: decoded.data,
            })
            if (displayName && !this.newContactName.trim()) {
              this.fetchedContactDisplayName = displayName
              this.newContactName = displayName
            }
          }
        } catch (err) {
          console.warn('[Chat] Failed to fetch display name for npub:', err)
        }
      }
    },
  },
  async mounted () {
    const scannedNpub = this.$route.query.npub

    // If we have a scanned npub, handle it immediately where possible
    // to avoid waiting for the full relay initialization
    if (scannedNpub) {
      const contact = this.$store.getters['nostrChat/getContactByNpub'](scannedNpub)

      if (!contact) {
        // New contact — show Add Contact dialog immediately.
        // The dialog doesn't need initialization; room creation happens
        // on button click, by which time init will have finished.
        this.$router.replace({ path: '/apps/chat', query: {} })
        this.newContactNpub = scannedNpub
        this.newContactName = ''
        this.npubError = ''
        this.dialogTab = 'add'
        this.showNewChatDialog = true
      } else if (this.$store.state.nostrChat.initialized) {
        // Existing contact + store already initialized — open chat immediately
        this.startChatWith(contact)
      }
      // If existing contact but store not init'd yet, it will be handled below
    }

    try {
      // Initialize (skips if already initialized for this wallet)
      await this.$store.dispatch('nostrChat/initialize')
      this.$store.dispatch('nostrChat/subscribeToRelays')

      // Handle any scanned npub that we deferred because the store
      // wasn't initialized yet (existing contact case).
      if (scannedNpub && this.$route.query.npub) {
        this.handleScannedNpub(scannedNpub)
      }
    } catch (err) {
      console.error('Failed to initialize Nostr chat:', err)
      this.$q.notify({
        type: 'negative',
        message: this.$t('ChatInitFailed', {}, 'Failed to initialize chat') + ': ' + err.message,
      })
    }
  },
  beforeUnmount () {
    // Keep subscription alive for background messages
  },
  methods: {
    getDarkModeClass,
    copyNpub () {
      if (!this.myNpub) return
      copyToClipboard(this.myNpub)
        .then(() => {
          this.$q.notify({
            type: 'positive',
            message: this.$t('CopiedToClipboard', {}, 'Copied to clipboard'),
          })
        })
        .catch(() => {
          this.$q.notify({
            type: 'negative',
            message: this.$t('CopyFailed', {}, 'Copy failed'),
          })
        })
    },
    openRoom (roomId) {
      this.$router.push(`/apps/chat/${roomId}`)
    },
    confirmArchiveRoom (roomId) {
      const room = this.rooms.find(r => r.id === roomId)
      if (!room) return

      const roomName = this.getRoomDisplayName(room)
      this.$q.dialog({
        title: this.$t('ArchiveConversation', {}, 'Archive Conversation'),
        message: this.$t('ArchiveConversationConfirm', { name: roomName }, `Archive conversation with ${roomName}?`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: {
          label: this.$t('Cancel', {}, 'Cancel'),
          flat: true,
          color: 'grey',
        },
        ok: {
          label: this.$t('Archive', {}, 'Archive'),
          color: 'primary',
          flat: true,
        },
        persistent: true,
      }).onOk(() => {
        this.$store.commit('nostrChat/ARCHIVE_ROOM', roomId)
        this.$q.notify({
          type: 'info',
          message: this.$t('ConversationArchived', {}, 'Conversation archived'),
        })
      })
    },
    confirmBlockRoom (roomId) {
      const room = this.rooms.find(r => r.id === roomId)
      if (!room) return

      const otherPubKey = room.members?.find(m => m !== this.$store.getters['nostrChat/myPubKey'])
      if (!otherPubKey) return

      const roomName = this.getRoomDisplayName(room)
      this.$q.dialog({
        title: this.$t('BlockContact', {}, 'Block Contact'),
        message: this.$t('BlockContactConfirm', { name: roomName }, `Block ${roomName}? They won't be able to start new conversations with you, and you won't receive their messages.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: {
          label: this.$t('Cancel', {}, 'Cancel'),
          flat: true,
          color: 'grey',
        },
        ok: {
          label: this.$t('Block', {}, 'Block'),
          color: 'negative',
          flat: true,
        },
        persistent: true,
      }).onOk(() => {
        this.$store.commit('nostrChat/BLOCK_CONTACT', otherPubKey)
        this.$q.notify({
          type: 'info',
          message: this.$t('ContactBlocked', {}, 'Contact blocked'),
        })
      })
    },
    confirmUnblockRoom (roomId) {
      const room = this.rooms.find(r => r.id === roomId)
      if (!room) return

      const otherPubKey = room.members?.find(m => m !== this.$store.getters['nostrChat/myPubKey'])
      if (!otherPubKey) return

      const roomName = this.getRoomDisplayName(room)
      this.$q.dialog({
        title: this.$t('UnblockContact', {}, 'Unblock Contact'),
        message: this.$t('UnblockContactConfirm', { name: roomName }, `Unblock ${roomName}? They will be able to send you messages again.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: {
          label: this.$t('Cancel', {}, 'Cancel'),
          flat: true,
          color: 'grey',
        },
        ok: {
          label: this.$t('Unblock', {}, 'Unblock'),
          color: 'primary',
          flat: true,
        },
        persistent: true,
      }).onOk(() => {
        this.$store.commit('nostrChat/UNBLOCK_CONTACT', otherPubKey)
        this.$q.notify({
          type: 'positive',
          message: this.$t('ContactUnblocked', {}, 'Contact unblocked'),
        })
      })
    },
    unarchiveRoom (roomId) {
      this.$store.commit('nostrChat/UNARCHIVE_ROOM', roomId)
      this.$q.notify({
        type: 'positive',
        message: this.$t('ConversationUnarchived', {}, 'Conversation unarchived'),
      })
    },
    confirmDeleteRoom (roomId) {
      const room = this.archivedRooms.find(r => r.id === roomId)
      if (!room) return

      const otherPubKey = room.members?.find(m => m !== this.$store.getters['nostrChat/myPubKey'])
      const roomName = this.getRoomDisplayName(room)
      const isBlocked = otherPubKey && this.$store.getters['nostrChat/isContactBlocked'](otherPubKey)

      // If already blocked, just offer delete
      if (isBlocked) {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationConfirm', { name: roomName }, `Permanently delete conversation with ${roomName}?`),
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          cancel: {
            label: this.$t('Cancel', {}, 'Cancel'),
            flat: true,
            color: 'grey',
          },
          ok: {
            label: this.$t('Delete', {}, 'Delete'),
            color: 'negative',
            flat: true,
          },
          persistent: true,
        }).onOk(() => {
          this.$store.commit('nostrChat/REMOVE_ROOM', roomId)
          this.$q.notify({
            type: 'info',
            message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
          })
        })
        return
      }

      // Not blocked — offer both options
      this.$q.dialog({
        title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
        message: this.$t('DeleteConversationOptions', { name: roomName }, `How would you like to delete the conversation with ${roomName}?`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        options: {
          type: 'radio',
          model: 'delete',
          items: [
            {
              label: this.$t('DeleteOnly', {}, 'Delete only'),
              value: 'delete',
              description: this.$t('DeleteOnlyDesc', {}, 'Remove this conversation. You may receive new messages from this contact.'),
            },
            {
              label: this.$t('BlockAndDelete', {}, 'Block and delete'),
              value: 'block_delete',
              description: this.$t('BlockAndDeleteDesc', {}, 'Block this contact and remove the conversation. You won\'t receive messages from them.'),
            },
          ],
        },
        cancel: {
          label: this.$t('Cancel', {}, 'Cancel'),
          flat: true,
          color: 'grey',
        },
        ok: {
          label: this.$t('Confirm', {}, 'Confirm'),
          color: 'negative',
          flat: true,
        },
        persistent: true,
      }).onOk((option) => {
        if (option === 'block_delete' && otherPubKey) {
          this.$store.commit('nostrChat/BLOCK_CONTACT', otherPubKey)
        }
        this.$store.commit('nostrChat/REMOVE_ROOM', roomId)
        this.$q.notify({
          type: 'info',
          message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
        })
      })
    },
openScannerFromDialog () {
        this.showNewChatDialog = false
        this.reopenDialogAfterScan = true
        this.showQrScanner = true
      },
      onScannerDecode (value) {
        const nostrMatch = String(value || '').match(/^(nostr:)?(npub1[a-z0-9]{58,})$/i)
        if (nostrMatch) {
          this.newContactNpub = nostrMatch[2]
          this.npubError = ''
        } else {
          this.npubError = this.$t('InvalidNpub', {}, 'Invalid npub')
        }
        this.showQrScanner = false
        this.reopenDialogAfterScan = false
        this.dialogTab = 'add'
        this.showNewChatDialog = true
      },
    contactInitial (contact) {
      return (contact.name || '').charAt(0).toUpperCase()
    },
    toggleMember (npub) {
      const idx = this.selectedMemberNpubs.indexOf(npub)
      if (idx >= 0) {
        this.selectedMemberNpubs.splice(idx, 1)
      } else {
        this.selectedMemberNpubs.push(npub)
      }
    },
    async createGroup () {
      if (!this.canCreateGroup) return
      try {
        // Convert npubs to hex pubkeys
        const memberPubKeys = this.selectedMemberNpubs.map(npub => {
          const decoded = nip19Decode(npub)
          return decoded.data
        })
        const name = this.groupName.trim()
        const room = await this.$store.dispatch('nostrChat/createGroupRoom', {
          name,
          members: memberPubKeys,
        })
        // Send an initial message with the group name as subject so all members
        // receive the room via the relay and can reconstruct it on any device
        const text = this.$t('GroupCreatedWith', { name }, `Created group "${name}"`)
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: room.id,
          text,
          subject: name,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        this.showNewChatDialog = false
        this.$router.push(`/apps/chat/${room.id}`)
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err.message || this.$t('CreateGroupFailed', {}, 'Failed to create group'),
        })
      }
    },
    getRoomDisplayName (room) {
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      if (!myPubKey) return room.subject || room.name || 'Chat'

      const otherPubKey = room.members?.find(m => m !== myPubKey)
      if (!otherPubKey) return room.subject || room.name || 'Chat'

      // If a subject has been set, use it as the conversation name
      if (room.subject) return room.subject

      let otherNpub = null
      try {
        otherNpub = npubEncode(otherPubKey)
      } catch {
        return room.name || 'Chat'
      }

      const contact = this.$store.getters['nostrChat/getContactByNpub'](otherNpub)
      if (contact) return contact.name

      return otherNpub.slice(0, 12) + '...' + otherNpub.slice(-8)
    },
    async addContactAndChat () {
      try {
        await this.$store.dispatch('nostrChat/addContact', {
          name: this.newContactName.trim(),
          npub: this.newContactNpub.trim(),
        })
        const contact = this.$store.getters['nostrChat/getContactByNpub'](this.newContactNpub.trim())
        this.startChatWith(contact)
        this.newContactName = ''
        this.newContactNpub = ''
        this.npubError = ''
        this.showNewChatDialog = false
      } catch (err) {
        this.npubError = err.message
      }
    },
    async startChatWith (contact) {
      let room = this.$store.getters['nostrChat/getRoomByContact'](contact.npub)
      if (!room) {
        room = await this.$store.dispatch('nostrChat/createPrivateRoom', contact.npub)
      }
      this.showNewChatDialog = false
      this.$router.push(`/apps/chat/${room.id}`)
    },
    async handleScannedNpub (npub) {
      // Clean up query param so dialog doesn't reopen on refresh
      this.$router.replace({ path: '/apps/chat', query: {} })

      // Check if contact already exists
      const contact = this.$store.getters['nostrChat/getContactByNpub'](npub)
      if (contact) {
        // Contact exists — open conversation directly
        await this.startChatWith(contact)
      } else {
        // Contact does not exist — open Add Contact tab with npub prefilled
        this.newContactNpub = npub
        this.newContactName = ''
        this.npubError = ''
        this.dialogTab = 'add'
        this.showNewChatDialog = true
      }
    },
  },
}
</script>

<style scoped>
.chat-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  min-height: 0;
}

/* Identity section */
.identity-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.identity-avatar {
  color: #ffffff;
}

.identity-info {
  flex: 1;
  min-width: 0;
}

.identity-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 2px;
}

.identity-npub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.identity-npub:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.npub-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.copy-icon {
  color: #9ca3af;
  transition: color 0.15s ease;
}

.identity-npub:hover .copy-icon {
  color: #3b82f6;
}

.qr-btn {
  color: #6b7280;
  transition: color 0.15s ease;
}

.qr-btn:hover {
  color: #3b82f6;
}

.qr-display-box {
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.npub-full-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #6b7280;
  word-break: break-all;
  line-height: 1.5;
  max-width: 240px;
  margin: 0 auto;
}

/* Rooms section */
.rooms-section {
  padding-bottom: 80px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-count {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: #9ca3af;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* FAB */
.fab-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fab-btn:active {
  transform: scale(0.94);
}

/* Nostr footer */
.nostr-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 16px;
  padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
  background: rgba(245, 247, 250, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  text-align: center;
  z-index: 50;
}

.footer-text {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.nostr-link {
  color: #3b82f6;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.nostr-link:hover {
  opacity: 0.8;
}

.nostr-link:active {
  opacity: 0.6;
}

/* Dark mode: nostr footer */
.dark.nostr-footer {
  background: rgba(15, 23, 42, 0.95);
  border-top-color: rgba(255, 255, 255, 0.04);
}

.dark .footer-text {
  color: #64748b;
}

.dark .nostr-link {
  color: #60a5fa;
}

/* Dialog */
.dialog-header {
  padding-bottom: 8px;
}

.fetched-name-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.15);
  margin-bottom: 16px;
}

.fetched-name-text {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.contact-item {
  padding: 10px 4px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.contact-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.group-members-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.group-members-list {
  max-height: 220px;
  overflow-y: auto;
}

.group-member-item {
  padding: 6px 4px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.group-member-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

/* Tabs */
.tabs-header {
  padding: 0 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.tabs-header :deep(.q-tab) {
  text-transform: none;
  font-weight: 600;
  font-size: 13px;
  min-height: 40px;
}

.tabs-header :deep(.q-tab__content) {
  padding: 0 12px;
}

.tabs-header :deep(.q-tab--active) {
  color: var(--q-primary);
}

.tabs-header :deep(.q-tab-panels) {
  background: transparent;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabs-header :deep(.q-tab-panel) {
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.npub-caption {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

/* Dark mode */
.dark.identity-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.06));
  border-bottom-color: rgba(255, 255, 255, 0.04);
}

.dark .identity-label {
  color: #64748b;
}

.dark .npub-text {
  color: #cbd5e1;
}

.dark .identity-npub:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.dark .section-title {
  color: #64748b;
}

.dark .section-count {
  background: #475569;
}

.dark .contact-item:hover {
  background-color: rgba(255, 255, 255, 0.04);
}

.dark .fetched-name-hint {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark .fetched-name-text {
  color: #d1d5db;
}

.dark .group-member-item:hover {
  background-color: rgba(255, 255, 255, 0.04);
}

.dark .tabs-header {
  border-bottom-color: rgba(255, 255, 255, 0.04);
}

.dark .qr-btn {
  color: #94a3b8;
}

.dark .qr-btn:hover {
  color: #60a5fa;
}

.dark .qr-display-box {
  background: #1e293b;
}

.dark .npub-full-text {
  color: #94a3b8;
}


</style>
