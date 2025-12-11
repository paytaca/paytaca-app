<template>
  <q-card
    class="br-15 q-pt-sm pt-card text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <q-card-section v-if="!stagedSwapDetails.show">
      <div class="row items-center justify-end q-mb-md">
        <q-btn
          round
          color="blue-9"
          padding="xs"
          icon="refresh"
          class="q-ml-md button"
          @click="function(){
            updateNetworkData()
            updateTokenListBalances()
          }"
        />
        <q-btn
          round
          color="blue-9"
          padding="xs"
          icon="settings"
          class="q-ml-md button"
          @click="showSettingsDialogForm = true"
        />
      </div>

      <q-banner v-if="networkData.error" dense rounded class="text-white bg-red q-mx-md q-mb-sm">
        {{ $t('SmartSwapFormErr') }}
        <template v-slot:action>
          <q-btn
            no-caps
            flat
            rounded
            color="white"
            :label="$t('Refetch')"
            @click="updateNetworkData()"
          />
        </template>
      </q-banner>

      <div class="text-center">
        {{ $t('SwapFrom') }}:
      </div>

      <q-item clickable>
        <q-item-section avatar @click="selectSourceToken()" class="items-center">
          <img
            :src="formData.sourceToken.image_url || getFallbackAssetLogo(`sep20/${formData.sourceToken.address}`)"
            height="30"
            style="border-radius:50%"
            class="q-mb-sm"
            alt=""
          >
          <q-item-label>
            {{ formData.sourceToken.symbol }} <q-icon name="expand_more"/>
          </q-item-label>
        </q-item-section>
        <q-item-section>
          <q-input
            dense
            filled
            v-model.number="formData.amount"
            :dark="darkMode"
            @update:modelValue="function(){
              updateExcptectedReturn()
              updateNetworkData()
            }"
          />
          <q-item-label
            v-if="formData.sourceToken.balance > 0 || formData.sourceToken.balance === 0"
            class="text-right q-mt-sm"
            caption
            :class="{'text-grey-6': darkMode}"
            @click="setAmountToSourceTokenBalance()"
          >
            {{ $t('Balance') }}: {{ formatNumber(formData.sourceToken.balance) }}
          </q-item-label>
        </q-item-section>
      </q-item>
      <div class="q-px-md q-my-xs row items-center justify-center">
        <q-btn
          icon="mdi-swap-vertical"
          round
          text-color="blue-9"
          color="grey-4"
          unelevated
          @click="reverseSelectedTokens()"
        />
      </div>

      <div class="full-width text-center q-mt-md">
        {{ $t('SwapTo') }}:
      </div>

      <q-item clickable>
        <q-item-section avatar @click="selectDestToken()" class="items-center">
          <img
            :src="formData.destToken.image_url || getFallbackAssetLogo(`sep20/${formData.destToken.address}`)"
            height="30"
            style="border-radius:50%"
            class="q-mb-sm"
            alt=""
          >
          <q-item-label>
            {{ formData.destToken.symbol }} <q-icon name="expand_more"/>
          </q-item-label>
        </q-item-section>
        <q-item-section>
          <q-skeleton v-if="networkData.loading" type="rect"/>
          <q-input
            v-else
            disable
            dense
            filled
            :dark="darkMode"
            :modelValue="formatNumber(networkData.expectedReturn, 6)"
          />
          <q-item-label
            v-if="networkData.exchangeRate"
            class="text-right q-mt-sm"
            caption
            :class="{'text-grey-6': darkMode}"
          >
            <div>
              <q-skeleton v-if="networkData.loading" type="text"/>
              <template v-else>
                1 {{ formData.sourceToken.symbol === 'BCH' ? denomination : formData.sourceToken.symbol}} ~=
                {{
                  formData.destToken.symbol === 'BCH'
                    ? getAssetDenomination(denomination, networkData.exchangeRate)
                    : `${formatNumber(networkData.exchangeRate, 10)} ${formData.destToken.symbol}`
                }}
              </template>
            </div>
          </q-item-label>
        </q-item-section>
      </q-item>
      <div class="q-px-sm row items-center justify-end q-mt-md">
        <q-btn
          icon="launch"
          color="blue-9"
          flat
          padding="xs"
          size="sm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="showSettingsDialogForm = true"
        />
      </div>
      <q-item class="q-mt-sm">
        <q-item-section side>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('Slippage') }}:</q-item-label>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('Deadline') }}:</q-item-label>
        </q-item-section>
        <q-item-section class="text-right">
          <q-item-label>{{ formData.slippageTolerance }}%</q-item-label>
          <q-item-label>
            {{ formData.transactionDeadline }}
            minute{{ formData.transactionDeadline > 1 ? 's' : '' }}
          </q-item-label>
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item class="q-my-sm">
        <q-item-section side>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('Route') }}:</q-item-label>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('MinimumReturn') }}:</q-item-label>
        </q-item-section>
        <q-item-section class="text-right">
          <q-item-label @click="showRouteDialog = computedFormData.parsedDistribution.steps > 0" style="cursor:pointer;">
            <q-skeleton v-if="networkData.loading" type="text"/>
            <template v-else-if="computedFormData.parsedDistribution.steps > 0">
              {{ `${computedFormData.parsedDistribution.steps} step${computedFormData.parsedDistribution.steps > 1 ? 's' : ''}` }}
              <q-icon
                name="launch"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
              />
                <SmartSwapRouteDialog
                  v-model="showRouteDialog"
                  :steps="computedFormData.parsedDistribution.steps"
                  :groupedRoute="computedFormData.parsedDistribution.grouped"
                  :darkMode="darkMode"
                  :inputCurrency="formData.sourceToken"
                  :outputCurrency="formData.destToken"
                />
            </template>
            <template v-else>
              &nbsp;
            </template>
          </q-item-label>
          <q-item-label>
            <q-skeleton v-if="networkData.loading" type="text"/>
            <template v-else>
              ~ {{
                  formData.destToken.symbol === 'BCH'
                    ? getAssetDenomination(denomination, computedFormData.minimumReturn)
                    : `${formatNumber(computedFormData.minimumReturn, 6)} ${formData.destToken.symbol}`
                }}
            </template>
          </q-item-label>
        </q-item-section>
      </q-item>
      <div class="row justify-center q-mb-md" style="color: gray;">
        <span>{{ $t('PoweredBy') }} SmartSwap.fi</span>
      </div>
      <div class="row">
        <q-btn
          v-if="!networkData.isApproved && !formData.sourceToken.mainCurrency"
          :disable="networkData.approvingToken || networkData.loading || Boolean(networkData.error)"
          no-caps
          :loading="networkData.approvingToken"
          :label="$t('Approve') + ' ' + formData.sourceToken.symbol"
          class="q-space button"
          rounded
          @click="confirmApproveToken()"
        />
        <q-btn
          v-else-if="!formData.amount"
          disable
          rounded
          no-caps
          :label="$t('EnterAmount')"
          class="q-space button"
        />
        <q-btn
          v-else
          :disable="insufficientBalance || networkData.approvingToken || networkData.loading || Boolean(networkData.error)"
          no-caps
          rounded
          :label="insufficientBalance ? $t('InsufficientBalance') : $t('Swap')"
          class="q-space button"
          @click="moveSwapDetailsToStaging()"
        />
      </div>
    </q-card-section>
    <q-card-section v-else>
      <div>
        <q-banner v-if="Boolean(stagedSwapDetails.error)" dense rounded class="text-white bg-red q-mx-md q-mb-sm">
          {{ stagedSwapDetails.error }}
        </q-banner>
      </div>
      <div class="row no-wrap justify-around items-baseline">
        <div class="col-5 column items-center">
          <img height="40" :src="stagedSwapDetails.sourceToken.image_url" alt=""/>
          <div class="q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">
            {{ computedStagedSwapDetails.formattedAmount }}
          </div>
          <div class="text-center pt-label" :class="getDarkModeClass(darkMode)">
            {{ stagedSwapDetails.sourceToken.symbol }}
          </div>
        </div>

        <q-icon name="arrow_forward" size="2em"/>

        <div class="col-5 column items-center">
          <img height="40" :src="stagedSwapDetails.destToken.image_url"/>
          <div class="q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">
            {{ computedStagedSwapDetails.formattedExpectedReturn }}
          </div>
          <div class="text-center pt-label" :class="getDarkModeClass(darkMode)">
            {{ stagedSwapDetails.destToken.symbol }}
          </div>
        </div>
      </div>
      <q-separator spaced/>
      <q-item>
        <q-item-section side>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('Slippage') }}:</q-item-label>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('MinimumReturn') }}:</q-item-label>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('Deadline') }}:</q-item-label>
          <q-item-label :class="darkMode ? 'text-grey-6' : 'text-dark'">{{ $t('Route') }}:</q-item-label>
        </q-item-section>
        <q-item-section class="text-right">
          <q-item-label>{{ stagedSwapDetails.slippageTolerance }}%</q-item-label>
          <q-item-label>
            {{ computedStagedSwapDetails.formattedMinReturn }}
            {{ stagedSwapDetails.destToken.symbol }}
          </q-item-label>
          <q-item-label>
            {{ stagedSwapDetails.transactionDeadline }}
            minute{{ stagedSwapDetails.transactionDeadline > 1 ? 's' : '' }}
          </q-item-label>
          <q-item-label @click="showRouteDialog = computedStagedSwapDetails.parsedDistribution.steps > 0" style="cursor:pointer;">
            <template v-if="computedStagedSwapDetails.parsedDistribution.steps > 0">
              {{ `${computedStagedSwapDetails.parsedDistribution.steps} step${computedStagedSwapDetails.parsedDistribution.steps > 1 ? 's' : ''}` }}
              <q-icon
                name="launch"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
              />
                <SmartSwapRouteDialog
                  v-model="showRouteDialog"
                  :steps="computedStagedSwapDetails.parsedDistribution.steps"
                  :groupedRoute="computedStagedSwapDetails.parsedDistribution.grouped"
                  :darkMode="darkMode"
                  :inputCurrency="stagedSwapDetails.sourceToken"
                  :outputCurrency="stagedSwapDetails.destToken"
                />
            </template>
            <template v-else>
              &nbsp;
            </template>
          </q-item-label>
        </q-item-section>
      </q-item>
      <div v-if="!stagedSwapDetails.txid" class="row items-center justify-end q-mb-md">
        <q-btn
          flat
          no-caps
          :disable="stagedSwapDetails.loading"
          rounded
          icon="mdi-arrow-left"
          :label="$t('BackToEdit')"
          class="button"
          @click="stagedSwapDetails.show = false"
        />
      </div>
      <div v-if="stagedSwapDetails.txid" class="q-mx-md q-mt-sm">
        <div>{{ $t('ViewTransactionInExplorer') }}:</div>
        <div class="ellipsis">
          <a
            :href="`https://sonar.cash/tx/${stagedSwapDetails.txid}`"
            target="_blank"
            style="text-decoration: none;"
            class="button button-text-primary"
          >
            {{ stagedSwapDetails.txid }}
          </a>
        </div>
      </div>
      <q-separator />
      <div v-if="stagedSwapDetails.loading" class="row items-center justify-center">
        <ProgressLoader />
      </div>
      <div class="row justify-center" style="margin-top: 20px; color: gray;">
        <span>{{ $t('PoweredBy') }} SmartSwap.fi</span>
      </div>
      <DragSlide
        v-if="stagedSwapDetails.show && stagedSwapDetails.showConfirmSwipe"
        :style="{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
        }"
        @swiped="confirmSwiped()"
      />
      <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogNextAction" />
    </q-card-section>
    <q-dialog v-model="showSettingsDialogForm" persistent seamless>
      <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width:75vw;">
        <div class="row no-wrap items-center justify-center q-pl-md">
          <div
            class="text-subtitle1 text-weight-medium q-space q-pt-sm text-section"
            :class="{'text-blue-5': darkMode}"
          >
            {{ $t('Settings') }}
          </div>
          <q-btn
              flat
              icon="refresh"
              round
              padding="sm"
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click="function(){
                formData.transactionDeadline = 20
                formData.slippageTolerance = 1
              }"
            />
          <q-btn
            flat
            round
            color="grey"
            padding="sm"
            icon="close"
            class="close-button"
            v-close-popup
          />
        </div>
        <q-card-section class="text-center">
          <div class="q-mb-sm text-subtitle2 text-weight-regular">
            {{ $t('SlippageTolerance') }}
            <q-icon name="help" class="q-ml-sm" size="1.25em" :color="darkMode ? 'grad' : 'blue-9'">
              <q-popup-proxy :breakpoint="0">
                <div class="q-px-md q-py-sm text-caption pt-card-2 pt-label" :class="getDarkModeClass(darkMode)">
                  {{ $t('SlippageToleranceDescription') }}
                </div>
              </q-popup-proxy>
            </q-icon>
          </div>
          <div class="no-wrap row items-center justify-center q-gutter-sm">
            <q-btn-toggle
              v-model="formData.slippageTolerance"
              rounded
              :toggle-color="'grad'"
              :toggle-text-color="darkMode ? 'dark' : 'white'"
              :color="darkMode ? 'blue-9' : 'grey-3'"
              :text-color="darkMode ? 'white' : 'dark'"
              :options="[
                {label: '0.5%', value: 0.5 },
                {label: '1%', value: 1},
                {label: '2%', value: 2},
              ]"
            />
          </div>
          <div class="q-mt-lg q-mb-sm text-subtitle2 text-weight-regular">
            {{ $t('TransactionDeadline') }}
            <q-icon name="help" class="q-ml-sm" size="1.25em" :color="darkMode ? 'grad' : 'blue-9'">
              <q-popup-proxy :breakpoint="0">
                <div class="q-px-md q-py-sm text-caption pt-card-2 pt-label" :class="getDarkModeClass(darkMode)">
                  {{ $t('SwapTransactionDeadlineDescription') }}
                </div>
              </q-popup-proxy>
            </q-icon>
          </div>
          <div :class="{'text-grey-6': darkMode}">{{ formData.transactionDeadline }} minutes</div>
          <div class="no-wrap row items-center q-gutter-sm">
            <q-slider
              :min="5"
              :max="30"
              color="slider"
              v-model="formData.transactionDeadline"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>
<script>
import { markRaw } from '@vue/reactivity'
import { debounce, throttle } from 'quasar'
import { getMnemonic, Wallet } from '../../wallet'
import {
  batchFetchBalance,
  hasApprovedSmartswap,
  approveTokenOnSmartswap,
  getExpectedReturnWithGas,
  currencyToBigNumber,
  bigNumberToCurrency,
  getSwapDetails,
  decodeSwapHexData,
  parseDistribution,
  BigNumber
} from '../../wallet/smartswap'
import { bchToken, tokensList } from '../../wallet/smartswap/tokens'
import DragSlide from '../drag-slide.vue'
import ProgressLoader from '../ProgressLoader.vue'
import pinDialog from '../pin/index.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import SmartSwapTokenSelectorDialog from './SmartSwapTokenSelectorDialog.vue'
import SmartSwapRouteDialog from './SmartSwapRouteDialog.vue'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { generateSbchAddress } from 'src/utils/address-generation-utils.js'

export default {
  name: 'SmartSwapForm',
  components: {
    ProgressLoader,
    DragSlide,
    SmartSwapRouteDialog,
    pinDialog
  },
  props: {
    darkMode: {
      type: Boolean,
      default: false
    },
    currentCountry: { type: String },
    denomination: { type: String }
  },
  data () {
    return {
      wallet: null,
      address: '',

      // info that the user can update
      formData: {
        loading: false,
        sourceToken: bchToken,
        // sourceToken: tokensList[2],
        destToken: tokensList[3],
        amount: 0,
        slippageTolerance: 1,
        transactionDeadline: 20
      },
      showSettingsDialogForm: false,
      showRouteDialog: false,

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
        loading: false,

        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Bitcoin Cash',
          symbol: 'BCH',
          decimals: 18,
          image_url: 'bch-logo.png'
        },
        destToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Bitcoin Cash',
          symbol: 'BCH',
          decimals: 18,
          image_url: 'bch-logo.png'
        },
        slippageTolerance: 1,
        transactionDeadline: 20,

        amount: BigNumber.from('0x0'), // must be after adjusting decimals, (e.g. if BCH, amount must be in ether)
        expectedReturn: BigNumber.from('0x0'), // must be adjusting decimals
        distribution: [],

        loading: false,
        error: null,
        txid: ''
      },

      tokensList: [bchToken, ...tokensList],
      updatingTokenBalances: false,
      pinDialogAction: ''
    }
  },
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    },
    insufficientBalance () {
      const hasValidBalance = this.formData.sourceToken.balance >= 0
      if (!hasValidBalance) return true

      return this.formData.sourceToken.balance < this.formData.amount
    },
    computedFormData () {
      /*
        Swap info that are calculated from 'networkData' and 'formData'
      */
      const slippagePctg = this.formData.slippageTolerance / 100
      return {
        parsedDistribution: parseDistribution(this.networkData.distribution),
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
        distribution: this.networkData.distribution
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
        formattedMinReturn: formattedMinReturn,
        parsedDistribution: parseDistribution(this.stagedSwapDetails.distribution)
      }
    }
  },
  methods: {
    getAssetDenomination,
    getDarkModeClass,
    isHongKong,
    formatNumber (value = 0, decimals = 6) {
      return Number(value.toPrecision(decimals))
    },
    confirmApproveToken () {
      if (this.approvingToken) return

      const tokenInfo = {
        name: this.formData.sourceToken.name,
        address: this.formData.sourceToken.address
      }
      this.$q.dialog({
        title: this.$t(isHongKong(this.currentCountry) ? 'ApprovePoint' : 'ApproveToken'),
        message: `You are approving SmartSwap's contract to transfer your ${tokenInfo.name}. Are you sure you want to proceed?`,
        persistent: true,
        seamless: true,
        ok: {
          rounded: true
        },
        cancel: {
          rounded: true
        },
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })
        .onOk(() => {
          this.approveSourceToken()
        })
    },
    approveSourceToken () {
      if (this.approvingToken) return

      const tokenInfo = {
        name: this.formData.sourceToken.name,
        address: this.formData.sourceToken.address
      }

      this.approvingToken = true
      const dialog = this.$q.dialog({
        title: this.$t(isHongKong(this.currentCountry) ? 'ApprovingPoint' : 'ApprovingToken'),
        message: this.$t(
          'ApprovingTokenName',
          { tokenInfoName: tokenInfo.name },
          `Approving ${tokenInfo.name}`
        ),
        progress: true,
        seamless: true,
        persistent: false,
        ok: false, // we want the user to not be able to close it
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })

      const onApproveSuccess = () => {
        dialog.update({
          message: this.$t(isHongKong(this.currentCountry) ? 'PointApproved' : 'TokenApproved') + '!',
          progress: false,
          ok: true
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
            message: `Failed to approve ${isHongKong(this.currentCountry) ? 'point' : 'token'}. ${error?.error ? error.error : ''}`,
            progress: false,
            ok: true
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
        else isApproved = await hasApprovedSmartswap(this.networkDataReqs.sourceToken.address, this.address)

        var parsedExpectedReturn
        var exchangeRate
        var distribution = []
        if (this.networkDataReqs.amount > 0) {
          const { amount: expectedReturn, distribution: _distribution } = await getExpectedReturnWithGas(
            this.networkDataReqs.sourceToken.address,
            this.networkDataReqs.destToken.address,
            this.networkDataReqs.amount.toHexString()
          )

          const decimalDiff = this.networkDataReqs.destToken.decimals - this.networkDataReqs.sourceToken.decimals
          parsedExpectedReturn = bigNumberToCurrency(expectedReturn, this.networkDataReqs.destToken.decimals)
          exchangeRate = expectedReturn / (this.networkDataReqs.amount * 10 ** decimalDiff)
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
    setAmountToSourceTokenBalance () {
      if (!this.formData.sourceToken || !typeof this.formData.sourceToken.balance === 'number') return
      if (this.formData.sourceToken.balance === this.formData.amount) return

      this.formData.amount = this.formData.sourceToken.balance
      this.updateExcptectedReturn()
      this.updateNetworkData()
    },
    selectSourceToken () {
      this.$q.dialog({
        component: SmartSwapTokenSelectorDialog,
        componentProps: {
          tokensList: this.tokensList,
          title: this.$t(isHongKong(this.currentCountry) ? 'SelectPoint' : 'SelectToken'),
          darkMode: this.darkMode,
          currentCountry: this.currentCountry
        }
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
        componentProps: {
          tokensList: this.tokensList,
          darkMode: this.darkMode,
          currentCountry: this.currentCountry
        }
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
    confirmSwiped (reset = () => {}) {
      this.stagedSwapDetails.showConfirmSwipe = false
      this.executeSecurityChecking(reset)
    },
    executeSecurityChecking (reset = () => {}) {
      const vm = this
      setTimeout(() => {
        const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
        if (preferredSecurity === 'pin') {
          // Reset first to ensure watcher is triggered
          vm.pinDialogAction = ''
          vm.$nextTick(() => {
            vm.pinDialogAction = 'VERIFY'
          })
        } else {
          vm.verifyBiometric(reset)
        }
      }, 300)
    },
    verifyBiometric (reset = () => {}) {
      const vm = this
      NativeBiometric.verifyIdentity({
        reason: vm.$t('NativeBiometricReason2'),
        title: vm.$t('SecurityAuthentication'),
        subtitle: vm.$t('NativeBiometricSubtitle'),
        description: ''
      }).then(
        () => {
          // Authentication successful
          vm.commitStagedSwapDetails()
        },
        (error) => {
          // Failed to authenticate
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            reset?.()
            vm.stagedSwapDetails.showConfirmSwipe = true
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            // Retry after delay
            setTimeout(() => {
              vm.verifyBiometric(reset)
            }, 2000)
          } else {
            vm.verifyBiometric(reset)
          }
        }
      )
    },
    pinDialogNextAction (action) {
      if (action === 'proceed') {
        this.commitStagedSwapDetails()
      } else {
        this.stagedSwapDetails.showConfirmSwipe = true
      }
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
      this.stagedSwapDetails.transactionDeadline = this.formData.transactionDeadline

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

      await this.wallet.sBCH.getOrInitWallet()
      try {
        const params = {
          sourceTokenAddress: this.stagedSwapDetails.sourceToken.address,
          destTokenAddress: this.stagedSwapDetails.destToken.address,
          amount: this.stagedSwapDetails.amount,
          minReturn: this.computedStagedSwapDetails.minReturn,
          distribution: this.stagedSwapDetails.distribution,
          deadline: Math.round(Date.now() / 1000) + this.stagedSwapDetails.transactionDeadline * 60, // 20 minutes from timestamp
          feePercent: 500000000000000 // taken from tango swap
        }
        const txParams = await getSwapDetails(params)
        console.log(decodeSwapHexData(txParams.data))
        const response = await this.wallet.sBCH.sendTransaction(txParams)
        console.log(response)
        if (!response.success) throw response

        if (response.transaction && response.transaction.hash) this.stagedSwapDetails.txid = response.transaction.hash
        this.$q.dialog({
          title: this.$t('SwapSuccess'),
          message: this.$t('AssetsSwappedSuccesfully') + '!',
          ok: {
            rounded: true
          },
          persisted: true,
          seamless: true,
          class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
        })
      } catch (err) {
        console.error(err)
        if (err.error) this.stagedSwapDetails.error = err.error
        else this.stagedSwapDetails.error = 'Unknown error occurred'
      } finally {
        this.stagedSwapDetails.loading = false
      }
    },
    updateSourceTokenBalance: throttle(async function () {
      const sourceTokenAddress = this.formData.sourceToken.address
      const sourceTokenDecimals = this.formData.sourceToken.decimals
      if (sourceTokenAddress === '0x0000000000000000000000000000000000000000') {
        const bchBalance = await this.wallet.sBCH.getBalance(this.address)

        // Estimate swap gas is around 1.5 million gas
        const gas = await this.wallet.sBCH.provider.getGasPrice()
        const estimateGas = gas.mul(1.5 * 10 ** 6)
        const estimateGasBCH = bigNumberToCurrency(estimateGas, 18)

        // sourceToken changes while balance is being updated on some instances
        if (sourceTokenAddress === this.formData.sourceToken.address) {
          const diff = Number(bchBalance) - estimateGasBCH
          this.formData.sourceToken.balance = diff > 0 ? diff : 0
        }
        this.$forceUpdate()
        return
      }

      const balanceMap = await batchFetchBalance([sourceTokenAddress], this.address)
      const tokenBalance = balanceMap[sourceTokenAddress.toLowerCase()]
      if (!tokenBalance) return

      // sourceToken changes while balance is being updated on some instances
      if (sourceTokenAddress === this.formData.sourceToken.address) {
        this.formData.sourceToken.balance = bigNumberToCurrency(tokenBalance, sourceTokenDecimals)
      }
      this.$forceUpdate()
      console.log('Balance:', this.formData.sourceToken.balance)
    }, 500),
    updateBchTokenBalance: throttle(async function () {
      const bchToken = this.tokensList.find(tokenInfo => tokenInfo && tokenInfo.address === '0x0000000000000000000000000000000000000000')
      if (bchToken) {
        const bchBalance = await this.wallet.sBCH.getBalance(this.address)

        // Estimate swap gas is around 1.5 million gas
        const gas = await this.wallet.sBCH.provider.getGasPrice()
        const estimateGas = gas.mul(1.5 * 10 ** 6)
        const estimateGasBCH = bigNumberToCurrency(estimateGas, 18)
        bchToken.balance = Number(bchBalance) - estimateGasBCH
        this.$forceUpdate()
      }
    }, 500),
    updateTokenListBalances: throttle(async function () {
      this.updatingTokenBalances = true
      try {
        this.updateBchTokenBalance()

        const tokenAddresses = this.tokensList
          .map(tokenInfo => tokenInfo && tokenInfo.address)
          .filter(address => address && address !== '0x0000000000000000000000000000000000000000')

        const balanceMap = await batchFetchBalance(tokenAddresses, this.address)
        this.tokensList.forEach(tokenInfo => {
          if (!tokenInfo) return
          const balance = balanceMap[tokenInfo.address.toLowerCase()]
          if (!balance) return
          tokenInfo.balance = bigNumberToCurrency(balance, tokenInfo.decimals)
        })
      } finally {
        this.updatingTokenBalances = false
      }
    }, 500),
    fetchTokensList (updateBalances = true) {
      return this.$axios
        .get(
          'https://raw.githubusercontent.com/tangoswap-cash/default-token-list/master/tokens/smartbch.json'
          // 'https://raw.githubusercontent.com/zh/sep20tokens/main/smartbch.tokenlist.json'
        )
        .then(response => {
          if (Array.isArray(response.data)) {
            this.tokensList = [
              bchToken,
              ...response.data
                .map(token => {
                  if (!token || !token.address) return
                  if (token.chainId !== 10000) return

                  return {
                    address: token.address,
                    name: token.name,
                    symbol: token.symbol,
                    decimals: token.decimals,
                    image_url: token.logoURI
                  }
                })
                .filter(Boolean)
            ]
            if (updateBalances) this.updateTokenListBalances()
          }
        })
    },
    async loadWallet () {
      const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
      this.wallet = markRaw(new Wallet(mnemonic))
      await this.loadAddress()
      return this.wallet
    },
    async loadAddress () {
      try {
        const address = await generateSbchAddress({
          walletIndex: this.$store.getters['global/getWalletIndex']
        })
        this.address = address || ''
      } catch (error) {
        console.error('Error generating sBCH address:', error)
        this.address = ''
      }
    }
  },
  watch: {
    'formData.sourceToken.address': {
      handler () {
        this.updateNetworkData()
        this.updateSourceTokenBalance()
      }
    },
    'formData.destToken.address': {
      handler () {
        this.updateNetworkData()
      }
    }
  },
  unmounted () {
    this.stopNetworkDataUpdater()
  },
  beforeDestroy () {
    this.stopNetworkDataUpdater()
  },
  mounted () {
    Promise.all([
      this.loadWallet(),
      this.fetchTokensList(false)
    ])
      .then(() => {
        this.updateTokenListBalances()
        this.updateSourceTokenBalance()
      })
    this.updateNetworkData()
    // this.startNetworkDataUpdater()
  }
}
</script>
