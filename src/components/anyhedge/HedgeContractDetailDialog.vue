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

        <div>
          <div class="text-grey">Funding</div>
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
        
        <div class="text-body1">
          <div class="text-grey">Liquidation</div>
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
          <div class="text-grey">Payout Addresses</div>
          <div class="row q-gutter-x-xs no-wrap">
            <div @click="copyText(contract.metadata.hedgeAddress)" v-ripple style="position:relative;">
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
            <div @click="copyText(contract.metadata.longAddress)" v-ripple style="position:relative;">
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

        <div>
          <div class="text-grey">Duration</div>
          <div class="row q-gutter-x-sm">
            <div class="q-space">{{ formatTimestampToText(contract.parameters.startTimestamp * 1000) }}</div>
            <div>{{ formatTimestampToText(contract.parameters.maturityTimestamp * 1000) }}</div>
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
</script>
