<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mb-lg q-pb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${minHeight}px;`"
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
          {{ user.nickname }} <q-icon @click="editNickname = true" v-if="type === 'self'" size="sm" name='o_edit' color="blue-grey-6"/>
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
          <span>{{ user.trade_count }} total trades</span>&nbsp;&nbsp;
          <span>|</span>&nbsp;&nbsp;
          <span> {{ user.completion_rate }}% completion</span>
      </div>

      <div class="q-px-sm q-pt-sm">
        <q-separator :dark="darkMode" class="q-mx-lg q-mt-md"/>
      </div>

      <!-- Comments -->
      <div>
        <div v-if="reviewList.length !== 0"  class="text-center q-py-lg xm-font-size bold-text">
          Reviews
        </div>
        <div v-else class="text-center q-pt-md text-italized bold-text xm-font-size">
          No Reviews Yet
        </div>
        <div class="q-mx-lg q-px-md">
          <q-scroll-area :style="`height: ${ minHeight - 350 }px`" style="overflow-y:auto;">
            <div class="q-pt-md" v-for="(review, index) in reviewList" :key="index">
              <div class="md-font-size bold-text">
                {{  review.from_peer.nickname }}
              </div>
              <div class="sm-font-text">
                <q-rating
                  readonly
                  v-model="review.rating"
                  size="2em"
                  color="yellow-9"
                  icon="star"
                />
              </div>
              <div class="q-pt-sm q-px-xs">
                <q-input
                  v-model="review.comment"
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
      wallet: null,
      isloaded: false,
      user: null,
      editNickname: false,
      state: 'initial',
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      // minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      rating: 3,
      comment: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      reviewList: null
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
  async mounted () {
    const vm = this
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)

    await this.processUserData()
    await this.fetchTopAds()
    vm.isloaded = true
  },
  methods: {
    processUserData () {
      if (this.type === 'self') {
        // get this user's info
        this.user = this.$store.getters['ramp/getUser']
      } else {
        this.user = this.userInfo
      }
    },
    async updateUserName (info) {
      const vm = this

      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'PEER_UPDATE', timestamp)
      // this.$store.commit('global/editRampNickname', info.nickname)
      vm.$axios.put(vm.apiURL + '/peer', {
        nickname: info.nickname
      },
      {
        headers: {
          'wallet-hash': wallet.walletHash,
          signature: signature,
          timestamp: timestamp
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

      this.editNickname = false
    },
    async fetchTopAds () {
      const vm = this

      const url = `${vm.apiURL}/order/feedback/peer`

      await vm.$axios.get(url, {
        params: {
          to_peer: this.$store.getters['ramp/getUser'].id
        }
      })
        .then(response => {
          if (response.data) {
            // const data = response.data
            vm.reviewList = response.data
            console.log('reviews: ', vm.reviewList)
          }
        })
        .catch(error => {
          console.log(error)
        })
        // top 5 reviews
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
