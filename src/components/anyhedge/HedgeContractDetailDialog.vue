<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :class="darkMode ? 'pt-dark info-banner' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">
          <template v-if="viewAsHedge && viewPositionInTitle">Stabilize</template>
          <template v-else-if="viewAsLong && viewPositionInTitle">Leverage</template>
          <template v-else>AnyHedge Contract</template>
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm" style="max-height:calc(95vh - 10rem);overflow:auto;">
        <div>
          <div class="text-grey text-subtitle1">Address</div>
          <div class="row q-gutter-x-xs no-wrap q-pr-sm">
            <div @click="copyText(contract.address)" v-ripple style="position:relative;" class="text-body1 q-space">
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
          <div class="text-grey text-subtitle1">Contract Value</div>
          <div class="row items-center">
            <div class="col-6">
              <div class="text-grey-7">Hedge</div>
              <div>
                {{ formatUnits(contract.metadata.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
              </div>
              <div>
                {{ getAssetDenomination(denomination, contract.metadata.hedgeInputInSatoshis / (10**8)) }}
              </div>
              <div
                v-if="isFinite(hedgeMarketValue) && selectedMarketCurrency !== oracleInfo.assetCurrency"
                class="text-caption text-grey"
                style="margin-top:-0.25em"
              >
                {{ hedgeMarketValue }} {{ selectedMarketCurrency }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-grey-7">Long</div>
              <div>
                {{ formatUnits(contract.metadata.longInputInOracleUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
              </div>
              <div>
                {{ getAssetDenomination(denomination, contract.metadata.longInputInSatoshis / (10**8)) }}
              </div>
              <div
                v-if="isFinite(longMarketValue) && selectedMarketCurrency !== oracleInfo.assetCurrency"
                class="text-caption text-grey"
                style="margin-top:-0.25em">
                {{ longMarketValue }} {{ selectedMarketCurrency }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="(!settled || contract.fundingTxHash)">
          <div class="text-grey text-subtitle1">Funding</div>
          <div v-if="contract.fundingTxHash">
            <div class="row items-center q-pr-sm">
              <div @click="copyText(contract.fundingTxHash)" v-ripple style="position:relative;" class="text-body1 q-space">
                {{ ellipsisText(contract.fundingTxHash, {start: 10, end: 10}) }}
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
            <FundingAmountsPanel
              v-if="fundingMetadata.hedge.fees.network || fundingMetadata.hedge.fees.premium || fundingMetadata.hedge.fees.service"
              :dark-mode="darkMode"
              label="Hedge" :data="fundingMetadata.hedge"
              class="q-pr-md"
            />
            <FundingAmountsPanel
              v-if="fundingMetadata.long.fees.network || fundingMetadata.long.fees.premium || fundingMetadata.long.fees.service"
              :dark-mode="darkMode"
              label="Long" :data="fundingMetadata.long"
              class="q-pr-md"
            />
            <FundingAmountsPanel
              v-if="fundingMetadata.fees.network || fundingMetadata.fees.premium || fundingMetadata.fees.service"
              :dark-mode="darkMode"
              label="Other fees" :data="fundingMetadata"
              class="q-pr-md"
            />
          </div>
          <div v-else>
            <q-badge v-if="isCancelled" color="red" class="q-mr-xs">
              Contract cancelled
              <span v-if="contract?.cancelled?.at > 0" class="q-ml-xs">
                ({{ formatDate(contract?.cancelled?.at * 1000) }})
              </span>
            </q-badge>
            <q-badge color="grey-7">
              Not yet funded
            </q-badge>
            <div class="row no-wrap items-center q-gutter-x-xs q-py-xs">
              <div class="col-3 text-body1">Hedge</div>
              <template v-if="!isCancelled">
                <q-badge v-if="contract.hedgeFundingProposal" color="brandblue">Submitted</q-badge>
                <template v-else>
                  <q-btn
                    v-if="viewAsHedge"
                    :disable="matured"
                    no-caps
                    label="Submit funding proposal"
                    color="brandblue"
                    padding="none sm"
                    @click="fundHedgeProposal('hedge')"
                  />
                  <q-badge v-else color="grey-7">Not yet submitted</q-badge>
                </template>
              </template>
              <q-space/>
              <q-btn v-if="contract.hedgeFundingProposal && viewAsHedge && !matured && !isCancelled" icon="more_vert" flat size="sm">
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
            <FundingAmountsPanel
              :dark-mode="darkMode"
              hide-total
              total-bottom
              :data="calculatedFundingAmounts.hedge"
              class="q-pl-sm q-pr-md"
            />

            <div class="row items-center q-gutter-x-xs">
              <div class="col-3 text-body1">Long</div>
              <template v-if="!isCancelled">
                <q-badge v-if="contract.longFundingProposal" color="brandblue">Submitted</q-badge>
                <template v-else>
                  <q-btn
                    v-if="viewAsLong"
                    :disable="matured"
                    no-caps
                    label="Submit funding proposal"
                    color="brandblue"
                    padding="none sm"
                    @click="fundHedgeProposal('long')"
                  />
                  <q-badge v-else color="grey-7">Not yet submitted</q-badge>
                </template>
              </template>
              <q-space/>
              <q-btn v-if="contract.longFundingProposal && viewAsLong && !matured && !isCancelled" icon="more_vert" flat size="sm">
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
            <FundingAmountsPanel
              :dark-mode="darkMode"
              hide-label
              total-bottom
              :data="calculatedFundingAmounts.long"
              class="q-pl-sm q-pr-md"
            />
            <q-btn
              v-if="canCancelContract"
              outline
              padding="xs sm"
              no-caps
              color="red"
              label="Cancel contract"
              icon="block"
              class="full-width q-mt-sm"
              @click="cancelContractConfirm(viewAs)"
            />
          </div>

          <div
            v-if="contract.hedgeFundingProposal && contract.longFundingProposal && (viewAsHedge || viewAsLong) && !contract?.fundingTxHash"
            class="q-mt-sm"
          >
            <q-btn
              :disable="matured"
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
          <div class="text-grey text-caption">Start Price</div>
          <div>
            {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
          </div>
          <div class="text-grey text-caption">Liquidation Price</div>
          <div>
            {{ formatUnits(contract.parameters.lowLiquidationPrice, oracleInfo.assetDecimals) }}
            -
            {{ formatUnits(contract.parameters.highLiquidationPrice, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
          </div>
        </div>

        <div>
          <div class="text-grey text-subtitle1">Payout Addresses</div>
          <div class="row q-gutter-x-xs no-wrap q-pr-sm">
            <div @click="copyText(contract.metadata.hedgePayoutAddress)" v-ripple style="position:relative;" class="text-body2 q-space">
              Hedge: {{ ellipsisText(contract.metadata.hedgePayoutAddress) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/address/' + contract.metadata.hedgePayoutAddress"
              target="_blank"
            />
          </div>
          <div class="row q-gutter-x-xs no-wrap q-pr-sm">
            <div @click="copyText(contract.metadata.longPayoutAddress)" v-ripple style="position:relative;" class="text-body2 q-space">
              Long: {{ ellipsisText(contract.metadata.longPayoutAddress) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/address/' + contract.metadata.longPayoutAddress"
              target="_blank"
            />
          </div>
        </div>

        <div v-if="!settled">
          <div class="text-grey text-subtitle1">Duration</div>
          <div class="row q-gutter-x-sm">
            <div class="q-space">From: {{ formatTimestampToText(contract.parameters.startTimestamp * 1000) }}</div>
            <div>To: {{ formatTimestampToText(contract.parameters.maturityTimestamp * 1000) }}</div>
          </div>
          <div v-if="durationText" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="margin-top:-0.25em;">
            {{ durationText }}
          </div>
        </div>

        <div v-if="settled">
          <div class="text-grey text-subtitle1">Settlement</div>
          <div
            v-if="settlementMetadata.settlementTimestamp > 0"
            class="text-caption text-grey row items-center"
            style="margin-top:-0.5em"
          >
            {{ formatTimestampToText(settlementMetadata.settlementTimestamp * 1000) }}
            <q-icon name="schedule" class="q-ml-xs"/>
          </div>
          <div v-if="settlementMetadata.txid" class="row items-center now-wrap q-pr-sm">
            <div @click="copyText(settlementMetadata.txid)" v-ripple style="position:relative;" class="text-body2 q-space">
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
          <div class="text-body2">
            Settlement type: {{ settlementMetadata.settlementTypeText }}
            <template v-if="settlementMetadata.mutualRedemptionTypeText">
              ({{settlementMetadata.mutualRedemptionTypeText}})
            </template>
          </div>
          <div v-if="settlementMetadata.settlementPriceValue" class="text-body2">
            <div class="text-grey">Start - Settlement Price:</div>
            {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }} -
            {{ formatUnits(settlementMetadata.settlementPriceValue, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
          </div>
          <div class="row">
            <div class="col">
              <div class="text-grey-7">Hedge</div>
              <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.hedge.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(contract?.metadata?.nominalUnits, oracleInfo.assetDecimals) }} -
                {{ formatUnits(settlementMetadata.hedge.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </div>
              <div :class="`text-${resolveColor(settlementMetadata.hedge.bchChangePctg)}` + ' text-weight-medium'">
                {{ parseFloat(getAssetDenomination(denomination, contract?.metadata?.hedgeInputInSatoshis / 10 ** 8)) }} -
                {{ getAssetDenomination(denomination, settlementMetadata.hedge.satoshis / 10 ** 8) }}
              </div>
            </div>
            <div class="col">
              <div class="text-grey-7">Long</div>
              <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.long.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(contract?.metadata?.longInputInOracleUnits, oracleInfo.assetDecimals) }} -
                {{ formatUnits(settlementMetadata.long.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </div>
              <div :class="`text-${resolveColor(settlementMetadata.long.bchChangePctg)}` + ' text-weight-medium'">
                {{ parseFloat(getAssetDenomination(denomination, contract?.metadata?.longInputInSatoshis / 10 ** 8)) }} -
                {{ getAssetDenomination(denomination, settlementMetadata.long.satoshis / 10 ** 8) }}
              </div>
            </div>
          </div>
          <div v-if="settled && summaryDataAvailable">
            <div class="text-grey text-subtitle1">Summary</div>
            <div v-if="settlementMetadata.settlementType === 'mutual'">
              <template v-if="viewAs === 'hedge'">
                You {{ settlementMetadata.summary.hedge.actualSatsChange < 0 ? 'lost' : 'gained' }}
                <span :class="`text-${resolveColor(settlementMetadata.summary.hedge.actualSatsChange)}` + ' text-weight-medium'">
                  {{ getAssetDenomination(denomination, settlementMetadata.summary.hedge.actualSatsChange / 10 ** 8) }}
                </span>.
              </template>
              <template v-else-if="viewAs === 'long'">
                You {{ settlementMetadata.summary.long.actualSatsChange < 0 ? 'lost' : 'gained' }}
                <span :class="`text-${resolveColor(settlementMetadata.summary.long.actualSatsChange)}` + ' text-weight-medium'">
                  {{ getAssetDenomination(denomination, settlementMetadata.summary.long.actualSatsChange / 10 ** 8) }}
                </span>.
              </template>
            </div>
            <div v-else-if="viewAs === 'hedge'">
              Contract value
              <template v-if="settlementMetadata.summary.hedge.assetChangePctg === 0">
                maintained
              </template>
              <template v-else-if="settlementMetadata.summary.hedge.assetChangePctg < 0">
                dropped to
              </template>
              <template v-else-if="settlementMetadata.summary.assetChangePctg > 0">
                rose to
              </template>
              <span :class="`text-${resolveColor(settlementMetadata.summary.hedge.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(settlementMetadata.hedge.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </span>
              by a
              <span :class="`text-${resolveColor(settlementMetadata.summary.hedge.actualSatsChange)}` + ' text-weight-medium'">
                {{ getAssetDenomination(denomination, settlementMetadata.summary.hedge.actualSatsChange / 10 ** 8) }}
              </span>
              {{ settlementMetadata.summary.hedge.actualSatsChange < 0 ? 'loss' : 'gain' }}.
            </div>
            <div v-else-if="viewAs === 'long'">
              You {{ settlementMetadata.summary.long.actualSatsChange < 0 ? 'lost' : 'gained' }}
              <span :class="`text-${resolveColor(settlementMetadata.summary.long.actualSatsChange)}` + ' text-weight-medium'">
                {{ getAssetDenomination(denomination, settlementMetadata.summary.long.actualSatsChange / 10 ** 8) }}
              </span>.
            </div>
          </div>
        </div>
        <div v-if="!settled && funding === 'complete' && (mutualRedemptionAllowed || mutualRedemptionData.exists || mutualRedemptionData.txHash)">
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
              <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
            </div>
            <div class="row q-gutter-x-xs items-center">
              <div>Hedge:</div>
              <div class="row q-gutter-x-xs items-center q-space no-wrap">
                <div>{{ getAssetDenomination(denomination, mutualRedemptionData.hedgeSatoshis / 10 ** 8) }}</div>
                <div class="q-space">
                  <q-badge v-if="mutualRedemptionData.hedgeSchnorrSig" color="brandblue">Signed</q-badge>
                  <q-badge v-else color="grey-7">Pending</q-badge>
                </div>
                <q-btn v-if="viewAsHedge && !mutualRedemptionData.txHash" icon="more_vert" flat size="sm">
                  <q-menu
                    anchor="bottom right" self="top right"
                    :class="{ 'pt-dark': darkMode, 'text-black': !darkMode }"
                  >
                    <q-item clickable v-ripple v-close-popup @click="signMutualRedemptionConfirm('hedge')">
                      <q-item-section>
                        <q-item-label>
                          {{ mutualRedemptionData.hedgeSchnorrSig ? 'Resubmit' : 'Accept'  }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item clickable v-ripple v-close-popup @click="cancelMutualRedemptionConfirm('hedge')">
                      <q-item-section>
                        <q-item-label>{{ mutualRedemptionData.hedgeSchnorrSig ? 'Cancel' : 'Decline' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-menu>
                </q-btn>
              </div>
            </div>
            <div class="row q-gutter-x-xs items-center">
              <div>Long:</div>
              <div class="row q-gutter-x-xs items-center q-space no-wrap">
                <div>{{ getAssetDenomination(denomination, mutualRedemptionData.longSatoshis / 10 ** 8) }}</div>
                <div class="q-space">
                  <q-badge v-if="mutualRedemptionData.longSchnorrSig" color="brandblue">Signed</q-badge>
                  <q-badge v-else color="grey-7">Pending</q-badge>
                </div>
                <q-btn v-if="viewAsLong && !mutualRedemptionData.txHash" icon="more_vert" flat size="sm">
                  <q-menu
                    anchor="bottom right" self="top right"
                    :class="{ 'pt-dark': darkMode, 'text-black': !darkMode }"
                  >
                    <q-item clickable v-ripple v-close-popup @click="signMutualRedemptionConfirm('long')">
                      <q-item-section>
                        <q-item-label>
                          {{ mutualRedemptionData.longSchnorrSig ? 'Resubmit' : 'Accept'  }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item clickable v-ripple v-close-popup @click="cancelMutualRedemptionConfirm('long')">
                      <q-item-section>
                        <q-item-label>{{ mutualRedemptionData.longSchnorrSig ? 'Cancel' : 'Decline' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-menu>
                </q-btn>
              </div>
            </div>
            <div>
              <q-btn
                v-if="!mutualRedemptionData.txHash && (viewAsHedge || viewAsLong)"
                no-caps
                color="brandblue"
                label="Propose Another Redemption"
                class="full-width"
                @click="openCreateMutualRedemptionFormDialog()"
              />
            </div>
          </div>
          <q-btn
            v-else-if="mutualRedemptionAllowed"
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
import BCHJS from '@psf/bch-js';
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import { formatDate, formatUnits, formatTimestampToText, ellipsisText, parseHedgePositionData, parseSettlementMetadata } from 'src/wallet/anyhedge/formatters';
import { calculateContractFundingWithFees, calculateFundingAmounts, createFundingProposal } from 'src/wallet/anyhedge/funding'
import { signMutualEarlyMaturation, signMutualRefund, signArbitraryPayout } from 'src/wallet/anyhedge/mutual-redemption'
import { getPrivateKey } from 'src/wallet/anyhedge/utils'
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import VerifyFundingProposalDialog from './VerifyFundingProposalDialog.vue'
import FundingAmountsPanel from './FundingAmountsPanel.vue'
import CreateMutualRedemptionFormDialog from './CreateMutualRedemptionFormDialog.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import { getAssetDenomination } from 'src/utils/denomination-utils'

const bchjs = new BCHJS()

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
const denomination = computed(() => store.getters['global/denomination'])
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
  viewPositionInTitle: Boolean,
  wallet: Object,
})

async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

const viewAsHedge = computed(() => props.viewAs === 'hedge')
const viewAsLong = computed(() => props.viewAs === 'long')

const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
const oracleInfo = computed(() => {
  const oracles = store.getters['anyhedge/oracles']
  return oracles?.[props.contract?.parameters?.oraclePublicKey] || defaultOracleInfo
})

const selectedMarketCurrency = computed(() => store.getters['market/selectedCurrency']?.symbol)
const oracleToSelectedAssetRate = computed(() => {
  return store.getters['market/getAssetConversion'](
    oracleInfo.value?.assetCurrency,
    selectedMarketCurrency.value,
  )
})
const hedgeMarketValue = computed(() => {
  const nominalUnits = props.contract?.metadata?.nominalUnits
  if (!isFinite(oracleToSelectedAssetRate.value)) return undefined
  if (!isFinite(nominalUnits)) return undefined

  let marketValue = (nominalUnits * oracleToSelectedAssetRate.value) / (10 ** oracleInfo.value?.assetDecimals || 0)
  marketValue = Number(marketValue.toFixed(2))
  return marketValue
})

const longMarketValue = computed(() => {
  const longInputInOracleUnits = props.contract?.metadata?.longInputInOracleUnits
  if (!isFinite(oracleToSelectedAssetRate.value)) return undefined
  if (!isFinite(longInputInOracleUnits)) return undefined

  let marketValue = (longInputInOracleUnits * oracleToSelectedAssetRate.value) / (10 ** oracleInfo.value?.assetDecimals || 0)
  marketValue = Number(marketValue.toFixed(2))
  return marketValue
})
function updateOracleMarketValue() {
  const currency = oracleInfo.value?.assetCurrency
  if (!currency) return
  store.dispatch('market/updateUsdRates', { currency, priceDataAge: 60 * 1000 }) 
}
const oracleMarketValueUpdateInterval = ref(null)
onMounted(() => {
  window.c = props.contract
  clearInterval(oracleMarketValueUpdateInterval.value)
  oracleMarketValueUpdateInterval.value = setInterval(
    () => updateOracleMarketValue(),
    60 * 1000,
  )
  updateOracleMarketValue()
})
onUnmounted(() => clearInterval(oracleMarketValueUpdateInterval.value))
watch(oracleInfo, () => updateOracleMarketValue())

const durationText = computed(() => {
  const unitOptions = [
    {label: 'second', multiplier: 1,               max: 60 },
    {label: 'minute', multiplier: 60,              max: 3600 },
    {label: 'hour',   multiplier: 3600,            max: 86400 },
    {label: 'day',    multiplier: 86400,           max: 86400 * 10 },
    {label: 'week',   multiplier: 86400 * 7,       max: 86400 * 30 },
    {label: '~month', multiplier: 86400 * 30,      max: 86400 * 30 * 12 },
    {label: '~year',  multiplier: 86400 * 30 * 12, max: Infinity },
  ]
  const durationInSeconds = props.contract?.metadata?.durationInSeconds
  if (!isFinite(durationInSeconds) || durationInSeconds <= 0) return ''
  const unit = unitOptions.find(unit => durationInSeconds <= unit.max)
  if (!unit) return ''

  const durationValue = durationInSeconds/unit.multiplier
  let label = unit.label
  if (durationValue > 1) {
    label += 's'
  }
  return `${durationValue} ${label}`
})

const funding = computed(() => {
  if (props.contract?.fundings?.[0]?.fundingTransactionHash) return 'complete'
  else if (props.contract?.hedgeFundingProposal && props.contract?.longFundingProposal) return 'ready'
  else if (props.contract?.hedgeFundingProposal || props.contract?.longFundingProposal) return 'partial'

  return 'pending'
})
const fundingMetadata = computed(() => {
  const data = {
    hedge: {
      total: props.contract?.apiMetadata?.totalHedgeFundingSats || 0,
      fees: { premium: 0, network: 0, service: 0, serviceFees: [] }
    },
    long: {
      total: props.contract?.apiMetadata?.totalLongFundingSats || 0,
      fees: { premium: 0, network: 0, service: 0, serviceFees: [] }
    },
    fees: { network: 0, service: 0, premium: 0, premiumTaker: '', serviceFees: [] }
  }

  const apiMetadata = props.contract?.apiMetadata
  if (apiMetadata?.positionTaker === 'hedge') {
    data.hedge.fees.network = apiMetadata?.networkFee || 0
    if (Array.isArray(props.contract?.fees)) {
      data.hedge.fees.serviceFees = props.contract?.fees.filter(fee=> fee?.address && fee?.satoshis)
      data.hedge.fees.service = props.contract.fees
        .map(fee => fee?.satoshis)
        .filter(satoshis => !isNaN(satoshis))
        .reduce((subtotal, satoshis) => subtotal+satoshis, 0)
    }
    if (apiMetadata?.liquidityFee) {
      data.hedge.fees.premium = apiMetadata.liquidityFee
      data.long.fees.premium = apiMetadata.liquidityFee * -1
    }
  } else if (apiMetadata?.positionTaker === 'long') {
    data.long.fees.network = apiMetadata?.networkFee || 0
    if (Array.isArray(props.contract?.fees)) {
      data.long.fees.serviceFees = props.contract?.fees.filter(fee=> fee?.address && fee?.satoshis)
      data.long.fees.service = props.contract.fees
        .map(fee => fee?.satoshis)
        .filter(satoshis => !isNaN(satoshis))
        .reduce((subtotal, satoshis) => subtotal+satoshis, 0)
    }
    if (apiMetadata?.liquidityFee) {
      data.long.fees.premium = apiMetadata.liquidityFee
      data.hedge.fees.premium = apiMetadata.liquidityFee * -1
      
    }
  } else {
    data.fees.network = apiMetadata?.networkFee || 0
    if (Array.isArray(props.contract?.fees)) {
      data.fees.serviceFees = props.contract?.fees.filter(fee=> fee?.address && fee?.satoshis)
      data.fees.service = props.contract?.fees
        .map(fee => fee?.satoshis)
        .filter(satoshis => !isNaN(satoshis))
        .reduce((subtotal, satoshis) => subtotal+satoshis, 0)
    }
    data.fees.premium = apiMetadata?.liquidityFee || 0
    data.fees.premiumTaker = apiMetadata?.positionTaker || 'unknown'
  }

  return data
})

const calculatedFundingAmounts = computed(() => {
  return calculateContractFundingWithFees({
    contractData: props.contract,
    position: props.contract?.apiMetadata?.positionTaker,
    liquidityFee: props.contract?.apiMetadata?.liquidityFee,
  })
})
const matured = computed(() => Date.now()/1000 >= props.contract?.parameters?.maturityTimestamp)
const settled = computed(() => props.contract?.settlements?.[0]?.settlementTransactionHash)
const summaryDataAvailable = computed(() => {
  if (props.viewAs === 'hedge' && settlementMetadata.value.summary.hedge) return true
  if (props.viewAs === 'long' && settlementMetadata.value.summary.long) return true
  return false
})
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
    const result = await props.wallet.BCH.getNewAddressSet(addressIndex)
    const addressSet = result.adddresses
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
  const positionTaker = props.contract.apiMetadata?.positionTaker || position
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

  try {
    dialog.update({ message: 'Calculating funding amount' })
    const { hedge, long } = calculateFundingAmounts(props.contract, positionTaker, 0)
    let amount
    if (position === 'hedge') amount = Math.round(hedge)/10**8
    else if (position === 'long') amount = Math.round(long)/10**8
    await dialogPromise({
      title: `Fund ${position} position`,
      message: `Prepare utxo amounting to ${amount} BCH`,
      cancel: true,
      class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
    })
    await dialogPromise({component: SecurityCheckDialog})
  } catch(error) {
    console.error(error)
    dialog.update({ message: 'User rejected' })
    return
  } finally {
    dialog.update({ persistent: false, ok: true, progress: false })
  }

  let fundingUtxo, signedFundingProposal
  try {
    dialog.update({ persistent: true, ok: false, progress: true })
    dialog.update({ message: 'Creating funding proposal' })
    const createFundingProposalResponse = await createFundingProposal(
      props.contract, position, props.wallet, addressSet, 0, positionTaker,
    )
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

const mutualRedemptionAllowed = computed(() => {
  return props.contract?.parameters?.enableMutualRedemption &&
    props.contract?.hedgeWalletHash &&
    props.contract?.longWalletHash && 
    (viewAsHedge.value || viewAsLong.value)
})
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
    initiator: '',
  }

  if (props?.contract?.mutualRedemption) data.exists = true

  data.initiator = props?.contract?.mutualRedemption?.initiator
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
  if (!props?.contract?.fundings?.[0]?.fundingTransactionHash) throw new Exception('No funding transaction found')
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

  const hedgePayoutAddress = props?.contract?.metadata?.hedgePayoutAddress
  const longPayoutAddress = props?.contract?.metadata?.longPayoutAddress
  const signedHedgeSats = transactionProposal?.outputs?.find(output => output?.to === hedgePayoutAddress)?.amount
  const signedLongSats = transactionProposal?.outputs?.find(output => output?.to === longPayoutAddress)?.amount

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

async function signMutualRedemptionConfirm(position) {
  const message = `Hedge payout: ${mutualRedemptionData.value.hedgeSatoshis / 10 ** 8} BCH<br/>` +
                  `Long payout: ${mutualRedemptionData.value.longSatoshis / 10 ** 8} BCH<br/>` +
                  'Are you sure?'
  await dialogPromise({
    title: 'Sign mutual redemption',
    message: message,
    html: true,
    ok: true,
    cancel: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  await dialogPromise({component: SecurityCheckDialog})
  signMutualRedemption(position)
}

async function cancelMutualRedemption(position) {
  const initiator = mutualRedemptionData.value.initiator
  const dialog = $q.dialog({
    title: position === initiator ? 'Cancel proposal' : 'Decline proposal',
    message: 'Signing message',
    persistent: true,
    progress: true,
    html: true,
    ok: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black'
  })

  let signature
  try {
    const privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    const message = initiator === 'hedge'
      ? mutualRedemptionData.value.hedgeSchnorrSig
      : mutualRedemptionData.value.longSchnorrSig
    signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, message)
  } catch(error) {
    console.error(error)
    dialog.update({ message: 'Unable to sign message' })
    return
  } finally {
    dialog.update({ persistent: false, ok: true, progress: false })
  }


  dialog.update({
    message: (position === initiator ? 'Cancelling' : 'Declining') + ' mutual redemption proposal',
    persistent: true, ok: false, progress: true
  })
  const data = { position, signature }
  const contractAddress = props.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/cancel_mutual_redemption/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        dialog.update({
          message: 'Mutual redemption ' + (initiator == position ? 'cancelled' : 'declined'),
          ok: true,
          progress: false,
        })
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let errors = ['Encountered error in cancelling proposal']
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error.response.data
      else if (Array.isArray(error?.response?.data?.non_field_errors)) errors = error?.response?.data?.non_field_errors
      dialog.update({ message: errors.join('<br/>') })
    })
    .finally(() => {
      dialog.update({progress: false, persistent: false, ok: true})
    })
}

async function cancelMutualRedemptionConfirm(position) {
  await dialogPromise({
    title: position === mutualRedemptionData.value.initiator ? 'Cancel proposal' : 'Decline proposal',
    message: 'Are you sure?',
    html: true,
    ok: true,
    cancel: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  await dialogPromise({component: SecurityCheckDialog})
  cancelMutualRedemption(position)
}

const isCancelled = computed(() => props.contract?.cancelled?.at > 0)
const canCancelContract = computed(() => {
  return !props.contract?.fundingTxHash &&
    !props.contract?.cancelled?.at &&
    (viewAsHedge.value || viewAsLong.value)
})
async function cancelContract(position) {
  const dialog = $q.dialog({
    title: 'Cancel contract',
    message: 'Cancelling contract',
    persistent: true,
    progress: true,
    html: true,
    ok: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black'
  })

  const data = {
    position: position,
    timestamp: Math.floor(Date.now()/ 1000),
    signature: undefined,
  }

  try {
    dialog.update({ message: 'Signing request' })
    const privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    const message = `${data.timestamp}:${props.contract?.address}`
    data.signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, message)
  } catch(error) {
    console.error(error)
    dialog.update({ message: 'Encountered error in signing message' })
    return
  } finally {
    dialog.update({ persistent: false, ok: true, progress: false })
  }

  dialog.update({
    message: 'Cancelling contract',
    persistent: true, ok: false, progress: true
  })
  const contractAddress = props.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/cancel/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        dialog.update({
          message: 'Contract cancelled',
          ok: true,
          progress: false,
        })
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let errors = ['Encountered error in cancelling contract']
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error.response.data
      else if (Array.isArray(error?.response?.data?.non_field_errors)) errors = error?.response?.data?.non_field_errors
      dialog.update({ message: errors.join('<br/>') })
    })
    .finally(() => {
      dialog.update({progress: false, persistent: false, ok: true})
    })
}

async function cancelContractConfirm(position) {
  await dialogPromise({
    title: 'Cancel contract',
    message: 'Are you sure?',
    html: true,
    ok: true,
    cancel: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  await dialogPromise({component: SecurityCheckDialog})
  cancelContract(position)
}
</script>
