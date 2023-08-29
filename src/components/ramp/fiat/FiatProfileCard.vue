<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mb-lg q-pb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`min-height: ${minHeight}px;`"
  >
    <div v-if="state === 'initial' && isloaded">
      <div>
        <q-btn
          flat
          padding="md"
          icon="arrow_back"
          @click="$emit('back')"
        />
      </div>
      <div class="text-center q-pt-none">
        <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
        <div class="bold-text lg-font-size q-pt-sm">
          {{ user.name }} <q-icon @click="editNickname = true" v-if="type === 'self'" size="sm" name='o_edit' color="blue-grey-6"/>
        </div>
      </div>

      <!-- Edit Payment Methods -->
      <div class="row q-mx-lg q-px-md q-pt-md" v-if="type === 'self'">
        <q-btn
          rounded
          no-caps
          label="Edit Payment Methods"
          color="blue-8"
          class="q-space"
          @click="state= 'edit-pm'"
          icon="o_payments"
          >
        </q-btn>
      </div>

      <div class="row q-mx-lg q-px-md q-pt-md" v-if="type !== 'self'">
        <q-btn
          rounded
          no-caps
          label="See User Ads"
          color="blue-8"
          class="q-space"
          icon="sym_o_sell"
          >
        </q-btn>
      </div>

      <!-- User Stats -->
      <div class="text-center md-font-size subtext bold-text q-pt-md">
          <span>100 total trades</span>&nbsp;&nbsp;
          <span>|</span>&nbsp;&nbsp;
          <span>50% completion</span>
      </div>

      <div class="q-px-sm q-pt-sm">
        <q-separator :dark="darkMode" class="q-mx-lg q-mt-md"/>
      </div>

      <!-- Comments -->
      <div>
        <div class="text-center q-pt-md xm-font-size">
          <div class="bold-text">Reviews</div>
        </div>
        <div class="q-mx-lg q-px-md">
          <q-scroll-area :style="`height: ${minHeight - (minHeight*.55)}px`" style="overflow-y:auto;">
            <div class="q-pt-md" v-for="i in 5" :key="i">
              <div class="md-font-size bold-text">
                Edgar Allan Poe
              </div>
              <div class="sm-font-text">
                <q-rating
                  readonly
                  v-model="rating"
                  size="2em"
                  color="yellow-9"
                  icon="star"
                />
              </div>
              <div class="q-pt-sm q-px-xs">
                <q-input
                  v-model="comment"
                  :dark="darkMode"
                  dense
                  disable
                  outlined
                  autogrow
                />
              </div>
              <q-separator :dark="darkMode" class="q-mt-md"/>
            </div>
          </q-scroll-area>
        </div>
      </div>
    </div>
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader/>
      </div>
    </div>
    <div v-if="state === 'edit-pm'">
      <AddPaymentMethods
        :type="'Profile'"
        v-on:back="state = 'initial'"
        v-on:submit="state === 'edit-pm'"
      />
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
import AddPaymentMethods from './AddPaymentMethods.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      walletIndex: this.$store.getters['global/getWalletIndex'],
      isloaded: false,
      user: null,
      editNickname: false,
      state: 'initial',
      minHeight: this.$q.screen.height - 195,
      wallet: null,
      rating: 3,
      comment: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
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
    MiscDialogs,
    AddPaymentMethods,
    ProgressLoader
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
      if (this.type === 'self') {
        // get this user's info
        this.user = {
          name: this.$store.getters['ramp/getUser'].nickname
        }
      } else {
        this.user = this.userInfo
      }
    },
    async updateUserName (info) {
      const vm = this

      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
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
          // console.log(response.data)
          vm.$store.commit('ramp/updateUser', response.data)
          this.processUserData()
        })
        .catch(error => {
          console.log(error)
        })
    },
    // async fetchTopAds () {
    //   const vm = this

    //   const timestamp = Date.now()
    //   const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)
    //   const headers = {
    //     'wallet-hash': vm.wallet.walletHash,
    //     timestamp: timestamp,
    //     signature: signature
    //   }
    //   const params = { trade_type: vm.}
    // }
    // async fetchAds (overwrite = false) {
    //   const vm = this
    //   const timestamp = Date.now()
    //   const signature = await signMessage(this.wallet.privateKeyWif, 'AD_LIST', timestamp)
    //   const headers = {
    //     'wallet-hash': this.wallet.walletHash,
    //     timestamp: timestamp,
    //     signature: signature
    //   }
    //   const params = { trade_type: vm.transactionType, owned: true }
    //   vm.$store.dispatch(
    //     'ramp/fetchAds',
    //     { component: 'ads', params: params, headers: headers, overwrite: overwrite })
    //     .then(response => {
    //       vm.loading = false
    //     })
    //     .catch(error => {
    //       console.error(error.response)
    //     })
    // },
  },
  async mounted () {
    const vm = this
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)

    await this.processUserData()
    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
