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
              clickable
              class="member-item"
              :class="{ 'member-item-me': member.isMe }"
              @click="openMemberDetails(member)"
            >
              <q-item-section avatar>
                <q-avatar
                  :color="member.isMe ? 'primary' : 'grey-5'"
                  text-color="white"
                  size="44px"
                >
                  <img v-if="member.avatar" :src="member.avatar" />
                  <template v-else>{{ member.initial }}</template>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium member-name-row">
                  {{ member.displayName }}
                  <q-badge
                    v-if="member.isMe"
                    color="primary"
                    class="you-chip q-ml-xs"
                    outline
                  >
                    {{ $t('You', {}, 'You') }}
                  </q-badge>
                </q-item-label>
                <q-item-label caption class="npub-caption">
                  {{ member.displayNpub }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Member Details Dialog -->
        <q-dialog v-model="showMemberDetails" persistent>
          <q-card class="member-details-card pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 320px; border-radius: 16px;">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">{{ $t('MemberDetails', {}, 'Member Details') }}</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section v-if="selectedMember">
              <!-- Avatar and name -->
              <div class="member-header">
                <q-avatar
                  :color="selectedMember.isMe ? 'primary' : 'grey-5'"
                  text-color="white"
                  size="128px"
                  style="font-size: 56px;"
                >
                  <img v-if="selectedMember.avatar" :src="selectedMember.avatar" />
                  <template v-else>{{ selectedMember.initial }}</template>
                </q-avatar>
                <div class="member-header-info">
                  <div class="member-display-name">
                    {{ memberDisplayNames[selectedMember.pubKeyHex] || selectedMember.displayName }}
                    <q-badge
                      v-if="selectedMember.isMe"
                      color="primary"
                      class="you-chip q-ml-xs"
                      outline
                    >
                      {{ $t('You', {}, 'You') }}
                    </q-badge>
                  </div>
                  <div v-if="selectedMember.contact?.name && memberDisplayNames[selectedMember.pubKeyHex] && memberDisplayNames[selectedMember.pubKeyHex] !== selectedMember.contact.name" class="member-contact-name">
                    {{ selectedMember.contact.name }}
                  </div>
                  <div class="member-npub-display">{{ selectedMember.displayNpub }}</div>
                </div>
              </div>

              <!-- Copy npub -->
              <q-btn
                flat
                :label="$t('CopyNpub', {}, 'Copy npub')"
                color="primary"
                icon="content_copy"
                class="full-width q-mt-sm"
                @click="copyMemberNpub"
              />
            </q-card-section>

          </q-card>
        </q-dialog>

        <!-- Leave / Rejoin group -->
        <div class="leave-section q-mt-md">
          <q-btn
            v-if="!isGroupBlocked"
            :label="$t('LeaveGroup', {}, 'Leave Group')"
            color="negative"
            outline
            rounded
            class="full-width"
            @click="confirmLeaveGroup"
          />
          <q-btn
            v-else
            :label="$t('RejoinGroup', {}, 'Rejoin Group')"
            color="primary"
            outline
            rounded
            class="full-width"
            @click="confirmRejoinGroup"
          />
        </div>

        <!-- Info note -->
        <div class="info-note q-mt-md">
          <q-icon name="info" size="16px" color="grey-5" />
          <span v-if="!isGroupBlocked">{{ $t('LeaveGroupNote', {}, 'Leaving a group archives it and stops new messages from arriving. A message will be sent to the group notifying them you left. You can rejoin later.') }}</span>
          <span v-else>{{ $t('LeftGroupNote', {}, 'You left this group. Rejoin to send and receive messages again.') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import { npubEncode } from 'nostr-tools/nip19'
import { copyToClipboard } from 'quasar'

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
      showMemberDetails: false,
      selectedMember: null,
      memberAvatars: {},
      memberDisplayNames: {},
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    room () {
      return this.$store.getters['nostrChat/getRoom'](this.roomId)
    },
    isGroupBlocked () {
      if (!this.roomId) return false
      return this.$store.getters['nostrChat/isGroupBlocked'](this.roomId)
    },
    myPubKey () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
    membersWithInfo () {
      const members = this.room?.members || []
      const list = members.map(pubKeyHex => {
        const contact = this.contacts.find(c => c.pubKeyHex === pubKeyHex)
        let displayNpub = ''
        try { displayNpub = npubEncode(pubKeyHex) } catch { displayNpub = pubKeyHex }
        const initial = contact ? contact.name.charAt(0).toUpperCase() : (displayNpub.charAt(0) || '?').toUpperCase()
        const publishedName = this.memberDisplayNames[pubKeyHex]
        return {
          pubKeyHex,
          isMe: pubKeyHex === this.myPubKey,
          displayName: contact ? contact.name : (publishedName || displayNpub.slice(0, 12) + '...' + displayNpub.slice(-8)),
          displayNpub: displayNpub.slice(0, 18) + '...',
          initial,
          contact,
          npub: displayNpub,
          avatar: this.memberAvatars[pubKeyHex] || null,
        }
      })
      // Sort current user to the top
      return list.sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0))
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },

  },
  mounted () {
    this.fetchMemberAvatars()
    this.fetchMemberDisplayNames()
  },
  watch: {
    room (val) {
      if (!val) {
        this.$router.replace('/apps/chat')
      } else {
        this.memberAvatars = {}
        this.memberDisplayNames = {}
        this.fetchMemberAvatars()
        this.fetchMemberDisplayNames()
      }
    },
    async showMemberDetails (val) {
      this.fetchedMemberDisplayName = null
      if (val && this.selectedMember?.pubKeyHex) {
        const pubKeyHex = this.selectedMember.pubKeyHex
        try {
          const [displayName, avatar] = await Promise.all([
            this.$store.dispatch('nostrChat/fetchPublishedDisplayName', { pubKeyHex }),
            this.$store.dispatch('nostrChat/fetchPublishedAvatar', { pubKeyHex }),
          ])
          if (displayName) {
            this.fetchedMemberDisplayName = displayName
          }
          if (avatar && !this.memberAvatars[pubKeyHex]) {
            this.memberAvatars = { ...this.memberAvatars, [pubKeyHex]: avatar }
          }
        } catch (err) {
          console.warn('[GroupInfo] Failed to fetch member details:', err)
        }
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
        const text = this.$t('GroupRenamedTo', { name }, `Changed group name to "${name}"`)
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
          subject: name,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        // Persist the new name on the relay so all members see it
        this.$store.dispatch('nostrChat/publishGroupMetadata', {
          roomId: this.roomId,
          memberPubKeys: this.room?.members || [],
          name,
        }).catch(() => {})
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
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          await this.$store.dispatch('nostrChat/leaveGroup', { roomId: this.roomId })
          this.$router.replace('/apps/chat')
          this.$q.notify({ type: 'info', message: this.$t('LeftGroup', {}, 'You left the group') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('LeaveGroupFailed', {}, 'Failed to leave group') })
        }
      })
    },
    confirmRejoinGroup () {
      this.$q.dialog({
        title: this.$t('RejoinGroup', {}, 'Rejoin Group'),
        message: this.$t('RejoinGroupConfirm', { name: this.room?.name }, `Rejoin "${this.room?.name}"? You will be able to send and receive messages again.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('RejoinGroup', {}, 'Rejoin Group'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(async () => {
        await this.$store.dispatch('nostrChat/rejoinGroup', { roomId: this.roomId })
        this.$q.notify({ type: 'positive', message: this.$t('GroupRejoined', {}, 'Group rejoined') })
      })
    },

    openMemberDetails (member) {
      this.selectedMember = member
      this.showMemberDetails = true
    },
    copyMemberNpub () {
      if (!this.selectedMember?.npub) return
      copyToClipboard(this.selectedMember.npub)
      this.$q.notify({
        type: 'positive',
        message: this.$t('Copied', {}, 'Copied to clipboard'),
        timeout: 1500,
      })
    },
    useFetchedMemberDisplayName () {
      if (this.fetchedMemberDisplayName) {
        this.editMemberNameValue = this.fetchedMemberDisplayName
      }
    },
    myDisplayName () {
      const myPub = this.myPubKey
      if (!myPub) return 'You'
      const contact = this.contacts.find(c => c.pubKeyHex === myPub)
      return contact?.name || 'You'
    },
    async fetchMemberAvatars () {
      const members = this.room?.members || []
      for (const pubKeyHex of members) {
        if (this.memberAvatars[pubKeyHex]) continue
        try {
          const avatar = await this.$store.dispatch('nostrChat/fetchPublishedAvatar', {
            pubKeyHex,
          })
          if (avatar) {
            this.memberAvatars = { ...this.memberAvatars, [pubKeyHex]: avatar }
          }
        } catch (err) {
          console.warn('[GroupInfo] Failed to fetch avatar:', err)
        }
      }
    },
    async fetchMemberDisplayNames () {
      const members = this.room?.members || []
      for (const pubKeyHex of members) {
        if (this.memberDisplayNames[pubKeyHex]) continue
        try {
          const name = await this.$store.dispatch('nostrChat/fetchPublishedDisplayName', {
            pubKeyHex,
          })
          if (name) {
            this.memberDisplayNames = { ...this.memberDisplayNames, [pubKeyHex]: name }
          }
        } catch (err) {
          console.warn('[GroupInfo] Failed to fetch display name:', err)
        }
      }
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

.member-details-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
}

.member-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.member-header-info {
  text-align: center;
  width: 100%;
}

.member-display-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.member-contact-name {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 400;
  margin-bottom: 2px;
}

.member-name-input {
  max-width: 260px;
  margin: 0 auto 8px;
}

.member-name-input :deep(.q-field__control) {
  border-radius: 10px;
}

.member-npub-display {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #6b7280;
  word-break: break-all;
}

.edit-name-section {
  margin-top: 12px;
}

.edit-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.use-published-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.use-published-name-text {
  flex: 1;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

.use-published-name-text strong {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-top: 2px;
}

.member-item {
  padding: 8px 4px;
  border-radius: 10px;
}

.member-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.member-item-me {
  background: rgba(59, 130, 246, 0.06);
  border-radius: 10px;
}

.member-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.you-chip {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
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

.dark .member-item-me {
  background: rgba(59, 130, 246, 0.12);
}

.dark .member-display-name {
  color: #f1f5f9;
}

.dark .member-contact-name {
  color: #6b7280;
}

.dark .member-npub-display {
  color: #94a3b8;
}

.dark .use-published-name-row {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark .use-published-name-text {
  color: #d1d5db;
}

.dark .use-published-name-text strong {
  color: #f3f4f6;
}
</style>
