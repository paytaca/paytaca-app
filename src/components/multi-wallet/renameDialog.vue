<template>
  <q-dialog ref="rename" persistent>
      <q-card style="min-width: 350px" class="br-15" :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
        <div v-if="isLoaded">
          <q-card-section>
            <div class="text-h5" style="font-size: 18px;">Rename Wallet</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input :dark="darkMode" dense v-model="name" autofocus @keyup.enter="v-close-popup" />
          </q-card-section>

          <q-card-actions align="right" class="text-primary">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn flat label="rename" @click="renameWallet" />
          </q-card-actions>
        </div>
      </q-card>
    </q-dialog>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      name: '',
      selectedIndex: null,
      isLoaded: false
    }
  },
  props: {
    index: Number
  },
  async mounted () {
    console.log(this.index)
    this.selectedIndex = this.index
    this.isLoaded = true
  },
  methods: {
    renameWallet () {
      this.$store.commit('global/updateWalletName', { name: this.name, index: this.selectedIndex})
      console.log(this.name)
      this.hide()
    },
    hide () {
      this.$refs.rename.hide()
    }
  }
}
</script>
