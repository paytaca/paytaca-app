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

      <div class="settings-item">
        <div class="settings-item-content">
          <q-icon 
            name="notifications" 
            :color="activeCard?.isAlertsEnabled ? 'primary' : 'grey'"
            size="24px"
          />
          <div class="q-ml-md disabled-item">
            <div class="text-subtitle2" :class="textColor">Transaction Alerts</div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              Get notified for every transaction
            </div>
          </div>
        </div>
        <q-toggle
          disable
          v-model="isAlertsEnabled"
          color="primary"
          @update:model-value="onAlertsToggle"
        />
      </div>

      <q-separator color="primary" />

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
            Destination (your wallet): {{ ftDestination || '...' }}
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
import { parseFtSweepError } from 'src/services/card/card';
import { isTokenAddress } from 'src/utils/address-utils';
import { toTokenAddress } from 'src/utils/crypto';

export default {
  name: 'CardSettings',
  mixins: [CardMixin],
  props: {
    activeCard: {
      type: Object,
      required: true
    },
  },
  emits: ['lock-status-changed', 'sweep-funds'],
  data() {
    return {
      isLocked: this.activeCard?.isLocked || false,
      isAlertsEnabled: this.activeCard?.isAlertsEnabled || false,
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
      ftDestination: '',
      ftSweeping: false,
      ftStatusMap: {}
    }
  },
  computed: {
    hasCardBalance() {
      return parseFloat(this.cardBalance) > 0
    },
    ftDestinationError() {
      if (!this.ftDestination) return ''
      return this.normalizeFtDestination(this.ftDestination) ? '' : 'Enter a valid CashToken address'
    },
    canSweepFt() {
      return !this.ftSweeping && this.ftSelected.length > 0 && !!this.ftDestination && !this.ftDestinationError
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
      if (open && !this.ftBalances.length && !this.ftLoading) this.loadFtBalances()
    }
  },
  methods: {
    satoshiToBch,
    async loadData() {
      this.isLocked = this.activeCard.isLocked || false;
      this.isAlertsEnabled = this.activeCard.isAlertsEnabled || false;
      await this.loadCardBalance()
      this.loadCardReplacementStatus()
      this.setDefaultFtDestination()
    },
    setDefaultFtDestination() {
      if (this.ftDestination) return
      try {
        const addr = this.activeCard?.wallet?.tokenAddress?.()
        if (addr) this.ftDestination = addr
      } catch {}
    },
    normalizeFtDestination(address) {
      const clean = String(address || '').trim().split('?')[0].split(' ')[0]
      if (!clean) return null
      if (isTokenAddress(clean)) return clean
      try {
        return toTokenAddress(clean)
      } catch {
        return null
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
        this.setDefaultFtDestination()
        this.ftBalances = await this.activeCard.fetchFtBalances() || []
        this.ftSelected = []
        this.ftStatusMap = {}
        this.hydrateFtMetadata()
      } catch (error) {
        const { message } = parseFtSweepError(error)
        this.ftError = message || 'Failed to load token balances'
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
      const destination = this.normalizeFtDestination(this.ftDestination)
      if (!destination) return
      this.ftStatusMap = { ...this.ftStatusMap, [tokenId]: { state: 'loading' } }
      try {
        const result = await this.activeCard.sweepFungibleTokens(tokenId, destination)
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
      if (!this.normalizeFtDestination(this.ftDestination)) return
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
        cardLogger.error('Failed to update card lock status:', error);
        this.isLocked = !isLocked; // Revert toggle state on error
        this.$q.notify({
          type: 'negative',
          message: this.$t('FailedToUpdateCardLock', { action: isLocked ? this.$t('Lock', {}, 'lock') : this.$t('Unlock', {}, 'unlock') }, `Failed to ${isLocked ? 'lock' : 'unlock'} the card. Please try again.`)
        });
      } finally {
        this.isLocking = false;
      }
    },
    async onAlertsToggle(isAlertsEnabled) {
      try {
        // Call API to update alerts status
        await this.$store.dispatch('card/updateCardAlertsStatus', {
          cardId: this.activeCard.id,
          isAlertsEnabled
        });
        // Optionally show a success message
        this.$q.notify({
          type: 'positive',
          message: this.$t('TransactionAlertsUpdated', { status: isAlertsEnabled ? this.$t('Enabled', {}, 'enabled') : this.$t('Disabled', {}, 'disabled') }, `Transaction alerts have been ${isAlertsEnabled ? 'enabled' : 'disabled'} successfully!`)
        });
      } catch (error) {
        // Revert toggle state on error
        this.isAlertsEnabled = !isAlertsEnabled;
        // Show error message
        this.$q.notify({
          type: 'negative',
          message: this.$t('FailedToUpdateTransactionAlerts', {}, 'Failed to update transaction alerts. Please try again.')
        });
      }
    },
    async handleSweepFunds () {
      cardLogger.log('[CardSettings] handleSweepFunds called')
      cardLogger.log('[CardSettings] activeCard:', this.activeCard)

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
        cardLogger.error('[CardSettings] Sweep funds failed:', error)
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
      // Emit event to save other card settings like transaction alerts
      this.$emit('save-card-settings', this.activeCard);
    }
  }
}
</script>
<style lang="scss">
  @import "src/css/app-card.scss";
</style>