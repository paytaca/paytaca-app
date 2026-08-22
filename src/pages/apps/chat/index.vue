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
          <q-tab v-if="pendingInviteCount > 0" name="invitations">
            <div class="tab-label-wrapper">
              <span>{{ $t('Invitations', {}, 'Invitations') }}</span>
              <span
                v-if="chatTab !== 'invitations' && pendingInviteCount > 0"
                class="tab-unread-badge"
              >
                {{ pendingInviteCount }}
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
              @leave-room="confirmLeaveGroup"
              @rejoin-room="confirmRejoinGroup"
            />
          </q-tab-panel>
          <q-tab-panel name="archived" class="q-pa-none">
            <room-list
              :rooms="archivedRooms"
              :messages="messages"
              archived
              @select-room="openRoom"
              @unarchive-room="unarchiveOrRejoinRoom"
              @rejoin-room="confirmRejoinGroup"
              @delete-room="confirmDeleteRoom"
            />
          </q-tab-panel>
          <q-tab-panel v-if="pendingInviteCount > 0" name="invitations" class="q-pa-none">
            <div class="invitations-list">
              <div
                v-for="invite in pendingInvitations"
                :key="invite.roomId"
                class="invite-item"
              >
                <q-avatar class="invite-avatar" color="teal" text-color="white" size="40px">
                  <q-icon name="group" size="20px" />
                </q-avatar>
                <div class="invite-info">
                  <div class="invite-name">{{ invite.name }}</div>
                  <div class="invite-subtitle">
                    {{ $t('InvitedBy', { name: inviteDisplayNames[invite.inviterPubKey] || shortNpub(invite.inviterPubKey) }, 'Invited by {name}') }}
                  </div>
                </div>
                <div class="invite-actions">
                  <q-btn
                    flat
                    dense
                    color="primary"
                    :label="$t('Accept', {}, 'Accept')"
                    :loading="acceptingInvites[invite.roomId]"
                    @click="acceptInvite(invite)"
                  />
                  <q-btn
                    flat
                    dense
                    color="grey-7"
                    :label="$t('Decline', {}, 'Decline')"
                    @click="declineInvite(invite)"
                  />
                </div>
              </div>
            </div>
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
          <div class="text-h6 text-bow" :class="getDarkModeClass(darkMode)">{{ dialogTitle }}</div>
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
                  {{ $t('DirectMessageDesc', {}, 'End-to-end encrypted direct messages between two parties.') }}
                </div>
              </div>
              <q-icon name="chevron_right" size="20px" class="chat-type-chevron" />
            </div>

            <div
              class="chat-type-option"
              :class="getDarkModeClass(darkMode)"
              @click="groupTypeExpanded = !groupTypeExpanded"
            >
              <q-avatar size="44px" class="chat-type-icon group-icon">
                <q-icon name="groups" size="24px" color="white" />
              </q-avatar>
              <div class="chat-type-text">
                <div class="chat-type-title" :class="getDarkModeClass(darkMode)">
                  {{ $t('GroupChat', {}, 'Group Chat') }}
                </div>
                <div class="chat-type-desc">
                  {{ $t('GroupChatDesc', {}, 'Create an end-to-end encrypted group chat.') }}
                </div>
              </div>
              <q-icon
                :name="groupTypeExpanded ? 'expand_less' : 'expand_more'"
                size="20px"
                class="chat-type-chevron"
              />
            </div>

            <!-- Group type picker: revealed when Group Chat is clicked -->
            <div v-if="groupTypeExpanded" class="group-type-sublist" :class="getDarkModeClass(darkMode)">
              <div
                class="group-type-row"
                @click="selectedGroupType = 'open_private_group'"
              >
                <q-radio
                  v-model="selectedGroupType"
                  val="open_private_group"
                  dense
                  class="group-type-radio"
                />
                <q-avatar size="36px" class="chat-type-icon public-group-icon">
                  <q-icon name="group_add" size="20px" color="white" />
                </q-avatar>
                <div class="chat-type-text">
                  <div class="chat-type-title group-type-title" :class="getDarkModeClass(darkMode)">
                    {{ $t('OpenGroup', {}, 'Open Group') }}
                  </div>
                  <div class="chat-type-desc">
                    {{ $t('OpenGroupDesc', {}, 'New members can be added anytime.') }}
                  </div>
                </div>
              </div>

              <div
                class="group-type-row"
                @click="selectedGroupType = 'private_group'"
              >
                <q-radio
                  v-model="selectedGroupType"
                  val="private_group"
                  dense
                  class="group-type-radio"
                />
                <q-avatar size="36px" class="chat-type-icon group-icon group-avatar-wrap">
                  <q-icon name="group" size="20px" color="white" />
                  <div class="group-lock-badge">
                    <q-icon name="lock" size="8px" />
                  </div>
                </q-avatar>
                <div class="chat-type-text">
                  <div class="chat-type-title group-type-title" :class="getDarkModeClass(darkMode)">
                    {{ $t('ClosedGroup', {}, 'Closed Group') }}
                  </div>
                  <div class="chat-type-desc">
                    {{ $t('ClosedGroupDesc', {}, 'Members are fixed once created (up to 10).') }}
                  </div>
                </div>
              </div>

              <q-btn
                :label="$t('Proceed', {}, 'Proceed')"
                color="primary"
                rounded
                unelevated
                class="full-width q-mt-sm"
                @click="proceedWithGroupType"
              />
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
                <q-input
                  v-if="contacts.length"
                  v-model="contactSearch"
                  :label="$t('SearchContacts', {}, 'Search contacts')"
                  outlined
                  dense
                  rounded
                  clearable
                  class="contact-search q-mb-sm"
                >
                  <template #prepend>
                    <q-icon name="search" size="18px" />
                  </template>
                </q-input>
                <q-list v-if="filteredContacts.length" separator class="contact-list">
                  <q-item
                    v-for="contact in filteredContacts"
                    :key="contact.npub"
                    clickable
                    class="contact-item"
                    @click="startChatWith(contact)"
                  >
                    <q-item-section avatar>
                      <div class="contact-avatar-wrapper">
                        <q-avatar color="primary" text-color="white" size="44px">
                          <img v-if="contactAvatars[contact.npub]" :src="contactAvatars[contact.npub]" />
                          <template v-else>{{ contactInitial(contact) }}</template>
                        </q-avatar>
                        <div
                          v-if="activeContactMap[contact.pubKeyHex]"
                          class="active-dot"
                          :class="{ 'active-dot--dark': darkMode }"
                        ></div>
                      </div>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-medium">{{ contact.name }}</q-item-label>
                      <q-item-label caption class="npub-caption">{{ contact.npub.slice(0, 18) }}...</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else-if="contactSearch.trim()" class="text-grey text-center q-pa-lg">
                  <q-icon name="search_off" size="40px" class="q-mb-sm" style="opacity: 0.4;" />
                  <div>{{ $t('NoMatchingContacts', {}, 'No matching contacts.') }}</div>
                </div>
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

                <template v-if="fetchedContactDisplayName">
                  <div class="published-identity-row q-mb-md">
                    <q-avatar size="48px" color="grey-4" text-color="white" class="q-mr-sm">
                      <img v-if="fetchedContactAvatar" :src="fetchedContactAvatar" />
                      <template v-else>{{ fetchedContactDisplayName.charAt(0).toUpperCase() }}</template>
                    </q-avatar>
                    <span class="published-name-text"><strong>{{ fetchedContactDisplayName }}</strong></span>
                  </div>
                </template>
                <q-input
                  v-else
                  v-model="newContactName"
                  :label="$t('Name', {}, 'Name')"
                  outlined
                  dense
                  rounded
                  class="q-mb-md"
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
          </template>

          <!-- Step 2 (Group): Create group form -->
          <template v-else-if="selectedChatType === 'private_group' || selectedChatType === 'open_private_group'">
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
                <!-- Step 1: pick members -->
                <template v-if="groupStep === 1">
                  <div class="group-members-label q-mb-xs">
                    {{ $t('SelectMembersWithLimit', { count: selectedMemberNpubs.length }, `Selected ${selectedMemberNpubs.length} members`) }}
                  </div>
                  <div class="group-min-hint" :class="{ 'group-min-hint--unmet': !hasMinGroupMembers }">
                    <q-icon :name="hasMinGroupMembers ? 'check_circle' : 'error_outline'" size="14px" />
                    <span>
                      {{ hasMinGroupMembers
                        ? $t('MinMembersMet', {}, 'Minimum group size met')
                        : $t('MinMembersRequired', {}, 'A group needs at least 3 members including you — select 2 or more contacts.') }}
                    </span>
                  </div>
                  <q-input
                    v-if="contacts.length"
                    v-model="contactSearch"
                    :label="$t('SearchContacts', {}, 'Search contacts')"
                    outlined
                    dense
                    rounded
                    clearable
                    class="contact-search q-mb-sm"
                  >
                    <template #prepend>
                      <q-icon name="search" size="18px" />
                    </template>
                  </q-input>
                  <q-list v-if="filteredContacts.length" separator class="group-members-list">
                    <q-item
                      v-for="contact in filteredContacts"
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
                          <img v-if="contactAvatars[contact.npub]" :src="contactAvatars[contact.npub]" />
                          <template v-else>{{ contactInitial(contact) }}</template>
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">{{ contact.name }}</q-item-label>
                        <q-item-label caption class="npub-caption">{{ contact.npub.slice(0, 18) }}...</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div v-else-if="contacts.length && contactSearch.trim()" class="text-grey text-center q-pa-md">
                    <q-icon name="search_off" size="32px" class="q-mb-sm" style="opacity: 0.4;" />
                    <div>{{ $t('NoMatchingContacts', {}, 'No matching contacts.') }}</div>
                  </div>
                  <div v-else class="text-grey text-center q-pa-md">
                    <q-icon name="person_off" size="32px" class="q-mb-sm" style="opacity: 0.4;" />
                    <div>{{ $t('NoContactsToAdd', {}, 'No contacts to add. Use the Add Contact tab.') }}</div>
                  </div>
                  <q-btn
                    :label="$t('Proceed', {}, 'Proceed')"
                    color="primary"
                    rounded
                    unelevated
                    class="full-width q-mt-sm"
                    :disable="!hasMinGroupMembers"
                    @click="proceedWithMembers"
                  />
                </template>

                <!-- Step 2: name the group and review members -->
                <template v-else>
                  <q-input
                    ref="groupNameInput"
                    v-model="groupName"
                    :label="$t('GroupName', {}, 'Group name')"
                    outlined
                    dense
                    rounded
                    maxlength="100"
                    class="q-mb-sm"
                    autofocus
                    :error="!!groupName && groupName.trim().length > 0 && groupName.trim().length < 4"
                    :error-message="$t('GroupNameMinChars', {}, 'Group name must be at least 4 characters.')"
                  />
                  <div class="group-members-label q-mb-xs">
                    {{ $t('GroupMembersCount', { count: groupSelectedMembers.length }, `Members (${groupSelectedMembers.length})`) }}
                  </div>
                  <q-list separator class="group-members-list group-review-list">
                    <q-item v-for="member in groupSelectedMembers" :key="member.isMe ? 'me' : member.npub" class="group-member-item">
                      <q-item-section avatar>
                        <q-avatar color="primary" text-color="white" size="36px">
                          <img v-if="!member.isMe && contactAvatars[member.npub]" :src="contactAvatars[member.npub]" />
                          <template v-else>
                            <q-icon v-if="member.isMe" name="person" size="20px" />
                            <template v-else>{{ member.name.charAt(0).toUpperCase() }}</template>
                          </template>
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">
                          {{ member.name }}
                          <span v-if="member.isMe" class="group-me-tag">{{ $t('You', {}, 'You') }}</span>
                        </q-item-label>
                        <q-item-label caption class="npub-caption">{{ member.npub.slice(0, 18) }}...</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <q-btn
                    :label="$t('CreateGroup', {}, 'Create Group')"
                    color="primary"
                    rounded
                    unelevated
                    class="full-width q-mt-sm"
                    :disable="!canCreateGroup"
                    @click="createGroup"
                  />
                </template>
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

                <template v-if="fetchedContactDisplayName">
                  <div class="published-identity-row q-mb-md">
                    <q-avatar size="48px" color="grey-4" text-color="white" class="q-mr-sm">
                      <img v-if="fetchedContactAvatar" :src="fetchedContactAvatar" />
                      <template v-else>{{ fetchedContactDisplayName.charAt(0).toUpperCase() }}</template>
                    </q-avatar>
                    <span class="published-name-text"><strong>{{ fetchedContactDisplayName }}</strong></span>
                  </div>
                </template>
                <q-input
                  v-else
                  v-model="newContactName"
                  :label="$t('Name', {}, 'Name')"
                  outlined
                  dense
                  rounded
                  class="q-mb-md"
                />

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
import { ACTIVE_THRESHOLD_MS } from 'src/store/nostr-chat/state'
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
      groupTypeExpanded: false,
      selectedGroupType: 'open_private_group',
      dialogTab: 'contacts',
      newContactName: '',
      newContactNpub: '',
      npubError: '',
      groupName: '',
      selectedMemberNpubs: [],
      groupStep: 1,
      contactSearch: '',
      fetchedContactDisplayName: null,
      fetchedContactAvatar: null,
      contactAvatars: {},
      inviteDisplayNames: {},
      acceptingInvites: {},
      _profilePromptShown: false,
      _profilePromptTimer: null,
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
      return this.$store.getters['nostrChat/getAllMessages']
    },
    contacts () {
      const all = this.$store.getters['nostrChat/getContacts']
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      if (!myPubKey) return all
      return all.filter(c => {
        if (c.pubKeyHex) return c.pubKeyHex !== myPubKey
        try {
          const decoded = nip19Decode(c.npub)
          return decoded.data !== myPubKey
        } catch { return true }
      })
    },
    filteredContacts () {
      const q = this.contactSearch.trim().toLowerCase()
      if (!q) return this.contacts
      return this.contacts.filter(c => {
        return (c.name || '').toLowerCase().includes(q) ||
          c.npub.toLowerCase().includes(q)
      })
    },
    showActiveStatus () {
      return this.$store.getters['nostrChat/getShowActiveStatus']
    },
    activeContactMap () {
      const map = {}
      if (!this.showActiveStatus) return map
      const activeStatus = this.$store.getters['nostrChat/getActiveStatusMap']
      for (const contact of this.contacts) {
        if (!contact.pubKeyHex) continue
        const entry = activeStatus[contact.pubKeyHex]
        if (!entry || !entry.lastActiveAt) {
          map[contact.pubKeyHex] = false
        } else {
          map[contact.pubKeyHex] = Date.now() - new Date(entry.lastActiveAt).getTime() <= ACTIVE_THRESHOLD_MS
        }
      }
      return map
    },
    canAddContact () {
      return this.newContactName.trim() && this.newContactNpub.trim().startsWith('npub')
    },
    // Groups need at least 3 members total — the creator plus 2 contacts.
    hasMinGroupMembers () {
      return this.selectedMemberNpubs.length >= 2
    },
    // Max group size including the creator: closed groups cap at 10,
    // open groups at 100.
    groupMaxMembers () {
      return this.selectedChatType === 'private_group' ? 10 : 100
    },
    // Max selectable contacts (creator is the extra member).
    groupMaxContacts () {
      return this.groupMaxMembers - 1
    },
    canCreateGroup () {
      return this.groupName.trim().length >= 4 && this.hasMinGroupMembers && this.selectedMemberNpubs.length <= this.groupMaxContacts
    },
    // Step-2 review list: the creator plus the selected contacts.
    groupSelectedMembers () {
      const list = []
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      const profile = this.$store.getters['nostrChat/getProfile']
      if (myPubKey) {
        let myNpub = ''
        try { myNpub = npubEncode(myPubKey) } catch { myNpub = myPubKey }
        list.push({
          isMe: true,
          pubKeyHex: myPubKey,
          name: profile?.displayName?.trim() || myNpub.slice(0, 12) + '...' + myNpub.slice(-8),
          npub: myNpub,
        })
      }
      for (const npub of this.selectedMemberNpubs) {
        const contact = this.$store.getters['nostrChat/getContactByNpub'](npub)
        if (!contact) continue
        list.push({
          isMe: false,
          pubKeyHex: contact.pubKeyHex || null,
          name: contact.name || npub.slice(0, 12) + '...' + npub.slice(-8),
          npub,
        })
      }
      return list
    },
    activeUnreadCount () {
      return this.totalUnreadFor(this.rooms)
    },
    archivedUnreadCount () {
      return this.totalUnreadFor(this.archivedRooms)
    },
    pendingInvitations () {
      return this.$store.getters['nostrChat/getMlsPendingInvitations']
    },
    pendingInviteCount () {
      return this.pendingInvitations.length
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
      if (!this.$store.getters['nostrChat/getProfile']?.displayName) {
        items.push(this.$t('DisplayName', {}, 'Display Name'))
      }
      if (!this.$store.getters['nostrChat/getProfile']?.bchAddress) {
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
        // Scanner closed without a decode (cancel/back) — restore the dialog
        // in the exact context it was opened from.
        this.reopenDialogAfterScan = false
        this.selectedChatType = this.scannerOrigin || 'dm'
        this.dialogTab = 'add'
        this.scannerOrigin = null
        this.showNewChatDialog = true
      }
    },
    showNewChatDialog (val) {
      if (val) {
        this.fetchContactAvatars()
      } else if (!this.reopenDialogAfterScan) {
        // Dialog closed for a scan (or a mid-scan reopen pending): keep the
        // chat-type context and form state so onScannerDecode can restore the
        // exact dialog it was opened from.
        this.groupName = ''
        this.selectedMemberNpubs = []
        this.groupStep = 1
        this.contactSearch = ''
        this.newContactName = ''
        this.newContactNpub = ''
        this.npubError = ''
        this.fetchedContactDisplayName = null
        this.fetchedContactAvatar = null
        this.selectedChatType = null
        this.groupTypeExpanded = false
        this.selectedGroupType = 'open_private_group'
        this.dialogTab = 'contacts'
        this.scannerOrigin = null
      }
    },
    async newContactNpub (val) {
      this.fetchedContactDisplayName = null
      this.fetchedContactAvatar = null
      const trimmed = val?.trim()
      if (trimmed && trimmed.startsWith('npub')) {
        try {
          const decoded = nip19Decode(trimmed)
          if (decoded.type === 'npub' && decoded.data) {
            const [displayName, avatar] = await Promise.all([
              this.$store.dispatch('nostrChat/fetchPublishedDisplayName', {
                pubKeyHex: decoded.data,
              }),
              this.$store.dispatch('nostrChat/fetchPublishedAvatar', {
                pubKeyHex: decoded.data,
              }),
            ])
            if (displayName && !this.newContactName.trim()) {
              this.fetchedContactDisplayName = displayName
              this.newContactName = displayName
            }
            if (avatar) {
              this.fetchedContactAvatar = avatar
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
      } else if (this.$store.getters['nostrChat/isInitialized']) {
        // Existing contact + store already initialized — open chat immediately
        this.startChatWith(contact)
      }
      // If existing contact but store not init'd yet, it will be handled below
    }

    try {
      // Initialize (skips if already initialized for this wallet)
      await this.$store.dispatch('nostrChat/initialize')
      this.$store.dispatch('nostrChat/ensureSubscribed').catch(() => {})

      // Fetch last-active timestamps for all conversations on screen
      this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})

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

    // Show profile setup prompt if profile is incomplete.
    // Short delay lets the synchronous cache-fill in initialize()
    // settle in Vuex reactivity before we read the store.
    if (!this._profilePromptShown && this.isProfileIncomplete) {
      this._profilePromptTimer = setTimeout(() => {
        this._checkAndShowProfilePrompt()
      }, 1000)
    }

    // Re-subscribe and refresh active status when tab becomes visible (e.g., after app backgrounding)
    this._onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.$store.dispatch('nostrChat/ensureSubscribed').catch(() => {})
        this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', this._onVisibilityChange)

    // Poll active status every minute while on this page
    this._activeStatusPollTimer = setInterval(() => {
      this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
    }, 60000)

    this.resolveInviteDisplayNames()
  },
  activated () {
    // Re-check subscription when returning to this page via keep-alive
    this.$store.dispatch('nostrChat/ensureSubscribed').catch(() => {})
    this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
  },
  beforeUnmount () {
    clearTimeout(this._profilePromptTimer)
    clearInterval(this._activeStatusPollTimer)
    document.removeEventListener('visibilitychange', this._onVisibilityChange)
    // Keep subscription alive for background messages
  },
  methods: {
    getDarkModeClass,
    _checkAndShowProfilePrompt () {
      if (this._profilePromptShown) return
      if (!this.isProfileIncomplete) return
      this.showProfilePrompt()
    },
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
      } else if (type === 'private_group' || type === 'open_private_group') {
        this.groupStep = 1
        this.dialogTab = 'members'
      }
    },
    proceedWithGroupType () {
      if (!this.selectedGroupType) return
      this.groupTypeExpanded = false
      this.selectChatType(this.selectedGroupType)
    },
    handleDialogBack () {
      if (this.groupStep === 2) {
        this.groupStep = 1
        return
      }
      this.selectedChatType = null
    },
    proceedWithMembers () {
      if (!this.hasMinGroupMembers) return
      this.groupStep = 2
      // Focus the group name input so the keyboard comes up on mobile.
      // autofocus is unreliable inside animated tab panels, so focus explicitly.
      this.$nextTick(() => {
        const input = this.$refs.groupNameInput
        if (input) {
          input.focus()
        }
      })
    },
    async addContactForGroup () {
      try {
        const npub = this.newContactNpub.trim()
        await this.$store.dispatch('nostrChat/addContact', {
          name: this.newContactName.trim(),
          npub,
        })
        if (!this.selectedMemberNpubs.includes(npub) && this.selectedMemberNpubs.length < this.groupMaxContacts) {
          this.selectedMemberNpubs.push(npub)
        }
        this.newContactName = ''
        this.newContactNpub = ''
        this.npubError = ''
        this.fetchedContactDisplayName = null
        this.fetchedContactAvatar = null
        this.groupStep = 1
        this.dialogTab = 'members'
      } catch (err) {
        this.npubError = err.message
      }
    },
    totalUnreadFor (rooms) {
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      if (!myPubKey) return 0
      const readIdsMap = this.$store.getters['nostrChat/getReadMessageIds']
      let total = 0
      for (const room of rooms) {
        const msgs = this.messages[room.id] || []
        const readIds = readIdsMap[room.id] || {}
        total += msgs.filter(m => m.sender !== myPubKey && !readIds[m.id]).length
      }
      return total
    },
    openRoom (roomId) {
      const room = this.rooms.find(r => r.id === roomId) || this.archivedRooms.find(r => r.id === roomId)
      this.$router.push({ path: `/apps/chat/${roomId}`, query: room?.type ? { type: room.type } : {} })
    },
    shortNpub (pubKeyHex) {
      return pubKeyHex?.slice(0, 8) || 'Unknown'
    },
    async resolveInviteDisplayNames () {
      for (const invite of this.pendingInvitations) {
        const pubKeyHex = invite.inviterPubKey
        if (!pubKeyHex || this.inviteDisplayNames[pubKeyHex]) continue
        try {
          const displayName = await this.$store.dispatch('nostrChat/fetchPublishedDisplayName', { pubKeyHex })
          if (displayName) {
            this.inviteDisplayNames = { ...this.inviteDisplayNames, [pubKeyHex]: displayName }
          }
        } catch (err) {
          console.warn('[Chat] Failed to resolve inviter name:', err)
        }
      }
    },
    async acceptInvite (invite) {
      this.acceptingInvites = { ...this.acceptingInvites, [invite.roomId]: true }
      try {
        await this.$store.dispatch('nostrChat/acceptMlsInvite', { roomId: invite.roomId })
        this.$q.notify({
          type: 'positive',
          message: this.$t('InviteAccepted', {}, 'You joined the group'),
        })
        this.openRoom(invite.roomId)
      } catch (err) {
        console.error('[MLS] accept invite failed:', err)
        this.$q.notify({
          type: 'negative',
          message: this.$t('InviteAcceptFailed', {}, 'Failed to join group') + ': ' + err.message,
          timeout: 5000,
        })
      } finally {
        const next = { ...this.acceptingInvites }
        delete next[invite.roomId]
        this.acceptingInvites = next
      }
    },
    declineInvite (invite) {
      this.$q.dialog({
        title: this.$t('InviteDecline', {}, 'Decline Invitation'),
        message: this.$t('InviteDeclineConfirm', { name: invite.name }, `Decline the invitation to join ${invite.name}?`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: {
          label: this.$t('Cancel', {}, 'Cancel'),
          flat: true,
          color: 'grey',
        },
        ok: {
          label: this.$t('Decline', {}, 'Decline'),
          color: 'negative',
          flat: true,
        },
        persistent: true,
      }).onOk(() => {
        this.$store.dispatch('nostrChat/declineMlsInvite', { roomId: invite.roomId })
      })
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
        this.$store.dispatch('nostrChat/archiveRoom', roomId)
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
        this.$store.dispatch('nostrChat/blockContact', otherPubKey)
        this.$store.dispatch('nostrChat/archiveRoom', roomId)
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
        this.$store.dispatch('nostrChat/unblockContact', otherPubKey)
        this.$store.dispatch('nostrChat/unarchiveRoom', roomId)
        this.$q.notify({
          type: 'positive',
          message: this.$t('ContactUnblocked', {}, 'Contact unblocked'),
        })
      })
    },
    unarchiveOrRejoinRoom (roomId) {
      // A left (blocked) group is archived; unarchiving it should rejoin it.
      const room = this.archivedRooms.find(r => r.id === roomId)
      if (room?.type === 'group' || room?.type === 'mls-group') {
        if (this.$store.getters['nostrChat/isGroupBlocked'](roomId)) {
          this.confirmRejoinGroup(roomId)
          return
        }
      }
      this.$store.dispatch('nostrChat/unarchiveRoom', roomId)
      this.$q.notify({
        type: 'positive',
        message: this.$t('ConversationUnarchived', {}, 'Conversation unarchived'),
      })
    },
    confirmLeaveGroup (roomId) {
      const room = this.rooms.find(r => r.id === roomId)
      if (!room) return
      const roomName = this.getRoomDisplayName(room)
      this.$q.dialog({
        title: this.$t('LeaveGroup', {}, 'Leave Group'),
        message: this.$t('LeaveGroupConfirm', { name: roomName }, `Leave group "${roomName}"? The group will be archived and you won't receive new messages until you rejoin.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          if (room?.type === 'mls-group') {
            // The owner must choose a successor from the group info page.
            const myPubKey = this.$store.getters['nostrChat/myPubKey']
            if (room.owner === myPubKey) {
              this.$router.push(`/apps/chat/${roomId}/info`)
              return
            }
            await this.$store.dispatch('nostrChat/leaveMlsGroup', { roomId })
          } else {
            await this.$store.dispatch('nostrChat/leaveGroup', { roomId })
          }
          this.$q.notify({ type: 'info', message: this.$t('LeftGroup', {}, 'You left the group') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('LeaveGroupFailed', {}, 'Failed to leave group') })
        }
      })
    },
    confirmRejoinGroup (roomId) {
      const room = (this.rooms.find(r => r.id === roomId) || this.archivedRooms.find(r => r.id === roomId))
      if (!room) return
      const roomName = this.getGroupDisplayName(room)
      this.$q.dialog({
        title: this.$t('RejoinGroup', {}, 'Rejoin Group'),
        message: this.$t('RejoinGroupConfirm', { name: roomName }, `Rejoin "${roomName}"? You will be able to send and receive messages again.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('RejoinGroup', {}, 'Rejoin Group'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(async () => {
        await this.$store.dispatch('nostrChat/rejoinGroup', { roomId })
        this.$q.notify({ type: 'positive', message: this.$t('GroupRejoined', {}, 'Group rejoined') })
      })
    },
    getGroupDisplayName (room) {
      return room?.name || room?.subject || this.$t('Group', {}, 'Group')
    },
    confirmDeleteRoom (roomId) {
      const room = this.archivedRooms.find(r => r.id === roomId)
      if (!room) return

      const roomName = this.getRoomDisplayName(room)
      const note = this.$t('DeleteConversationNote', {}, 'This only removes it from this device. It stays on the relay and will be restored if you Reset Chat.')

      // Groups: leaving already handles "blocking" via BLOCK_GROUP, so delete
      // is a simple permanent removal. Also clear any group-block tracker.
      if (room.type === 'group' || room.type === 'mls-group') {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationConfirm', { name: roomName }, `Permanently delete "${roomName}"?`) + '\n\n' + note,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          ok: { label: this.$t('Delete', {}, 'Delete'), color: 'negative', flat: true },
          persistent: true,
        }).onOk(() => {
          this.$store.dispatch('nostrChat/unblockGroup', roomId)
          this.$store.dispatch('nostrChat/deleteRoom', roomId)
          this.$q.notify({ type: 'info', message: this.$t('ConversationDeleted', {}, 'Conversation deleted') })
        })
        return
      }

      const otherPubKey = room.members?.find(m => m !== this.$store.getters['nostrChat/myPubKey'])
      const isBlocked = otherPubKey && this.$store.getters['nostrChat/isContactBlocked'](otherPubKey)

      // If already blocked, just offer delete
      if (isBlocked) {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationConfirm', { name: roomName }, `Delete conversation with ${roomName}?`) + '\n\n' + note,
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
          this.$store.dispatch('nostrChat/deleteRoom', roomId)
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
        message: this.$t('DeleteConversationOptions', { name: roomName }, `How would you like to delete the conversation with ${roomName}?`) + '\n\n' + note,
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
          this.$store.dispatch('nostrChat/blockContact', otherPubKey)
        }
        this.$store.dispatch('nostrChat/deleteRoom', roomId)
        this.$q.notify({
          type: 'info',
          message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
        })
      })
    },
    openScannerFromDialog () {
      // Remember the exact dialog context so the scan restores it verbatim
      // ('dm' | 'private_group' | 'open_private_group'). Flag the handover
      // BEFORE closing so the showNewChatDialog watcher doesn't wipe it.
      this.scannerOrigin = this.selectedChatType
      this.reopenDialogAfterScan = true
      this.showNewChatDialog = false
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
      this.selectedChatType = this.scannerOrigin || 'dm'
      this.dialogTab = 'add'
      this.scannerOrigin = null
      this.showNewChatDialog = true
    },
    contactInitial (contact) {
      return (contact.name || '').charAt(0).toUpperCase()
    },
    async fetchContactAvatars () {
      if (!this.contacts.length) return
      const newAvatars = { ...this.contactAvatars }
      for (const contact of this.contacts) {
        if (newAvatars[contact.npub]) continue
        try {
          const decoded = nip19Decode(contact.npub)
          if (decoded.type === 'npub' && decoded.data) {
            const avatar = await this.$store.dispatch('nostrChat/fetchPublishedAvatar', {
              pubKeyHex: decoded.data,
            })
            if (avatar) newAvatars[contact.npub] = avatar
          }
        } catch {
          // skip
        }
      }
      this.contactAvatars = newAvatars
    },
    toggleMember (npub) {
      const idx = this.selectedMemberNpubs.indexOf(npub)
      if (idx >= 0) {
        this.selectedMemberNpubs.splice(idx, 1)
      } else if (this.selectedMemberNpubs.length < this.groupMaxContacts) {
        this.selectedMemberNpubs.push(npub)
      }
    },
    async createGroup () {
      if (!this.canCreateGroup) {
        if (this.groupName.trim() && !this.hasMinGroupMembers) {
          this.$q.notify({
            type: 'warning',
            message: this.$t('MinMembersRequired', {}, 'A group needs at least 3 members including you — select 2 or more contacts.'),
            timeout: 5000,
          })
        }
        return
      }
      try {
        // Convert npubs to hex pubkeys
        const memberPubKeys = this.selectedMemberNpubs.map(npub => {
          const decoded = nip19Decode(npub)
          return decoded.data
        })
        const name = this.groupName.trim()

        if (this.selectedChatType === 'open_private_group') {
          // MLS groups: create the MLS group and add each selected member.
          // Members whose MLS KeyPackage hasn't been published yet are skipped
          // (a warning is shown) but the group is still created.
          const { room, roomId } = await this.$store.dispatch('nostrChat/createMlsGroup', {
            name,
            members: memberPubKeys,
          })

          const failed = []
          for (const memberPubKey of memberPubKeys) {
            try {
              await this.$store.dispatch('nostrChat/addMlsMember', {
                roomId,
                memberPubKey: memberPubKey,
              })
            } catch (err) {
              console.error('[MLS] addMlsMember failed for', memberPubKey, 'error:', err.message)
              failed.push({ pubKey: memberPubKey, error: err.message })
            }
          }

          this.showNewChatDialog = false
          this.$router.push(`/apps/chat/${roomId}`)

          if (failed.length) {
            const failedNpubs = failed.map(f => {
              try { return npubEncode(f.pubKey) } catch { return f.pubKey }
            }).join(', ')
            const reason = failed[0]?.error || ''
            this.$q.notify({
              type: 'warning',
              message: this.$t('MlsMemberNotReady', { npubs: failedNpubs, reason }, `Couldn't add: ${failedNpubs}. ${reason}`),
              timeout: 6000,
            })
          }
          return
        }

        // NIP-17 (Closed) group: create the room and send an initial message
        // with the group name as subject so all members receive the room via
        // the relay and can reconstruct it on any device.
        const room = await this.$store.dispatch('nostrChat/createGroupRoom', {
          name,
          members: memberPubKeys,
        })
        const text = this.$t('GroupCreatedWith', { name }, `Created group "${name}"`)
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: room.id,
          text,
          subject: name,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        // Publish group metadata so new members who join later can
        // discover the group name from the relay.
        this.$store.dispatch('nostrChat/publishGroupMetadata', {
          roomId: room.id,
          memberPubKeys: room.members,
          name,
        }).catch(() => {})
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
      // Group rooms: always use room.name (kept in sync with subject by mutations)
      if (room.type === 'group' || room.type === 'mls-group') {
        return room.name || room.subject || this.$t('Group', {}, 'Group')
      }
      // Private (DM) rooms: prefer subject, then contact name, then npub
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      if (!myPubKey) return room.subject || room.name || this.$t('Chat')

      const otherPubKey = room.members?.find(m => m !== myPubKey)
      if (!otherPubKey) return room.subject || room.name || this.$t('Chat')

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
        this.fetchedContactDisplayName = null
        this.fetchedContactAvatar = null
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

.invitations-list {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
}

.invite-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.invite-item:last-child {
  border-bottom: none;
}

.invite-avatar {
  background: linear-gradient(135deg, #14b8a6, #0d9488);
}

.invite-info {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
}

.invite-name {
  font-weight: 600;
  color: var(--q-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-subtitle {
  font-size: 12px;
  color: var(--q-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* New chat dialog — chat type picker */
.chat-type-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 8px;
}

.group-type-sublist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: -4px;
  margin-left: 12px;
  padding: 10px;
  border-radius: 12px;
  border-left: 3px solid rgba(59, 130, 246, 0.4);
  background: rgba(0, 0, 0, 0.02);
}

.group-type-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.group-type-row:hover {
  background: rgba(59, 130, 246, 0.06);
}

.group-type-radio {
  flex-shrink: 0;
  align-self: center;
}

.group-type-title {
  font-size: 14px;
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
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
}

.group-avatar-wrap {
  position: relative;
  overflow: visible;
}

.group-lock-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #64748b;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
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

.group-min-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #16a34a;
  margin-bottom: 8px;
}

.group-min-hint--unmet {
  color: #d97706;
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

/* Scrollable contact lists in the New Chat dialog */
.contact-list,
.group-members-list {
  max-height: min(50vh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.group-review-list {
  max-height: min(40vh, 320px);
}

.group-me-tag {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--q-primary);
  margin-left: 4px;
}

/* Header right slot - remove fixed width so action icons display in a row */
.apps-header :deep(.pt-header-right) {
  flex-basis: auto;
  width: auto;
  min-width: auto;
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

/* Dark mode */
.published-identity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.published-name-text {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.dark .contact-item:hover {
  background-color: rgba(255, 255, 255, 0.04);
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

.dark .published-identity-row {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark .published-name-text {
  color: #f1f5f9;
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

.dark .group-type-sublist {
  background: rgba(255, 255, 255, 0.04);
}

.dark .group-type-row:hover {
  background: rgba(59, 130, 246, 0.12);
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

.contact-avatar-wrapper {
  position: relative;
  display: inline-block;
}

.active-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4caf50;
  border: 3px solid #ffffff;
  z-index: 1;
}

.active-dot--dark {
  border-color: #1e293b;
}
</style>
