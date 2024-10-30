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
      <ShardsProcess
        :mnemonic="mnemonic"
        :walletHash="walletHash"
        :fromWalletInfo="true"
      />
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ShardsProcess from 'src/components/registration/ShardsProcess'

export default {
  name: 'ShardsDialog',

  props: {
    mnemonic: String,
    walletHash: String
  },

  components: {
    ShardsProcess
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
