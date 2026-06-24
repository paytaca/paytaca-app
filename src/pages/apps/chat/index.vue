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
      :backnavpath="chatBackPath"
      :title="$t('Chat')"
    >
      <template #top-right-menu>
        <q-btn flat round dense icon="edit_square" @click="showNewChatDialog = true" />
        <q-btn flat round dense icon="account_circle" @click="$router.push('/apps/chat/profile')" />
      </template>
    </header-nav>

    <div class="chat-body">
      <!-- Rooms list -->
      <div class="rooms-section">
        <q-tabs
          v-model="chatTab"
          dense
          class="text-grey-7 tabs-header"
          active-color="primary"
          indicator-color="primary"
          align="left"
          narrow-indicator
        >
          <q-tab name="active">
            <div class="tab-label-wrapper">
              <span>{{ $t('Active', {}, 'Active') }}</span>
              <span
                v-if="chatTab !== 'active' && activeUnreadCount > 0"
                class="tab-unread-badge"
              >
                {{ activeUnreadCount }}
              </span>
            </div>
          </q-tab>
          <q-tab name="archived">
            <div class="tab-label-wrapper">
              <span>{{ $t('Archived', {}, 'Archived') }}</span>
              <span
                v-if="chatTab !== 'archived' && archivedUnreadCount > 0"
                class="tab-unread-badge"
              >
                {{ archivedUnreadCount }}
              </span>
            </div>
          </q-tab>
        </q-tabs>

        <q-tab-panels v-model="chatTab" animated>
          <q-tab-panel name="active" class="q-pa-none">
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

    <!-- New chat dialog -->
    <q-dialog v-model="showNewChatDialog" persistent>
      <q-card style="min-width: 320px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="dialog-header row items-center q-gutter-sm">
          <q-btn
            v-if="selectedChatType"
            flat
            round
            dense
            icon="arrow_back"
            @click="handleDialogBack"
          />
          <div class="text-h6">{{ dialogTitle }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <!-- Step 1: Choose chat type -->
          <div v-if="!selectedChatType" class="chat-type-list">
            <div
              class="chat-type-option"
              :class="getDarkModeClass(darkMode)"
              @click="selectChatType('dm')"
            >
              <q-avatar size="44px" class="chat-type-icon dm-icon">
                <q-icon name="person" size="24px" color="white" />
              </q-avatar>
              <div class="chat-type-text">
                <div class="chat-type-title" :class="getDarkModeClass(darkMode)">
                  {{ $t('DirectMessage', {}, 'Direct Message') }}
                </div>
                <div class="chat-type-desc">
                  {{ $t('DirectMessageDesc', {}, 'End-to-end encrypted one-on-one chat.') }}
                </div>
              </div>
              <q-icon name="chevron_right" size="20px" class="chat-type-chevron" />
            </div>

            <div
              class="chat-type-option"
              :class="getDarkModeClass(darkMode)"
              @click="selectChatType('private_group')"
            >
              <q-avatar size="44px" class="chat-type-icon group-icon">
                <q-icon name="groups" size="24px" color="white" />
              </q-avatar>
              <div class="chat-type-text">
                <div class="chat-type-title" :class="getDarkModeClass(darkMode)">
                  {{ $t('PrivateGroup', {}, 'Private Group') }}
                </div>
                <div class="chat-type-desc">
                  {{ $t('PrivateGroupDesc', {}, 'End-to-end encrypted, up to 10 members. Members are fixed once created.') }}
                </div>
              </div>
              <q-icon name="chevron_right" size="20px" class="chat-type-chevron" />
            </div>

            <div
              class="chat-type-option chat-type-option--disabled"
              :class="getDarkModeClass(darkMode)"
            >
              <q-avatar size="44px" class="chat-type-icon public-group-icon">
                <q-icon name="public" size="24px" color="white" />
              </q-avatar>
              <div class="chat-type-text">
                <div class="chat-type-title-row">
                  <span class="chat-type-title" :class="getDarkModeClass(darkMode)">
                    {{ $t('PublicGroup', {}, 'Public Group') }}
                  </span>
                  <span class="coming-soon-badge">
                    {{ $t('ComingSoon', {}, 'Coming soon') }}
                  </span>
                </div>
                <div class="chat-type-desc">
                  {{ $t('PublicGroupDesc', {}, 'Unencrypted, open membership with no limit.') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 (DM): Contacts + Add Contact -->
          <template v-else-if="selectedChatType === 'dm'">
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
            </q-tab-panels>
          </template>

          <!-- Step 2 (Private Group): Create group form -->
          <template v-else-if="selectedChatType === 'private_group'">
            <q-tabs
              v-model="dialogTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
            >
              <q-tab name="members" :label="$t('Members', {}, 'Members')" />
              <q-tab name="add" :label="$t('AddContact', {}, 'Add Contact')" />
            </q-tabs>

            <q-tab-panels v-model="dialogTab" animated>
              <q-tab-panel name="members" class="q-px-none">
                <div class="group-hint q-mb-md">
                  <q-icon name="lock" size="14px" color="primary" />
                  <span>
                    {{ $t('PrivateGroupHint', {}, 'End-to-end encrypted. Members are fixed once created.') }}
                  </span>
                </div>
                <q-input
                  v-model="groupName"
                  :label="$t('GroupName', {}, 'Group name')"
                  outlined
                  dense
                  rounded
                  class="q-mb-sm"
                  autofocus
                />
                <div class="group-members-label q-mb-xs">
                  {{ $t('SelectMembersWithLimit', { count: selectedMemberNpubs.length, max: 9 }, `Select members (${selectedMemberNpubs.length}/9)`) }}
                </div>
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
                  <div>{{ $t('NoContactsToAdd', {}, 'No contacts to add. Use the Add Contact tab.') }}</div>
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
                  @click="addContactForGroup"
                />
              </q-tab-panel>
            </q-tab-panels>
          </template>
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
import { decode as nip19Decode, npubEncode } from 'nostr-tools/nip19'

export default {
  name: 'ChatApp',
  components: { HeaderNav, RoomList, QrScanner },
  data () {
    return {
      chatTab: 'active',
      showNewChatDialog: false,
      showQrScanner: false,
      reopenDialogAfterScan: false,
      scannerOrigin: null,
      selectedChatType: null,
      dialogTab: 'contacts',
      newContactName: '',
      newContactNpub: '',
      npubError: '',
      groupName: '',
      selectedMemberNpubs: [],
      fetchedContactDisplayName: null,
      _profilePromptShown: false,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    chatBackPath () {
      if (this.$route.query?.from === 'home') return '/'
      const prevRoute = this.$store.state.global.previousRoute
      return prevRoute === '/apps' ? '/apps' : '/'
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
      return this.groupName.trim() && this.selectedMemberNpubs.length > 0 && this.selectedMemberNpubs.length <= 9
    },
    activeUnreadCount () {
      return this.totalUnreadFor(this.rooms)
    },
    archivedUnreadCount () {
      return this.totalUnreadFor(this.archivedRooms)
    },
    dialogTitle () {
      if (this.selectedChatType === 'dm') {
        return this.$t('NewDirectMessage', {}, 'New Direct Message')
      }
      if (this.selectedChatType === 'private_group') {
        return this.$t('NewPrivateGroup', {}, 'New Private Group')
      }
      return this.$t('NewChat', {}, 'New Chat')
    },
    missingProfileItems () {
      const items = []
      if (!this.$store.state.nostrChat.profile?.displayName) {
        items.push(this.$t('DisplayName', {}, 'Display Name'))
      }
      if (!this.$store.state.nostrChat.profile?.bchAddress) {
        items.push(this.$t('BchAddress', {}, 'BCH Address'))
      }
      return items
    },
    isProfileIncomplete () {
      return this.missingProfileItems.length > 0
    },
    profilePromptMessage () {
      const items = this.missingProfileItems
      const suffix = this.$t('ProfilePromptAvatarHint', {}, ' You can also set a display image so others can recognize you.')
      if (items.length === 2) {
        return this.$t('ProfilePromptBothMissing', { displayName: items[0], bchAddress: items[1] }, `Set your ${items[0]} and ${items[1]} so others can identify you and send you payments.`) + suffix
      }
      if (items.length === 1) {
        return this.$t('ProfilePromptOneMissing', { item: items[0] }, `Set your ${items[0]} so others can identify you and send you payments.`) + suffix
      }
      return ''
    },
  },
  watch: {
    showQrScanner (val) {
      if (!val && this.reopenDialogAfterScan) {
        this.reopenDialogAfterScan = false
        if (this.scannerOrigin === 'group') {
          this.selectedChatType = 'private_group'
        } else {
          this.selectedChatType = 'dm'
        }
        this.dialogTab = 'add'
        this.scannerOrigin = null
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
        this.selectedChatType = null
        this.dialogTab = 'contacts'
        this.scannerOrigin = null
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
        this.selectedChatType = 'dm'
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

      // Show profile setup prompt if profile is incomplete (after a short delay
      // to allow the background profile fetch from initialize() to complete)
      if (!this._profilePromptShown && this.isProfileIncomplete) {
        setTimeout(() => {
          if (!this._profilePromptShown && this.isProfileIncomplete) {
            this.showProfilePrompt()
          }
        }, 3000)
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
    showProfilePrompt () {
      const message = this.profilePromptMessage
      if (!message) return
      this._profilePromptShown = true
      this.$q.dialog({
        title: this.$t('CompleteYourProfile', {}, 'Complete Your Profile'),
        message,
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: {
          label: this.$t('Later', {}, 'Later'),
          flat: true,
          color: 'grey',
        },
        ok: {
          label: this.$t('SetUpNow', {}, 'Set Up Now'),
          color: 'primary',
          flat: true,
        },
        persistent: true,
      }).onOk(() => {
        this.$router.push('/apps/chat/profile')
      })
    },
    selectChatType (type) {
      this.selectedChatType = type
      if (type === 'dm') {
        this.dialogTab = this.contacts.length ? 'contacts' : 'add'
      } else if (type === 'private_group') {
        this.dialogTab = 'members'
      }
    },
    handleDialogBack () {
      this.selectedChatType = null
    },
    async addContactForGroup () {
      try {
        const npub = this.newContactNpub.trim()
        await this.$store.dispatch('nostrChat/addContact', {
          name: this.newContactName.trim(),
          npub,
        })
        if (!this.selectedMemberNpubs.includes(npub) && this.selectedMemberNpubs.length < 9) {
          this.selectedMemberNpubs.push(npub)
        }
        this.newContactName = ''
        this.newContactNpub = ''
        this.npubError = ''
        this.fetchedContactDisplayName = null
        this.dialogTab = 'members'
      } catch (err) {
        this.npubError = err.message
      }
    },
    totalUnreadFor (rooms) {
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      if (!myPubKey) return 0
      const readIdsMap = this.$store.state.nostrChat.readMessageIds || {}
      let total = 0
      for (const room of rooms) {
        const msgs = this.messages[room.id] || []
        const readIds = readIdsMap[room.id] || {}
        total += msgs.filter(m => m.sender !== myPubKey && !readIds[m.id]).length
      }
      return total
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
      this.scannerOrigin = this.selectedChatType === 'private_group' ? 'group' : 'dm'
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
      if (this.scannerOrigin === 'group') {
        this.selectedChatType = 'private_group'
      } else {
        this.selectedChatType = 'dm'
      }
      this.dialogTab = 'add'
      this.scannerOrigin = null
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
      if (!myPubKey) return room.subject || room.name || this.$t('Chat')

      const otherPubKey = room.members?.find(m => m !== myPubKey)
      if (!otherPubKey) return room.subject || room.name || this.$t('Chat')

      // If a subject has been set, use it as the conversation name
      if (room.subject) return room.subject

      let otherNpub = null
      try {
        otherNpub = npubEncode(otherPubKey)
      } catch {
        return room.name || this.$t('Chat')
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
        this.selectedChatType = 'dm'
        this.dialogTab = 'add'
        this.showNewChatDialog = true
      }
    },
  },
}
</script>

<style scoped>
/* Override shared bottom padding — no footer on chat page */
#app-container {
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
}

.chat-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Rooms section */
.rooms-section {
  background: transparent;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.tab-label-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-unread-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

/* New chat dialog — chat type picker */
.chat-type-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 8px;
}

.chat-type-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.015);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.chat-type-option:hover {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.3);
}

.chat-type-option:active {
  transform: scale(0.99);
}

.chat-type-option--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.chat-type-option--disabled:hover {
  background: rgba(0, 0, 0, 0.015);
  border-color: rgba(0, 0, 0, 0.08);
}

.chat-type-option--disabled:active {
  transform: none;
}

.chat-type-icon {
  flex-shrink: 0;
}

.chat-type-icon.dm-icon {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.chat-type-icon.group-icon {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.chat-type-icon.public-group-icon {
  background: linear-gradient(135deg, #10b981, #047857);
}

.chat-type-text {
  flex: 1;
  min-width: 0;
}

.chat-type-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.chat-type-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.chat-type-title-row .chat-type-title {
  margin-bottom: 0;
}

.chat-type-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.chat-type-chevron {
  color: #9ca3af;
  flex-shrink: 0;
}

.coming-soon-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
  border: 1px solid rgba(16, 185, 129, 0.3);
  line-height: 1.4;
}

.group-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.08);
  font-size: 12px;
  color: #4b5563;
  line-height: 1.4;
}

.group-members-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
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
  background: transparent;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabs-header :deep(.q-panel.scroll) {
  background: transparent;
}

.npub-caption {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

/* Header right slot - remove fixed width so action icons display in a row */
.apps-header :deep(.pt-header-right) {
  flex-basis: auto;
  width: auto;
  min-width: auto;
}

/* Dark mode */
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

.dark .tab-unread-badge {
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.dark.chat-type-option {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}

.dark.chat-type-option:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.4);
}

.dark.chat-type-option--disabled:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}

.dark .chat-type-title {
  color: #f1f5f9;
}

.dark .chat-type-desc {
  color: #94a3b8;
}

.dark .chat-type-chevron {
  color: #64748b;
}

.dark .coming-soon-badge {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.4);
}

.dark .group-hint {
  background: rgba(59, 130, 246, 0.14);
  color: #cbd5e1;
}

.dark .group-members-label {
  color: #94a3b8;
}


</style>
