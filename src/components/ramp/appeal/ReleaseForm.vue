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
        <div class="bold-text lg-font-size" >{{ appeal.type.label.toUpperCase() }} APPEAL</div>
        <div class="sm-font-size" :class="darkMode ? 'text-grey-4' : 'text-grey-6'">(Order #{{ appeal.order.id }})</div>
      </div>
      <q-scroll-area :style="`height: ${minHeight - 170}px`" style="overflow-y:auto;">
        <div class="q-mx-lg">
          <q-card class="br-15 q-mt-md" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
            <q-card-section>
              <div class="md-font-size">
              <span>Last status: </span><span class="bold-text">{{ appeal.order.status.label }}</span>
              </div>
              <!-- <span class="sm-font-size">Awaiting confirmation of payment and release of crypto</span> -->
            </q-card-section>

            <q-separator :dark="darkMode" />

            <q-card-section>
              <div class="bold-text md-font-size">Reason(s):</div>
              <q-badge v-for="(reason, index) in appeal.reasons" :key="index" size="sm" outline :color="darkMode ? 'blue-grey-4' : 'blue-grey-6'" :label="reason" />
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

          <!-- update later -->
          <div class="sm-font-size q-pt-md q-px-lg">
            <!-- FLOATING -->
            <div v-if="true">
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
            </div>
            <!-- FIXED -->
            <div v-else>
              <div class="row justify-between no-wrap q-mx-lg">
                <span>Fixed Price</span>
                <span class="text-nowrap q-ml-xs">
                  $100,000
                </span>
              </div>
            </div>


            <div class="row justify-between no-wrap q-mx-lg">
              <span>Crypto Amount</span>
              <span class="text-nowrap q-ml-xs">
                1 BCH
              </span>
            </div>
            <q-separator class="q-my-sm" :dark="darkMode"/>

            <div class="row justify-between no-wrap q-mx-lg">
              <span>Fiat Price</span>
              <span class="text-nowrap q-ml-xs">
                $105,500
              </span>
            </div>

            <div class="text-blue text-center q-pt-xs" @click="state = 'snapshot'"><u>View Ad Snapshot</u></div>
          </div>

          <q-separator class="q-my-sm q-mt-md" :dark="darkMode"/>

          <div class="q-pt-sm">
            <q-card class="br-15 q-mt-md q-py-sm" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
              <q-tabs
                v-model="tab"
                dense
                class=""
                active-color="primary"
                indicator-color="primary"
                align="justify"
                narrow-indicator
              >
                <q-tab name="status" label="Status" />
                <q-tab name="transaction" label="Transactions" />
              </q-tabs>

              <q-separator  class="q-mb-sm" :dark="darkMode"/>

              <div v-if="tab === 'status'">
                <div v-for="(snapshot, index) in snapshots.status" :key="index" class="sm-font-size q-pb-sm" :class="darkMode ? '' : 'subtext'">
                  <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                  <div class="row justify-between no-wrap q-mx-lg">
                    <span>{{ snapshot.status }}</span>
                    <span class="text-nowrap q-ml-xs">
                      {{ snapshot.date }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="tab === 'transaction'">
                <div class="row bold-text sm-font-size" :class="darkMode ? '' : 'text-grey-7'">
                  <div class="col-3 text-center">Type</div>
                  <div class="col-4 text-center">Status</div>
                  <div class="col-5 text-center">Timestamp</div>
                </div>

                <q-separator class="q-my-sm" :dark="darkMode"/>

                <div>
                  <div v-for="(snapshot, index) in snapshots.transaction" :key=index>
                    <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                    <div class="row sm-font-size" :class="darkMode ? '' : 'text-grey-7'">
                      <div class="col-3 text-center">{{ snapshot.type }}</div>
                      <div class="col-4 text-center">{{ snapshot.status}}</div>
                      <div class="col-5 xs-font-size">{{ snapshot.timestamp}}</div>
                    </div>
                    <div v-if="snapshot.hasOwnProperty('txid')" class="q-pt-xs">
                      <div class="row sm-font-size" :class="darkMode ? '' : 'text-grey-7'">
                        <div class="col-4 text-center">Transaction ID</div>
                        <div class="col text-blue-6"><u>{{ snapshot.txid}}</u></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </q-card>
          </div>

          <!-- Simplified this -->
          <div class="q-pb-md">
            <q-card class="br-15 q-mt-md q-py-sm" bordered flat :class="[ darkMode ? 'pt-dark-card' : '',]">
              <div class="text-center q-py-xs bold-text text-uppercase">
                Select Options
              </div>
              <q-separator class="q-my-sm" :dark="darkMode"/>
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

                <q-separator class="q-my-sm q-mt-md" :dark="darkMode"/>

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
      tab: 'status',
      appeal: null,
      isloaded: false,
      state: 'form',
      amount: {
        buyer: 1,
        seller: 105500
      },
      selectedType: null,
      snapshots: {
        status: [
          {
            status: 'Paid Pending',
            date: 'Aug 31, 2023 3:17pm'
          },
          {
            status: 'Escrowed',
            date: 'Aug 31, 2023 3:16pm'
          },
          {
            status: 'Escrow Pending',
            date: 'Aug 31, 2023 3:15pm'
          },
          {
            status: 'Confirmed',
            date: 'Aug 31, 2023 3:13pm'
          },
          {
            status: 'Submitted',
            date: 'Aug 31, 2023 3:12pm'
          }
        ],
        transaction: [
          {
            type: 'Release',
            status: 'Validating',
            timestamp: '2023-06-26T08:58:37.529593Z'
          },
          {
            type: 'Escrow',
            status: 'Validating',
            timestamp: '2023-06-26T08:58:37.529593Z',
            txid: 'jsdjskdjakdlajdkucisfsdjksajdkajdl'
          }
        ]
      },
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.25
      // minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125
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
    console.log('appeal:', this.appeal)

    this.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
