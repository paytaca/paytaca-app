<template>
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
      <div class="identity-section" :class="getDarkModeClass(darkMode)">
        <q-avatar size="48px" class="identity-avatar">
          <q-icon name="account_circle" size="40px" />
        </q-avatar>
        <div class="identity-info">
          <div class="identity-label">{{ $t('YourNpub', {}, 'Your Nostr ID') }}</div>
          <div class="identity-npub" @click="copyNpub">
            <span class="npub-text">{{ displayNpub }}</span>
            <q-icon name="content_copy" size="14px" class="copy-icon" />
          </div>
        </div>
      </div>

      <!-- Relay status -->
      <div class="relay-section">
        <div class="relay-label">{{ $t('RelayStatus', {}, 'Relays') }}</div>
        <relay-status-chip :relay-urls="relays" :relay-status="relayStatus" />
      </div>

      <!-- Rooms list -->
      <div class="rooms-section" :class="getDarkModeClass(darkMode)">
        <div class="section-header">
          <span class="section-title">{{ $t('Conversations', {}, 'Conversations') }}</span>
          <span v-if="rooms.length" class="section-count">{{ rooms.length }}</span>
        </div>
        <room-list
          :rooms="rooms"
          :messages="messages"
          @select-room="openRoom"
        />
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
                v-model="newContactName"
                :label="$t('Name', {}, 'Name')"
                outlined
                dense
                rounded
                class="q-mb-md"
              />
              <q-input
                v-model="newContactNpub"
                :label="$t('Npub', {}, 'npub...')"
                outlined
                dense
                rounded
                class="q-mb-md"
                :error="!!npubError"
                :error-message="npubError"
              />
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
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel', {}, 'Cancel')" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import RoomList from 'src/components/chat/RoomList.vue'
import RelayStatusChip from 'src/components/chat/RelayStatusChip.vue'
import { copyToClipboard } from 'quasar'

export default {
  name: 'ChatApp',
  components: { HeaderNav, RoomList, RelayStatusChip },
  data () {
    return {
      showNewChatDialog: false,
      dialogTab: 'contacts',
      newContactName: '',
      newContactNpub: '',
      npubError: '',
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
    relays () {
      return this.$store.state.nostrChat.relays
    },
    relayStatus () {
      return this.$store.getters['nostrChat/getRelayStatus']
    },
    rooms () {
      return this.$store.getters['nostrChat/getRooms']
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
  },
  async mounted () {
    try {
      await this.$store.dispatch('nostrChat/initialize')
      await this.$store.dispatch('nostrChat/publishKind10050')
      this.$store.dispatch('nostrChat/subscribeToRelays')
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
    contactInitial (contact) {
      return (contact.name || '').charAt(0).toUpperCase()
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
  },
}
</script>

<style scoped>
.chat-body {
  padding: 0;
}

/* Identity section */
.identity-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.04));
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.identity-avatar {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
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

/* Relay section */
.relay-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  background: rgba(0, 0, 0, 0.01);
}

.relay-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  margin-right: 12px;
}

/* Rooms section */
.rooms-section {
  padding-bottom: 80px;
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

/* Dialog */
.dialog-header {
  padding-bottom: 8px;
}

.contact-item {
  padding: 10px 4px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.contact-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
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

.dark .relay-section {
  background: rgba(255, 255, 255, 0.01);
  border-bottom-color: rgba(255, 255, 255, 0.04);
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
</style>
