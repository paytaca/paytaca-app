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
                <q-btn v-if="viewAsHedge" no-caps label="Submit funding proposal" color="brandblue" padding="none sm"/>
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
                  <q-item clickable v-ripple v-close-popup disable>
                    <q-item-section>
                      <q-item-label>Verify Validity</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple v-close-popup disable>
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
                <q-btn v-if="viewAsLong" no-caps label="Submit funding proposal" color="brandblue" padding="none sm"/>
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
                  <q-item clickable v-ripple v-close-popup disable>
                    <q-item-section>
                      <q-item-label>Verify Validity</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple v-close-popup disable>
                    <q-item-section>
                      <q-item-label>Resubmit</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-menu>
              </q-btn>
            </div>
          </div>

          <div
            v-if="contract.hedgeFundingProposal && contract.longFundingProposal && (viewAsHedge || viewAsLong)"
            class="q-mt-sm"
          >
            <q-btn
              padding="none md"
              no-caps
              label="Complete Funding Proposal"
              color="brandblue"
              class="full-width"
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
import { formatUnits, formatTimestampToText, ellipsisText } from 'src/wallet/anyhedge/formatters';
import { computed, inject } from 'vue'
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'

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
</script>
