<template>
  <q-dialog ref="rename" seamless persistent>
    <q-card style="min-width: 350px" class="br-15 pt-card" :class="getDarkModeClass('text-white', 'text-black')">
      <div v-if="isLoaded">
        <q-card-section>
          <div class="text-h5" style="font-size: 18px;">{{ $t('RenameWallet') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            :dark="darkMode"
            :disable="loading"
            :loading="loading"
            dense
            v-model="name"
            autofocus
            @keyup.enter="v-close-popup"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat :disable="loading" :label="$t('Cancel')" v-close-popup />
          <q-btn flat :disable="loading" :label="$t('Rename')" @click="renameWallet" />
        </q-card-actions>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { encryptWalletName } from 'src/marketplace/chat/encryption'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      name: '',
      loading: false,
      selectedIndex: null,
      isLoaded: false
    }
  },
  props: {
    index: Number
  },
  async mounted () {
    this.selectedIndex = this.index
    this.name = this.$store.getters['global/getVault'][this.selectedIndex].name
    this.isLoaded = true
  },
  methods: {
    async renameWallet () {
      const vm = this
      try {
        vm.loading = true
        const encrypedName = encryptWalletName(vm.name, vm.selectedIndex)
        await vm.$store.dispatch('global/updateWalletNameInPreferences', {
          walletName: encrypedName,
          walletIndex: vm.selectedIndex
        })
        vm.$store.commit('global/updateWalletName', { name: vm.name, index: vm.selectedIndex })
        vm.$emit('ok')
        vm.hide()
      } finally {
        vm.loading = false
      }
    },
    hide () {
      this.$refs.rename.hide()
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    }
  }
}
</script>
