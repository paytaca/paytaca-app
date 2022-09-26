<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :class="darkMode ? 'pt-dark' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">Anyhedge Contract</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm">
        <div>
          <div class="text-grey text-subtitle1">Hedge Value</div>
          <div class="row text-body1">
            <div class="q-space">
              {{ formatUnits(contract.metadata.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
            </div>
            <div class="text-grey">{{ contract.metadata.hedgeInputSats / (10**8) }} BCH</div>
          </div>
        </div>
        <div>
          <div class="text-grey text-subtitle1">Address</div>
          <div class="row q-gutter-x-xs no-wrap">
            <div @click="copyText(contract.address)" v-ripple style="position:relative;" class="text-body1">
              {{ ellipsisText(contract.address) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/address/' + contract.address"
              target="_blank"
            />
          </div>
        </div>

        <div v-if="(!settled || contract.fundingTxHash)">
          <div class="text-grey text-subtitle1">Funding</div>
          <div v-if="contract.fundingTxHash" class="row items-center">
            <div @click="copyText(contract.fundingTxHash)" v-ripple style="position:relative;" class="text-body1">
              {{ ellipsisText(contract.fundingTxHash, {start: 5, end: 10}) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/transaction/' + contract.fundingTxHash"
              target="_blank"
            />
          </div>
          <div v-else>
            <q-badge color="grey-7">
              Not yet funded
            </q-badge>
            <div class="row no-wrap items-center q-gutter-x-xs q-py-xs">
              <div class="col-3 text-body1">Hedge</div>
              <q-badge v-if="contract.hedgeFundingProposal" color="brandblue">Submitted</q-badge>
              <template v-else>
                <q-btn v-if="viewAsHedge" no-caps label="Submit funding proposal" color="brandblue" padding="none sm" @click="fundHedgeProposal('hedge')"/>
                <q-badge v-else color="grey-7">Not yet submitted</q-badge>
              </template>
              <q-space/>
              <q-btn v-if="contract.hedgeFundingProposal && viewAsHedge" icon="more_vert" flat size="sm">
                <q-menu
                  anchor="bottom right" self="top right"
                  :class="{
                    'pt-dark': darkMode,
                    'text-black': !darkMode,
                  }"
                >
                  <q-item clickable v-ripple v-close-popup @click="verifyFundingProposalUtxo('hedge')">
                    <q-item-section>
                      <q-item-label>Verify Validity</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple v-close-popup @click="fundHedgeProposal('hedge')">
                    <q-item-section>
                      <q-item-label>Resubmit</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-menu>
              </q-btn>
            </div>

            <div class="row items-center q-gutter-x-xs">
              <div class="col-3 text-body1">Long</div>
              <q-badge v-if="contract.longFundingProposal" color="brandblue">Submitted</q-badge>
              <template v-else>
                <q-btn v-if="viewAsLong" no-caps label="Submit funding proposal" color="brandblue" padding="none sm" @click="fundHedgeProposal('long')"/>
                <q-badge v-else color="grey-7">Not yet submitted</q-badge>
              </template>
              <q-space/>
              <q-btn v-if="contract.longFundingProposal && viewAsLong" icon="more_vert" flat size="sm">
                <q-menu
                  anchor="bottom right" self="top right"
                  :class="{
                    'pt-dark': darkMode,
                    'text-black': !darkMode,
                  }"
                >
                  <q-item clickable v-ripple v-close-popup @click="verifyFundingProposalUtxo('long')">
                    <q-item-section>
                      <q-item-label>Verify Validity</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple v-close-popup @click="fundHedgeProposal('long')">
                    <q-item-section>
                      <q-item-label>Resubmit</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-menu>
              </q-btn>
            </div>
          </div>

          <div
            v-if="contract.hedgeFundingProposal && contract.longFundingProposal && (viewAsHedge || viewAsLong) && !contract?.fundingTxHash"
            class="q-mt-sm"
          >
            <q-btn
              padding="none md"
              no-caps
              label="Complete Funding Proposal"
              color="brandblue"
              class="full-width"
              @click="completeFunding()"
            />
          </div>
        </div>
        
        <div v-if="!settled" class="text-body1">
          <div class="text-grey text-subtitle1">Liquidation</div>
          <div>
            Start: {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ oracleInfo.assetCurrency }}/BCH</template>
          </div>
          <div class="row q-gutter-x-xs">
            <div class="q-space">
              Low: {{ formatUnits(contract.parameters.lowLiquidationPrice, oracleInfo.assetDecimals) }}
              <template v-if="oracleInfo.assetCurrency">{{ oracleInfo.assetCurrency }}/BCH</template>
            </div>
            <div>
              High: {{ formatUnits(contract.parameters.highLiquidationPrice, oracleInfo.assetDecimals) }}
              <template v-if="oracleInfo.assetCurrency">{{ oracleInfo.assetCurrency }}/BCH</template>
            </div>
          </div>
        </div>

        <div>
          <div class="text-grey text-subtitle1">Payout Addresses</div>
          <div class="row q-gutter-x-xs no-wrap">
            <div @click="copyText(contract.metadata.hedgeAddress)" v-ripple style="position:relative;" class="text-body2">
              Hedge: {{ ellipsisText(contract.metadata.hedgeAddress) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/address/' + contract.metadata.hedgeAddress"
              target="_blank"
            />
          </div>
          <div class="row q-gutter-x-xs no-wrap">
            <div @click="copyText(contract.metadata.longAddress)" v-ripple style="position:relative;" class="text-body2">
              Long: {{ ellipsisText(contract.metadata.longAddress) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/address/' + contract.metadata.longAddress"
              target="_blank"
            />
          </div>
        </div>

        <div v-if="!settled">
          <div class="text-grey text-subtitle1">Duration</div>
          <div class="row q-gutter-x-sm">
            <div class="q-space">{{ formatTimestampToText(contract.parameters.startTimestamp * 1000) }}</div>
            <div>{{ formatTimestampToText(contract.parameters.maturityTimestamp * 1000) }}</div>
          </div>
        </div>

        <div v-if="settled">
          <div class="text-grey text-subtitle1">Settlement</div>

          <div class="text-body2">
            Settlement type: {{ settlementMetadata.settlementTypeText }}
            <template v-if="settlementMetadata.mutualRedemptionTypeText">
              ({{settlementMetadata.mutualRedemptionTypeText}})
            </template>
          </div>
          <div v-if="settlementMetadata.txid" class="row items-center now-wrap">
            <div @click="copyText(settlementMetadata.txid)" v-ripple style="position:relative;" class="text-body2">
              Transaction: {{ ellipsisText(settlementMetadata.txid, {start: 5, end: 10}) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/transaction/' + settlementMetadata.txid"
              target="_blank"
            />
          </div>
          <div v-else>Settlement transaction not found</div>
          <div v-if="settlementMetadata.settlementPriceValue" class="text-body2">
            Settlement Price: {{ formatUnits(settlementMetadata.settlementPriceValue, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ oracleInfo.assetCurrency }}/BCH</template>
          </div>
          <div class="row">
            <div class="col">
              <div class="text-grey-7">Hedge</div>
              <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.hedge.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(contract?.metadata?.nominalUnits, oracleInfo.assetDecimals) }} -
                {{ formatUnits(settlementMetadata.hedge.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </div>
              <div :class="`text-${resolveColor(settlementMetadata.hedge.bchChangePctg)}` + ' text-weight-medium'">
                {{ contract?.metadata?.hedgeInputSats / 10 ** 8 }} -
                {{ settlementMetadata.hedge.satoshis / 10 ** 8 }} BCH
              </div>
            </div>
            <div class="col">
              <div class="text-grey-7">Long</div>
              <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.long.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(contract?.metadata?.longInputUnits, oracleInfo.assetDecimals) }} -
                {{ formatUnits(settlementMetadata.long.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </div>
              <div :class="`text-${resolveColor(settlementMetadata.long.bchChangePctg)}` + ' text-weight-medium'">
                {{ contract?.metadata?.longInputSats / 10 ** 8 }} -
                {{ settlementMetadata.long.satoshis / 10 ** 8 }} BCH
              </div>
            </div>
          </div>
        </div>
        <div v-if="!settled && funding === 'complete'">
          <div class="text-grey text-subtitle1">Mutual Redemption</div>
          <div v-if="mutualRedemptionData.txHash" class="row items-center">
            <div @click="copyText(mutualRedemptionData.txHash)" v-ripple style="position:relative;" class="text-body1">
              Tx: {{ ellipsisText(mutualRedemptionData.txHash, {start: 5, end: 10}) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/transaction/' + mutualRedemptionData.txHash"
              target="_blank"
            />
          </div>
          <div v-if="mutualRedemptionData.exists" class="text-body1 q-gutter-y-xs">
            <div>Type: {{ mutualRedemptionData.redemptionTypeLabel }}</div>
            <div v-if="mutualRedemptionData.redemptionType === 'early_maturation'">
              Settlement price: {{ formatUnits(mutualRedemptionData.settlementPrice, oracleInfo.assetDecimals) }}
              <template v-if="oracleInfo.assetCurrency">{{ oracleInfo.assetCurrency }}/BCH</template>
            </div>
            <div class="row q-gutter-x-xs items-center">
              <div>Hedge:</div>
              <div class="row q-gutter-x-xs items-center q-space no-wrap">
                <div>{{ mutualRedemptionData.hedgeSatoshis / 10 ** 8 }} BCH</div>
                <template v-if="mutualRedemptionData.hedgeSchnorrSig">
                  <div class="q-space">
                    <q-badge color="brandblue">Signed</q-badge>
                  </div>
                  <q-btn v-if="viewAsHedge && !mutualRedemptionData.txHash" icon="more_vert" flat size="sm">
                    <q-menu
                      anchor="bottom right" self="top right"
                      :class="{ 'pt-dark': darkMode, 'text-black': !darkMode }"
                    >
                      <q-item clickable v-ripple v-close-popup @click="signMutualRedemptionConfirm('hedge')">
                        <q-item-section>
                          <q-item-label>Resubmit</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-menu>
                  </q-btn>
                </template>
                <template v-else>
                  <q-btn
                    v-if="viewAsHedge && !mutualRedemptionData.txHash"
                    no-caps label="Approve"
                    color="brandblue" padding="none sm"
                    @click="signMutualRedemptionConfirm('hedge')"
                  />
                  <q-badge v-else color="grey-7">Pending</q-badge>
                </template>
              </div>
            </div>
            <div class="row q-gutter-x-xs items-center">
              <div>Long:</div>
              <div class="row q-gutter-x-xs items-center q-space no-wrap">
                <div>{{ mutualRedemptionData.longSatoshis / 10 ** 8 }} BCH</div>
                <template v-if="mutualRedemptionData.longSchnorrSig">
                  <div class="q-space">
                    <q-badge color="brandblue">Signed</q-badge>
                  </div>
                  <q-btn v-if="viewAsLong && !mutualRedemptionData.txHash" icon="more_vert" flat size="sm">
                    <q-menu
                      anchor="bottom right" self="top right"
                      :class="{ 'pt-dark': darkMode, 'text-black': !darkMode }"
                    >
                      <q-item clickable v-ripple v-close-popup @click="signMutualRedemptionConfirm('long')">
                        <q-item-section>
                          <q-item-label>Resubmit</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-menu>
                  </q-btn>
                </template>
                <template v-else>
                  <q-btn
                    v-if="viewAsLong && !mutualRedemptionData.txHash"
                    no-caps label="Approve"
                    color="brandblue" padding="none sm"
                    @click="signMutualRedemptionConfirm('long')"
                  />
                  <q-badge v-else color="grey-7">Pending</q-badge>
                </template>
              </div>
            </div>
            <div>
              <q-btn
                v-if="!mutualRedemptionData.txHash"
                no-caps
                color="brandblue"
                label="Propose Another Redemption"
                class="full-width"
                @click="openCreateMutualRedemptionFormDialog()"
              />
            </div>
          </div>
          <q-btn
            v-else
            no-caps
            color="brandblue"
            label="Propose Mutual Redemption"
            class="full-width"
            @click="openCreateMutualRedemptionFormDialog()"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import { formatUnits, formatTimestampToText, ellipsisText, parseHedgePositionData, parseSettlementMetadata } from 'src/wallet/anyhedge/formatters';
import { calculateFundingAmounts, createFundingProposal } from 'src/wallet/anyhedge/funding'
import { signMutualEarlyMaturation, signMutualRefund, signArbitraryPayout } from 'src/wallet/anyhedge/mutual-redemption'
import { getPrivateKey } from 'src/wallet/anyhedge/utils'
import { computed, inject } from 'vue'
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import VerifyFundingProposalDialog from './VerifyFundingProposalDialog.vue'
import CreateMutualRedemptionFormDialog from './CreateMutualRedemptionFormDialog.vue'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// misc
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const $q = useQuasar()

const $copyText = inject('$copyText')
function copyText(value) {
  $copyText(value)
  $q.notify({
    color: 'blue-9',
    message: 'Copied to clipboard',
    icon: 'mdi-clipboard-check',
    timeout: 200
  })
}

const props = defineProps({
  contract: {
    type: Object,
    required: true,
  },
  viewAs: String,
  wallet: Object,
})

const viewAsHedge = computed(() => props.viewAs === 'hedge')
const viewAsLong = computed(() => props.viewAs === 'long')

const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
const oracleInfo = computed(() => {
  const oracles = store.getters['anyhedge/oracles']
  return oracles?.[props.contract?.metadata?.oraclePublicKey] || defaultOracleInfo
})

const funding = computed(() => {
  if (props.contract?.funding?.[0]?.fundingTransaction) return 'complete'
  else if (props.contract?.hedgeFundingProposal && props.contract?.longFundingProposal) return 'ready'
  else if (props.contract?.hedgeFundingProposal || props.contract?.longFundingProposal) return 'partial'

  return 'pending'
})
const settled = computed(() => props.contract?.settlement?.[0]?.spendingTransaction)
const settlementMetadata = computed(() => parseSettlementMetadata(props?.contract))

function resolveColor(changePctg) {
  if (changePctg > 0) return 'green'
  else if (changePctg < 0) return 'red'
  return 'grey-7'
}

async function getAddressesFromStore() {
  const response = { success: false, addressSet: { change: '', receiving: '', pubkey: '', index: 0 } }
  try {
    const bchWalletInfo = store.getters['global/getWallet']('bch')
    if (bchWalletInfo) {
      const { lastAddress, lastChangeAddress, lastAddressIndex } = bchWalletInfo
      if (lastAddress && lastChangeAddress && lastAddressIndex >= 0 ) {
        response.addressSet.receiving = lastAddress
        response.addressSet.change = lastChangeAddress
        response.addressSet.pubkey = await props.wallet.BCH.getPublicKey(`0/${lastAddressIndex}`)
        response.addressSet.index = lastAddressIndex
        response.success = true
      }
    }
  } catch(error) {
    console.error(error)
  }

  return response
}

async function getAddresses() {
  const response = { success: false, error: null, addressSet: { change: '', receiving: '', pubkey: '', index: 0 } }
  try {
    const getAddressesFromStoreResponse = await getAddressesFromStore()
    if (getAddressesFromStoreResponse.success) {
      response.addressSet = getAddressesFromStoreResponse.addressSet
      response.success = true
      return response
    }

    const addressIndex = 0
    let addressSet = await props.wallet.BCH.getNewAddressSet(addressIndex)
    if (!addressSet?.receiving) throw new Error('Expected receiving address')
    response.addressSet = addressSet
    response.addressSet.index = addressIndex
    response.addressSet.pubkey = await props.wallet.BCH.getPublicKey(`0/${addressIndex}`)
    response.success = true
    return response
  } catch(error) {
    response.error = error
    response.success = false
    return response
  }
}


async function fundHedgeProposal(position) {
  const dialog = $q.dialog({
    title: 'Submitting funding proposal',
    message: 'Retrieving addresses',
    progress: true, // we enable default settings
    persistent: true, // we want the user to not be able to close it
    ok: false, // we want the user to not be able to close it
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black'
  })

  const getAddressesResponse = await getAddresses()
  if (!getAddressesResponse?.success) {
    dialog.update({
      persistent: false,
      ok: true,
      progress: false,
      title: 'Error',
      message: 'Encountered error in retrieving addresses',
    })
    return
  }
  const { addressSet } = getAddressesResponse

  let fundingUtxo, signedFundingProposal
  try {
    dialog.update({ message: 'Creating funding proposal' })
    const createFundingProposalResponse = await createFundingProposal(props.contract, position, props.wallet, addressSet, 0, 'hedge')
    fundingUtxo = createFundingProposalResponse.fundingUtxo
    signedFundingProposal = createFundingProposalResponse.signedFundingProposal
  } catch(error) {
    console.error(error)
    dialog.update({
      persistent: false,
      ok: true,
      progress: false,
      title: 'Error',
      message: 'Encountered error in creating funding utxo'
    })
  }

  const data = {
    hedge_address: props.contract.address,
    position: position,
    tx_hash: fundingUtxo?.txid,
    tx_index: fundingUtxo?.vout,
    tx_value: fundingUtxo?.amount,
    pubkey: signedFundingProposal?.publicKey,
    script_sig: signedFundingProposal?.signature,
    input_tx_hashes: fundingUtxo?.dependencyTxids,
  }

  dialog.update({ message: 'Submitting funding proposal' })
  anyhedgeBackend.post('anyhedge/hedge-positions/submit_funding_proposal/', data)
    .then(response => {
      dialog.update({
        persistent: false,
        ok: true,
        progress: false,
        title: 'Success',
        message: 'Funding proposal submitted!',
      })
      parseHedgePositionData(response?.data)
        .then(contractData => Object.assign(props.contract, contractData))
      return Promise.resolve(response)
    })
    .catch(error => {
      console.error(error)
      let errorMessage = 'Error in submitting funding proposal'
      if (error?.response?.data?.hedge_address?.[0]) errorMessage = error?.response?.data?.hedge_address?.[0]
      dialog.update({
        persistent: false,
        ok: true,
        progress: false,
        title: 'Error',
        message: errorMessage,
      })
    })
    .finally(() => {
      dialog.update({ persistent: false, ok: true, progress: false })
    })
}

async function completeFunding() {
  if (!props.contract?.address) return

  const dialog = $q.dialog({
    title: 'Completing contract funding',
    message: '',
    progress: true, // we enable default settings
    persistent: true, // we want the user to not be able to close it
    ok: false, // we want the user to not be able to close it
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black'
  })
  anyhedgeBackend.post(`anyhedge/hedge-positions/${props.contract.address}/complete_funding/`)
    .then(response => {
      if (response?.data?.address) {
        dialog.update({
          persistent: false,
          ok: true,
          progress: false,
          title: 'Success',
          message: 'Funding transaction submitted!',
        })
        parseHedgePositionData(response?.data)
          .then(contractData => Object.assign(props.contract, contractData))
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let message = 'Error in submitting funding proposal'
      if (error?.message) message = error.message
      if (error?.response?.data) {
        if (typeof error.response.data === 'string') message = error.response.data
        else if (Array.isArray(error.response.data) && error.response.data) message = error.response.data.join('<br/>')
      }

      dialog.update({
        persistent: false,
        ok: true,
        progress: false,
        html: true,
        title: 'Error in completing funding proposal',
        message: message,
      })
    })
    .finally(() => {
      dialog.update({ persistent: false, ok: true, progress: false })
    })
}

async function verifyFundingProposalUtxo(position) {
  if (position !== 'hedge' && position !== 'long') return
  const fundingProposal = position === 'hedge' ? props?.contract?.hedgeFundingProposal : props?.contract?.longFundingProposal
  $q.dialog({
    component: VerifyFundingProposalDialog,
    componentProps: { position, fundingProposal }
  })
  .onDismiss(data => {
    if (data?.spendingTx && !data?.error) {
      $q.dialog({
        message: 'Resubmit funding proposal?',
        cancel: true,
        class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
      })
        .onOk(() => fundHedgeProposal(position))
    }
  })
}

function openCreateMutualRedemptionFormDialog() {
  $q.dialog({
    component: CreateMutualRedemptionFormDialog,
    componentProps: props,
  })
}
const mutualRedemptionData = computed(() => {
  const data = {
    exists: false,
    redemptionType: 'arbitrary',
    redemptionTypeLabel: 'Arbitrary',
    hedgeSatoshis: 0,
    longSatoshis: 0,
    hedgeSchnorrSig: '',
    longSchnorrSig: '',
    txHash: '',
    settlementPrice: undefined,
  }

  if (props?.contract?.mutualRedemption) data.exists = true

  data.hedgeSatoshis = props?.contract?.mutualRedemption?.hedge_satoshis || 0
  data.longSatoshis = props?.contract?.mutualRedemption?.long_satoshis || 0
  data.txHash = props?.contract?.mutualRedemption?.tx_hash || ''
  data.settlementPrice = props?.contract?.mutualRedemption?.settlement_price || 0

  if (typeof props?.contract?.mutualRedemption?.redemption_type === 'string') {
    data.redemptionType = props.contract.mutualRedemption.redemption_type
    data.redemptionTypeLabel = (data.redemptionType.charAt(0).toUpperCase() + data.redemptionType.substring(1)).replace('_', ' ')
  }
  if (typeof props?.contract?.mutualRedemption?.hedge_schnorr_sig === 'string') {
    data.hedgeSchnorrSig = props.contract.mutualRedemption.hedge_schnorr_sig
  }

  if (typeof props?.contract?.mutualRedemption?.long_schnorr_sig === 'string') {
    data.longSchnorrSig = props.contract.mutualRedemption.long_schnorr_sig
  }
  return data
})


async function validateContractFunding() {
  if (!props?.contract?.funding?.[0]?.fundingTransaction) throw new Exception('No funding transaction found')
  const contractAddress = props?.contract?.address

  if (!contractAddress) throw new Exception('Contract address not found')
  const { data } = await anyhedgeBackend.post(`anyhedge/hedge-positions/${contractAddress}/validate_contract_funding/`)
  return data
}
async function signMutualRedemption(position) {
  const dialog = $q.dialog({
    title: 'Signing mutual redemption proposal',
    persistent: true,
    progress: true,
    html: true,
    ok: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black'
  })

  if (!props?.contract?.funding?.[0]?.fundingSatoshis) {
    try {
      dialog.update({message: 'Verifying contract funding'})
      const contractDataApi = await validateContractFunding()
      const contractData = await parseHedgePositionData(contractDataApi)
      Object.assign(props.contract, contractData)
    } catch(error) {
      console.error(error)
      let errors = ['Encountered error in validating contract funding']
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error?.response?.data
      else if (typeof error?.message === 'string') errors = [error.message]
      dialog.update({
        title: 'Mutual redemption signing error',
        message: errors.join('<br/>'),
        progress: false, persistent: false, ok: true,
      })
      return
    } finally {
      dialog.update({progress: false, persistent: false, ok: true})
    }
  }

  let privkey
  try {
    dialog.update({message: 'Retrieving private key', progress: true, persistent: true, ok: false})
    privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    if (!privkey) throw new Error('Unable to find resolve private key for contract')
  } catch(error) {
    console.error(error)
    let errors = ['Failed to retrieve private key']
    if (typeof error?.message === 'string') errors = [error.message]
    dialog.update({
      title: 'Mutual redemption signing error',
      message: errors.join('<br/>'),
      progress: false, persistent: false, ok: true,
    })
    return
  } finally {
    dialog.update({progress: false, persistent: false, ok: true})
  }

  let transactionProposal
  try{
    let signMutualPayoutResponse
    dialog.update({message: 'Signing proposal', progress: true, persistent: true, ok: false})
    switch(mutualRedemptionData.value.redemptionType) {
      case 'refund':
        signMutualPayoutResponse = await signMutualRefund(props?.contract, privkey)
        break;
      case 'early_maturation':
        signMutualPayoutResponse = await signMutualEarlyMaturation(
          props?.contract, privkey, mutualRedemptionData.value.settlementPrice)
        break;
      case 'arbitrary':
        signMutualPayoutResponse = await signArbitraryPayout(
          props?.contract, privkey, mutualRedemptionData.value.hedgeSatoshis, mutualRedemptionData.value.longSatoshis)
        break;
      default:
        throw new Error('Invalid redemption type')
    }

    if (!signMutualPayoutResponse.success) throw signMutualPayoutResponse.error
    transactionProposal = signMutualPayoutResponse.proposal
  }catch(error) {
    console.error(error)
    let errors = ['Encountered error in creating data']
    if (typeof error?.message === 'string') errors = [error.message]
    dialog.update({
      title: 'Mutual redemption signing error',
      message: errors.join('<br/>'),
      progress: false, persistent: false, ok: true,
    })
    return
  } finally {
    dialog.update({progress: false, persistent: false, ok: true})
  }

  if (!transactionProposal) {
    dialog.update({
      title: 'Mutual redemption signing error',
      message: 'Unresolved transaction proposal',
      progress: false, persistent: false, ok: true
    })
    return
  }

  const hedgeAddress = props?.contract?.metadata?.hedgeAddress
  const longAddress = props?.contract?.metadata?.longAddress
  const signedHedgeSats = transactionProposal?.outputs?.find(output => output?.to === hedgeAddress)?.amount
  const signedLongSats = transactionProposal?.outputs?.find(output => output?.to === longAddress)?.amount

  if (signedHedgeSats !== mutualRedemptionData.value.hedgeSatoshis) {
    dialog.update({
      title: 'Mutual redemption signing error',
      message: `Invalid hedge satoshis, expected ${signedHedgeSats}`,
      progress: false, persistent: false, ok: true
    })
    return
  }

  if (signedLongSats !== mutualRedemptionData.value.longSatoshis) {
    dialog.update({
      title: 'Mutual redemption signing error',
      message: `Invalid hedge satoshis, expected ${signedLongSats}`,
      progress: false, persistent: false, ok: true,
    })
    return
  }

  const hedgeSchnorrSig = transactionProposal?.redemptionDataList?.find(e => e['hedge_key.schnorr_signature.all_outputs'])?.['hedge_key.schnorr_signature.all_outputs']
  const longSchnorrSig = transactionProposal?.redemptionDataList?.find(e => e['long_key.schnorr_signature.all_outputs'])?.['long_key.schnorr_signature.all_outputs']
  const data = {
    redemption_type: mutualRedemptionData.value.redemptionType,
    hedge_satoshis: mutualRedemptionData.value.hedgeSatoshis,
    long_satoshis: mutualRedemptionData.value.longSatoshis,
    hedge_schnorr_sig: hedgeSchnorrSig || undefined,
    long_schnorr_sig: longSchnorrSig || undefined,
    settlement_price: undefined,
  }

  if (data.redemption_type === 'early_maturation') {
    data.settlement_price = mutualRedemptionData.value.settlementPrice || undefined
  }

  dialog.update({message: 'Submitting mutual redemption', progress: true, persistent: true, ok: false})
  const contractAddress = props?.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/mutual_redemption/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        dialog.update({
          message: 'Mutual redemption submitted',
          ok: true,
          progress: false,
        })
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let errors = ['Encountered error in submitting mutual redemption']
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error.response.data
      dialog.update({
        title: 'Mutual redemption signing error',
        message: errors.join('<br/>'),
        progress: false, persistent: false, ok: true })
    })
    .finally(() => {
      dialog.update({progress: false, persistent: false, ok: true})
    })
}

function signMutualRedemptionConfirm(position) {
  const message = `Hedge payout: ${mutualRedemptionData.value.hedgeSatoshis / 10 ** 8} BCH<br/>` +
                  `Long payout: ${mutualRedemptionData.value.longSatoshis / 10 ** 8} BCH<br/>` +
                  'Are you sure?'
  $q.dialog({
    title: 'Sign mutual redemption',
    message: message,
    html: true,
    ok: true,
    cancel: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  }).onOk(() => signMutualRedemption(position))
}
</script>
