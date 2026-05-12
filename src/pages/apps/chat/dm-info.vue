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
          :class="getDarkModeClass(darkMode)"
          :style="{ background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}0a)` }"
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
            <div class="subject-text">{{ room?.name || $t('NoSubject', {}, 'No subject set') }}</div>
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
              :disable="!editSubjectValue.trim()"
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

        <!-- Contact details -->
        <div class="contact-section" :class="getDarkModeClass(darkMode)">
          <div class="section-title">{{ $t('Contact', {}, 'Contact') }}</div>
          <q-list>
            <q-item class="contact-item">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="44px">
                  {{ contactInitial }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ contactDisplayName }}</q-item-label>
                <q-item-label caption class="npub-caption">{{ fullShortNpub }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
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
  },
  methods: {
    getDarkModeClass,
    startEditSubject () {
      this.editSubjectValue = this.room?.subject || this.room?.name || ''
      this.editingSubject = true
    },
    cancelEditSubject () {
      this.editingSubject = false
      this.editSubjectValue = ''
    },
    async saveSubject () {
      const subject = this.editSubjectValue.trim()
      if (!subject || !this.room) return
      this.savingSubject = true
      try {
        this.$store.commit('nostrChat/UPDATE_ROOM_NAME', { roomId: this.roomId, name: subject })
        this.$store.commit('nostrChat/UPDATE_ROOM_SUBJECT', { roomId: this.roomId, subject })
        const text = this.$t('SubjectChangedTo', { subject }, `Changed subject to "${subject}"`)
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
          subject,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        this.editingSubject = false
        this.$q.notify({ type: 'positive', message: this.$t('SubjectUpdated', {}, 'Subject updated') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('SubjectUpdateFailed', {}, 'Failed to update subject') })
      } finally {
        this.savingSubject = false
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

.subject-edit-section,
.contact-section {
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

.contact-item {
  padding: 8px 4px;
  border-radius: 10px;
}

.npub-caption {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

/* Dark mode */
.dark .contact-name-display {
  color: #f1f5f9;
}

.dark .subject-text {
  color: #f1f5f9;
}

.dark .subject-edit-section,
.dark .contact-section {
  background: rgba(255, 255, 255, 0.04);
}
</style>
