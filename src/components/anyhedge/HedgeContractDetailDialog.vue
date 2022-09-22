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

        <div v-if="!settled">
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
          <div class="text-body2">
            Settlement Price: {{ formatUnits(settlementMetadata.priceValue, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ oracleInfo.assetCurrency }}/BCH</template>
          </div>
          <div class="row">
            <div class="col">
              <div class="text-grey-7">Hedge</div>
              <div :class="`text-${resolveColor(settlementMetadata.hedge.assetChangePctg)}` + ' text-weight-medium'">
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
              <div :class="`text-${resolveColor(settlementMetadata.long.assetChangePctg)}` + ' text-weight-medium'">
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
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import { formatUnits, formatTimestampToText, ellipsisText, parseHedgePositionData } from 'src/wallet/anyhedge/formatters';
import { calculateFundingAmounts, createFundingProposal } from 'src/wallet/anyhedge/funding'
import { computed, inject } from 'vue'
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import VerifyFundingProposalDialog from './VerifyFundingProposalDialog.vue'

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

const settled = computed(() => props.contract?.settlement?.[0]?.spendingTransaction)
const settlementMetadata = computed(() => {
  const data = {
    priceValue: 0,
    txid: '',
    hedge: { nominalUnits: 0, satoshis: 0, assetChangePctg: 0, bchChangePctg: 0 },
    long: { nominalUnits: 0, satoshis: 0, assetChangePctg: 0, bchChangePctg: 0 }
  }

  const settlement = props.contract?.settlement?.[0]
  if (settlement?.hedgeSatoshis >= 0 && settlement?.longSatoshis >= 0 && settlement?.settlementPrice) {
    data.txid = settlement?.spendingTransaction || ''
    const { hedgeSatoshis, longSatoshis } = settlement
    const hedgeUnits = (hedgeSatoshis * settlement.settlementPrice) / 10 ** 8
    const longUnits = (longSatoshis * settlement.settlementPrice) / 10 ** 8

    data.hedge.nominalUnits = hedgeUnits
    data.hedge.satoshis = hedgeSatoshis
    data.long.nominalUnits = longUnits
    data.long.satoshis = longSatoshis

    data.hedge.assetChangePctg = Math.round((hedgeUnits / props.contract?.metadata?.nominalUnits) * 10000)
    data.hedge.bchChangePctg = Math.round((hedgeSatoshis / props.contract?.metadata?.hedgeInputSats) * 10000)
    data.long.assetChangePctg = Math.round((longUnits / props.contract?.metadata?.longInputUnits) * 10000)
    data.long.bchChangePctg = Math.round((longSatoshis / props.contract?.metadata?.longInputSats) * 10000)

    data.hedge.assetChangePctg = -(10000 - data.hedge.assetChangePctg) / 100
    data.hedge.bchChangePctg = -(10000 - data.hedge.bchChangePctg) / 100
    data.long.assetChangePctg = -(10000 - data.long.assetChangePctg) / 100
    data.long.bchChangePctg = -(10000 - data.long.bchChangePctg) / 100

    data.priceValue = settlement?.settlementPrice
  }
  return data
})

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
</script>
