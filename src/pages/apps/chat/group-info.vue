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
          <template v-if="isMlsRoom">
            <q-tabs
              v-model="memberTab"
              dense
              no-caps
              align="left"
              active-color="primary"
              indicator-color="primary"
              class="member-tabs"
            >
              <q-tab name="joined" :label="$t('JoinedTab', { count: joinedMembers.length }, `Joined (${joinedMembers.length})`)" />
              <q-tab name="invited">
                {{ $t('InvitedTab', {}, 'Invited') }}
                <q-badge v-if="invitedMembers.length" color="warning" class="q-ml-xs">{{ invitedMembers.length }}</q-badge>
              </q-tab>
            </q-tabs>
            <q-separator />
          </template>

          <q-list separator>
            <q-item
              v-for="member in displayedMembers"
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
                  <q-badge
                    v-if="isMlsRoom && member.pubKeyHex === room?.owner"
                    color="amber-7"
                    class="role-chip q-ml-xs"
                  >
                    {{ $t('Owner', {}, 'Owner') }}
                  </q-badge>
                  <q-badge
                    v-else-if="isMlsRoom && member.isAdmin"
                    color="teal-6"
                    class="role-chip q-ml-xs"
                  >
                    {{ $t('Admin', {}, 'Admin') }}
                  </q-badge>
                  <q-badge
                    v-if="isMlsRoom && memberTab === 'invited'"
                    color="warning"
                    class="you-chip q-ml-xs"
                    outline
                  >
                    {{ $t('InvitedBadge', {}, 'Invited') }}
                  </q-badge>
                </q-item-label>
                <q-item-label caption class="npub-caption">
                  {{ member.displayNpub }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-if="isMlsRoom && memberTab === 'invited'" side>
                <q-icon name="hourglass_top" size="18px" color="warning" />
              </q-item-section>
            </q-item>
          </q-list>
          <div
            v-if="isMlsRoom && memberTab === 'invited' && !invitedMembers.length"
            class="no-invited-note"
          >
            {{ $t('NoPendingInvites', {}, 'No pending invitations') }}
          </div>

          <!-- MLS groups support adding members after creation -->
          <q-btn
            v-if="room?.type === 'mls-group'"
            :label="$t('AddMember', {}, 'Add member')"
            color="primary"
            outline
            rounded
            unelevated
            class="full-width q-mt-sm"
            :disable="addingMember || !isGroupManager"
            @click="openAddMemberDialog"
          />
        </div>

        <!-- Member Details Dialog -->        <q-dialog v-model="showMemberDetails" persistent>
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

              <template v-if="room?.type === 'mls-group' && !selectedMember.isMe">
                <!-- Owner controls -->
                <template v-if="isGroupOwner">
                  <q-btn
                    v-if="!selectedMember.isAdmin && selectedMember.pubKeyHex !== room?.owner"
                    flat
                    :label="$t('MakeAdmin', {}, 'Make admin')"
                    color="primary"
                    icon="shield"
                    class="full-width q-mt-sm"
                    :loading="roleChanging"
                    @click="confirmToggleAdmin(true)"
                  />
                  <q-btn
                    v-if="selectedMember.isAdmin"
                    flat
                    :label="$t('RevokeAdmin', {}, 'Remove admin')"
                    color="orange"
                    icon="shield"
                    class="full-width q-mt-sm"
                    :loading="roleChanging"
                    @click="confirmToggleAdmin(false)"
                  />
                  <q-btn
                    v-if="selectedMember.isAdmin"
                    flat
                    :label="$t('TransferOwnership', {}, 'Transfer ownership')"
                    color="primary"
                    icon="swap_horiz"
                    class="full-width q-mt-sm"
                    :loading="roleChanging"
                    @click="confirmTransferOwnership"
                  />
                </template>
                <!-- Manager controls (owner or admin) -->
                <q-btn
                  v-if="canRemoveManager && !selectedMember.isAdmin"
                  flat
                  :label="$t('RemoveMember', {}, 'Remove from group')"
                  color="negative"
                  icon="person_remove"
                  class="full-width q-mt-sm"
                  :loading="removingMember"
                  @click="confirmRemoveMember"
                />
              </template>
            </q-card-section>

          </q-card>
        </q-dialog>

        <!-- Add Member Dialog -->
        <q-dialog v-model="showAddMemberDialog" persistent>
          <q-card class="member-details-card pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 320px; max-width: 420px; border-radius: 16px;">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">{{ $t('AddMember', {}, 'Add member') }}</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section>
              <q-tabs
                v-model="addMemberTab"
                dense
                no-caps
                align="left"
                active-color="primary"
                indicator-color="primary"
                class="q-mb-sm"
              >
                <q-tab name="contacts" :label="$t('Contacts', {}, 'Contacts')" />
                <q-tab name="npub" :label="$t('InviteByNpub', {}, 'By npub')" />
              </q-tabs>

              <q-tab-panels v-model="addMemberTab" animated class="add-member-panels">
                <q-tab-panel name="contacts" class="q-px-none">
                  <q-list v-if="addableContacts.length" separator class="add-member-list">
                    <q-item
                      v-for="contact in addableContacts"
                      :key="contact.npub"
                      clickable
                      @click="toggleAddMember(contact.npub)"
                    >
                      <q-item-section avatar>
                        <q-checkbox
                          :model-value="selectedAddNpubs.includes(contact.npub)"
                          @click.stop
                          @update:model-value="toggleAddMember(contact.npub)"
                        />
                      </q-item-section>
                      <q-item-section avatar>
                        <q-avatar color="primary" text-color="white" size="36px">
                          {{ contact.name.charAt(0).toUpperCase() }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">{{ contact.name }}</q-item-label>
                        <q-item-label caption class="npub-caption">{{ contact.npub.slice(0, 18) }}...</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div v-else class="no-invited-note">
                    {{ $t('NoContactsToAdd', {}, 'No contacts to add. Use the By npub tab.') }}
                  </div>
                </q-tab-panel>

                <q-tab-panel name="npub" class="q-px-none">
                  <q-input
                    v-model="manualNpub"
                    :label="$t('Npub', {}, 'npub...')"
                    outlined
                    dense
                    rounded
                    :error="!!manualNpubError"
                    :error-message="manualNpubError"
                  >
                    <template #append>
                      <q-btn
                        flat
                        round
                        dense
                        icon="qr_code_scanner"
                        color="primary"
                        @click="showQrScanner = true"
                      />
                    </template>
                  </q-input>
                </q-tab-panel>
              </q-tab-panels>
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat :label="$t('Cancel', {}, 'Cancel')" color="grey" v-close-popup />
              <q-btn
                unelevated
                rounded
                :label="$t('Add', {}, 'Add')"
                color="primary"
                :loading="addingMember"
                :disable="!canAddMembers"
                @click="confirmAddMembers"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>

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
          <span>{{ $t('LeaveGroupNote', {}, 'Leaving a group removes you from the group and stops new messages from arriving.') }}</span>
        </div>
      </div>
    </div>

    <QrScanner v-model="showQrScanner" @decode="onScannerDecode" />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import QrScanner from 'src/components/qr-scanner.vue'
import { npubEncode } from 'nostr-tools/nip19'
import { copyToClipboard } from 'quasar'

export default {
  name: 'GroupInfo',
  components: { HeaderNav, QrScanner },
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
      addingMember: false,
      roleChanging: false,
      removingMember: false,
      memberTab: 'joined',
      mlsTreeMembers: [],
      showAddMemberDialog: false,
      addMemberTab: 'contacts',
      selectedAddNpubs: [],
      manualNpub: '',
      manualNpubError: '',
      showQrScanner: false,
      leaveSuccessor: '',
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    room () {
      return this.$store.getters['nostrChat/getRoom'](this.roomId)
    },
    isMlsRoom () {
      return this.room?.type === 'mls-group'
    },
    myPubKey () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
    // Current wallet's role in an MLS group: 'owner', 'admin', or null.
    myRole () {
      if (!this.isMlsRoom || !this.room) return null
      if (this.room.owner === this.myPubKey) return 'owner'
      if (Array.isArray(this.room.admins) && this.room.admins.includes(this.myPubKey)) return 'admin'
      return null
    },
    isGroupOwner () {
      return this.myRole === 'owner'
    },
    isGroupAdmin () {
      return this.myRole === 'admin'
    },
    isGroupManager () {
      return this.isGroupOwner || this.isGroupAdmin
    },
    // Remove is allowed for the owner (any non-owner member) and for admins
    // (regular members only — they may not remove the owner or another admin).
    canRemoveManager () {
      if (!this.isGroupManager || !this.selectedMember) return false
      if (this.selectedMember.isMe) return false
      if (this.selectedMember.pubKeyHex === this.room?.owner) return false
      if (this.isGroupAdmin && this.selectedMember.isAdmin) return false
      return true
    },
    membersWithInfo () {
      const members = this.room?.members || []
      const adminSet = new Set(this.room?.admins || [])
      const list = members.map(pubKeyHex => {
        const contact = this.contacts.find(c => c.pubKeyHex === pubKeyHex)
        let displayNpub = ''
        try { displayNpub = npubEncode(pubKeyHex) } catch { displayNpub = pubKeyHex }
        const initial = contact ? contact.name.charAt(0).toUpperCase() : (displayNpub.charAt(0) || '?').toUpperCase()
        const publishedName = this.memberDisplayNames[pubKeyHex]
        return {
          pubKeyHex,
          isMe: pubKeyHex === this.myPubKey,
          isAdmin: adminSet.has(pubKeyHex),
          displayName: contact ? contact.name : (publishedName || displayNpub.slice(0, 12) + '...' + displayNpub.slice(-8)),
          displayNpub: displayNpub.slice(0, 18) + '...',
          initial,
          contact,
          npub: displayNpub,
          avatar: this.memberAvatars[pubKeyHex] || null,
        }
      })
      // Sort current user to the top, then owner, then admins.
      return list.sort((a, b) => {
        if (a.isMe !== b.isMe) return a.isMe ? -1 : 1
        const rankA = a.pubKeyHex === this.room?.owner ? 2 : a.isAdmin ? 1 : 0
        const rankB = b.pubKeyHex === this.room?.owner ? 2 : b.isAdmin ? 1 : 0
        return rankB - rankA
      })
    },
    // Members present in the MLS tree have completed the join handshake.
    joinedMembers () {
      if (!this.isMlsRoom || !this.mlsTreeMembers.length) return this.membersWithInfo
      const treeSet = new Set(this.mlsTreeMembers)
      return this.membersWithInfo.filter(m => treeSet.has(m.pubKeyHex))
    },
    // In the room's member list but not yet in the MLS tree — invite sent,
    // they haven't accepted (or their device hasn't processed the welcome).
    invitedMembers () {
      if (!this.isMlsRoom) return []
      if (!this.mlsTreeMembers.length) return []
      const treeSet = new Set(this.mlsTreeMembers)
      return this.membersWithInfo.filter(m => !treeSet.has(m.pubKeyHex))
    },
    displayedMembers () {
      if (!this.isMlsRoom) return this.membersWithInfo
      return this.memberTab === 'invited' ? this.invitedMembers : this.joinedMembers
    },
    // Contacts not already in the group — the selectable list in the
    // Add Member dialog.
    addableContacts () {
      const memberSet = new Set(this.room?.members || [])
      return (this.contacts || []).filter(c => c.pubKeyHex && !memberSet.has(c.pubKeyHex))
    },
    manualNpubTrimmed () {
      return this.manualNpub.trim()
    },
    canAddMembers () {
      if (this.addingMember) return false
      if (this.selectedAddNpubs.length) return true
      return this.manualNpubTrimmed.startsWith('npub1')
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
    this.fetchMlsTreeMembers()
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
        this.fetchMlsTreeMembers()
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
        await this.$store.dispatch('nostrChat/updateRoomName', { roomId: this.roomId, name })
        this.editingName = false
        this.$q.notify({ type: 'positive', message: this.$t('GroupRenamed', {}, 'Group renamed') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('RenameGroupFailed', {}, 'Failed to rename group') })
      } finally {
        this.savingName = false
      }
    },
    confirmLeaveGroup () {
      if (this.isGroupOwner) {
        this.confirmOwnerLeaveGroup()
        return
      }
      this.$q.dialog({
        title: this.$t('LeaveGroup', {}, 'Leave Group'),
        message: this.$t('LeaveGroupConfirm', { name: this.room?.name }, `Leave group "${this.room?.name}"?`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          await this.$store.dispatch('nostrChat/leaveMlsGroup', { roomId: this.roomId })
          this.$router.replace('/apps/chat')
          this.$q.notify({ type: 'info', message: this.$t('LeftGroup', {}, 'You left the group') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('LeaveGroupFailed', {}, 'Failed to leave group') })
        }
      })
    },
    // Owner leaving an MLS group must designate a successor from the admins
    // (ownership is transferred to them before departure). If the owner is the
    // only member, they can leave without a successor (the group is deleted).
    confirmOwnerLeaveGroup () {
      const admins = this.room?.admins || []
      const onlyMember = (this.room?.members?.length || 0) <= 1
      if (!admins.length && !onlyMember) {
        this.$q.notify({
          type: 'warning',
          message: this.$t('OwnerLeaveNeedsAdmin', {}, 'Promote another member to admin first — the group needs a new owner before you can leave.'),
          timeout: 6000,
        })
        return
      }
      if (onlyMember) {
        this.$q.dialog({
          title: this.$t('LeaveGroup', {}, 'Leave Group'),
          message: this.$t('LeaveGroupConfirm', { name: this.room?.name }, `Leave "${this.room?.name}"?`),
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
          persistent: true,
        }).onOk(async () => {
          await this.doOwnerLeave({})
        })
        return
      }
      const successorOptions = admins.map(pubKeyHex => {
        const info = this.membersWithInfo.find(m => m.pubKeyHex === pubKeyHex)
        return { value: pubKeyHex, label: info?.displayName || pubKeyHex.slice(0, 12) }
      })
      this.$q.dialog({
        title: this.$t('ChooseNewOwner', {}, 'Choose a new owner'),
        message: this.$t('OwnerLeaveSuccessor', {}, 'You are the group owner. Choose which admin will become the new owner after you leave.'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        options: {
          type: 'radio',
          model: this.leaveSuccessor,
          items: successorOptions,
        },
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        await this.doOwnerLeave({ successorPubKey: this.leaveSuccessor })
      })
    },
    async doOwnerLeave ({ successorPubKey }) {
      try {
        await this.$store.dispatch('nostrChat/leaveMlsGroup', {
          roomId: this.roomId,
          successorPubKey,
        })
        this.$router.replace('/apps/chat')
        this.$q.notify({ type: 'info', message: this.$t('LeftGroup', {}, 'You left the group') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('LeaveGroupFailed', {}, 'Failed to leave group') })
      }
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
    confirmToggleAdmin (isAdmin) {
      const member = this.selectedMember
      if (!member?.pubKeyHex) return
      this.$q.dialog({
        title: this.$t(isAdmin ? 'MakeAdmin' : 'RevokeAdmin', {}, isAdmin ? 'Make admin' : 'Remove admin'),
        message: this.$t(
          isAdmin ? 'MakeAdminConfirm' : 'RevokeAdminConfirm',
          { name: member.displayName },
          isAdmin
            ? `Make ${member.displayName} an admin? They will be able to manage members.`
            : `Remove admin from ${member.displayName}? They will no longer be able to manage members.`
        ),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t(isAdmin ? 'Make' : 'Revoke', {}, isAdmin ? 'Make admin' : 'Revoke'), color: isAdmin ? 'primary' : 'orange', flat: true },
        persistent: true,
      }).onOk(() => {
        this.toggleAdmin(isAdmin)
      })
    },
    async toggleAdmin (isAdmin) {
      const member = this.selectedMember
      if (!member?.pubKeyHex || this.roleChanging) return
      if (!this.isGroupOwner) return
      this.roleChanging = true
      try {
        await this.$store.dispatch('nostrChat/setMlsAdmin', {
          roomId: this.roomId,
          memberPubKey: member.pubKeyHex,
          isAdmin,
        })
        // Keep the open dialog in sync with the refreshed role state.
        const fresh = this.membersWithInfo.find(m => m.pubKeyHex === member.pubKeyHex)
        if (fresh) this.selectedMember = { ...member, isAdmin: fresh.isAdmin }
        this.$q.notify({ type: 'positive', message: isAdmin
          ? this.$t('MemberMadeAdmin', {}, 'Member is now an admin')
          : this.$t('AdminRevoked', {}, 'Admin role removed') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('RoleChangeFailed', {}, 'Failed to update role'), timeout: 5000 })
      } finally {
        this.roleChanging = false
      }
    },
    confirmTransferOwnership () {
      const member = this.selectedMember
      if (!member?.pubKeyHex) return
      this.$q.dialog({
        title: this.$t('TransferOwnership', {}, 'Transfer ownership'),
        message: this.$t('TransferOwnershipConfirm', { name: member.displayName }, `Transfer group ownership to ${member.displayName}? You will become a regular member.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Transfer', {}, 'Transfer'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(async () => {
        this.roleChanging = true
        try {
          await this.$store.dispatch('nostrChat/transferMlsOwnership', {
            roomId: this.roomId,
            newOwnerPubKey: member.pubKeyHex,
          })
          this.showMemberDetails = false
          this.$q.notify({ type: 'positive', message: this.$t('OwnershipTransferred', { name: member.displayName }, `Ownership transferred to ${member.displayName}`) })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('OwnershipTransferFailed', {}, 'Failed to transfer ownership'), timeout: 5000 })
        } finally {
          this.roleChanging = false
        }
      })
    },
    confirmRemoveMember () {
      const member = this.selectedMember
      if (!member?.pubKeyHex) return
      this.$q.dialog({
        title: this.$t('RemoveMember', {}, 'Remove from group'),
        message: this.$t('RemoveMemberConfirm', { name: member.displayName }, `Remove ${member.displayName} from this group? They will no longer be able to read or send messages.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Remove', {}, 'Remove'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        this.removingMember = true
        try {
          await this.$store.dispatch('nostrChat/removeMlsMember', {
            roomId: this.roomId,
            memberPubkey: member.pubKeyHex,
          })
          this.showMemberDetails = false
          this.$q.notify({ type: 'positive', message: this.$t('MemberRemoved', {}, 'Member removed') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('RemoveMemberFailed', {}, 'Failed to remove member'), timeout: 5000 })
        } finally {
          this.removingMember = false
        }
      })
    },
    async fetchMlsTreeMembers () {
      if (!this.isMlsRoom) return
      try {
        const members = await this.$store.dispatch('nostrChat/getMlsGroupMemberPubkeys', { roomId: this.roomId })
        this.mlsTreeMembers = members || []
      } catch (err) {
        console.warn('[GroupInfo] Failed to load MLS tree members:', err)
        this.mlsTreeMembers = []
      }
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
    openAddMemberDialog () {
      if (!this.isGroupManager) {
        this.$q.notify({
          type: 'warning',
          message: this.$t('ManagersOnly', {}, 'Only the group owner or an admin can add members'),
          timeout: 4000,
        })
        return
      }
      const currentCount = this.room?.members?.length || 0
      if (currentCount >= 50) {
        this.$q.notify({
          type: 'warning',
          message: this.$t('MlsMemberLimit', {}, 'This group has reached the 50-member limit'),
          timeout: 5000,
        })
        return
      }
      this.addMemberTab = 'contacts'
      this.selectedAddNpubs = []
      this.manualNpub = ''
      this.manualNpubError = ''
      this.showAddMemberDialog = true
    },
    toggleAddMember (npub) {
      const idx = this.selectedAddNpubs.indexOf(npub)
      if (idx !== -1) {
        this.selectedAddNpubs.splice(idx, 1)
      } else {
        this.selectedAddNpubs.push(npub)
      }
    },
    onScannerDecode (value) {
      this.showQrScanner = false
      if (!value) return
      let npub = String(value).trim()
      // Accept BIP21-style payloads that embed an ?nostype=chat&npub= param
      const match = npub.match(/[?&]npub=(npub1[A-Za-z0-9]+)/)
      if (match) npub = match[1]
      if (!npub.startsWith('npub1')) return
      this.manualNpub = npub
      this.manualNpubError = ''
      this.addMemberTab = 'npub'
    },
    async confirmAddMembers () {
      const { nip19Decode } = await import('nostr-tools/nip19')
      const npubs = [...this.selectedAddNpubs]

      // Manual npub entry — validate before dispatching anything.
      if (this.manualNpubTrimmed) {
        if (!this.manualNpubTrimmed.startsWith('npub1')) {
          this.manualNpubError = this.$t('InvalidNpub', {}, 'Invalid npub')
          return
        }
        try {
          const decoded = nip19Decode(this.manualNpubTrimmed)
          if (decoded.type !== 'npub') throw new Error('Invalid npub')
        } catch {
          this.manualNpubError = this.$t('InvalidNpub', {}, 'Invalid npub')
          return
        }
        npubs.push(this.manualNpubTrimmed)
      }
      if (!npubs.length) return

      // Skip contacts already in the group (list is filtered, but the manual
      // entry could duplicate an existing member).
      const memberSet = new Set(this.room?.members || [])
      const existingContacts = this.contacts.filter(c => npubs.includes(c.npub) && memberSet.has(c.pubKeyHex))
      if (existingContacts.length === npubs.length) {
        this.$q.notify({ type: 'warning', message: this.$t('AlreadyMember', {}, 'Already a member of this group') })
        return
      }

      this.addingMember = true
      let added = 0
      let lastErr = null
      try {
        for (const npub of npubs) {
          const contact = this.contacts.find(c => c.npub === npub)
          if (contact && memberSet.has(contact.pubKeyHex)) continue
          try {
            const decoded = nip19Decode(npub.trim())
            if (decoded.type !== 'npub') throw new Error('Invalid npub')
            await this.$store.dispatch('nostrChat/addMlsMember', {
              roomId: this.roomId,
              memberPubKey: decoded.data,
            })
            added++
          } catch (err) {
            lastErr = err
            console.warn('[GroupInfo] Failed to add member:', err.message)
          }
        }
        await this.fetchMlsTreeMembers()
        if (this.invitedMembers.length) this.memberTab = 'invited'
        if (added > 0) {
          this.showAddMemberDialog = false
          this.$q.notify({ type: 'positive', message: this.$t('MemberAdded', {}, 'Member added') })
        } else {
          this.$q.notify({
            type: 'negative',
            message: lastErr?.message || this.$t('AddMemberFailed', {}, 'Failed to add member'),
            timeout: 5000,
          })
        }
      } finally {
        this.addingMember = false
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

.member-tabs {
  margin-bottom: 4px;
}

.add-member-panels {
  background: transparent;
}

.add-member-list {
  max-height: 320px;
  overflow-y: auto;
}

.no-invited-note {
  padding: 16px 4px;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
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
