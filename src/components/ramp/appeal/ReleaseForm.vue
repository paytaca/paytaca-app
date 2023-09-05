<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${ minHeight }px;`" v-if="state === 'form'">
    <div class="q-pt-sm" v-if="isloaded">
      <div class="row items-center justify-between q-mt-md q-mr-lg q-pb-xs q-px-sm">
        <q-btn
          flat
          padding="md"
          icon="arrow_back"
          @click="$emit('back')"
        />
        <q-icon class="q-pl-lg" size="sm" name='o_question_answer'/>
      </div>
      <div class="text-center">
        <div class="bold-text lg-font-size" >RELEASE APPEAL</div>
        <div class="sm-font-size text-grey-6">(Order #{{ appeal.order }})</div>
      </div>
      <q-scroll-area :style="`height: ${minHeight - 210}px`" style="overflow-y:auto;">
        <div class="q-mx-lg">
          <q-card class="br-15 q-mt-md" bordered flat>
            <q-card-section>
              <div class="bold-text md-font-size">Status: {{ appeal.status }}</div>
              <span class="sm-font-size">Awaiting confirmation of payment and release of crypto</span>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <div class="bold-text md-font-size">Reason:</div>
              <q-badge rounded size="sm" outline color="blue-grey-6" :label="appeal.reason" />
            </q-card-section>
          </q-card>

          <div class="q-pt-md q-px-sm">
            <div class="sm-font-size q-pb-xs text-italic">Buyer Receives</div>
            <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="amount.buyer">
              <template v-slot:append>
                <span class="sm-font-size bold-text">BCH</span>
              </template>
            </q-input>

            <div class="sm-font-size q-pb-xs text-italic">Seller Receives</div>
            <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="amount.seller">
              <template v-slot:append>
                <span class="sm-font-size bold-text">USD</span>
              </template>
            </q-input>
          </div>

          <div class="sm-font-size q-pt-md q-px-lg">
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Market Price</span>
              <span class="text-nowrap q-ml-xs">
                $100,000
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Floating Price</span>
              <span class="text-nowrap q-ml-xs">
                105.5%
              </span>
            </div>
            <div class="row justify-between no-wrap q-mx-lg">
              <span>Crypto Amount</span>
              <span class="text-nowrap q-ml-xs">
                1 BCH
              </span>
            </div>
            <q-separator class="q-my-sm"/>

            <div class="row justify-between no-wrap q-mx-lg">
              <span>Fiat Price</span>
              <span class="text-nowrap q-ml-xs">
                $105,500
              </span>
            </div>

            <div class="text-blue text-center q-pt-xs" @click="state = 'snapshot'"><u>View Ad Snapshot</u></div>
          </div>

          <q-separator class="q-my-sm q-mt-md"/>

          <div class="q-pt-sm">
            <q-card class="br-15 q-mt-md q-py-sm" bordered flat>
              <div class="row text-center">
                <div class="col">Status</div>
                <div class="col">Transactions</div>
              </div>
              <div v-for="(snapshot, index) in snapshots" :key="index" class="sm-font-size subtext">
                <q-separator class="q-my-sm"/>
                <div class="row justify-between no-wrap q-mx-lg">
                  <span>{{ snapshot.status }}</span>
                  <span class="text-nowrap q-ml-xs">
                    {{ snapshot.transaction }}
                  </span>
                </div>
              </div>
            </q-card>
          </div>

          <!-- Simplified this -->
          <div>
            <q-card class="br-15 q-mt-md q-py-sm" bordered flat>
              <div class="text-center q-py-xs">
                Select Options
              </div>
              <q-separator class="q-my-sm"/>
              <div>
                <div class="row justify-between no-wrap q-mx-lg q-pt-sm">
                  <span class="sm-font-size">Release</span>
                  <span class="text-nowrap q-ml-xs">
                    <q-btn
                      :outline="selectedType !== 'release'"
                      rounded
                      padding="sm"
                      size="sm"
                      icon="done"
                      :color="selectedType === 'release' ? 'blue-6' : 'grey-6'"
                      class="q-ml-xs"
                      @click="selectReleaseType('release')"
                    />
                  </span>
                </div>

                <q-separator class="q-my-sm q-mt-md"/>

                <div class="row justify-between no-wrap q-mx-lg q-py-sm">
                  <span class="sm-font-size">Refund</span>
                  <span class="text-nowrap q-ml-xs">
                    <q-btn
                      :outline="selectedType !== 'refund'"
                      rounded
                      padding="sm"
                      size="sm"
                      icon="done"
                      :color="selectedType === 'refund' ? 'blue-6' : 'grey-6'"
                      class="q-ml-xs"
                      @click="selectReleaseType('refund')"
                    />
                  </span>
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </q-card>

  <!-- Ad Snapshot -->
  <AdSnapshot
    v-if="state === 'snapshot'"
    @back="state = 'form'"
  />

  <!-- Add DragSlide -->
  <DragSlide
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @swiped="confirmRelease"
    text="Swipe To Confirm"
    v-if="selectedType && state === 'form'"
  />
</template>
<script>
import DragSlide from 'src/components/drag-slide.vue'
import AdSnapshot from './AdSnapshot.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      appeal: null,
      isloaded: false,
      state: 'form',
      amount: {
        buyer: 1,
        seller: 105500
      },
      selectedType: null,
      snapshots: [
        {
          status: 'Paid Pending',
          transaction: 'Aug 31, 2023 3:17pm'
        },
        {
          status: 'Escrowed',
          transaction: 'Aug 31, 2023 3:16pm'
        },
        {
          status: 'Escrow Pending',
          transaction: 'Aug 31, 2023 3:15pm'
        },
        {
          status: 'Confirmed',
          transaction: 'Aug 31, 2023 3:13pm'
        },
        {
          status: 'Submitted',
          transaction: 'Aug 31, 2023 3:12pm'
        }
      ],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125
    }
  },
  props: {
    appealInfo: Object
  },
  emits: ['back'],
  components: {
    DragSlide,
    AdSnapshot
  },
  methods: {
    confirmRelease () {
      console.log('confirming')
    },
    selectReleaseType (type) {
      if (this.selectedType === type) {
        this.selectedType = null
      } else {
        this.selectedType = type
      }
    },
    selectButtonColor (type) {
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      return temp.includes(type) ? 'blue-6' : 'grey-6'
    }
  },
  async mounted () {
    this.appeal = this.appealInfo
    console.log(this.appeal)

    this.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
