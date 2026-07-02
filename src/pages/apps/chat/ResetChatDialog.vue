<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 320px">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('ResetChat', {}, 'Reset Chat') }}</div>
        <div class="text-body2 q-mb-md" style="color: #ef4444; line-height: 1.5;">
          {{ $t('ResetChatConfirm', {}, 'This will permanently delete all conversations, contacts, and profile data. Your Nostr keys will be re-derived from your wallet seed phrase.') }}
        </div>
        <div class="text-caption q-mb-sm" style="color: #9ca3af;">
          {{ $t('ResetChatTypeConfirm', {}, 'Type RESET to confirm:') }}
        </div>
        <q-input
          v-model="input"
          outlined
          dense
          :placeholder="$t('ResetChatTypeConfirmPlaceholder', {}, 'Type RESET here')"
          :dark="darkMode"
          @keyup.enter="onConfirmClick"
        />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn
          :label="$t('Cancel', {}, 'Cancel')"
          flat
          color="grey"
          v-close-popup
        />
        <q-btn
          :label="$t('Reset', {}, 'Reset')"
          color="negative"
          :disable="input !== 'RESET'"
          @click="onConfirmClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ResetChatDialog',
  emits: ['ok', 'hide'],
  data () {
    return {
      input: '',
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  methods: {
    getDarkModeClass,
    show () {
      this.input = ''
      this.$refs.dialog.show()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    },
    onConfirmClick () {
      if (this.input === 'RESET') {
        this.$emit('ok')
        this.hide()
      }
    },
  },
}
</script>
