<template>
  <q-card flat bordered :dark="darkMode" class="text-bow br-15">
    <q-card-section bordered class="pt-card" :class="getDarkModeClass(darkMode)" style="overflow-x: auto;">
      <div v-if="type !== 'appeal'">
        <div class="xs-font-size">Trading with</div>
        <div class="row justify-end">
            <div class="col q-py-none">
                <div style="overflow-x: scroll; max-width: 200px;">
                  <q-btn flat no-caps dense
                      padding="none"
                      color="primary"
                      class="q-py-none q-my-none row lg-font-size text-weight-bold"
                      @click="onViewPeer(counterparty?.id)">
                      {{ counterparty?.name }}
                  </q-btn>
                </div>
                <div class="row">
                  <q-rating
                  readonly
                  :model-value="counterparty?.rating || 0"
                  :v-model="counterparty?.rating || 0"
                  size="1em"
                  color="yellow-9"
                  icon="star"
                  icon-half="star_half"
                  @click="onViewReviews"/>
                  <span class="q-mx-xs sm-font-size">({{ counterparty?.rating?.toFixed(1) || 0 }})</span>
                </div>
            </div>
            <div v-if="type === 'order'" class="col-auto q-mx-sm">
                <q-btn size="1.2em" padding="none" dense ripple round flat class="button button-icon" icon="forum" @click="onViewChat">
                  <q-badge v-if="unread" floating color="red" rounded>{{ unread }}</q-badge>
                </q-btn>
            </div>
        </div>
      </div>
      <div v-else>
        <div class="row justify-between no-wrap">
          <div class="col-auto">
            <div class="sm-font-size">SELLER</div>
            <div class="row justify-end">
                <div class="col q-py-none">
                    <q-btn flat no-caps dense
                        padding="none"
                        color="primary"
                        class="q-py-none q-my-none row lg-font-size text-weight-bold"
                        @click="onViewPeer(order?.members?.seller?.id)">
                        {{ order?.members?.seller?.name }}
                    </q-btn>
                    <div class="row">
                        <q-rating
                        readonly
                        :model-value="order?.members?.seller?.rating || 0"
                        :v-model="order?.members?.seller?.rating || 0"
                        size="1em"
                        color="yellow-9"
                        icon="star"
                        @click="onViewReviews"/>
                        <span class="q-mx-xs sm-font-size">({{ order?.members?.seller?.rating?.toFixed(1) || 0 }})</span>
                    </div>
                </div>
            </div>
          </div>
          <div class="col-auto text-right">
            <div class="sm-font-size">BUYER</div>
            <div class="row justify-end q-py-none">
              <q-btn
                  flat
                  no-caps
                  dense
                  padding="none"
                  color="primary"
                  class="row lg-font-size text-weight-bold"
                  @click="onViewPeer(order?.members?.buyer?.id)">
                  {{ order?.members?.buyer?.name }}
              </q-btn>
            </div>
            <div class="row justify-end text-right">
                <q-rating
                readonly
                :model-value="order?.members?.buyer?.rating || 0"
                :v-model="order?.members?.buyer?.rating || 0"
                size="1em"
                color="yellow-9"
                icon="star"
                @click="onViewReviews"/>
                <span class="q-ml-xs sm-font-size">({{ order?.members?.buyer?.rating.toFixed(1) || 0 }})</span>
            </div>
          </div>
        </div>
      </div>
      <div>
        <q-separator class="q-my-sm"/>
        <div v-if="type !== 'appeal'" class="row justify-end">
            <div class="col-auto">
              <div v-if="type === 'ad'">
                <div class="xs-font-size">Price</div>
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ this.ad?.fiat_currency?.symbol }} {{ formatCurrency(ad?.price, this.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
                </span>
                <span class="sm-font-size q-ml-xs">/BCH </span>
              </div>
              <div v-if="type === 'order'">
                <div class="xs-font-size">Trade Amount</div>
                <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label">{{ byFiat ? order?.ad?.fiat_currency?.symbol : '' }}</span>&nbsp;
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ tradeAmount }}
                </span>
                <span class="sm-font-size q-ml-xs">{{ byFiat ? '' : 'BCH' }}</span>
              </div>
              <div v-if="type === 'order'" class="row q-mt-none">
                <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="byFiat = !byFiat"> View amount in {{ byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol }}</q-btn>
              </div>
            </div>
            <q-space/>
            <div class="col-auto q-py-sm q-mx-sm">
              <q-btn v-if="type === 'order'|| type === 'appeal'" dense flat padding="none" color="primary" label="view ad" class="sm-font-size" @click="onViewAd"/>
            </div>
        </div>
        <div v-else>
          <div class="row no-wrap justify-between">
            <div class="col-auto">
              <div class="row xs-font-size">Trade Amount</div>
              <div class="q-mb-none">
                <span class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label">{{ byFiat ? order?.ad?.fiat_currency?.symbol : '' }}</span>
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ tradeAmount }}
                </span>
                <span class="sm-font-size q-ml-xs">{{ byFiat ? '' : 'BCH' }}</span>
              </div>
              <div class="row q-mt-none">
                <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="byFiat = !byFiat"> View amount in {{ byFiat ? 'BCH' : order?.ad?.fiat_currency?.symbol }}</q-btn>
              </div>
            </div>
            <div class="col-auto q-ml-md q-mr-sm text-right">
              <div class="xs-font-size">Ad Price</div>
              <div>
                <span
                    class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                    :class="getDarkModeClass(darkMode)">
                    {{ this.ad?.fiat_currency?.symbol }} {{ formatCurrency(ad?.price, this.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
                </span>
                <span class="sm-font-size">/BCH</span>
              </div>
              <div class="row justify-end q-mt-none text-right">
                <q-btn style="font-size: smaller;" padding="none" flat no-caps color="primary" @click="onViewAd"> View Ad </q-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatCurrency } from 'src/wallet/ramp'
import { generateChatRef, fetchChatMembers } from 'src/wallet/ramp/chat'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      wsURL: process.env.MARKETPLACE_WS_URL,
      websocket: null,
      byFiat: false,
      chatRef: '',
      unread: 0
    }
  },
  emits: ['view-ad', 'view-peer', 'view-reviews', 'view-chat'],
  props: {
    order: Object,
    ad: Object,
    type: {
      type: String,
      default: 'ad'
    }
  },
  created () {
    bus.on('last-read-update', this.onLastReadUpdate)
  },
  async mounted () {
    await this.loadChatInfo()
  },
  computed: {
    completedOrder () {
      return ['CNCL', 'RLS', 'RFN'].includes(this.order?.status?.value)
    },
    lockedPrice () {
      return formatCurrency(this.order?.locked_price, this.order?.ad?.fiat_currency?.symbol)
    },
    tradeAmount () {
      let amount = 0
      if (this.byFiat) {
        amount = formatCurrency((Number(this.order?.crypto_amount) * Number(this.order?.locked_price)).toFixed(2), this.order?.ad?.fiat_currency?.symbol)
      } else {
        amount = parseFloat(Number(this.order?.crypto_amount).toFixed(8))
      }
      return String(amount).replace(/[^\d.,-]/g, '')
    },
    counterparty () {
      let counterparty = this.ad?.owner
      if (this.order?.is_ad_owner) {
        counterparty = this.order?.owner
      }
      return counterparty
    }
  },
  methods: {
    formatCurrency,
    getDarkModeClass,
    onLastReadUpdate () {
      this.fetchChatUnread(this.chatRef)
    },
    async loadChatInfo () {
      if (this.order) {
        this.chatRef = generateChatRef(this.order.id, this.order.created_at)
        await this.fetchChatUnread(this.chatRef)
      }
    },
    async fetchChatUnread (chatRef) {
      const user = this.$store.getters['ramp/getUser']
      await fetchChatMembers(chatRef).then(response => {
        const userMember = response?.filter(member => {
          return user.chat_identity_id === member.chat_identity.id
        })[0]
        this.unread = userMember?.unread_count
      }).catch(console.error)
    },
    onViewAd () {
      this.$emit('view-ad')
    },
    onViewPeer (peerId) {
      this.$emit('view-peer', { id: peerId, self: false })
    },
    onViewReviews () {
      this.$emit('view-reviews')
    },
    async onViewChat () {
      this.$emit('view-chat')
    }
  }
}
</script>
<style scoped>
.xs-font-size {
  font-size: smaller
}

.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}

.subtext {
  opacity: .5;
}

</style>
