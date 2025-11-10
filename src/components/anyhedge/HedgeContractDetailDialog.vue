<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" seamless class="no-click-outside">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">
          <template v-if="viewAsShort && viewPositionInTitle">{{ $t('Stabilize') }}</template>
          <template v-else-if="viewAsLong && viewPositionInTitle">{{ $t('Leverage') }}</template>
          <template v-else>{{ $t('AnyHedgeContract') }}</template>
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm contract-details-container">
        <div>
          <div class="text-grey text-subtitle1">{{ $t('Address') }}</div>
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
          <div class="text-grey text-subtitle1">{{ $t('ContractValue') }}</div>
          <div class="row items-center">
            <div class="col-6">
              <div class="text-grey-7">{{ $t('Hedge') }}</div>
              <div>
                {{ formatUnits(contract.metadata.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
              </div>
              <div>
                {{ getAssetDenomination(denomination, formatUnits(contract.metadata.shortInputInSatoshis, 8)) }}
              </div>
              <div
                v-if="isFinite(shortMarketValue) && selectedMarketCurrency !== oracleInfo.assetCurrency"
                class="text-caption text-grey"
                style="margin-top:-0.25em"
              >
                {{ parseFiatCurrency(shortMarketValue, selectedMarketCurrency) }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-grey-7">{{ $t('Long') }}</div>
              <div>
                {{ formatUnits(contract.metadata.longInputInOracleUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
              </div>
              <div>
                {{ getAssetDenomination(denomination, formatUnits(contract.metadata.longInputInSatoshis, 8)) }}
              </div>
              <div
                v-if="isFinite(longMarketValue) && selectedMarketCurrency !== oracleInfo.assetCurrency"
                class="text-caption text-grey"
                style="margin-top:-0.25em"
              >
                {{ parseFiatCurrency(longMarketValue, selectedMarketCurrency) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="(!settled || contract.fundingTxHash)">
          <div class="text-grey text-subtitle1">{{ $t('Funding') }}</div>
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
              v-if="fundingMetadata.short.fees.network || fundingMetadata.short.fees.premium || fundingMetadata.short.fees.service"
              :dark-mode="darkMode"
              :label="$t('Hedge')" :data="fundingMetadata.short"
              class="q-pr-md"
            />
            <FundingAmountsPanel
              v-if="fundingMetadata.long.fees.network || fundingMetadata.long.fees.premium || fundingMetadata.long.fees.service"
              :dark-mode="darkMode"
              :label="$t('Long')" :data="fundingMetadata.long"
              class="q-pr-md"
            />
            <FundingAmountsPanel
              v-if="fundingMetadata.fees.network || fundingMetadata.fees.premium || fundingMetadata.fees.service"
              :dark-mode="darkMode"
              :label="$t('OtherFees')" :data="fundingMetadata"
              class="q-pr-md"
            />
          </div>
          <div v-else>
            <q-badge v-if="isCancelled" color="red" class="q-mr-xs">
              {{ $t('ContractCancelled') }}
              <span v-if="contract?.cancelled?.at > 0" class="q-ml-xs">
                ({{ formatDate(contract?.cancelled?.at * 1000) }})
              </span>
            </q-badge>
            <q-badge color="grey-7">
              {{ $t('NotYetFunded') }}
            </q-badge>
            <div class="row no-wrap items-center q-gutter-x-xs q-py-xs">
              <div class="col-3 text-body1">{{ $t('Hedge') }}</div>
              <template v-if="!isCancelled">
                <q-badge v-if="contract.shortFundingProposal" color="brandblue">{{ $t('Submitted') }}</q-badge>
                <template v-else>
                  <q-btn
                    v-if="viewAsShort"
                    :disable="matured"
                    no-caps
                    :label="$t('SubmitFundingProposal')"
                    color="brandblue"
                    padding="none sm"
                    @click="fundHedgeProposal('short')"
                  />
                  <q-badge v-else color="grey-7">{{ $t('NotYetSubmitted') }}</q-badge>
                </template>
              </template>
              <q-space/>
              <q-btn v-if="contract.shortFundingProposal && viewAsShort && !matured && !isCancelled" icon="more_vert" flat size="sm">
                <q-menu anchor="bottom right" self="top right" class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <q-item clickable v-ripple v-close-popup @click="verifyFundingProposalUtxo('short')">
                    <q-item-section>
                      <q-item-label>{{ $t('VerifyValidity') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple v-close-popup @click="fundHedgeProposal('short')">
                    <q-item-section>
                      <q-item-label>{{ $t('Resubmit') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-menu>
              </q-btn>
            </div>
            <FundingAmountsPanel
              :dark-mode="darkMode"
              hide-total
              total-bottom
              :data="calculatedFundingAmounts.short"
              class="q-pl-sm q-pr-md"
            />

            <div class="row items-center q-gutter-x-xs">
              <div class="col-3 text-body1">{{ $t('Long') }}</div>
              <template v-if="!isCancelled">
                <q-badge v-if="contract.longFundingProposal" color="brandblue">{{ $t('Submitted') }}</q-badge>
                <template v-else>
                  <q-btn
                    v-if="viewAsLong"
                    :disable="matured"
                    no-caps
                    :label="$t('SubmitFundingProposal')"
                    color="brandblue"
                    padding="none sm"
                    @click="fundHedgeProposal('long')"
                  />
                  <q-badge v-else color="grey-7">{{ $t('NotYetSubmitted') }}</q-badge>
                </template>
              </template>
              <q-space/>
              <q-btn v-if="contract.longFundingProposal && viewAsLong && !matured && !isCancelled" icon="more_vert" flat size="sm">
                <q-menu anchor="bottom right" self="top right" class="text-bow pt-card-2" :class="getDarkModeClass(darkMode)">
                  <q-item clickable v-ripple v-close-popup @click="verifyFundingProposalUtxo('long')">
                    <q-item-section>
                      <q-item-label>{{ $t('VerifyValidity') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple v-close-popup @click="fundHedgeProposal('long')">
                    <q-item-section>
                      <q-item-label>{{ $t('Resubmit') }}</q-item-label>
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
              :label="$t('CancelContract')"
              icon="block"
              class="full-width q-mt-sm"
              @click="cancelContractConfirm(viewAs)"
            />
          </div>

          <div
            v-if="contract.shortFundingProposal && contract.longFundingProposal && (viewAsShort || viewAsLong) && !contract?.fundingTxHash"
            class="q-mt-sm"
          >
            <q-btn
              :disable="matured"
              padding="none md"
              no-caps
              :label="$t('CompleteFundingProposal')"
              color="brandblue"
              class="full-width"
              @click="completeFunding()"
            />
          </div>
        </div>
        
        <div v-if="!settled" class="text-body1">
          <div class="text-grey text-subtitle1">{{ $t('Liquidation') }}</div>
          <div class="text-grey text-caption">{{ $t('StartPrice')}}</div>
          <div>
            {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
          </div>
          <div class="text-grey text-caption">{{ $t('LiquidationPrice') }}</div>
          <div>
            {{ formatUnits(contract.parameters.lowLiquidationPrice, oracleInfo.assetDecimals) }}
            -
            {{ formatUnits(contract.parameters.highLiquidationPrice, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
          </div>
        </div>

        <div>
          <div class="text-grey text-subtitle1">{{ $t('PayoutAddressesBig')}}</div>
          <div class="row q-gutter-x-xs no-wrap q-pr-sm">
            <div @click="copyText(contract.metadata.shortPayoutAddress)" v-ripple style="position:relative;" class="text-body2 q-space">
              {{ $t('Hedge') }}: {{ ellipsisText(contract.metadata.shortPayoutAddress) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/address/' + contract.metadata.shortPayoutAddress"
              target="_blank"
            />
          </div>
          <div class="row q-gutter-x-xs no-wrap q-pr-sm">
            <div @click="copyText(contract.metadata.longPayoutAddress)" v-ripple style="position:relative;" class="text-body2 q-space">
              {{ $t('Long') }}: {{ ellipsisText(contract.metadata.longPayoutAddress) }}
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
          <div class="text-grey text-subtitle1">{{ $t('Duration') }}</div>
          <div class="row q-gutter-x-sm">
            <div class="q-space">{{ $t('From') }}: {{ formatTimestampToText(formatUnits(contract.parameters.startTimestamp, -3)) }}</div>
            <div>{{ $t('To') }}: {{ formatTimestampToText(formatUnits(contract.parameters.maturityTimestamp, -3)) }}</div>
          </div>
          <div v-if="durationText" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="margin-top:-0.25em;">
            {{ durationText }}
          </div>
        </div>

        <div v-if="settled">
          <div class="text-grey text-subtitle1">{{ $t('Settlement') }}</div>
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
              {{ $t('Transaction') }}: {{ ellipsisText(settlementMetadata.txid, {start: 5, end: 10}) }}
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
          <div v-else>{{ $t('SettlementTransactionNotFound') }}</div>
          <div class="text-body2">
            {{ $t('SettlementType') }}: {{ $t(settlementMetadata.settlementTypeText) }}
            <template v-if="settlementMetadata.mutualRedemptionTypeText">
              ({{ $t(settlementMetadata.mutualRedemptionTypeText) }})
            </template>
          </div>
          <div v-if="settlementMetadata.settlementPriceValue" class="text-body2">
            <div class="text-grey">{{ $t('Start') }} - {{ $t('SettlementPrice') }}:</div>
            {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }} -
            {{ formatUnits(settlementMetadata.settlementPriceValue, oracleInfo.assetDecimals) }}
            <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
          </div>
          <div class="row">
            <div class="col">
              <div class="text-grey-7">{{ $t('Hedge') }}</div>
              <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.short.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(contract?.metadata?.nominalUnits, oracleInfo.assetDecimals) }} -
                {{ formatUnits(settlementMetadata.short.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </div>
              <div :class="`text-${resolveColor(settlementMetadata.short.bchChangePctg)}` + ' text-weight-medium'">
                {{ parseFloat(getAssetDenomination(denomination, formatUnits(contract?.metadata?.shortInputInSatoshis, 8))) }} -
                {{ getAssetDenomination(denomination, formatUnits(settlementMetadata.short.satoshis, 8)) }}
              </div>
            </div>
            <div class="col">
              <div class="text-grey-7">{{ $t('Long') }}</div>
              <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.long.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(contract?.metadata?.longInputInOracleUnits, oracleInfo.assetDecimals) }} -
                {{ formatUnits(settlementMetadata.long.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </div>
              <div :class="`text-${resolveColor(settlementMetadata.long.bchChangePctg)}` + ' text-weight-medium'">
                {{ parseFloat(getAssetDenomination(denomination, formatUnits(contract?.metadata?.longInputInSatoshis, 8))) }} -
                {{ getAssetDenomination(denomination, formatUnits(settlementMetadata.long.satoshis, 8)) }}
              </div>
            </div>
          </div>
          <div v-if="settled && summaryDataAvailable">
            <div class="text-grey text-subtitle1">{{ $t('Summary') }}</div>
            <div v-if="settlementMetadata.settlementType === 'mutual'">
              <template v-if="viewAs === 'short'">
                {{ settlementMetadata.summary.short.actualSatsChange < 0 ? $t('YouLost') : $t('YouGained') }}
                <span :class="`text-${resolveColor(settlementMetadata.summary.short.actualSatsChange)}` + ' text-weight-medium'">
                  {{ getAssetDenomination(denomination, formatUnits(settlementMetadata.summary.short.actualSatsChange, 8)) }}
                </span>.
              </template>
              <template v-else-if="viewAs === 'long'">
                {{ settlementMetadata.summary.long.actualSatsChange < 0 ? $t('YouLost') : $t('YouGained') }}
                <span :class="`text-${resolveColor(settlementMetadata.summary.long.actualSatsChange)}` + ' text-weight-medium'">
                  {{ getAssetDenomination(denomination, formatUnits(settlementMetadata.summary.long.actualSatsChange, 8)) }}
                </span>.
              </template>
            </div>
            <div v-else-if="viewAs === 'short'">
              <template v-if="settlementMetadata.summary.short.assetChangePctg === 0">
                {{ $t('ContractValueMaintained') }}
              </template>
              <template v-else-if="settlementMetadata.summary.short.assetChangePctg < 0">
                {{ $t('ContractValueDroppedTo') }}
              </template>
              <template v-else-if="settlementMetadata.summary.assetChangePctg > 0">
                {{ $t('ContractValueRoseTo') }}
              </template>
              {{  }} <!-- space lol -->
              <span :class="`text-${resolveColor(settlementMetadata.summary.short.assetChangePctg)}` + ' text-weight-medium'">
                {{ formatUnits(settlementMetadata.short.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo?.assetCurrency }}
              </span>
              {{ $t('ByA') }}
              <span :class="`text-${resolveColor(settlementMetadata.summary.short.actualSatsChange)}` + ' text-weight-medium'">
                {{ getAssetDenomination(denomination, formatUnits(settlementMetadata.summary.short.actualSatsChange, 8)) }}
              </span>
              {{ settlementMetadata.summary.short.actualSatsChange < 0 ? $t('Loss') : $t('Gain') }}.
            </div>
            <div v-else-if="viewAs === 'long'">
              {{ settlementMetadata.summary.long.actualSatsChange < 0 ? $t('YouLost') : $t('YouGained') }}
              <span :class="`text-${resolveColor(settlementMetadata.summary.long.actualSatsChange)}` + ' text-weight-medium'">
                {{ getAssetDenomination(denomination, formatUnits(settlementMetadata.summary.long.actualSatsChange, 8)) }}
              </span>.
            </div>
          </div>
        </div>
        <div v-if="!settled && funding === 'complete' && (mutualRedemptionAllowed || mutualRedemptionData.exists || mutualRedemptionData.txHash)">
          <div class="text-grey text-subtitle1">{{ $t('MutualRedemption') }}</div>
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
            <div>{{ $t('Type') }}: {{ $t(mutualRedemptionData.redemptionTypeLabel)}}</div>
            <div v-if="mutualRedemptionData.redemptionType === 'early_maturation'">
              {{ $t('SettlementPrice') }}: {{ formatUnits(mutualRedemptionData.settlementPrice, oracleInfo.assetDecimals) }}
              <template v-if="oracleInfo.assetCurrency">{{ `${oracleInfo.assetCurrency}/${denomination}` }}</template>
            </div>
            <div class="row q-gutter-x-xs items-center">
            <div>{{ $t('Hedge') }}:</div>
              <div class="row q-gutter-x-xs items-center q-space no-wrap">
                <div>{{ getAssetDenomination(denomination, formatUnits(mutualRedemptionData.shortSatoshis, 8)) }}</div>
                <div class="q-space">
                  <q-badge v-if="mutualRedemptionData.shortSchnorrSig" color="brandblue">{{ $t('Signed') }}</q-badge>
                  <q-badge v-else color="grey-7">{{ $t('Pending') }}</q-badge>
                </div>
                <q-btn v-if="viewAsShort && !mutualRedemptionData.txHash" icon="more_vert" flat size="sm">
                  <q-menu anchor="bottom right" self="top right" class="text-bow pt-card-2" :class="getDarkModeClass(darkMode)">
                    <q-item clickable v-ripple v-close-popup @click="signMutualRedemptionConfirm('short')">
                      <q-item-section>
                        <q-item-label>
                          {{ mutualRedemptionData.shortSchnorrSig ? $t('Resubmit') : $t('Accept')  }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item clickable v-ripple v-close-popup @click="cancelMutualRedemptionConfirm('short')">
                      <q-item-section>
                        <q-item-label>{{ mutualRedemptionData.shortSchnorrSig ? $t('Cancel') : $t('Decline') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-menu>
                </q-btn>
              </div>
            </div>
            <div class="row q-gutter-x-xs items-center">
              <div>{{ $t('Long') }}:</div>
              <div class="row q-gutter-x-xs items-center q-space no-wrap">
                <div>{{ getAssetDenomination(denomination, formatUnits(mutualRedemptionData.longSatoshis, 8)) }}</div>
                <div class="q-space">
                  <q-badge v-if="mutualRedemptionData.longSchnorrSig" color="brandblue">{{ $t('Signed') }}</q-badge>
                  <q-badge v-else color="grey-7">{{ $t('Pending') }}</q-badge>
                </div>
                <q-btn v-if="viewAsLong && !mutualRedemptionData.txHash" icon="more_vert" flat size="sm">
                  <q-menu anchor="bottom right" self="top right" class="text-bow pt-card-2" :class="getDarkModeClass(darkMode)">
                    <q-item clickable v-ripple v-close-popup @click="signMutualRedemptionConfirm('long')">
                      <q-item-section>
                        <q-item-label>
                          {{ mutualRedemptionData.longSchnorrSig ? $t('Resubmit') : $t('Accept')  }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item clickable v-ripple v-close-popup @click="cancelMutualRedemptionConfirm('long')">
                      <q-item-section>
                        <q-item-label>{{ mutualRedemptionData.longSchnorrSig ? $t('Cancel') : $t('Decline') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-menu>
                </q-btn>
              </div>
            </div>
            <div>
              <q-btn
                v-if="!mutualRedemptionData.txHash && (viewAsShort || viewAsLong)"
                no-caps
                color="brandblue"
                :label="$t('ProposeAnotherRedemption')"
                class="full-width"
                @click="openCreateMutualRedemptionFormDialog()"
              />
            </div>
          </div>
          <q-btn
            v-else-if="mutualRedemptionAllowed"
            no-caps
            color="brandblue"
            :label="$t('ProposeMutualRedemption')"
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
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const bchjs = new BCHJS()
const $t = useI18n().t

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
    message: $t('CopiedToClipboard'),
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

const viewAsShort = computed(() => props.viewAs === 'short')
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
const shortMarketValue = computed(() => {
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
    {label: 'Second', multiplier: 1,               max: 60 },
    {label: 'Minute', multiplier: 60,              max: 3600 },
    {label: 'Hour',   multiplier: 3600,            max: 86400 },
    {label: 'Day',    multiplier: 86400,           max: 86400 * 10 },
    {label: 'Week',   multiplier: 86400 * 7,       max: 86400 * 30 },
    {label: 'TildeMonth', multiplier: 86400 * 30,      max: 86400 * 30 * 12 },
    {label: 'Tildeyear',  multiplier: 86400 * 30 * 12, max: Infinity },
  ]
  const durationInSeconds = parseInt(props.contract?.metadata?.durationInSeconds)
  if (!isFinite(durationInSeconds) || durationInSeconds <= 0) return ''
  const unit = unitOptions.find(unit => durationInSeconds <= unit.max)
  if (!unit) return ''

  const durationValue = durationInSeconds/unit.multiplier
  let label = unit.label
  if (durationValue > 1) {
    label += 's'
  }
  label = $t(label)
  return `${durationValue} ${label}`
})

const funding = computed(() => {
  if (props.contract?.fundings?.[0]?.fundingTransactionHash) return 'complete'
  else if (props.contract?.shortFundingProposal && props.contract?.longFundingProposal) return 'ready'
  else if (props.contract?.shortFundingProposal || props.contract?.longFundingProposal) return 'partial'

  return 'pending'
})
const fundingMetadata = computed(() => {
  const data = {
    short: {
      total: parseInt(props.contract?.apiMetadata?.totalShortFundingSats) || 0,
      fees: { premium: 0, network: 0, service: 0, serviceFees: [] }
    },
    long: {
      total: parseInt(props.contract?.apiMetadata?.totalLongFundingSats) || 0,
      fees: { premium: 0, network: 0, service: 0, serviceFees: [] }
    },
    fees: { premium: 0, premiumTaker: '', network: 0, service: 0, serviceFees: [] }
  }

  const apiMetadata = props.contract?.apiMetadata
  let takerFees, makerFees
  if (apiMetadata?.positionTaker === 'short') {
    takerFees = data.short
    makerFees = data.long
  } else if(apiMetadata?.positionTaker === 'long') {
    takerFees = data.long
    makerFees = data.short
  } else {
    takerFees = data.fees
  }

  takerFees.fees.network = parseInt(apiMetadata?.networkFee) || 0
  if (Array.isArray(props.contract?.fees)) {
    takerFees.fees.serviceFees = props.contract?.fees.filter(fee=> fee?.address && fee?.satoshis)
    takerFees.fees.serviceFees.forEach(fee => fee.satoshis = parseInt(fee.satoshis))
    takerFees.fees.service = props.contract.fees
      .map(fee => parseInt(fee?.satoshis))
      .filter(satoshis => !isNaN(satoshis))
      .reduce((subtotal, satoshis) => subtotal+satoshis, 0)
  }
  if (apiMetadata?.liquidityFee) {
    takerFees.fees.premium = parseInt(apiMetadata.liquidityFee)
    if (makerFees) {
      makerFees.fees.premium = takerFees.fees.premium * -1
    } else {
      takerFees.premiumTaker = apiMetadata?.positionTaker
    }
  }
  return data
})

const calculatedFundingAmounts = computed(() => {
  return calculateContractFundingWithFees({
    contractData: props.contract,
    position: props.contract?.apiMetadata?.positionTaker,
    liquidityFee: parseInt(props.contract?.apiMetadata?.liquidityFee),
  })
})
const matured = computed(() => Date.now()/1000 >= props.contract?.parameters?.maturityTimestamp)
const settled = computed(() => props.contract?.fundings?.map(funding => funding?.settlement?.settlementTransactionHash).find(Boolean))
const summaryDataAvailable = computed(() => {
  if (props.viewAs === 'short' && settlementMetadata.value.summary.short) return true
  if (props.viewAs === 'long' && settlementMetadata.value.summary.long) return true
  return false
})
const settlementMetadata = computed(() => parseSettlementMetadata(props?.contract))

function resolveColor(changePctg) {
  if (changePctg > 0) return 'green'
  else if (changePctg < 0) return 'red'
  return 'grey-7'
}

/**
 * Gets addresses from the current wallet using the latest address index
 * Generates dynamically to avoid address mixup issues in multi-wallet scenarios
 */
async function getAddresses() {
  const response = { success: false, error: null, addressSet: { change: '', receiving: '', pubkey: '', index: 0 } }
  try {
    // Get the current address index from store
    const lastAddressIndex = store.getters['global/getLastAddressIndex']('bch')
    
    // Generate addresses dynamically using the wallet's methods
    const addressIndex = lastAddressIndex >= 0 ? lastAddressIndex : 0
    const result = await props.wallet.BCH.getNewAddressSet(addressIndex)
    const addressSet = result.addresses
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
    title: $t('SubmittingFundingProposal'),
    message: $t('RetrievingAddresses'),
    progress: true, // we enable default settings
    persistent: true, // we want the user to not be able to close it
    seamless: true,
    ok: false, // we want the user to not be able to close it
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })

  const getAddressesResponse = await getAddresses()
  if (!getAddressesResponse?.success) {
    dialog.update({
      persistent: false,
      ok: { label: $t('OK') },
      progress: false,
      title: 'Error',
      message: $t('RetrievingAddressesError')
    })
    return
  }
  const { addressSet } = getAddressesResponse

  try {
    dialog.update({ message: $t('CalculatingFundingAmount') })
    const { short, long } = calculateFundingAmounts(props.contract, positionTaker, 0)
    let amount
    if (position === 'short') amount = Math.round(parseInt(short))/10**8
    else if (position === 'long') amount = Math.round(parseInt(long)) / 10 ** 8
    const dialogTitle = `Fund ${position} position`
    await dialogPromise({
      title: $t(dialogTitle),
      message: `${$t('PreparingUTXOAmount')} ${amount} BCH`,
      cancel: { label: $t('Cancel') },
      color: 'brandblue',
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
    })
    await dialogPromise({component: SecurityCheckDialog})
  } catch(error) {
    console.error(error)
    dialog.update({ message: $t('UserRejected') })
  
    return
  } finally {
    dialog.update({ persistent: false, ok: true, progress: false })
  }

  let fundingUtxo, signedFundingProposal
  try {
    dialog.update({ persistent: true, ok: false, progress: true })
    dialog.update({ message: $t('CreatingFundingProposal') })
    const createFundingProposalResponse = await createFundingProposal(
      props.contract, position, props.wallet, addressSet, 0, positionTaker,
    )
    fundingUtxo = createFundingProposalResponse.fundingUtxo
    signedFundingProposal = createFundingProposalResponse.signedFundingProposal
  } catch(error) {
    console.error(error)
    dialog.update({
      persistent: false,
      ok: { label: $t('OK') },
      progress: false,
      title: 'Error',
      message: $t('CreatingFundingUTXOError')
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

  dialog.update({ message: $t('SubmittingFundingProposal') })
  anyhedgeBackend.post('anyhedge/hedge-positions/submit_funding_proposal/', data)
    .then(response => {
      dialog.update({
        persistent: false,
        ok: { label: $t('OK') },
        progress: false,
        title: 'Success',
        message: $t('FundingProposalSubmitted')
      })
      parseHedgePositionData(response?.data)
        .then(contractData => Object.assign(props.contract, contractData))
      return Promise.resolve(response)
    })
    .catch(error => {
      console.error(error)
      let errorMessage = $t('SubmittingFundingProposalError')
      if (error?.response?.data?.hedge_address?.[0]) errorMessage = error?.response?.data?.hedge_address?.[0]
      dialog.update({
        persistent: false,
        ok: { label: $t('OK') },
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
    title: $t('CompletingContractFunding'),
    message: '',
    progress: true, // we enable default settings
    seamless: true,
    persistent: true, // we want the user to not be able to close it
    ok: false, // we want the user to not be able to close it
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  anyhedgeBackend.post(`anyhedge/hedge-positions/${props.contract.address}/complete_funding/`)
    .then(response => {
      if (response?.data?.address) {
        dialog.update({
          persistent: false,
          ok: { label: $t('OK') },
          progress: false,
          title: 'Success',
          message: $t('FundingTransactionSubmitted')
        })
        parseHedgePositionData(response?.data)
          .then(contractData => Object.assign(props.contract, contractData))
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let message = $t('SubmittingFundingProposalError')
      if (error?.message) message = error.message
      if (error?.response?.data) {
        if (typeof error.response.data === 'string') message = error.response.data
        else if (Array.isArray(error.response.data) && error.response.data) message = error.response.data.join('<br/>')
      }

      dialog.update({
        persistent: false,
        ok: { label: $t('OK') },
        progress: false,
        html: true,
        title: $t('CompletingFundingProposalError'),
        message: message,
      })
    })
    .finally(() => {
      dialog.update({ persistent: false, ok: true, progress: false })
    })
}

async function verifyFundingProposalUtxo(position) {
  if (position !== 'short' && position !== 'long') return
  const fundingProposal = position === 'short' ? props?.contract?.shortFundingProposal : props?.contract?.longFundingProposal
  $q.dialog({
    component: VerifyFundingProposalDialog,
    componentProps: { position, fundingProposal }
  })
  .onDismiss(data => {
    if (data?.spendingTx && !data?.error) {
      $q.dialog({
        message: $t('ResubmitProposal'),
        seamless: true,
        cancel: $t('Cancel'),
        color: 'brandblue',
        class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
      })
        .onOk(() => fundHedgeProposal(position))
    }
  })
}

const mutualRedemptionAllowed = computed(() => {
  return props.contract?.parameters?.enableMutualRedemption &&
    props.contract?.shortWalletHash &&
    props.contract?.longWalletHash && 
    (viewAsShort.value || viewAsLong.value)
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
    shortSatoshis: 0n,
    longSatoshis: 0n,
    shortSchnorrSig: '',
    longSchnorrSig: '',
    txHash: '',
    settlementPrice: undefined,
    initiator: '',
  }

  if (props?.contract?.mutualRedemption) data.exists = true

  data.initiator = props?.contract?.mutualRedemption?.initiator
  data.shortSatoshis = props?.contract?.mutualRedemption?.shortSatoshis || 0n
  data.longSatoshis = props?.contract?.mutualRedemption?.longSatoshis || 0n
  data.txHash = props?.contract?.mutualRedemption?.txHash || ''
  data.settlementPrice = props?.contract?.mutualRedemption?.settlementPrice || 0n

  if (typeof props?.contract?.mutualRedemption?.redemptionType === 'string') {
    data.redemptionType = props.contract.mutualRedemption.redemptionType
    data.redemptionTypeLabel = (data.redemptionType.charAt(0).toUpperCase() + data.redemptionType.substring(1)).replace('_', ' ')
  }
  if (typeof props?.contract?.mutualRedemption?.shortSchnorrSig === 'string') {
    data.shortSchnorrSig = props.contract.mutualRedemption.shortSchnorrSig
  }

  if (typeof props?.contract?.mutualRedemption?.longSchnorrSig === 'string') {
    data.longSchnorrSig = props.contract.mutualRedemption.longSchnorrSig
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
    title: $t('SigningMutualRedemptionProposal'),
    persistent: true,
    seamless: true,
    progress: true,
    html: true,
    ok: false,
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })

  if (!props?.contract?.funding?.[0]?.fundingSatoshis) {
    try {
      dialog.update({message: $t('VerifyingContractFunding')})
      const contractDataApi = await validateContractFunding()
      const contractData = await parseHedgePositionData(contractDataApi)
      Object.assign(props.contract, contractData)
    } catch(error) {
      console.error(error)
      let errors = [$t('ValidatingContractFundingError')]
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error?.response?.data
      else if (typeof error?.message === 'string') errors = [error.message]
      dialog.update({
        title: $t('MutualRedemptionSigningError'),
        message: errors.join('<br/>'),
        progress: false, persistent: false,
        ok: {
          label: $t('OK')
        }
      })
      return
    } finally {
      dialog.update({ progress: false, persistent: false, ok: { label: $t('OK') } })
    }
  }

  let privkey
  try {
    dialog.update({message: $t('RetrievePrivateKey'), progress: true, persistent: true, ok: false})
    privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    if (!privkey) throw new Error('Unable to find resolve private key for contract')
  } catch(error) {
    console.error(error)
    let errors = [$t('RetrievePrivateKeyError')]
    if (typeof error?.message === 'string') errors = [error.message]
    dialog.update({
      title: $t('MutualRedemptionSigningError'),
      message: errors.join('<br/>'),
      progress: false, persistent: false,
      ok: { label: $t('OK') }
    })
    return
  } finally {
    dialog.update({progress: false, persistent: false, ok: { label: $t('OK') }})
  }

  let transactionProposal
  try{
    let signMutualPayoutResponse
    dialog.update({message: $t('SigningProposal'), progress: true, persistent: true, ok: false})
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
          props?.contract, privkey, mutualRedemptionData.value.shortSatoshis, mutualRedemptionData.value.longSatoshis)
        break;
      default:
        throw new Error('Invalid redemption type')
    }

    if (!signMutualPayoutResponse.success) throw signMutualPayoutResponse.error
    transactionProposal = signMutualPayoutResponse.proposal
  }catch(error) {
    console.error(error)
    let errors = [$t('SigningProposalError')]
    if (typeof error?.message === 'string') errors = [error.message]
    dialog.update({
      title: $t('MutualRedemptionSigningError'),
      message: errors.join('<br/>'),
      progress: false, persistent: false,
      ok: { label: $t('OK') }
    })
    return
  } finally {
    dialog.update({progress: false, persistent: false, ok: { label: $t('OK') }})
  }

  if (!transactionProposal) {
    dialog.update({
      title: $t('MutualRedemptionSigningError'),
      message: $t('UnresolvedTransactionProposal'),
      progress: false, persistent: false,
      ok: { label: $t('OK') }
    })
    return
  }

  const shortPayoutAddress = props?.contract?.metadata?.shortPayoutAddress
  const longPayoutAddress = props?.contract?.metadata?.longPayoutAddress
  const signedShortSats = transactionProposal?.outputs?.find(output => output?.to === shortPayoutAddress)?.amount
  const signedLongSats = transactionProposal?.outputs?.find(output => output?.to === longPayoutAddress)?.amount

  if (signedShortSats !== mutualRedemptionData.value.shortSatoshis) {
    dialog.update({
      title: $t('MutualRedemptionSigningError'),
      message: $t(
        'InvalidHedgeSatoshis',
        { amount: signedShortSats },
        `Invalid hedge satoshis, expected ${signedShortSats}`
      ),
      progress: false,
      persistent: false,
      color: 'brandblue',
      ok: { label: $t('OK') }
    })
    return
  }

  if (signedLongSats !== mutualRedemptionData.value.longSatoshis) {
    dialog.update({
      title: $t('MutualRedemptionSigningError'),
      message: $t(
        'InvalidHedgeSatoshis',
        { amount: signedShortSats },
        `Invalid hedge satoshis, expected ${signedLongSats}`
      ),
      progress: false,
      persistent: false,
      color: 'brandblue',
      ok: { label: $t('OK') }
    })
    return
  }

  const shortSchnorrSig = transactionProposal?.redemptionDataList?.find(e => e['short_key.schnorr_signature.all_outputs'])?.['short_key.schnorr_signature.all_outputs']
  const longSchnorrSig = transactionProposal?.redemptionDataList?.find(e => e['long_key.schnorr_signature.all_outputs'])?.['long_key.schnorr_signature.all_outputs']
  const data = {
    redemption_type: mutualRedemptionData.value.redemptionType,
    short_satoshis: mutualRedemptionData.value.shortSatoshis,
    long_satoshis: mutualRedemptionData.value.longSatoshis,
    short_schnorr_sig: shortSchnorrSig || undefined,
    long_schnorr_sig: longSchnorrSig || undefined,
    settlement_price: undefined,
  }

  if (data.redemption_type === 'early_maturation') {
    data.settlement_price = mutualRedemptionData.value.settlementPrice || undefined
  }

  dialog.update({message: $t('SubmittingMutualRedemption'), progress: true, persistent: true, ok: false})
  const contractAddress = props?.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/mutual_redemption/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        dialog.update({
          message: $t('MutualRedemptionSubmitted'),
          ok: { label: $t('OK') },
          progress: false,
        })
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let errors = [$t('SubmittingMutualRedemptionError')]
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error.response.data
      dialog.update({
        title: $t('MutualRedemptionSigningError'),
        message: errors.join('<br/>'),
        progress: false,
        persistent: false,
        ok: { label: $t('OK') }
      })
    })
    .finally(() => {
      dialog.update({progress: false, persistent: false, ok: { label: $t('OK') }})
    })
}

async function signMutualRedemptionConfirm(position) {
  const message = `Short payout: ${formatUnits(mutualRedemptionData.value.shortSatoshis, 8)} BCH<br/>` +
                  `Long payout: ${formatUnits(mutualRedemptionData.value.longSatoshis, 8)} BCH<br/>` +
                  'Are you sure?'
  await dialogPromise({
    title: $t('SignMutualRedemption'),
    message: message,
    html: true,
    ok: { label: $t('OK') },
    cancel: { label: $t('Cancel') },
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  await dialogPromise({component: SecurityCheckDialog})
  signMutualRedemption(position)
}

async function cancelMutualRedemption(position) {
  const initiator = mutualRedemptionData.value.initiator
  const dialog = $q.dialog({
    title: position === initiator ? $t('CancelProposal') : $t('DeclineProposal'),
    message: $t('SigningMessage'),
    persistent: true,
    seamless: true,
    progress: true,
    html: true,
    ok: false,
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })

  let signature
  try {
    const privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    const message = initiator === 'short'
      ? mutualRedemptionData.value.shortSchnorrSig
      : mutualRedemptionData.value.longSchnorrSig
    signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, message)
  } catch(error) {
    console.error(error)
    dialog.update({ message: $t('SignMessageError') })
    return
  } finally {
    dialog.update({ persistent: false, ok: { label: $t('OK') }, progress: false })
  }


  dialog.update({
    message: (position === initiator ? $t('CancelMutualRedemptionProposal') : $t('DeclineMutualRedemptionProposal')),
    persistent: true, ok: false, progress: true
  })
  const data = { position, signature }
  const contractAddress = props.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/cancel_mutual_redemption/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        dialog.update({
          message: initiator == position ? $t('MutualRedemptionCancelled') : $t('MutualRedemptionDeclined'),
          ok: { label: $t('OK') },
          progress: false,
        })
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let errors = [$t('CancellingProposalError')]
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
    title: position === mutualRedemptionData.value.initiator ? $t('CancelProposal') : $t('DeclineProposal'),
    message: $t('AreYouSure'),
    html: true,
    ok: { label: $t('OK') },
    cancel: { label: $t('Cancel') },
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  await dialogPromise({component: SecurityCheckDialog})
  cancelMutualRedemption(position)
}

const isCancelled = computed(() => props.contract?.cancelled?.at > 0)
const canCancelContract = computed(() => {
  return !props.contract?.fundingTxHash &&
    !props.contract?.cancelled?.at &&
    (viewAsShort.value || viewAsLong.value)
})
async function cancelContract(position) {
  const dialog = $q.dialog({
    title: $t('CancelContract'),
    message: $t('CancellingContract'),
    persistent: true,
    seamless: true,
    progress: true,
    html: true,
    ok: false,
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })

  const data = {
    position: position,
    timestamp: Math.floor(Date.now()/ 1000),
    signature: undefined,
  }

  try {
    dialog.update({ message: $t('SigningRequest') })
    const privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    const message = `${data.timestamp}:${props.contract?.address}`
    data.signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, message)
  } catch(error) {
    console.error(error)
    dialog.update({ message: $t('SigningMessageError') })
    return
  } finally {
    dialog.update({ persistent: false, ok: { label: $t('OK') }, progress: false })
  }

  dialog.update({
    message: $t('CancellingContract'),
    persistent: true, ok: false, progress: true
  })
  const contractAddress = props.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/cancel/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        dialog.update({
          message: $t('ContractCancelled'),
          ok: { label: $t('OK') },
          progress: false,
        })
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      let errors = [$t('CancellingContractError')]
      if (typeof error?.response?.data === 'string') errors = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors = error.response.data
      else if (Array.isArray(error?.response?.data?.non_field_errors)) errors = error?.response?.data?.non_field_errors
      dialog.update({ message: errors.join('<br/>') })
    })
    .finally(() => {
      dialog.update({progress: false, persistent: false, ok: { label: $t('OK') }})
    })
}

async function cancelContractConfirm(position) {
  await dialogPromise({
    title: $t('CancelContract'),
    message: $t('AreYouSure'),
    html: true,
    ok: { label: $t('OK') },
    cancel: { label: $t('Cancel') },
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  await dialogPromise({component: SecurityCheckDialog})
  cancelContract(position)
}
</script>

<style lang="scss" scoped>
  .contract-details-container {
    max-height:calc(95vh - 10rem);
    overflow:auto;
  }
</style>