<template>
<div v-if="activeCard" class="full-width">
  <div class="settings-section q-mb-md">
  <div class="settings-list">
      <div class="settings-item">
        <div class="settings-item-content">
          <q-icon 
            :name="isLocked ? 'lock_open' : 'lock'" 
            :color="isLocked ? 'positive' : 'warning'"
            size="24px"
          />
          <div class="q-ml-md">
            <div 
              class="text-subtitle2"
              :class="textColor"
            >
              {{ isLocked ? 'Unlock Card' : 'Temporary Lock Card' }}
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              {{ isLocked ? 'Card is currently locked' : 'Temporarily disable all transactions' }}
            </div>
          </div>
        </div>
        <q-toggle 
          v-model="isLocked"
          color="warning"
          :disable="isLocking"
          @update:model-value="onCardLockToggle"
        />
        <!-- BACKEND: Disable toggle during API call -->
      </div>

      <q-separator color="primary" />

      <div v-if="activeCard?.hasV2Contract" class="settings-item">
        <div class="settings-item-content">
          <q-icon
            name="swap_horiz"
            :color="activeCard?.isV2Active ? 'positive' : 'primary'"
            size="24px"
          />
          <div class="q-ml-md">
            <div class="text-subtitle2" :class="textColor">
              Contract Version
            </div>
            <div
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Active: {{ activeCard?.activeContractVersion?.toUpperCase() || 'V1' }}
              <span v-if="activeCard?.isV2Active" class="text-positive"> · Token payments enabled · Locked to V2</span>
            </div>
          </div>
        </div>
        <q-btn
          v-if="!activeCard?.isV2Active"
          flat
          dense
          label="Switch to V2"
          color="primary"
          :loading="switchingVersion"
          @click="showVersionSwitchDialog = true"
        />
        <q-chip v-else dense color="positive" text-color="white" icon="lock">V2 locked</q-chip>
      </div>

      <q-dialog v-model="showVersionSwitchDialog" persistent>
        <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
          <q-card-section class="q-pa-lg">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-h6 text-weight-bold" :class="textColor">Switch Contract Version</div>
              <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showVersionSwitchDialog = false" />
            </div>
            <div class="q-mb-md" :class="textColorGrey">
              Switching to V2 will enable fungible token payments on this card. Migration is one-way and card payments stay on V2.
            </div>
            <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              No funds will be moved during this switch. Each version retains its own balance.
            </div>
          </q-card-section>
          <q-card-actions align="right" class="q-px-lg q-pb-md">
            <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="showVersionSwitchDialog = false" />
            <q-btn
              unelevated
              label="Switch to V2"
              color="primary"
              class="bg-grad text-white"
              rounded
              :loading="switchingVersion"
              @click="switchVersion"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- <div class="settings-item clickable" :class="{ 'cursor-not-allowed': hasCardBalance, 'opacity-50': hasCardBalance }" @click="handleCardReplacementToggle"> -->
      <div class="settings-item" :class="{ 'clickable': false, 'disabled-item': true }">
        <div class="settings-item-content">
          <q-icon name="autorenew" color="primary" size="24px" />
          <div class="q-ml-md">
            <div class="text-subtitle2" :class="textColor">Card Replacement</div>
            <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">Request a replacement card</div>
          </div>
        </div>
        <q-icon :name="showCardReplacement ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        <q-tooltip v-if="hasCardBalance && !showCardReplacement" anchor="top middle" self="bottom middle">Please sweep balance first before card replacement</q-tooltip>
      </div>

      <template v-if="showCardReplacement">
      <div class="q-pa-md full-width">
        <!-- PENDING: Request Under Review -->
        <div v-if="cardReplacementStatus === 'pending'" class="card-replacement-status text-center q-pa-xl">
          <q-icon name="schedule" size="80px" color="warning" class="q-mb-lg" />
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Request Under Review</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey" style="max-width: 400px; margin: 0 auto;">We're reviewing your card replacement request. This typically takes 1-2 business days. You'll receive a notification once your request is approved.</div>
          <div class="q-mt-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" label="Simulate Progress (Testing)" @click="simulateStatusProgression" class="q-mr-sm" />
          </div>
        </div>

        <!-- PROCESSING: Card Being Produced -->
        <div v-else-if="cardReplacementStatus === 'processing'" class="card-replacement-status text-center q-pa-xl">
          <q-icon name="precision_manufacturing" size="80px" color="info" class="q-mb-lg" />
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Processing Your Card</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey" style="max-width: 400px; margin: 0 auto;">We're now processing your card replacement request. Your new card is being produced and personalized. Expect to receive your card within 7-10 business days.</div>
          <div class="q-mt-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" label="Simulate Progress (Testing)" @click="simulateStatusProgression" class="q-mr-sm" />
          </div>
        </div>

        <!-- SHIPPED: Card on the Way -->
        <div v-else-if="cardReplacementStatus === 'shipped'" class="card-replacement-status text-center q-pa-xl">
          <q-icon name="local_shipping" size="80px" color="positive" class="q-mb-lg" />
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Your New Card is on the Way!</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey" style="max-width: 400px; margin: 0 auto;">Welcome your new card! Your replacement card has been shipped and is on its way to you. You should receive it within 2-3 business days. Please activate it upon arrival.</div>
          <div class="q-mt-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" label="Simulate Progress (Testing)" @click="simulateStatusProgression" class="q-mr-sm" />
          </div>
        </div>

        <!-- Default View -->
        <div v-else class="card-replacement-container text-center q-pa-lg">
          <div class="q-mb-xl">
            <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Why do you want to replace your card?</div>
            <div class="replacement-options q-gutter-sm">
              <q-btn v-for="option in replacementReasons" :key="option.value" :label="option.label" :outline="replacementReason !== option.value" :color="replacementReason === option.value ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')" :text-color="replacementReason === option.value ? 'white' : 'primary'" class="q-ma-sm" unelevated rounded :disable="hasCardBalance" @click="selectReplacementReason(option.value)" />
              <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">Please sweep all funds before replacing your card</q-tooltip>
            </div>
          </div>
          <div v-if="replacementReason">
            <q-btn label="Proceed" color="primary" class="q-px-xl" unelevated rounded @click="$router.push({ name: 'app-card', query: { replacement: 'true', reason: replacementReason } })" />
          </div>
        </div>
      </div>
      </template>

      <q-separator color="primary" />
    </div>
  </div>

  <div 
    class="settings-section q-mb-md"
  >
    <div class="settings-header q-pa-md">
      <div 
        class="text-subtitle1 text-weight-bold"
        :class="textColor"
      >
        Funds Management
      </div>
    </div>

    <q-separator color="primary" />

    <div class="settings-list">
      <div class="settings-item clickable" @click="showSweepFunds = !showSweepFunds">
        <div class="settings-item-content">
          <q-icon name="swap_horiz" color="info" size="24px" />
          <div class="q-ml-md">
            <div 
              class="text-subtitle2"
              :class="textColor"
            >
              Sweep Funds
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Transfer all funds back to wallet
            </div>
          </div>
        </div>
        <q-icon :name="showSweepFunds ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
      </div>

      <template v-if="showSweepFunds">
        <div class="q-pa-md full-width">
          <div class="text-caption q-mb-md" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
            This will transfer all funds ({{ satoshiToBch(cardBalance) || 0 }} BCH) from your card back to your wallet.
          </div>
          <div class="row justify-center">
            <q-btn
              label="Sweep Funds"
              color="info"
              class="q-px-xl"
              unelevated
              rounded
              :disable="!hasCardBalance"
              @click="showSweepFundsDialog = true"
            />
            <q-tooltip v-if="!hasCardBalance" anchor="top middle" self="bottom middle">
              No funds to sweep
            </q-tooltip>
          </div>
        </div>
      </template>
    </div>

    <q-dialog v-model="showSweepFundsDialog" persistent>
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-h6 text-weight-bold" :class="textColor">Sweep Funds</div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showSweepFundsDialog = false" />
          </div>
          <div class="q-mb-md" :class="textColorGrey">
            This will transfer all funds ({{ satoshiToBch(cardBalance) || 0 }} BCH) from your card back to your wallet.
          </div>
          <div class="text-caption text-negative">
            Are you sure you want to sweep all funds?
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-lg q-pb-md">
          <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="showSweepFundsDialog = false" />
          <q-btn unelevated label="Sweep Funds" color="primary" class="bg-grad text-white" rounded @click="handleSweepFunds" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <template v-if="showV1LegacySection">
      <q-separator color="primary" />

      <div class="settings-list">
        <div class="settings-item clickable" @click="showV1Legacy = !showV1Legacy">
          <div class="settings-item-content">
            <q-icon name="history" color="grey-7" size="24px" />
            <div class="q-ml-md">
              <div class="text-subtitle2" :class="textColor">V1 Legacy Funds</div>
              <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
                View only · {{ satoshiToBch(v1Balance) || 0 }} BCH stranded on V1
              </div>
            </div>
          </div>
          <q-icon :name="showV1Legacy ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        </div>

        <template v-if="showV1Legacy">
          <div class="q-pa-md full-width">
            <div class="row items-center q-mb-sm" style="gap: 8px;">
              <q-btn flat dense icon="refresh" color="primary" :loading="v1BalanceLoading" @click="loadV1Balance" />
              <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
                V1 does not accept new funds. Card payments stay on V2.
              </div>
            </div>
            <div v-if="v1BalanceLoading" class="flex flex-center q-pa-sm">
              <q-spinner-dots color="primary" size="28px" />
            </div>
            <div v-else class="text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              V1 balance: {{ satoshiToBch(v1Balance) || 0 }} BCH
            </div>
            <div class="row items-center justify-between q-mb-xs">
              <div class="text-caption text-weight-medium" :class="textColor">Recent V1 activity</div>
              <q-btn flat dense no-caps size="sm" color="primary" label="View all" @click="viewAllV1History" />
            </div>
            <div v-if="v1HistoryLoading" class="flex flex-center q-pa-sm">
              <q-spinner-dots color="primary" size="24px" />
            </div>
            <div v-else-if="!v1Transactions.length" class="text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              No V1 transactions
            </div>
            <q-list v-else separator dense class="q-mb-sm">
              <q-item v-for="tx in v1Transactions" :key="tx.id || tx.txid" dense class="q-px-none">
                <q-item-section avatar style="min-width: 28px;">
                  <q-icon v-if="tx.kind === 'payment'" name="north_east" color="negative" size="xs" />
                  <q-icon v-else-if="tx.kind === 'sweep'" name="swap_horiz" color="info" size="xs" />
                  <q-icon v-else name="south_west" color="positive" size="xs" />
                </q-item-section>
                <q-item-section>
                  <div class="text-caption text-weight-medium" :class="textColor">{{ v1TxTitle(tx) }}</div>
                  <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">{{ v1TxDate(tx) }}</div>
                </q-item-section>
                <q-item-section side>
                  <div class="text-caption text-weight-bold" :class="tx.direction === 'outgoing' ? 'text-negative' : 'text-positive'">
                    <span v-if="tx.direction === 'outgoing'">-</span><span v-else>+</span>{{ v1TxAmount(tx) }}
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="row justify-center">
              <q-btn
                label="Sweep V1 to V2"
                color="info"
                class="q-px-xl"
                unelevated
                rounded
                :disable="!hasV1Balance || sweepingV1"
                :loading="sweepingV1"
                @click="showSweepV1Dialog = true"
              />
              <q-tooltip v-if="!hasV1Balance" anchor="top middle" self="bottom middle">
                No V1 funds to sweep
              </q-tooltip>
            </div>
          </div>
        </template>
      </div>

      <q-dialog v-model="showSweepV1Dialog" persistent>
        <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
          <q-card-section class="q-pa-lg">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-h6 text-weight-bold" :class="textColor">Sweep V1 to V2</div>
              <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showSweepV1Dialog = false" />
            </div>
            <div class="q-mb-md" :class="textColorGrey">
              This will move {{ satoshiToBch(v1Balance) || 0 }} BCH from the retired V1 contract into your V2 contract. Funding stays on V2.
            </div>
          </q-card-section>
          <q-card-actions align="right" class="q-px-lg q-pb-md">
            <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="showSweepV1Dialog = false" />
            <q-btn unelevated label="Sweep to V2" color="primary" class="bg-grad text-white" rounded :loading="sweepingV1" @click="handleSweepV1ToV2" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>

    <template v-if="activeCard?.isV2Active">
      <q-separator color="primary" />

      <div class="settings-list">
        <div class="settings-item clickable" @click="showSweepTokens = !showSweepTokens">
          <div class="settings-item-content">
            <q-icon name="paid" color="primary" size="24px" />
            <div class="q-ml-md">
              <div class="text-subtitle2" :class="textColor">Sweep CashTokens</div>
              <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">Transfer fungible tokens back to wallet</div>
            </div>
          </div>
          <q-icon :name="showSweepTokens ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        </div>

        <template v-if="showSweepTokens">
          <div class="q-pa-md full-width">
            <div class="row items-center q-mb-sm" style="gap: 8px;">
              <q-btn flat dense icon="refresh" color="primary" :loading="ftLoading" @click="loadFtBalances" />
              <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">Sweepable fungible tokens on this card</div>
            </div>
            <div v-if="ftLoading" class="flex flex-center q-pa-md">
              <q-spinner-dots color="primary" size="32px" />
            </div>
            <div v-else-if="ftError" class="text-caption text-negative q-mb-sm">{{ ftError }}</div>
            <div v-else-if="!ftBalances.length" class="text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">No fungible tokens to sweep</div>
            <q-list v-else separator dense>
              <q-item v-for="token in ftBalances" :key="token.tokenId" clickable @click="toggleFtSelected(token.tokenId)">
                <q-item-section side>
                  <q-checkbox :model-value="ftSelected.includes(token.tokenId)" @update:model-value="toggleFtSelected(token.tokenId)" />
                </q-item-section>
                <q-item-section>
                  <div class="text-caption text-weight-medium" :class="textColor">{{ ftTokenTitle(token) }}</div>
                  <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">{{ ftTokenSubtitle(token) }} · Amount: {{ ftDisplayAmount(token) }}</div>
                  <div v-if="ftStatusMap[token.tokenId]?.txid" class="text-caption text-positive">txid: {{ ftStatusMap[token.tokenId].txid }}</div>
                  <div v-else-if="ftStatusMap[token.tokenId]?.error" class="text-caption text-negative">{{ ftStatusMap[token.tokenId].error }}</div>
                  <div v-else-if="ftStatusMap[token.tokenId]?.state === 'unknown'" class="text-caption text-warning">No confirmation received. Check balances again.</div>
                </q-item-section>
                <q-item-section side>
                  <q-spinner v-if="ftStatusMap[token.tokenId]?.state === 'loading'" color="primary" size="20px" />
                  <q-icon v-else-if="ftStatusMap[token.tokenId]?.state === 'success'" name="check_circle" color="positive" />
                  <q-btn
                    v-else-if="ftStatusMap[token.tokenId]?.state === 'error'"
                    flat
                    dense
                    round
                    icon="refresh"
                    color="primary"
                    :disable="ftSweeping"
                    @click.stop="retrySingleFt(token.tokenId)"
                  >
                    <q-tooltip>Retry sweep</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="text-caption q-mt-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              Destination (your wallet): {{ walletTokenAddress || '...' }}
            </div>
            <div class="row justify-center q-mt-sm">
              <q-btn
                label="Sweep Tokens"
                color="primary"
                class="q-px-xl bg-grad text-white"
                unelevated
                rounded
                :disable="!canSweepFt"
                :loading="ftSweeping"
                @click="sweepSelectedFt"
              />
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>

  <div 
    class="settings-section"
  >
    <div class="settings-header q-pa-md">
      <div 
        class="text-subtitle1 text-weight-bold"
        :class="textColor"
      >
        Danger Zone
      </div>
    </div>

    <q-separator color="primary" />

    <div class="settings-list">
      <!-- <div class="settings-item" :class="{ 'clickable': !hasCardBalance, 'disabled-item': hasCardBalance }" @click="showDeleteCard = !showDeleteCard"> -->
      <div class="settings-item disabled-item">
        <div class="settings-item-content">
          <!-- <q-icon name="delete" :color="hasCardBalance ? 'grey-5' : 'negative'" size="24px" /> -->
          <q-icon name="delete" color="grey-5" size="24px" />
          <div class="q-ml-md">
            <!-- <div :class="hasCardBalance ? 'text-grey-5' : 'text-subtitle2 text-negative'">Delete Card</div> -->
            <div class="text-grey-5">Delete Card</div>
            <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">Permanently remove this card</div>
          </div>
        </div>
        <q-icon :name="showDeleteCard ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
          Please sweep all funds before deleting your card
        </q-tooltip>
      </div>

      <template v-if="showDeleteCard">
        <div class="q-pa-md full-width">
          <div class="text-caption q-mb-md" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
            Are you sure you want to delete this card? This action cannot be undone.
          </div>
          <div class="text-caption text-negative q-mb-md">
            Warning: Any remaining funds will be lost.
          </div>
          <div class="row justify-center">
            <q-btn
              label="Delete Card"
              color="negative"
              class="q-px-xl"
              unelevated
              rounded
              :disable="hasCardBalance"
              @click="showDeleteCardDialog = true"
            />
            <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
              Please sweep all funds before deleting your card
            </q-tooltip>
          </div>
        </div>
      </template>
    </div>

    <q-dialog v-model="showDeleteCardDialog" persistent>
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-h6 text-weight-bold text-negative">Delete Card</div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showDeleteCardDialog = false" />
          </div>
          <div class="q-mb-md" :class="textColorGrey">
            Are you sure you want to delete this card? This action cannot be undone.
          </div>
          <div class="text-caption text-negative">
            Warning: Any remaining funds will be lost.
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-lg q-pb-md">
          <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="showDeleteCardDialog = false" />
          <q-btn unelevated label="Delete Card" color="negative" class="bg-grad text-white" rounded @click="handleDeleteCard" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>

</div>
</template>
<script>
import CardMixin from 'src/mixins/card/card-mixin';
import { CardStorage } from 'src/components/card/createCard'
import { satoshiToBch } from 'src/exchange';
import { cardLogger } from 'src/utils/debug-logger.js';
import { normalizeContractHistoryList, friendlyActivateVersionError } from 'src/services/card/card.js';

export default {
  name: 'CardSettings',
  mixins: [CardMixin],
  props: {
    activeCard: {
      type: Object,
      required: true
    },
  },
  emits: ['lock-status-changed', 'sweep-funds', 'version-changed', 'view-v1-history'],
  data() {
    return {
      isLocked: this.activeCard?.isLocked || false,
      isLocking: false,
      replacementReason: null,
      cardReplacementStatus: 'none',
      showCardReplacement: false,
      showSweepFunds: false,
      showSweepFundsDialog: false,
      showDeleteCard: false,
      showDeleteCardDialog: false,
      cardBalance: 0,
      showSweepTokens: false,
      ftBalances: [],
      ftLoading: false,
      ftError: '',
      ftSelected: [],
      ftSweeping: false,
      ftStatusMap: {},
      showVersionSwitchDialog: false,
      switchingVersion: false,
      showV1Legacy: false,
      showSweepV1Dialog: false,
      v1Balance: 0,
      v1BalanceLoading: false,
      sweepingV1: false,
      v1Transactions: [],
      v1HistoryLoading: false,
    }
  },
  computed: {
    hasCardBalance() {
      return parseFloat(this.cardBalance) > 0
    },
    showV1LegacySection() {
      return !!this.activeCard?.isV2Active && !!(this.activeCard?.hasV1Contract ?? this.activeCard?.v1Contract)
    },
    hasV1Balance() {
      return Number(this.v1Balance) > 0
    },
    walletTokenAddress() {
      try {
        return this.activeCard?.wallet?.tokenAddress?.() || ''
      } catch {
        return ''
      }
    },
    canSweepFt() {
      return !this.ftSweeping && this.ftSelected.length > 0
    },
    replacementReasons () {
      return [
        { value: 'lost', label: 'Card Lost' },
        { value: 'stolen', label: 'Card Stolen' },
        { value: 'damaged', label: 'Card Damaged' },
        { value: 'fraud', label: 'Suspected Fraud' },
        { value: 'other', label: 'Other' }
      ]
    }
  },
  mounted () {
    this.loadData()
  },
  watch: {
    showSweepTokens (open) {
      if (open) {
        if (!this.ftBalances.length && !this.ftLoading) this.loadFtBalances()
      }
    },
    showV1Legacy (open) {
      if (open && this.showV1LegacySection) this.loadV1Legacy()
    },
    'activeCard.id' () {
      this.v1Balance = 0
      this.v1Transactions = []
      if (this.showV1LegacySection) this.loadV1Legacy()
    },
  },
  methods: {
    satoshiToBch,
    async loadData() {
      this.isLocked = this.activeCard.isLocked || false;
      await this.loadCardBalance()
      this.loadCardReplacementStatus()
      if (this.showV1LegacySection) this.loadV1Legacy()
    },
    loadV1Legacy() {
      if (!this.showV1LegacySection || this.v1BalanceLoading) return
      this.loadV1Balance()
      if (!this.v1HistoryLoading) this.loadV1History()
    },
    async loadV1History() {
      if (!this.showV1LegacySection || !this.activeCard?.id) return
      if (typeof this.activeCard?.getTransactions !== 'function') return
      this.v1HistoryLoading = true
      try {
        const raw = await this.activeCard.getTransactions({ version: 'v1', page: 1, page_size: 5 })
        this.v1Transactions = normalizeContractHistoryList(raw).slice(0, 5)
      } catch (error) {
        cardLogger.error('Error refreshing V1 history:', error)
      } finally {
        this.v1HistoryLoading = false
      }
    },
    v1TxTitle(tx) {
      if (tx.kind === 'payment') return tx.merchant?.name || 'Payment'
      if (tx.kind === 'sweep') return 'Sweep'
      return 'Cash In'
    },
    v1TxAmount(tx) {
      if (tx.is_token) return `${tx.token?.amount ?? tx.amount ?? ''}`.trim()
      return `${satoshiToBch(tx.value) || 0} BCH`
    },
    v1TxDate(tx) {
      if (!tx.created_at) return ''
      try {
        return (new Date(tx.created_at)).toLocaleString()
      } catch {
        return ''
      }
    },
    viewAllV1History() {
      this.$emit('view-v1-history')
    },
    async loadV1Balance() {
      if (!this.showV1LegacySection) return
      this.v1BalanceLoading = true
      try {
        if (typeof this.activeCard?.getVersionBchBalance === 'function') {
          const balance = await this.activeCard.getVersionBchBalance('v1')
          if (balance != null) this.v1Balance = Number(balance) || 0
        }
      } catch (error) {
        cardLogger.error('Error refreshing V1 balance, keeping last known value:', error)
      } finally {
        this.v1BalanceLoading = false
      }
    },
    async handleSweepV1ToV2 () {
      if (!this.activeCard || this.sweepingV1) return
      this.sweepingV1 = true
      this.$q.loading.show({
        message: this.$t('SweepingFundsPleaseWait', {}, 'Sweeping funds, please wait...'),
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      })
      try {
        const result = await this.activeCard.sweepFromVersion('v1', 'v2', { broadcast: true })
        if (result?.success === false) throw new Error(result?.message || 'No V1 funds to sweep.')
        await this.loadV1Balance()
        await this.loadV1History().catch(() => {})
        await this.loadCardBalance()
        this.refreshCardHistory()
        this.$q.notify({
          message: `Moved V1 funds to V2 successfully`,
          color: 'positive',
          icon: 'check_circle',
          position: 'bottom'
        })
        this.$emit('sweep-funds', { swept: 'v1-to-v2' })
        this.$emit('version-changed', 'v2')
      } catch (error) {
        cardLogger.error('[CardSettings] Sweep V1 to V2 failed:', error.message || error)
        this.$q.notify({
          message: error?.message || this.$t('FailedToSweepFunds', {}, 'Failed to sweep funds. Please try again.'),
          color: 'negative',
          position: 'bottom',
          timeout: 5000
        })
      } finally {
        this.$q.loading.hide()
        this.sweepingV1 = false
        this.showSweepV1Dialog = false
      }
    },
    truncateTokenId(tokenId) {
      if (!tokenId) return 'Unknown token'
      return tokenId.length > 20 ? `${tokenId.slice(0, 12)}...${tokenId.slice(-6)}` : tokenId
    },
    ftDisplayAmount(token) {
      const raw = Number(token?.amount ?? 0)
      const decimals = parseInt(token?.decimals ?? this.ftTokenAsset(token?.tokenId)?.decimals ?? 0) || 0
      const value = raw / (10 ** decimals)
      return String(parseFloat(value.toFixed(decimals)))
    },
    ftTokenAsset(tokenId) {
      if (!tokenId) return null
      return this.$store.getters['assets/getAsset']?.(`ct/${tokenId}`)?.[0] || null
    },
    ftTokenTitle(token) {
      const asset = this.ftTokenAsset(token?.tokenId)
      return asset?.symbol || asset?.name || this.truncateTokenId(token?.tokenId)
    },
    ftTokenSubtitle(token) {
      const asset = this.ftTokenAsset(token?.tokenId)
      if (asset?.symbol && asset?.name) return asset.name
      return this.truncateTokenId(token?.tokenId)
    },
    hydrateFtMetadata() {
      this.ftBalances.forEach(token => {
        if (!token?.tokenId) return
        const exists = this.$store.getters['assets/getAsset']?.(`ct/${token.tokenId}`)?.length
        if (!exists) this.$store.dispatch('assets/getAssetMetadata', `ct/${token.tokenId}`).catch(() => {})
      })
    },
    async loadFtBalances() {
      if (!this.activeCard) return
      this.ftLoading = true
      this.ftError = ''
      try {
        this.ftBalances = await this.activeCard.fetchFtBalances() || []
        this.ftSelected = []
        this.ftStatusMap = {}
        this.hydrateFtMetadata()
      } catch (error) {
        this.ftError = error?.message || 'Failed to load token balances'
        this.ftBalances = []
      } finally {
        this.ftLoading = false
      }
    },
    toggleFtSelected(tokenId) {
      const index = this.ftSelected.indexOf(tokenId)
      if (index >= 0) this.ftSelected.splice(index, 1)
      else this.ftSelected.push(tokenId)
    },
    async sweepSingleFt(tokenId) {
      this.ftStatusMap = { ...this.ftStatusMap, [tokenId]: { state: 'loading' } }
      try {
        const result = await this.activeCard.sweepToken(tokenId)
        if (result?.success === false) {
          throw new Error(result?.message || 'Sweep failed')
        }
        if (result?.success === 'unknown') {
          this.ftStatusMap = { ...this.ftStatusMap, [tokenId]: { state: 'unknown' } }
        } else {
          this.ftStatusMap = { ...this.ftStatusMap, [tokenId]: { state: 'success', txid: result?.txid } }
        }
      } catch (error) {
        this.ftStatusMap = { ...this.ftStatusMap, [tokenId]: { state: 'error', error: error?.message || 'Sweep failed' } }
      }
    },
    async retrySingleFt(tokenId) {
      if (this.ftSweeping) return
      this.ftSweeping = true
      try {
        await this.sweepSingleFt(tokenId)
      } finally {
        this.ftSweeping = false
      }
    },
    refreshCardHistory () {
      if (!this.activeCard?.id) return
      this.$store.dispatch('card/fetchCardTransactions', { cardId: this.activeCard.id }).catch(() => {})
    },
    async sweepSelectedFt() {
      if (!this.ftSelected.length) return
      this.ftSweeping = true
      for (const tokenId of [...this.ftSelected]) {
        await this.sweepSingleFt(tokenId)
      }
      this.ftSweeping = false
      this.refreshCardHistory()
      try {
        this.ftBalances = await this.activeCard.fetchFtBalances() || []
        const remaining = new Set(this.ftBalances.map(token => token.tokenId))
        this.ftSelected = this.ftSelected.filter(tokenId => {
          if (remaining.has(tokenId)) return true
          const state = this.ftStatusMap[tokenId]?.state
          return state !== 'success'
        })
      } catch {}
      this.$emit('sweep-funds', { swept: 'tokens' })
    },
    async loadCardBalance() {
      try {
        const balance = await this.activeCard?.getBchBalance()
        if (balance != null) this.cardBalance = balance
      } catch (error) {
        cardLogger.error('Error refreshing card BCH balance, keeping last known value:', error)
      }
    },
    async onCardLockToggle(isLocked) {
      this.isLocking = true;
      try {
        await this.$store.dispatch('card/updateCardLockStatus', {
          cardId: this.activeCard?.id,
          isLocked
        });

        this.$emit('lock-status-changed', isLocked);
        this.$q.notify({
          type: 'positive',
          message: this.$t('CardLockStatusUpdated', { status: isLocked ? this.$t('Locked', {}, 'locked') : this.$t('Unlocked', {}, 'unlocked') }, `Card has been ${isLocked ? 'locked' : 'unlocked'} successfully!`)
        });
      } catch (error) {
        cardLogger.error('Failed to update card lock status:', error.message || error);
        this.isLocked = !isLocked; // Revert toggle state on error
        this.$q.notify({
          type: 'negative',
          message: this.$t('FailedToUpdateCardLock', { action: isLocked ? this.$t('Lock', {}, 'lock') : this.$t('Unlock', {}, 'unlock') }, `Failed to ${isLocked ? 'lock' : 'unlock'} the card. Please try again.`)
        });
      } finally {
        this.isLocking = false;
      }
    },
    async handleSweepFunds () {

      this.$q.loading.show({
        message: this.$t('SweepingFundsPleaseWait', {}, 'Sweeping funds, please wait...'),
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      })
      
      if (this.cardBalance <= 0) {
        this.$q.notify({
          message: this.$t('NoFundsToSweep', {}, 'No funds to sweep'),
          color: 'warning',
          position: 'bottom',
          timeout: 1500
        })
        this.showSweepFundsDialog = false
        return
      }

      await this.activeCard.sweep({ broadcast: true }).then(() => {
        this.loadCardBalance()
        this.$q.notify({
          message: `Successfully sent ${this.satoshiToBch(this.cardBalance)} BCH to your wallet`,
          color: 'positive',
          icon: 'check_circle',
          position: 'bottom'
        })
        this.refreshCardHistory()
        this.$emit('sweep-funds')
      }).catch((error) => {
        cardLogger.error('[CardSettings] Sweep funds failed:', error.message || error)
        this.$q.notify({
          message: this.$t('FailedToSweepFunds', {}, 'Failed to sweep funds. Please try again.'),
          color: 'negative',
          position: 'bottom',
          timeout: 2000
        })
      })

      this.$q.loading.hide()
      this.showSweepFundsDialog = false
    },
    handleDeleteCard () {
      if (!this.activeCard) return

      const deleted = CardStorage.deleteCard(this.activeCard.id)

      if (deleted) {
        this.$q.notify({
          message: this.$t('CardHasBeenDeleted', {}, 'Card has been deleted'),
          color: 'positive',
          icon: 'delete',
          position: 'bottom',
          timeout: 2000
        })
      }

      this.showDeleteCardDialog = false
      this.$router.push({ name: 'card-list' })
    },
    handleCardReplacementToggle () {
      if (this.hasCardBalance && !this.showCardReplacement) return
      this.showCardReplacement = !this.showCardReplacement
    },
    selectReplacementReason (reason) {
      this.replacementReason = reason
    },

    resetReplacementFlow () {
      this.replacementReason = null
      this.cardReplacementStatus = 'none'
      this.saveCardReplacementStatus()
    },

    saveCardReplacementStatus () {
      if (this.activeCard) {
        const updatedCard = CardStorage.setCardProperty(this.activeCard.id, 'cardReplacementStatus', this.cardReplacementStatus)
        if (updatedCard) {
          this.activeCard.cardReplacementStatus = updatedCard.cardReplacementStatus
        }
      }
    },

    loadCardReplacementStatus () {
      if (this.activeCard?.cardReplacementStatus) {
        this.cardReplacementStatus = this.activeCard.cardReplacementStatus
      }
    },

    simulateStatusProgression () {
      const statusFlow = { 'pending': 'processing', 'processing': 'shipped', 'shipped': 'none' }
      const nextStatus = statusFlow[this.cardReplacementStatus] || 'none'
      this.cardReplacementStatus = nextStatus
      this.saveCardReplacementStatus()
      this.$q.notify({
        message: `Status updated to: ${nextStatus}`,
        color: 'info',
        icon: 'update',
        timeout: 1500
      })
    },

    saveCardSettings() {
      // Emit event to save other card settings
      this.$emit('save-card-settings', this.activeCard);
    },

    async switchVersion () {
      if (!this.activeCard?.id) return
      if (this.activeCard.isV2Active) return
      const targetVersion = 'v2'
      this.switchingVersion = true
      try {
        await this.$store.dispatch('card/activateCardVersion', {
          cardId: this.activeCard.id,
          version: targetVersion
        })
        this.$q.notify({
          type: 'positive',
          message: this.$t('VersionSwitched', { version: targetVersion.toUpperCase() }, `Switched to ${targetVersion.toUpperCase()} successfully`),
          timeout: 3000,
        })
        this.$emit('version-changed', targetVersion)
      } catch (error) {
        cardLogger.error('Failed to switch version:', error.message || error)
        this.$q.notify({
          type: 'negative',
          message: friendlyActivateVersionError(error)
            || error?.message
            || this.$t('FailedToSwitchVersion', {}, 'Failed to switch version. Please try again.'),
          timeout: 5000,
        })
      } finally {
        this.switchingVersion = false
        this.showVersionSwitchDialog = false
      }
    }
  }
}
</script>
<style lang="scss">
  @import "src/css/app-card.scss";
</style>