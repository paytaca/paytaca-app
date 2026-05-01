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

    <div class="q-px-md q-pt-md">
      <!-- User identity card -->
      <q-card class="q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-avatar color="primary" text-color="white">
            <q-icon name="account_circle" />
          </q-avatar>
          <div class="col">
            <div class="text-subtitle2 text-weight-medium">{{ $t('YourNpub', {}, 'Your Nostr ID') }}</div>
            <div class="text-caption ellipsis">{{ myNpub || '...' }}</div>
          </div>
          <q-btn
            flat
            round
            dense
            icon="content_copy"
            :disable="!myNpub"
            @click="copyNpub"
          />
        </q-card-section>
      </q-card>

      <!-- Relay status -->
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-caption text-grey">{{ $t('RelayStatus', {}, 'Relays') }}</div>
        <relay-status-chip :relay-urls="relays" :relay-status="relayStatus" />
      </div>

      <!-- Rooms list -->
      <room-list
        :rooms="rooms"
        :messages="messages"
        @select-room="openRoom"
      />
    </div>

    <!-- FAB for new chat -->
    <div class="fab-container">
      <q-btn fab icon="chat" color="primary" @click="showNewChatDialog = true" />
    </div>

    <!-- New chat / add contact dialog -->
    <q-dialog v-model="showNewChatDialog" persistent>
      <q-card style="min-width: 320px;" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="text-h6">{{ $t('NewChat', {}, 'New Chat') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-tabs v-model="dialogTab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify">
            <q-tab name="contacts" :label="$t('Contacts', {}, 'Contacts')" />
            <q-tab name="add" :label="$t('AddContact', {}, 'Add Contact')" />
          </q-tabs>

          <q-tab-panels v-model="dialogTab" animated>
            <q-tab-panel name="contacts">
              <q-list v-if="contacts.length" separator>
                <q-item
                  v-for="contact in contacts"
                  :key="contact.npub"
                  clickable
                  @click="startChatWith(contact)"
                >
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white">
                      {{ contactInitial(contact) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ contact.name }}</q-item-label>
                    <q-item-label caption>{{ contact.npub.slice(0, 16) }}...</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="text-grey text-center q-pa-md">
                {{ $t('NoContactsYet', {}, 'No contacts yet. Add one below.') }}
              </div>
            </q-tab-panel>

            <q-tab-panel name="add">
              <q-input
                v-model="newContactName"
                :label="$t('Name', {}, 'Name')"
                outlined
                dense
                class="q-mb-md"
              />
              <q-input
                v-model="newContactNpub"
                :label="$t('Npub', {}, 'npub...')"
                outlined
                dense
                class="q-mb-md"
                :error="!!npubError"
                :error-message="npubError"
              />
              <q-btn
                :label="$t('AddContact', {}, 'Add Contact')"
                color="primary"
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
      // Always initialize (or re-initialize) so kind:10050 is re-published
      await this.$store.dispatch('nostrChat/initialize')
      // Re-publish relay preferences every time chat opens
      await this.$store.dispatch('nostrChat/publishKind10050')
      // Start listening for incoming messages
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
    // Keep subscription alive for background messages, but we could disconnect if needed
    // this.$store.dispatch('nostrChat/disconnectRelays')
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
.fab-container {
  position: fixed;
  bottom: 18px;
  right: 18px;
  z-index: 100;
}
</style>
