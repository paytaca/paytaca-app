<template>
  <q-dialog persistent>
    <q-card class="q-pa-md pt-card text-center text-bow" :class="getDarkModeClass(darkMode)">
      <p class="q-pt-lg q-px-xl text-h6">{{ $t(loadingText) }} ...</p>
      <ProgressLoader />
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ProgressLoader from 'src/components/ProgressLoader'

export default {
  name: 'LoadingWalletDialog',

  props: {
    loadingText: {
      type: String,
      default: 'LoadingWallet'
    }
  },

  components: {
    ProgressLoader
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  methods: {
    getDarkModeClass,
  }
}
</script>
