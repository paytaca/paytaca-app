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
        :title="$t('ConversationInfo', {}, 'Conversation Info')"
      />

      <div class="dm-info-body">
        <!-- Contact header card -->
        <div
          class="dm-header-card"
          :class="[getDarkModeClass(darkMode), 'clickable']"
          :style="{ background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}0a)` }"
          @click="openContactDetails"
        >
          <q-avatar
            size="64px"
            class="dm-avatar"
            :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }"
          >
            <span class="avatar-initial">{{ contactInitial }}</span>
          </q-avatar>
          <div class="contact-name-display">{{ contactDisplayName }}</div>
          <div class="contact-npub">{{ shortNpub }}</div>
        </div>

        <!-- Edit conversation subject -->
        <div class="subject-edit-section" :class="getDarkModeClass(darkMode)">
          <div class="section-title">{{ $t('ConversationSubject', {}, 'Conversation Subject') }}</div>
          <div v-if="!editingSubject" class="subject-display-row">
            <div class="subject-text" :class="{ 'subject-text-empty': !room?.subject }">
              {{ room?.subject || $t('NoSubject', {}, 'No subject set') }}
            </div>
            <q-btn
              v-if="room?.subject"
              flat
              dense
              round
              icon="close"
              color="grey"
              @click="clearSubject"
            >
              <q-tooltip>{{ $t('ClearSubject', {}, 'Clear subject') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="edit"
              color="primary"
              @click="startEditSubject"
            />
          </div>
          <div v-else class="subject-edit-row">
            <q-input
              v-model="editSubjectValue"
              outlined
              dense
              rounded
              class="subject-input"
              autofocus
              :placeholder="$t('ConversationSubjectPlaceholder', {}, 'Enter a subject...')"
              @keyup.enter="saveSubject"
            />
            <q-btn
              unelevated
              :label="$t('Save', {}, 'Save')"
              color="primary"
              rounded
              :loading="savingSubject"
              @click="saveSubject"
            />
            <q-btn
              flat
              :label="$t('Cancel', {}, 'Cancel')"
              color="grey"
              rounded
              @click="cancelEditSubject"
            />
          </div>
        </div>

        <!-- Contact Details Dialog -->
        <q-dialog v-model="showContactDetails" persistent>
          <q-card class="contact-details-card pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 320px; border-radius: 16px;">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">{{ $t('ContactDetails', {}, 'Contact Details') }}</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section v-if="otherMemberContact">
              <!-- Avatar and name -->
              <div class="contact-header">
                <q-avatar
                  color="primary"
                  text-color="white"
                  size="64px"
                  style="font-size: 28px;"
                >
                  {{ contactInitial }}
                </q-avatar>
                <div class="contact-header-info">
                  <div v-if="!editingContactName" class="contact-display-name">
                    {{ contactDisplayName }}
                  </div>
                  <q-input
                    v-else
                    v-model="editContactNameValue"
                    outlined
                    dense
                    rounded
                    class="contact-name-input"
                    autofocus
                    @keyup.enter="saveContactName"
                  />
                  <div class="contact-npub-display">{{ fullShortNpub }}</div>
                </div>
              </div>

              <!-- Edit name button / actions -->
              <div v-if="!editingContactName" class="edit-name-section">
                <q-btn
                  flat
                  :label="$t('EditName', {}, 'Edit Name')"
                  color="primary"
                  icon="edit"
                  class="full-width"
                  @click="startEditContactName"
                />
              </div>
              <div v-else class="edit-actions-row">
                <q-btn
                  flat
                  :label="$t('Cancel', {}, 'Cancel')"
                  color="grey"
                  rounded
                  @click="cancelEditContactName"
                />
                <q-btn
                  unelevated
                  :label="$t('Save', {}, 'Save')"
                  color="primary"
                  rounded
                  :disable="!editContactNameValue.trim()"
                  @click="saveContactName"
                />
              </div>

              <!-- Use published name option -->
              <div v-if="editingContactName && fetchedContactDisplayName" class="use-published-name-row q-mt-md">
                <q-icon name="badge" size="16px" color="primary" />
                <span class="use-published-name-text">
                  {{ $t('UsePublishedDisplayName', {}, 'Use published display name:') }}
                  <strong>{{ fetchedContactDisplayName }}</strong>
                </span>
                <q-btn
                  flat
                  dense
                  :label="$t('Use', {}, 'Use')"
                  color="primary"
                  size="sm"
                  @click="useFetchedContactDisplayName"
                />
              </div>

              <!-- Copy npub -->
              <q-btn
                flat
                :label="$t('CopyNpub', {}, 'Copy npub')"
                color="primary"
                icon="content_copy"
                class="full-width q-mt-sm"
                @click="copyContactNpub"
              />
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat :label="$t('Close', {}, 'Close')" color="primary" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import { npubEncode } from 'nostr-tools/nip19'
import { fetchPublishedDisplayName } from 'src/store/nostr-chat/actions'
import { copyToClipboard } from 'quasar'

export default {
  name: 'DmInfo',
  components: { HeaderNav },
  props: {
    roomId: { type: String, required: true },
  },
  data () {
    return {
      editingSubject: false,
      editSubjectValue: '',
      savingSubject: false,
      showContactDetails: false,
      editingContactName: false,
      editContactNameValue: '',
      fetchedContactDisplayName: null,
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
    otherMemberPubKey () {
      const members = this.room?.members || []
      return members.find(m => m !== this.myPubKey) || null
    },
    otherMemberNpub () {
      if (!this.otherMemberPubKey) return ''
      try { return npubEncode(this.otherMemberPubKey) } catch { return this.otherMemberPubKey }
    },
    otherMemberContact () {
      return this.contacts.find(c => c.pubKeyHex === this.otherMemberPubKey || c.npub === this.otherMemberNpub) || null
    },
    contactDisplayName () {
      if (this.otherMemberContact?.name) return this.otherMemberContact.name
      const npub = this.otherMemberNpub
      return npub ? npub.slice(0, 12) + '...' + npub.slice(-8) : ''
    },
    contactInitial () {
      return this.contactDisplayName.charAt(0).toUpperCase() || '?'
    },
    shortNpub () {
      const npub = this.otherMemberNpub
      return npub ? npub.slice(0, 18) + '...' : ''
    },
    fullShortNpub () {
      const npub = this.otherMemberNpub
      return npub ? npub.slice(0, 18) + '...' + npub.slice(-8) : ''
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
    async showContactDetails (val) {
      this.fetchedContactDisplayName = null
      if (val && this.otherMemberPubKey) {
        try {
          const displayName = await this.$store.dispatch('nostrChat/fetchPublishedDisplayName', {
            pubKeyHex: this.otherMemberPubKey,
          })
          if (displayName) {
            this.fetchedContactDisplayName = displayName
          }
        } catch (err) {
          console.warn('[DmInfo] Failed to fetch display name:', err)
        }
      }
    },
  },
  methods: {
    getDarkModeClass,
    startEditSubject () {
      this.editSubjectValue = this.room?.subject || ''
      this.editingSubject = true
    },
    cancelEditSubject () {
      this.editingSubject = false
      this.editSubjectValue = ''
    },
    clearSubject () {
      if (!this.room || !this.room.subject) return
      this.$q.dialog({
        title: this.$t('ClearSubjectTitle', {}, 'Clear subject'),
        message: this.$t('ClearSubjectConfirm', {}, 'Are you sure you want to clear the subject?'),
        cancel: true,
        persistent: true,
      }).onOk(() => {
        this.editSubjectValue = ''
        this.saveSubject()
      })
    },
    async saveSubject () {
      const subject = this.editSubjectValue.trim()
      if (!this.room) return
      this.savingSubject = true
      try {
        if (subject) {
          this.$store.commit('nostrChat/UPDATE_ROOM_NAME', { roomId: this.roomId, name: subject })
        } else if (this.otherMemberContact) {
          this.$store.commit('nostrChat/UPDATE_ROOM_NAME', { roomId: this.roomId, name: this.otherMemberContact.name })
        }
        this.$store.commit('nostrChat/UPDATE_ROOM_SUBJECT', { roomId: this.roomId, subject: subject || null })
        let text
        if (subject) {
          text = this.$t('SubjectChangedTo', { subject }, `Changed subject to "${subject}"`)
        } else {
          text = this.$t('SubjectCleared', {}, 'Cleared the subject')
        }
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
          subject,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        this.editingSubject = false
        this.$q.notify({
          type: 'positive',
          message: subject
            ? this.$t('SubjectUpdated', {}, 'Subject updated')
            : this.$t('SubjectClearedNotify', {}, 'Subject cleared'),
        })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('SubjectUpdateFailed', {}, 'Failed to update subject') })
      } finally {
        this.savingSubject = false
      }
    },
    openContactDetails () {
      this.showContactDetails = true
    },
    startEditContactName () {
      this.editContactNameValue = this.otherMemberContact?.name || this.contactDisplayName
      this.editingContactName = true
    },
    cancelEditContactName () {
      this.editingContactName = false
      this.editContactNameValue = ''
    },
    async saveContactName () {
      const name = this.editContactNameValue.trim()
      const contact = this.otherMemberContact
      if (!name || !contact) return
      try {
        await this.$store.dispatch('nostrChat/updateContact', {
          npub: contact.npub,
          name,
        })
        // Update room name if it's a DM room matching this contact
        const room = this.$store.getters['nostrChat/getRoomByMember'](contact.pubKeyHex)
        if (room && room.members.length === 2) {
          this.$store.commit('nostrChat/UPDATE_ROOM_NAME', {
            roomId: room.id,
            name,
          })
        }
        this.editingContactName = false
        this.$q.notify({ type: 'positive', message: this.$t('ContactRenamed', {}, 'Contact renamed') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('ContactRenameFailed', {}, 'Failed to rename contact') })
      }
    },
    copyContactNpub () {
      if (!this.otherMemberNpub) return
      copyToClipboard(this.otherMemberNpub)
      this.$q.notify({
        type: 'positive',
        message: this.$t('Copied', {}, 'Copied to clipboard'),
        timeout: 1500,
      })
    },
    useFetchedContactDisplayName () {
      if (this.fetchedContactDisplayName) {
        this.editContactNameValue = this.fetchedContactDisplayName
      }
    },
  },
}
</script>

<style scoped>
.dm-info-body {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.dm-header-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
  border-radius: 16px;
  text-align: center;
}

.dm-avatar {
  color: #ffffff;
}

.avatar-initial {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.contact-name-display {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.contact-npub {
  font-size: 12px;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
}

.subject-edit-section {
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

.subject-display-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subject-text {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.subject-text-empty {
  color: #9ca3af;
  font-style: italic;
  font-weight: 400;
}

.subject-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subject-input {
  flex: 1;
}

.subject-input :deep(.q-field__control) {
  border-radius: 10px;
}

.dm-header-card.clickable {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dm-header-card.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dm-header-card.clickable:active {
  transform: translateY(0);
}

.contact-details-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
}

.contact-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.contact-header-info {
  text-align: center;
  width: 100%;
}

.contact-display-name {
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

.contact-name-input {
  max-width: 260px;
  margin: 0 auto 8px;
}

.contact-name-input :deep(.q-field__control) {
  border-radius: 10px;
}

.contact-npub-display {
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

/* Dark mode */
.dark .contact-name-display {
  color: #f1f5f9;
}

.dark .subject-text {
  color: #f1f5f9;
}

.dark .subject-text-empty {
  color: #6b7280;
}

.dark .subject-edit-section {
  background: rgba(255, 255, 255, 0.04);
}

.dark .contact-display-name {
  color: #f1f5f9;
}

.dark .contact-npub-display {
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
