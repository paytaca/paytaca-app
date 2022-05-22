<template>
  <q-card
    :flat="darkMode"
    :class="[
      darkMode ? 'text-white pt-dark-card' : 'text-black',
    ]"
  >
    <q-card-section v-if="!stagedSwapDetails.show">
      <div class="row items-center justify-end q-mb-sm">
        <q-btn
          round
          padding="xs"
          icon="refresh"
          @click="updateNetworkData()"
        />
      </div>

      <q-banner v-if="networkData.error" dense rounded class="text-white bg-red q-mx-md q-mb-sm">
        Error occurred in fetching swap information
        <template v-slot:action>
          <q-btn
            no-caps
            flat
            color="white"
            label="Refetch"
            @click="updateNetworkData()"
          />
        </template>
      </q-banner>
      <q-item clickable>
        <q-item-section avatar @click="selectSourceToken()" class="items-center">
          <img :src="formData.sourceToken.image_url || getFallbackAssetLogo(`sep20/${formData.sourceToken.address}`)" height="30" class="q-mr-xs" style="border-radius:50%">
          <q-item-label>
            {{ formData.sourceToken.symbol }}
          </q-item-label>
        </q-item-section>
        <q-item-section>
          <q-input
            dense
            outlined
            v-model.number="formData.amount"
            :input-class="darkMode ? 'text-white' : 'text-black'"
            @input="
              updateExcptectedReturn()
              updateNetworkData()
            "
          />
        </q-item-section>
      </q-item>
      <div class="q-px-md q-my-xs row items-center justify-left">
        <q-btn
          icon="swap_vert"
          round
          padding="sm"
          flat
          @click="reverseSelectedTokens()"
        />
      </div>

      <q-item clickable>
        <q-item-section avatar @click="selectDestToken()" class="items-center">
          <img :src="formData.destToken.image_url || getFallbackAssetLogo(`sep20/${formData.destToken.address}`)" height="30" class="q-mr-xs" style="border-radius:50%">
          <q-item-label>
            {{ formData.destToken.symbol }}
          </q-item-label>
        </q-item-section>
        <q-item-section>
          <q-skeleton v-if="networkData.loading" type="rect"/>
          <q-input
            v-else
            disable
            dense
            outlined
            :input-class="darkMode ? 'text-white' : 'text-black'"
            :value="formatNumber(networkData.expectedReturn, 6)"
          />
        </q-item-section>
      </q-item>

      <div v-if="networkData.exchangeRate" class="q-px-md text-right">
        <q-skeleton v-if="networkData.loading" type="text"/>
        <template v-else>
          1 {{ formData.sourceToken.symbol}} ~=
          {{ formatNumber(networkData.exchangeRate, 10) }}
          {{ formData.destToken.symbol }}
        </template>
      </div>
      <q-item>
        <q-item-section side>
          <q-item-label :class="darkMode ? 'text-grey-6' : ''">Slippage</q-item-label>
        </q-item-section>
        <q-item-section class="text-right">
          <q-item-label>{{ formData.slippageTolerance }}%</q-item-label>
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item>
        <q-item-section side>
          <q-item-label :class="darkMode ? 'text-grey-6' : ''">Minimum return</q-item-label>
        </q-item-section>
        <q-item-section class="text-right">
          <q-item-label>
            <q-skeleton v-if="networkData.loading" type="text"/>
            <template v-else>
              ~ {{ formatNumber(computedFormData.minimumReturn, 6) }}
              {{ formData.destToken.symbol }}
            </template>
          </q-item-label>
        </q-item-section>
      </q-item>
      <div class="row">
        <q-btn
          v-if="networkData.isApproved || formData.sourceToken.mainCurrency"
          :disable="!formData.amount || networkData.loading || Boolean(networkData.error)"
          no-caps
          :label="formData.amount ? 'Swap' : 'Enter amount'"
          color="brandblue"
          class="q-space"
          @click="moveSwapDetailsToStaging()"
        />
        <q-btn
          v-else
          :disable="networkData.approvingToken || networkData.loading || Boolean(networkData.error)"
          no-caps
          :loading="networkData.approvingToken"
          :label="'Approve ' + formData.sourceToken.symbol"
          color="brandblue"
          class="q-space"
          @click="confirmApproveToken()"
        />
      </div>
      <div class="row justify-center" style="margin-top: 24px; color: gray;">
        <span>Powered by SmartSwap.fi</span>
      </div>
    </q-card-section>
    <q-card-section v-else>
      <div v-if="!stagedSwapDetails.txid" class="row items-center justify-end">
        <q-btn
          flat
          no-caps
          :disable="stagedSwapDetails.loading"
          padding="xs sm"
          label="Edit"
          class="q-mb-sm"
          @click="stagedSwapDetails.show = false"
        />
      </div>
      <div>
        <q-banner v-if="Boolean(stagedSwapDetails.error)" dense rounded class="text-white bg-red q-mx-md q-mb-sm">
          {{ stagedSwapDetails.error }}
        </q-banner>
      </div>
      <div class="row no-wrap justify-around items-baseline">
        <div class="col-5 column items-center">
          <img height="40" :src="stagedSwapDetails.sourceToken.image_url"/>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            {{ computedStagedSwapDetails.formattedAmount }}
          </div>
          <div class="text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            {{ stagedSwapDetails.sourceToken.symbol }}
          </div>
        </div>

        <q-icon name="arrow_forward" size="2em"/>

        <div class="col-5 column items-center">
          <img height="40" :src="stagedSwapDetails.destToken.image_url"/>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            {{ computedStagedSwapDetails.formattedExpectedReturn }}
          </div>
          <div class="text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            {{ stagedSwapDetails.destToken.symbol }}
          </div>
        </div>
      </div>
      <q-separator spaced/>
      <q-item>
        <q-item-section side>
          <q-item-label :class="darkMode ? 'text-grey-6' : ''">Slippage</q-item-label>
          <q-item-label :class="darkMode ? 'text-grey-6' : ''">Min. Return</q-item-label>
        </q-item-section>
        <q-item-section class="text-right">
          <q-item-label>{{ stagedSwapDetails.slippageTolerance }}%</q-item-label>
          <q-item-label>
            {{ computedStagedSwapDetails.formattedMinReturn }}
            {{ stagedSwapDetails.destToken.symbol }}
          </q-item-label>
        </q-item-section>
      </q-item>
      <div v-if="stagedSwapDetails.txid" class="q-mx-sm q-mt-sm">
        <div>View transaction in smartscan:</div>
        <div class="ellipsis">
          <a :href="`https://www.smartscan.cash/transaction/${stagedSwapDetails.txid}`" target="_blank"> {{ stagedSwapDetails.txid }}</a>
        </div>
      </div>
      <hr>
      <div v-if="stagedSwapDetails.loading" class="row items-center justify-center">
        <ProgressLoader/>
      </div>
      <div class="row justify-center" style="margin-top: 24px; color: gray;">
        <span>Powered by SmartSwap.fi</span>
      </div>
      <DragSlide
        v-if="stagedSwapDetails.show && stagedSwapDetails.showConfirmSwipe"
        square
        :style="{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
        }"
        @swiped="confirmSwiped()"
      />
    </q-card-section>
  </q-card>
</template>
<script>
import { debounce } from 'quasar'
import { getMnemonic, Wallet } from '../../wallet'
import {
  hasApprovedSmartswap,
  approveTokenOnSmartswap,
  getExpectedReturnWithGas,
  currencyToBigNumber,
  bigNumberToCurrency,
  getSwapDetails,
  decodeSwapHexData,
  BigNumber
} from '../../wallet/smartswap'
import { bchToken, tokensList } from '../../wallet/smartswap/tokens'
import DragSlide from '../drag-slide.vue'
import ProgressLoader from '../ProgressLoader.vue'
import SecurityCheckDialog from '../SecurityCheckDialog.vue'
import SmartSwapTokenSelectorDialog from './SmartSwapTokenSelectorDialog.vue'


export default {
  name: 'SmartSwapForm',
  components: {
    ProgressLoader,
    DragSlide,
  },
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    }
  },
  data () {
    return {
      wallet: null,

      // info that the user can update
      formData: {
        loading: false,
        sourceToken: bchToken,
        // sourceToken: tokensList[2],
        destToken: tokensList[3],
        amount: 0,
        slippageTolerance: 1
      },

      // info that needs to be updated from the network when formData changes, see computed 'networkDataReqs' below
      networkData: {
        loading: false,
        isApproved: true, // if smartswap contract is approved to spend sourceToken
        exchangeRate: 0,
        expectedReturn: 0,
        distribution: [],

        error: null
      },
      approvingToken: false,

      // state for regular network data update functionality
      networkDataUpdater: {
        intervalId: null,
        rate: 60 * 1000
      },

      // all the info necessary to display, confirm, and perform the swap is moved in this object to;
      // isolate the details from auto-update mechanisms within the form while the swap is in progress
      stagedSwapDetails: {
        show: false,
        showConfirmSwipe: false,

        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Bitcoin Cash',
          symbol: 'BCH',
          decimals: 18,
          image_url: 'bch-logo.png',
        },
        destToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Bitcoin Cash',
          symbol: 'BCH',
          decimals: 18,
          image_url: 'bch-logo.png',
        },
        slippageTolerance: 1,

        amount: BigNumber.from('0x0'), // must be after adjusting decimals, (e.g. if BCH, amount must be in ether)
        expectedReturn: BigNumber.from('0x0'), // must be adjusting decimals
        distribution: [],

        loading: false,
        error: null,
        txid: ''
      },

      tokensList: [bchToken, ...tokensList],
    }
  },
  computed: {
    computedFormData () {
      /*
        Swap info that are calculated from 'networkData' and 'formData'
      */
      const slippagePctg = this.formData.slippageTolerance / 100
      return {
        minimumReturn: this.networkData.expectedReturn * (1 - slippagePctg)
      }
    },
    networkDataReqs () {
      /*
        Extracted data from formData to use when updating network data
      */
      const parsedAmount = currencyToBigNumber(this.formData.amount, this.formData.sourceToken.decimals)
      return {
        sourceToken: {
          address: this.formData.sourceToken.address,
          decimals: this.formData.sourceToken.decimals
        },
        destToken: {
          address: this.formData.destToken.address,
          decimals: this.formData.destToken.decimals
        },
        amount: parsedAmount
      }
    },
    parsedSwapParameters () {
      /*
        Swap info taken from 'networkData' and 'formData', used for as parameters for the final params
      */
      const params = {
        sourceTokenAddress: this.formData.sourceToken.address,
        destTokenAddress: this.formData.destToken.address,
        amount: Math.round(this.formData.amount * (10 ** this.formData.sourceToken.decimals)),
        minReturn: Math.round(this.computedFormData.minimumReturn * (10 ** this.formData.destToken.decimals)),
        distribution: this.networkData.distribution,
      }

      return params
    },
    computedStagedSwapDetails () {
      const minReturn = this.stagedSwapDetails.expectedReturn.sub(
        this.stagedSwapDetails.expectedReturn.div(10 ** 2).mul(this.formData.slippageTolerance)
      )
      const formattedMinReturn = this.formatNumber(bigNumberToCurrency(minReturn, this.stagedSwapDetails.destToken.decimals))
      return {
        formattedAmount: this.formatNumber(
          bigNumberToCurrency(this.stagedSwapDetails.amount, this.stagedSwapDetails.sourceToken.decimals)
        ),
        formattedExpectedReturn: this.formatNumber(
          bigNumberToCurrency(this.stagedSwapDetails.expectedReturn, this.stagedSwapDetails.destToken.decimals)
        ),
        minReturn: minReturn,
        formattedMinReturn: formattedMinReturn
      }
    },
  },
  methods: {
    formatNumber (value = 0, decimals = 6) {
      return Number(value.toPrecision(decimals))
    },
    confirmApproveToken () {
      if (this.approvingToken) return

      const tokenInfo = {
        name: this.formData.sourceToken.name,
        address: this.formData.sourceToken.address,
      }
      this.$q.dialog({
        title: 'Approve token',
        message: `You are approving SmartSwap's contract to transfer your ${tokenInfo.name}. Are you sure you want to proceed?`,
        ok: true,
        cancel: true,
        class: this.darkMode ? 'text-white pt-dark-card' : 'text-black',
      })
        .onOk(() => {
          this.approveSourceToken()
        })
    },
    approveSourceToken () {
      if (this.approvingToken) return

      const tokenInfo = {
        name: this.formData.sourceToken.name,
        address: this.formData.sourceToken.address,
      }

      this.approvingToken = true
      const dialog = this.$q.dialog({
        title: 'Approving token',
        message: `Approving ${tokenInfo.name}`,
        progress: true,
        persistent: false,
        ok: false, // we want the user to not be able to close it
        class: this.darkMode ? 'text-white pt-dark-card' : 'text-black',
      })

      const onApproveSuccess = () => {
        dialog.update({
          message: 'Token approved!',
          progress: false,
          ok: true,
        })
        this.approvingToken = false
        this.networkData.isApproved = true
        this.updateNetworkData()
      }

      approveTokenOnSmartswap(tokenInfo.address, this.wallet.sBCH._wallet)
        .then(response => {
          if (response.success) {
            onApproveSuccess()
            return Promise.resolve(response)
          }
          return Promise.reject(response)
        })
        .catch((error) => {
          dialog.update({
            message: 'Failed to approve token' + ((error && error.error) ? `. ${error.error}` : ''),
            progress: false,
            ok: true,
          })
        })
        .finally(() => {
          this.approvingToken = false
        })
    },
    updateNetworkData: debounce(async function () {
      this.networkData.loading = true
      this.networkData.error = null
      try {
        var isApproved

        // zero address implies using the main currency BCH, which doesnt require approval
        if (this.networkDataReqs.sourceToken.address === '0x0000000000000000000000000000000000000000') isApproved = true
        else isApproved = await hasApprovedSmartswap(this.networkDataReqs.sourceToken.address, this.wallet.sBCH._wallet.address)

        var parsedExpectedReturn
        var exchangeRate
        var distribution = []
        if (this.networkDataReqs.amount > 0) {
          const { amount: expectedReturn, distribution: _distribution } = await getExpectedReturnWithGas(
            this.networkDataReqs.sourceToken.address,
            this.networkDataReqs.destToken.address,
            this.networkDataReqs.amount.toHexString()
          )

          parsedExpectedReturn = bigNumberToCurrency(expectedReturn, this.networkDataReqs.destToken.decimals)
          exchangeRate = expectedReturn / this.networkDataReqs.amount
          distribution = _distribution
        } else {
          parsedExpectedReturn = 0
          exchangeRate = 0
        }

        this.networkData.isApproved = isApproved
        this.networkData.expectedReturn = parsedExpectedReturn
        this.networkData.exchangeRate = exchangeRate
        this.networkData.distribution = distribution
      } catch (error) {
        console.error('Error fetching network data')
        console.error(error)
        this.networkData.error = error
      } finally {
        this.networkData.loading = false
      }
    }, 500),
    startNetworkDataUpdater (forceRestart = false) {
      if (this.networkDataUpdater.intervalId && !forceRestart) return
      this.stopNetworkDataUpdater()
      this.networkDataUpdater.intervalId = setInterval(() => {
        this.updateNetworkData()
      }, this.networkDataUpdater.rate)
    },
    stopNetworkDataUpdater () {
      if (!this.networkDataUpdater.intervalId) return
      clearInterval(this.networkDataUpdater.intervalId)
      this.networkDataUpdater.intervalId = null
    },
    updateExcptectedReturn () {
      /*
        Intended only for interactivity purposes in the ui,
        should ideally call 'updateNetworkData' after for more reliable data
      */
      this.networkData.expectedReturn = this.networkData.exchangeRate * this.formData.amount
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    selectSourceToken () {
      this.$q.dialog({
        component: SmartSwapTokenSelectorDialog,
        tokensList: this.tokensList,
        darkMode: this.darkMode,
      })
        .onOk(token => {
          if (!token) return
          if (token.address === this.formData.destToken.address) {
            this.reverseSelectedTokens()
            return
          }
          this.formData.sourceToken = token
        })
    },
    selectDestToken () {
      this.$q.dialog({
        component: SmartSwapTokenSelectorDialog,
        tokensList: this.tokensList,
        darkMode: this.darkMode
      })
        .onOk(token => {
          if (!token) return
          if (token.address === this.formData.sourceToken.address) {
            this.reverseSelectedTokens()
            return
          }
          this.formData.destToken = token
        })
    },
    reverseSelectedTokens () {
      const buffer = this.formData.destToken
      this.formData.destToken = this.formData.sourceToken
      this.formData.sourceToken = buffer
    },
    confirmSwiped () {
      this.stagedSwapDetails.showConfirmSwipe = false
      this.$q.dialog({
        component: SecurityCheckDialog,
        root: this.$root, // necessary for the dialog to work since it accesses $store
      })
        .onOk(() => {
          this.commitStagedSwapDetails()
        })
        .onCancel(() => {
          this.stagedSwapDetails.showConfirmSwipe = true
        })
    },
    moveSwapDetailsToStaging () {
      // guard to prevent updating data while sending swap transaction
      if (this.stagedSwapDetails.loading) return
      this.stagedSwapDetails.error = null
      this.stagedSwapDetails.txid = ''
      // this.stagedSwapDetails.error = 'Test display error'
      // this.stagedSwapDetails.txid = '0x2b264a0433a1332c996b9847207c97ee96aaa1bbdd9504631e6d1b236c893ba6'

      this.stagedSwapDetails.sourceToken = {
        address: this.formData.sourceToken.address,
        name: this.formData.sourceToken.name,
        symbol: this.formData.sourceToken.symbol,
        decimals: this.formData.sourceToken.decimals,
        image_url: this.formData.sourceToken.image_url
      }

      this.stagedSwapDetails.destToken = {
        address: this.formData.destToken.address,
        name: this.formData.destToken.name,
        symbol: this.formData.destToken.symbol,
        decimals: this.formData.destToken.decimals,
        image_url: this.formData.destToken.image_url
      }

      this.stagedSwapDetails.amount = currencyToBigNumber(this.formData.amount, this.formData.sourceToken.decimals)
      this.stagedSwapDetails.expectedReturn = currencyToBigNumber(this.networkData.expectedReturn, this.formData.destToken.decimals)
      this.stagedSwapDetails.distribution = this.networkData.distribution
      this.stagedSwapDetails.slippageTolerance = this.formData.slippageTolerance

      this.stagedSwapDetails.show = true
      this.stagedSwapDetails.showConfirmSwipe = true
    },
    async commitStagedSwapDetails () {
      // guard to check if swap details are shown before performing
      if (!this.stagedSwapDetails.show) return

      // guard to prevent possibility of sending multple transactions
      if (this.stagedSwapDetails.loading) return

      this.stagedSwapDetails.loading = true
      this.stagedSwapDetails.error = null
      this.$forceUpdate()
      try {
        const params = {
          sourceTokenAddress: this.stagedSwapDetails.sourceToken.address,
          destTokenAddress: this.stagedSwapDetails.destToken.address,
          amount: this.stagedSwapDetails.amount,
          minReturn: this.computedStagedSwapDetails.minReturn,
          distribution: this.stagedSwapDetails.distribution,
          deadline: Math.round(Date.now() / 1000) + 20 * 60, // 20 minutes from timestamp
          feePercent: 500000000000000, // taken from tango swap
        }
        const txParams = await getSwapDetails(params)
        console.log(decodeSwapHexData(txParams.data))
        const response = await this.wallet.sBCH.sendTransaction(txParams)
        console.log(response)
        if (!response.success) throw response

        if (response.transaction && response.transaction.hash) this.stagedSwapDetails.txid = response.transaction.hash
        this.$q.dialog({
          title: 'Swap success',
          message: 'Assets swapped succesfully!',
          ok: true,
          persistend: true,
          class: this.darkMode ? 'text-white pt-dark-card' : 'text-black',
        })
      } catch(err) {
        console.error(err)
        if (err.error) this.stagedSwapDetails.error = err.error
        else this.stagedSwapDetails.error = 'Unknown error occurred'
      } finally {
        console.log('Finally')
        this.stagedSwapDetails.loading = false
      }
    },
    fetchTokensList () {
      this.$axios
        .get(
          'https://raw.githubusercontent.com/zh/sep20tokens/main/smartbch.tokenlist.json',
        )
        .then(response => {
          if (Array.isArray(response.data.tokens)) {
            this.tokensList = [
              bchToken,
              ...response.data.tokens
                .map(token => {
                  if (!token || !token.address) return
                  if (token.chainId !== 10000) return

                  return {
                    address: token.address,
                    name: token.name,
                    symbol: token.symbol,
                    decimals: token.decimals,
                    image_url: token.logoURI,
                  }
                })
                .filter(Boolean)
            ]
          }
        })
    },
    async loadWallet () {
      const mnemonic = await getMnemonic()
      this.wallet = new Wallet(mnemonic)
      await this.wallet.sBCH.getOrInitWallet()
      return this.wallet
    },
  },
  watch: {
    "formData.sourceToken.address": {
      handler() {
        this.updateNetworkData()
      }
    },
    "formData.destToken.address": {
      handler() {
        this.updateNetworkData()
      }
    }
  },
  unmounted() {
    this.stopNetworkDataUpdater()
  },
  beforeDestroy() {
    this.stopNetworkDataUpdater()
  },
  mounted() {
    this.loadWallet()
    this.updateNetworkData()
    // this.startNetworkDataUpdater()
    this.fetchTokensList()
  }
}
</script>
