<template>
  <div>
    <div class="row no-wrap justify-around items-baseline pt-label" :class="getDarkModeClass(darkMode)">
      <div class="col-5 column items-center">
        <img
          height="50"
          src="bch-logo.png"
          alt=""
        />
        <div class="text-lowercase q-mt-sm">{{ $t('From') }}</div>
        <div class="text-subtitle1 text-center">
          <template v-if="transferType === 'c2s'">Bitcoin Cash</template>
          <template v-else>Smart Bitcoin Cash</template>
        </div>
      </div>

      <q-btn
        rounded
        flat
        padding="sm"
        icon="arrow_forward"
        disable
      />

      <div class="col-5 column items-center">
        <img height="50" src="bch-logo.png" alt=""/>
        <div class="text-lowercase q-mt-sm">{{ $t('To') }}</div>
        <div class="text-subtitle1 text-center">
          <template v-if="transferType === 'c2s'">Smart Bitcoin Cash</template>
          <template v-else>Bitcoin Cash</template>
        </div>
      </div>
    </div>

    <q-card class="q-mt-sm pp-text pt-card-2 pt-label" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <q-banner class="bg-grey-3 rounded-borders q-mb-sm">
          <template v-slot:avatar>
            <q-icon name="info" color="grey" />
          </template>
          Leaving the page may result in being unable to view progress
        </q-banner>

        <div class="text-center">
          {{ getAssetConversion(denomination, amount) }}
          <q-icon name="arrow_forward"/>
          ~{{ getAssetConversion(denomination, expectedAmount) }}
        </div>
        <div class="q-mt-sm">
          <div class="q-mb-sm">
            <span class="text-bow" :class="getDarkModeClass(darkMode)" v-if="transferType === 'c2s'">
              {{ `${denomination} Transaction:` }}
            </span>
            <span class="text-bow" :class="getDarkModeClass(darkMode)" v-else-if="transferType === 's2c'">SmartBCH Transaction:</span>
            <span class="text-bow" :class="getDarkModeClass(darkMode)" v-else>Source tx:</span>
            <q-btn
              flat
              icon="mdi-content-copy"
              size="sm"
              padding="xs"
              @click="copyToClipboard(incomingTxid)"
            />
          </div>
          <div class="ellipsis">
            <a :href="incomingTxUrl" target="_blank"> {{ incomingTxid }}</a>
          </div>
        </div>

        <q-separator spaced/>

        <div v-if="fetchingOutgoingTx || waiting" class="text-center">
          <template v-if="fetchingOutgoingTx">
            <div v-if="transferType === 'c2s'">Looking for SmartBCH Transaction</div>
            <div v-else-if="transferType === 's2c'">{{ `Looking for ${denomination} Transaction` }}</div>
          </template>
          <template v-else-if="waiting">
            <div v-if="transferType === 'c2s'">Waiting for SmartBCH Transaction</div>
            <div v-else-if="transferType === 's2c'">{{ `Waiting for ${denomination} Transaction` }}</div>
          </template>
          <ProgressLoader />
        </div>
        <div v-else-if="parsedOutgoingTx.hash">
          <div>
            <div class="q-mb-sm">
              {{ parsedOutgoingTx.chainName }} Transaction:
              <q-btn
                flat
                icon="mdi-content-copy"
                size="sm"
                padding="xs"
                @click="copyToClipboard(parsedOutgoingTx.hash)"
              />
            </div>
            <div class="ellipsis">
              <a :href="parsedOutgoingTx.url" target="_blank"> {{ parsedOutgoingTx.hash }}</a>
            </div>
          </div>
        </div>
        <div v-else class="text-center">
          <div class="q-my-md">Outgoing transaction not found</div>
          <q-btn
            no-caps
            color="brandblue"
            :label="$t('Retry')"
            class="full-width"
            @click="findAndOrWaitOutgoingTx()"
          />
        </div>
      </q-card-section>
    </q-card>
    <slot name="after" v-bind="{ waiting, fetchingOutgoingTx, outgoingTxFound }"/>
  </div>
</template>
<script>
import { findC2SOutgoingTx, findS2COutgoingTx, waitC2SOutgoing, waitS2COutgoing } from '../../wallet/hopcash'
import ProgressLoader from 'components/ProgressLoader.vue'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  name: 'HopCashSwapWait',
  components: { ProgressLoader },
  props: {
    transferType: {
      type: String,
      default: 'c2s' // c2s || s2c
    },
    incomingTxid: {
      type: String,
      required: true
    },
    amount: [Number, String],
    expectedAmount: [Number, String],
    darkMode: Boolean
  },
  data () {
    return {
      waitPromiseObj: null,
      fetchingOutgoingTx: false,
      tx: null
    }
  },
  computed: {
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    outgoingTxFound () {
      // Could do more checks like comparing `this.incomingTxid` with the data in `this.tx` to be more convincing
      return Boolean(this.parsedOutgoingTx.hash)
    },
    waiting () {
      return Boolean(this.waitPromiseObj)
    },
    incomingTxUrl () {
      if (this.transferType === 's2c') return this.sonarUrl(this.incomingTxid)
      if (this.transferType === 'c2s') return this.blockChairUrl(this.incomingTxid)
      return ''
    },
    parsedOutgoingTx () {
      const data = {
        chainName: '',
        hash: '',
        url: ''
      }

      if (!this.tx) return data

      if (this.transferType === 's2c') {
        data.chainName = 'BCH'
        data.hash = this.tx && this.tx.hash
        data.url = this.blockChairUrl(data.hash)
      } else if (this.transferType === 'c2s') {
        data.chainName = 'Smart BCH'
        data.hash = this.tx && this.tx.hash
        data.url = this.sonarUrl(data.hash)
      }

      return data
    }
  },
  methods: {
    getAssetDenomination,
    getDarkModeClass,
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 200,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    },
    blockChairUrl (txid) {
      return `https://blockchair.com/bitcoin-cash/transaction/${txid}`
    },
    sonarUrl (txid) {
      return `https://sonar.cash/tx/${txid}`
    },
    findOutgoingTx () {
      let func = null
      if (this.transferType === 'c2s') func = findC2SOutgoingTx
      if (this.transferType === 's2c') func = findS2COutgoingTx
      if (!func) return Promise.reject()

      this.fetchingOutgoingTx = true
      return func(this.incomingTxid)
        .finally(() => {
          this.fetchingOutgoingTx = false
        })
        .then(response => {
          if (response.success) {
            this.tx = response.tx
            return Promise.resolve(response)
          }
          return Promise.reject(response)
        })
    },

    waitOutgoingTx () {
      let func = null
      if (this.transferType === 'c2s') func = waitC2SOutgoing
      if (this.transferType === 's2c') func = waitS2COutgoing
      if (!func) return

      // stop previous listener if exists
      this.cancelWaitOutgoingTx()

      // both function will return a promise object with callable `cancelWatch` property to cancel the listener anytime
      this.waitPromiseObj = func(this.incomingTxid)

      this.waitPromiseObj
        .then(tx => {
          this.tx = tx
        })
        .finally(() => {
          // set to null to tell the component state its not waiting for a tx anymore
          this.waitPromiseObj = null
        })
    },

    cancelWaitOutgoingTx () {
      if (typeof this?.waitPromiseObj?.cancelWatch === 'function') this.waitPromiseObj.cancelWatch()
    },

    findAndOrWaitOutgoingTx () {
      this.findOutgoingTx()
        .catch(() => {
          this.waitOutgoingTx()
        })
    }
  },
  watch: {
    incomingTxid () {
      this.findAndOrWaitOutgoingTx()
    }
  },
  beforeDestroy () {
    this.cancelWaitOutgoingTx()
  },
  mounted () {
    this.findAndOrWaitOutgoingTx()
  }
}
</script>
