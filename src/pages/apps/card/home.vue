<template>
  <q-page class="column items-center q-px-md q-pb-md scroll" style="padding-top: 0; height: 100%;">
    <!-- Skeleton Loading -->
    <div v-if="!isloaded" class="column items-center full-width" style="max-width: 650px;">
      <div class="full-width q-mb-lg">
        <q-skeleton type="text" width="120px" height="28px" class="q-mx-auto q-mb-md" />
        <div class="row justify-center q-gutter-sm">
          <q-skeleton type="QBtn" class="skeleton-toggle" />
          <q-skeleton type="QBtn" class="skeleton-toggle" />
        </div>
      </div>
      <q-skeleton type="rect" width="100%" height="400px" class="skeleton-card" />
    </div>

    <div v-else class="column items-center full-width" style="max-width: 650px;">
      <!-- WELCOME STATE (0 cards) -->
      <transition v-if="wizardStep === 'welcome'" name="fade-slide" mode="out-in">
        <div key="welcome" class="full-width column items-center text-center q-pt-xl">
          <div class="link-icon-ring q-mb-lg">
            <div class="link-icon-inner">
              <q-icon name="credit_card" size="32px" color="primary" />
            </div>
          </div>
          <div class="text-h4 text-weight-bold q-mb-sm" :class="textColor">
            {{ $t("Let's set up your Paytaca Card") }}
          </div>
          <div class="text-body2 q-mb-xl" style="max-width: 360px;" :class="textColorGrey">
            {{ $t('Create a card to start using Paytaca. You can order a delivered card anytime.') }}
          </div>
          <q-btn
            label="Get Started"
            color="primary"
            unelevated
            rounded
            no-caps
            class="link-cta-btn"
            @click="onOpenCreateCardForm()"
          />
        </div>
      </transition>

      <!-- CREATING STATE (dialog is open, handled by showCreateCardForm) -->
      <!-- The CreateCardForm dialog overlays everything when showCreateCardForm is true -->

      <!-- PREVIEW STATE (just created a card) -->
      <transition v-if="wizardStep === 'preview'" name="fade-slide" mode="out-in">
        <div key="preview" class="full-width column items-center text-center q-pt-md">
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">
            {{ $t('Your Card is Ready') }}
          </div>

          <!-- Mini card preview -->
          <q-card
            flat
            class="create-card-action q-pa-lg text-center full-width q-mb-lg cursor-pointer"
            style="border-style: solid; max-width: 320px;"
            @click="$router.push({ name: 'card-details', params: { id: createdCard.id } })"
          >
            <div class="text-h6 text-weight-bold q-mb-sm text-primary">
              {{ createdCard?.alias || createdCard?.name || $t('Card') }}
            </div>
            <q-icon name="check_circle" size="48px" color="positive" class="q-mb-sm" />
            <div class="text-caption text-primary">
              {{ $t('Tap to view in your wallet') }}
            </div>
          </q-card>

          <div class="row q-gutter-md justify-center full-width q-mb-md">
            <q-btn
              label="View Card"
              color="primary"
              unelevated
              rounded
              no-caps
              class="link-cta-btn"
              @click="$router.push({ name: 'card-details', params: { id: createdCard.id } })"
            />
            <q-btn
              label="Order Card"
              color="primary"
              outline
              rounded
              no-caps
              class="link-cta-btn"
              @click="showInlineOrder = true"
            />
          </div>

          <div v-if="showInlineOrder" class="full-width q-mt-md" style="max-width: 400px;">
            <OrderCard :card="createdCard" :replacement-reason="replacementReasonLabel" />
          </div>
        </div>
      </transition>

      <!-- DASHBOARD STATE (has existing cards) -->
      <transition v-if="wizardStep === 'dashboard'" name="fade-slide" mode="out-in">
        <div key="dashboard" class="full-width column items-center q-pt-md">
          <!-- Replacement banner -->
          <div v-if="replacementReasonLabel" class="full-width q-mb-md" style="max-width: 400px;">
            <q-banner class="q-pa-sm text-center" rounded :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-primary'" style="border-radius: 12px;">
              <div class="text-caption text-weight-bold text-white">
                {{ $t('Card Replacement') }} — {{ $t('Reason') }}: {{ replacementReasonLabel }}
              </div>
            </q-banner>
          </div>

          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">
            {{ $t('You have') }} {{ cardCount }} {{ $t(cardCount === 1 ? 'card' : 'cards') }}
          </div>

          <!-- View My Cards -->
          <div class="full-width q-mb-md" style="max-width: 400px; margin-left: auto; margin-right: auto;">
            <div
              class="link-method-item cursor-pointer"
              :class="$q.dark.isActive ? 'method-item-dark' : 'method-item-light'"
              @click="$router.push({ name: 'card-list' })"
            >
              <div class="method-icon-box" :class="$q.dark.isActive ? 'icon-box-dark' : 'icon-box-light'">
                <q-icon name="credit_card" size="22px" color="primary" />
              </div>
              <div class="method-text">
                <div class="text-subtitle2 text-weight-bold" :class="textColor">{{ $t('View My Cards') }}</div>
                <div class="text-caption" :class="textColorGrey">{{ $t('Manage your cards') }}</div>
              </div>
              <q-icon name="chevron_right" size="20px" :color="$q.dark.isActive ? 'grey-5' : 'grey-6'" />
            </div>
          </div>

          <!-- Create Another Card -->
          <div class="full-width q-mb-md" style="max-width: 400px; margin-left: auto; margin-right: auto;">
            <div
              class="link-method-item cursor-pointer"
              :class="$q.dark.isActive ? 'method-item-dark' : 'method-item-light'"
              @click="onOpenCreateCardForm()"
            >
              <div class="method-icon-box" :class="$q.dark.isActive ? 'icon-box-dark' : 'icon-box-light'">
                <q-icon name="add_card" size="22px" color="primary" />
              </div>
              <div class="method-text">
                <div class="text-subtitle2 text-weight-bold" :class="textColor">{{ $t('Create Another Card') }}</div>
                <div class="text-caption" :class="textColorGrey">{{ $t('Add a new card to your wallet') }}</div>
              </div>
              <q-icon name="chevron_right" size="20px" :color="$q.dark.isActive ? 'grey-5' : 'grey-6'" />
            </div>
          </div>

          <!-- Inline replacement order form -->
          <div v-if="isReplacement" class="full-width q-mt-md" style="max-width: 400px;">
            <OrderCard :replacement-reason="replacementReasonLabel" />
          </div>
        </div>
      </transition>
    </div>

    <!-- Dialogs -->
    <CreateCardForm v-if="showCreateCardForm" @onClose="onCloseCreateCardForm" @card-created="onCardCreated" :idempotencyKey="idempotencyKey" />
    <ResumeCreateCardDialog
      v-if="showResumeCreateCardDialog"
      @resumeAttempt="onResumeCardAttempt"
      @deleteAttempt="onDeleteCardAttempt"
      @cancelAttempt="onCancelCardAttempt"
    />
  </q-page>
</template>

<script>
import CreateCardForm from 'src/components/card/CreateCardForm.vue';
import ResumeCreateCardDialog from 'src/components/card/ResumeCreateCardDialog.vue';
import OrderCard from 'src/components/card/OrderCard.vue';
import { loadCardUser } from 'src/services/card/user';
import CreateCardAttemptMixin from 'src/mixins/card/create-card-attempt-mixin'
import bus from 'src/services/event-bus';
import { createV2Contract, decodeCommitment, encodeCommitment, genesisFromScratch, sendOwnershipTokensToContract } from 'src/services/card/utils.js';
import { loadWallet } from 'src/services/wallet';
import { reverseHex } from 'src/services/card/utils.js';
import { TapToPayV2 } from 'src/services/card/contract/tap-to-pay.js';
import { mintLinkingToken, mintOwnershipTokens } from 'src/services/card/utils.js';
import { toTokenAddress } from 'src/utils/crypto';
import AuthNftService from 'src/services/card/auth-nft';
import { SignatureTemplate } from 'cashscript'
import { binToHex } from '@bitauth/libauth';
import { pubkeyToPkHash } from 'src/services/card/utils.js';
import Card from 'src/services/card/card.js';

export default {
  mixins: [CreateCardAttemptMixin],
  components: {
    CreateCardForm,
    ResumeCreateCardDialog,
    OrderCard
  },

  data () {
    return {
      isloaded: false,
      wizardStep: 'welcome', // 'welcome' | 'creating' | 'preview' | 'dashboard'
      createdCard: null,
      showInlineOrder: false
    }
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-6'
    },
    isReplacement() {
      return this.$route.query.replacement === 'true'
    },
    replacementReasonLabel() {
      const reasons = {
        lost: 'Card Lost',
        stolen: 'Card Stolen',
        damaged: 'Card Damaged',
        fraud: 'Suspected Fraud',
        other: 'Other'
      }
      return reasons[this.$route.query.reason] || this.$route.query.reason || ''
    },
    cardCount() {
      return this.$store?.getters['card/cards']?.length || 0
    }
  },

  created() {
    bus.on('session-expired', this.handleSessionExpired);
  },

  async mounted () {
    await this.loadData()
    const wallet = await loadWallet()
    console.log('wallet address:', wallet.address())
    console.log('wallet pubkey:', wallet.pubkey())
    console.log('wallet privkey:', wallet.privkey())
    console.log('wallet hash:', wallet.walletHash)
    console.log('wallet tokenAddress:', wallet.tokenAddress())

    // const authNftService = await AuthNftService.initializeWithWallet(wallet.privkey())
    // console.log('authNftService:', authNftService)
    // const result = await authNftService.mintGenesis()
    // console.log('mintGenesis result:', result)

    // Check if card is not yet linked to a user wallet
    const user = await loadCardUser();   
    const category = "750063dfb55b6a79b6730e020e479530631fa04d87ec6eba9c8b01ddd9de569f"
    console.log('category:', category)
    console.log('reverseHex(category):', reverseHex(category))
    console.log('reverseHex(reverseHex(category)):', reverseHex(reverseHex(category)))
    const { _rawData: data } = await user.fetchCardByIdentifier(category)
      .catch((err) => {
        console.error('Error fetching card by identifier:', err.response || err.message);
        throw err;
      });

    console.log('Fetched card by identifier:', data);
    const card = await Card.createInitialized(data)
    console.log('Initialized card:', card)
    await card.activate('My First Card')

    // await wallet.consolidateUtxos()
    // // -------- Backend Steps ---------
    // // Step 1: Mint Linking Token
    // // const mintLinkingResult = await mintLinkingToken()
    // // console.log('mintLinkingToken result:', mintLinkingResult)
    // // const linkingCategory = mintLinkingResult.category
    // const linkingCategory = "a3b98f21c9c69380694078e48f89d1423cd336c48613c773515fe66f9b88af7b"
    // console.log('linkingCategory:', linkingCategory)

    // // Step 2: Mint Ownership Tokens set commitments to expect category of Step 1
    // // const mintOwnershipResult = await mintOwnershipTokens(linkingCategory)
    // // const ownershipCategory = mintOwnershipResult.category
    // const ownershipCategory = "83da12c3b1d8782568acc950cadb432fe94ad0f9c1b6ac121577de97a8fd4cc3"
    // console.log('ownershipCategory:', ownershipCategory)

    // // Step 3: Create Tap-to-Pay Contract using category of Step 2
    // const tapToPay = await createV2Contract(ownershipCategory)
    // const contract = tapToPay.getContract()
    // const tokenAddress = toTokenAddress(contract.address)

    // console.log('contract address:', contract.address)
    // console.log('tokenAddress:', tokenAddress)

    // // Step 4: Send Ownership Tokens to Contract
    // // const sendResult = await sendOwnershipTokensToContract({ ownershipCategory, contractAddress: contract.address })
    // // console.log('sendOwnershipTokensToContract result:', sendResult)
    // const contractTokens = await contract.getUtxos()
    // console.log('>>>>>>>>contractTokens:', contractTokens)

    // // ----------- User Steps -----------
    // // Step 1: Mint Authorization Token
    // // const mintAuthResult = await mintLinkingToken()
    // // console.log('mintAuthResult:', mintAuthResult)
    // // const authTokenId = mintAuthResult.category;
    // const authTokenId = "ddcc4aa5567243ca0ab1e24e9aa8557199250a6ee4e47ee1a135b62a4dccb9a1"
    // console.log('authTokenId:', authTokenId)

    // // Step 2: Set ownership of contract using owner's public key and category of Step 1
    // const wallet = await loadWallet()
    // const ownerSig = new SignatureTemplate(wallet.privkey())
    // const ownerPk = binToHex(ownerSig.getPublicKey())
    // const ownerPkh = pubkeyToPkHash(ownerPk)
    // console.log('-----ownerPkh:', ownerPkh)
    // // const setOwnerResult = await tapToPay.setOwner(wallet.privkey(), authTokenId)
    // // console.log('setOwner result:', setOwnerResult)

  },

  methods: {
    async loadData() {
      this.showLoading()
      await this.loadCardUser()
      if (this.user?.cardCount > 0 && this.$store) {
        this.$store.dispatch('card/fetchCards').catch(() => {})
      }
      await this.checkExistingCreateCardAttempt()

      // Determine wizard step
      if (this.isReplacement) {
        this.wizardStep = 'dashboard'
      } else if (this.cardCount > 0) {
        this.wizardStep = 'dashboard'
      } else {
        this.wizardStep = 'welcome'
      }

      this.isloaded = true
      this.hideLoading()
    },
    async loadCardUser({ forceLogin = false } = {}) {
      try {
        const user = await loadCardUser(forceLogin);
        this.user = user;
      } catch (err) {
        this.user = null;
      }
    },
    async handleSessionExpired() {
      this.showLoading()
      await this.loadCardUser({ forceLogin: true })
      this.hideLoading()
    },
    onCardCreated (card) {
      this.createdCard = card
      // Add to Vuex store so card.vue can find it when navigating
      if (card?.raw && this.$store) {
        this.$store.commit('card/addCard', card.raw)
      }
      this.showCreateCardForm = false
      this.wizardStep = 'preview'
      this.showInlineOrder = false
    },
    showLoading(message) {
      this.$q.loading.show({
        message: message || this.$t('Loading...')
      });
    },
    hideLoading() {
      this.$q.loading.hide();
    }
  }
}
</script>

<style lang="scss" scoped>
// ====== Skeleton Loading ======
.skeleton-toggle {
  width: 140px;
  height: 44px;
  border-radius: 22px;
}

.skeleton-card {
  border-radius: 24px;
}

// ====== Link Methods ======
.link-method-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
}

.method-item-light {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.method-item-dark {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.link-method-item:hover {
  transform: translateX(4px);
}

.method-item-light:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: color-mix(in srgb, var(--q-primary) 25%, transparent);
}

.method-item-dark:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: color-mix(in srgb, var(--q-primary) 30%, transparent);
}

.method-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.icon-box-light {
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
}

.icon-box-dark {
  background: color-mix(in srgb, var(--q-primary) 18%, transparent);
}

.link-method-item:hover .method-icon-box {
  background: color-mix(in srgb, var(--q-primary) 22%, transparent);
  transform: scale(1.05);
}

.method-text {
  flex: 1;
  text-align: left;
}

// ====== Order Card Root ======
.order-card-root {
  width: 100%;
}

// ====== Page Transition ======
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

// ====== Responsive ======
@media (max-width: 599px) {
  .link-hero {
    padding: 24px 16px !important;
  }
}

/* Create New Card - Glassmorphic Gold */
.create-card-action {
  background: transparent;
  border: 2px dashed;
  border-radius: 24px;
  transition: all 0.3s ease;
}

.body--light .create-card-action {
  border-color: color-mix(in srgb, var(--q-primary) 30%, transparent);
  background: color-mix(in srgb, var(--q-primary) 10%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.body--light .create-card-action:hover {
  background: color-mix(in srgb, var(--q-primary) 10%, white);
  border-color: color-mix(in srgb, var(--q-primary) 60%, transparent);
  transform: translateY(-4px);
}

.body--dark .create-card-action {
  border-color: color-mix(in srgb, var(--q-primary) 20%, transparent);
  background: color-mix(in srgb, var(--q-primary) 15%, black);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.body--dark .create-card-action:hover {
  background: color-mix(in srgb, var(--q-primary) 25%, black);
  border-color: color-mix(in srgb, var(--q-primary) 35%, transparent);
  transform: translateY(-4px);
}
</style>
