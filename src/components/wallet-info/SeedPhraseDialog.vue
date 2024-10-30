<template>
  <q-dialog persistent seamless ref="dialog" class="no-click-outside">
    <q-card class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-end">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <span>{{ $t('YourMnemonic') }}:</span>
      <SeedPhraseContainer :mnemonic="mnemonic" class="q-mt-sm" />
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import SeedPhraseContainer from 'src/components/SeedPhraseContainer'

export default {
  name: 'SeedPhraseDialog',

  props: {
    mnemonic: String
  },

  components: {
    SeedPhraseContainer
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  },

  mounted () {
    document.addEventListener('backbutton', () => {
      this.$refs.dialog.hide()
    })
  }
}
</script>
