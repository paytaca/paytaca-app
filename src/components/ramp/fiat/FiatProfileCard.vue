<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:50vh;"
  >
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div class="text-center q-pt-none" v-if="isloaded">
      <q-icon size="5em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
      <div class="bold-text lg-font-size q-pt-sm">
        {{ user.name }} <q-icon @click="editNickname = true" v-if="type === 'self'" size="sm" name='o_edit' color="blue-grey-6"/>
      </div>
    </div>
  </q-card>
  <MiscDialogs
    v-if="editNickname"
    :type="'editNickname'"
    v-on:back="editNickname = false"
    v-on:submit="updateUserName"
  />
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'
import { loadP2PWalletInfo } from 'src/wallet/ramp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      isloaded: false,
      user: null,
      editNickname: false
    }
  },
  props: {
    userInfo: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      default: 'self'
    }
  },
  emits: ['back'],
  components: {
    MiscDialogs
  },
  // computed: {
  //   user () {
  //     if (this.type === 'self') {
  //       return this.$store.getters['ramp/getUser']
  //     }
  //   }
  // }
  methods: {
    processUserData () {
      // console.log(this.$store.getters['ramp/getUser'].nickname)
      if (this.type === 'self') {
        // get this user's info
        this.user = {
          name: this.$store.getters['ramp/getUser'].nickname
        }
        console.log(this.user)
      } else {
        this.user = this.userInfo
      }
    },
    async updateUserName (info) {
      console.log(info)
      const vm = this

      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      console.log(wallet)
      // this.$store.commit('global/editRampNickname', info.nickname)
      vm.$axios.put(vm.apiURL + '/peer', {
        nickname: info.nickname
      },
      {
        headers: {
          'wallet-hash': wallet.walletHash,
          signature: null,
          timestamp: Date.now()
        }
      })
        .then(response => {
          console.log(response.data)
          vm.$store.commit('ramp/updateUser', response.data)
          this.processUserData()
        })
        .catch(error => {
          console.log(error)
        })

      // vm.$axios.get(vm.apiURL + '/currency/fiat')
      //   .then(response => {
      //     vm.fiatCurrencies = response.data
      //     if (!vm.selectedCurrency) {
      //       vm.selectedCurrency = vm.fiatCurrencies[0]
      //     }
      //   })
      //   .catch(error => {
      //     console.error(error)
      //     console.error(error.response)

      //     vm.fiatCurrencies = vm.availableFiat
      //     if (!vm.selectedCurrency) {
      //       vm.selectedCurrency = vm.fiatCurrencies[0]
      //     }
      //   })

    }
  },
  async mounted () {
    const vm = this
    await this.processUserData()
    vm.isloaded = true
  }
}
</script>

<!-- REQUEST USER INFO? -->
