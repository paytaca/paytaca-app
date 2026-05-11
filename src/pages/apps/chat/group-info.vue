<template>
  <div class="static-container">
    <div
      id="app-container"
      class="sticky-header-container text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <header-nav
        class="apps-header"
        :backnavpath="`/apps/chat/${roomId}`"
        :title="$t('GroupInfo', {}, 'Group Info')"
      />

      <div class="group-info-body">
        <!-- Group header card -->
        <div
          class="group-header-card"
          :class="getDarkModeClass(darkMode)"
          :style="{ background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}0a)` }"
        >
          <q-avatar
            size="64px"
            class="group-avatar"
            :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }"
          >
            <q-icon name="group" size="36px" />
          </q-avatar>
          <div class="group-name-display">{{ room?.name || '' }}</div>
          <div class="group-meta">
            {{ $t('MemberCount', { count: room?.members?.length || 0 }, `${room?.members?.length || 0} members`) }}
          </div>
        </div>

        <!-- Edit group name -->
        <div class="name-edit-section" :class="getDarkModeClass(darkMode)">
          <div class="section-title">{{ $t('GroupName', {}, 'Group Name') }}</div>
          <div v-if="!editingName" class="name-display-row">
            <div class="name-text">{{ room?.name || '' }}</div>
            <q-btn
              flat
              dense
              round
              icon="edit"
              color="primary"
              @click="startEditName"
            />
          </div>
          <div v-else class="name-edit-row">
            <q-input
              v-model="editNameValue"
              outlined
              dense
              rounded
              class="name-input"
              autofocus
              @keyup.enter="saveName"
            />
            <q-btn
              unelevated
              :label="$t('Save', {}, 'Save')"
              color="primary"
              rounded
              :loading="savingName"
              :disable="!editNameValue.trim()"
              @click="saveName"
            />
            <q-btn
              flat
              :label="$t('Cancel', {}, 'Cancel')"
              color="grey"
              rounded
              @click="cancelEditName"
            />
          </div>
        </div>

        <!-- Members list -->
        <div class="members-section" :class="getDarkModeClass(darkMode)">
          <div class="section-title">{{ $t('Members', {}, 'Members') }}</div>
          <q-list separator>
            <q-item
              v-for="member in membersWithInfo"
              :key="member.pubKeyHex"
              class="member-item"
            >
              <q-item-section avatar>
                <q-avatar
                  color="primary"
                  text-color="white"
                  size="44px"
                >
                  {{ member.initial }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ member.displayName }}
                  <span v-if="member.isMe" class="you-badge">{{ $t('You', {}, '(You)') }}</span>
                </q-item-label>
                <q-item-label caption class="npub-caption">
                  {{ member.displayNpub }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Leave group -->
        <div class="leave-section q-mt-md">
          <q-btn
            :label="$t('LeaveGroup', {}, 'Leave Group')"
            color="negative"
            outline
            rounded
            class="full-width"
            @click="confirmLeaveGroup"
          />
        </div>

        <!-- Info note -->
        <div class="info-note q-mt-md">
          <q-icon name="info" size="16px" color="grey-5" />
          <span>{{ $t('LeaveGroupNote', {}, 'Leaving a group removes it from your view. A message will be sent to the group notifying them you left.') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import { npubEncode } from 'nostr-tools/nip19'

export default {
  name: 'GroupInfo',
  components: { HeaderNav },
  props: {
    roomId: { type: String, required: true },
  },
  data () {
    return {
      editingName: false,
      editNameValue: '',
      savingName: false,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    room () {
      return this.$store.getters['nostrChat/getRoom'](this.roomId)
    },
    myPubKey () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
    membersWithInfo () {
      const members = this.room?.members || []
      return members.map(pubKeyHex => {
        const contact = this.contacts.find(c => c.pubKeyHex === pubKeyHex)
        let displayNpub = ''
        try { displayNpub = npubEncode(pubKeyHex) } catch { displayNpub = pubKeyHex }
        const initial = contact ? contact.name.charAt(0).toUpperCase() : (displayNpub.charAt(0) || '?').toUpperCase()
        return {
          pubKeyHex,
          isMe: pubKeyHex === this.myPubKey,
          displayName: contact ? contact.name : displayNpub.slice(0, 12) + '...' + displayNpub.slice(-8),
          displayNpub: displayNpub.slice(0, 18) + '...',
          initial,
        }
      })
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
  },
  watch: {
    room (val) {
      if (!val) {
        this.$router.replace('/apps/chat')
      }
    },
  },
  methods: {
    getDarkModeClass,
    startEditName () {
      this.editNameValue = this.room?.name || ''
      this.editingName = true
    },
    cancelEditName () {
      this.editingName = false
      this.editNameValue = ''
    },
    async saveName () {
      const name = this.editNameValue.trim()
      if (!name || !this.room) return
      this.savingName = true
      try {
        this.$store.commit('nostrChat/UPDATE_ROOM_NAME', { roomId: this.roomId, name })
        const text = this.$t('GroupRenamedBy', { name }, `renamed the group to "${name}"`)
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        this.editingName = false
        this.$q.notify({ type: 'positive', message: this.$t('GroupRenamed', {}, 'Group renamed') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('RenameGroupFailed', {}, 'Failed to rename group') })
      } finally {
        this.savingName = false
      }
    },
    confirmLeaveGroup () {
      this.$q.dialog({
        title: this.$t('LeaveGroup', {}, 'Leave Group'),
        message: this.$t('LeaveGroupConfirm', { name: this.room?.name }, `Leave group "${this.room?.name}"?`),
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          const myDisplayName = this.myDisplayName
          const text = this.$t('LeftGroup', {}, `${myDisplayName} left the group`)
          const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
            roomId: this.roomId,
            text,
          })
          this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
          this.$store.commit('nostrChat/REMOVE_ROOM', this.roomId)
          this.$router.replace('/apps/chat')
          this.$q.notify({ type: 'info', message: this.$t('LeftGroup', {}, 'You left the group') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('LeaveGroupFailed', {}, 'Failed to leave group') })
        }
      })
    },
    myDisplayName () {
      const myPub = this.myPubKey
      if (!myPub) return 'You'
      const contact = this.contacts.find(c => c.pubKeyHex === myPub)
      return contact?.name || 'You'
    },
  },
}
</script>

<style scoped>
.group-info-body {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.group-header-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
  border-radius: 16px;
  text-align: center;
}

.group-avatar {
  color: #ffffff;
}

.group-name-display {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.group-meta {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.name-edit-section {
  margin-top: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  padding: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.name-display-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name-text {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.name-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-input {
  flex: 1;
}

.name-input :deep(.q-field__control) {
  border-radius: 10px;
}

.members-section {
  margin-top: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  padding: 16px;
}

.member-item {
  padding: 8px 4px;
  border-radius: 10px;
}

.member-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.you-badge {
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
  margin-left: 4px;
}

.npub-caption {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.leave-section {
  padding: 0 16px;
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0 16px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

/* Dark mode */
.dark .group-name-display {
  color: #f1f5f9;
}

.dark .name-text {
  color: #f1f5f9;
}

.dark .name-edit-section,
.dark .members-section {
  background: rgba(255, 255, 255, 0.04);
}

.dark .member-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
</style>
