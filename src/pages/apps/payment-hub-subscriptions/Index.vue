<template>
  <q-layout view="lHh Lpr lFf" :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page']">
    <q-header class="shadow-2" :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
      <HeaderNav
        :title="$t('RecurringPayments') || 'Recurring Payments'"
        :backnavpath="{ name: 'apps-dashboard' }"
        class="apps-header"
      />
    </q-header>

    <q-page-container>
      <q-page :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'" class="column no-wrap">
        <q-pull-to-refresh @refresh="refreshPage" class="col column no-wrap q-pa-md">
        <div class="row items-center q-mb-md">
          <div class="text-h6 text-bow" :class="getDarkModeClass(darkMode)">
            {{ $t('MySubscriptions') || 'My Subscriptions' }}
          </div>
          <q-space />
          <q-btn flat round dense icon="refresh" color="pt-primary1" @click="refreshPage(null, false)" />
        </div>

        <div class="row items-center q-col-gutter-sm q-mb-md">
          <div class="col">
            <q-input
              v-model="searchQuery"
              dense
              rounded
              outlined
              :placeholder="$t('Search') || 'Search'"
              :bg-color="darkMode ? 'pt-dark' : 'white'"
              :dark="darkMode"
              @update:model-value="onSearch"
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-auto">
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              dense
              outlined
              rounded
              emit-value
              map-options
              :bg-color="darkMode ? 'pt-dark' : 'white'"
              :dark="darkMode"
              @update:model-value="refreshPage(null, true)"
              style="min-width: 120px;"
            />
          </div>
        </div>

        <q-linear-progress v-if="fetchingData" query rounded color="pt-primary1" class="q-mb-md" />

        <div v-if="!fetchingData && subscriptions.length === 0" class="text-center q-mt-xl">
          <div v-if="!searchQuery && statusFilter === 'ALL'">
            <q-icon name="autorenew" size="4em" class="text-grey q-mb-md" />
            <div class="text-h6 text-grey q-mb-xs">{{ $t('NoSubscriptions') || 'No Subscriptions' }}</div>
            <div class="text-body2 text-grey q-mb-lg">{{ $t('YouHaveNoSubscriptions') || "You don't have any active subscriptions." }}</div>
          </div>
          <div v-else>
            <q-icon name="search_off" size="4em" class="text-grey q-mb-md" />
            <div class="text-h6 text-grey q-mb-xs">{{ $t('NoResults') || 'No Results' }}</div>
            <div class="text-body2 text-grey q-mb-lg">{{ $t('NoSearchMatches') || 'No subscriptions match your criteria.' }}</div>
            <q-btn
              flat
              rounded
              color="pt-primary1"
              :label="$t('ClearFilter') || 'Clear filter'"
              @click="searchQuery = ''; statusFilter = 'ALL'; refreshPage()"
            />
          </div>
        </div>

        <div v-else>
          <q-infinite-scroll @load="onLoadMoreSubscriptions" :offset="250" :disable="!hasNextSubscriptionsPage">
            <q-list separator class="br-15 overflow-hidden border-grey-4 pt-card-2" :class="getDarkModeClass(darkMode)">
              <q-item
                v-for="sub in subscriptions"
                :key="sub.id"
                class="q-py-md"
                clickable
                v-ripple
                @click="openDetail(sub)"
              >
                <q-item-section>
                  <div class="row items-center no-wrap full-width">
                    <div class="col ellipsis q-pr-sm">
                      <div class="text-weight-bold">{{ sub.plan_details?.name || 'Subscription' }}</div>
                      <div class="text-caption text-grey text-weight-regular">
                        {{ sub.plan_details?.amount }} {{ sub.plan_details?.currency }}
                        &bull;
                        <span v-if="sub.plan_details?.period_days">{{ sub.plan_details.period_days }} {{ $t('Days') || 'days' }}</span>
                        <span v-else-if="sub.plan_details?.period_blocks">{{ sub.plan_details.period_blocks }} {{ $t('Blocks') || 'blocks' }}</span>
                      </div>
                      <div class="text-caption text-grey-6 font-mono q-mt-xs" style="font-size: 0.7rem;">{{ sub.short_id || sub.id }}</div>
                    </div>
                    <div class="col-auto text-center q-px-sm" style="width: 100px;">
                      <q-badge
                        :color="sub.status === 'ACTIVE' ? 'green-4' : (sub.status === 'CANCELLED' ? 'red-4' : (sub.status === 'PENDING' ? 'orange-4' : 'grey-5'))"
                        :text-color="darkMode ? 'black' : 'white'"
                        rounded
                        class="q-px-sm text-weight-medium"
                        style="min-width: 80px;"
                      >
                        {{ sub.status }}
                      </q-badge>
                    </div>
                    <div class="col-auto text-right q-pr-sm row no-wrap items-center">
                      <q-btn
                        v-if="sub.status === 'ACTIVE' || sub.status === 'PENDING'"
                        flat
                        rounded
                        dense
                        color="pt-primary1"
                        size="sm"
                        class="q-mr-xs q-px-sm"
                        @click.stop="topUp(sub)"
                      >
                        {{ $t('TopUp') || 'Top Up' }}
                      </q-btn>
                      <q-btn
                        v-if="sub.status === 'ACTIVE'"
                        flat
                        round
                        dense
                        icon="block"
                        color="grey-6"
                        size="sm"
                        @click.stop="cancelSubscription(sub)"
                      >
                        <q-tooltip>{{ $t('Cancel') || 'Cancel' }}</q-tooltip>
                      </q-btn>
                    </div>
                    <div class="col-auto">
                      <q-icon name="chevron_right" class="text-grey" />
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <template v-slot:loading>
              <div class="row justify-center q-my-md">
                <q-spinner-dots color="pt-primary1" size="30px" />
              </div>
            </template>
          </q-infinite-scroll>
        </div>

        <q-page-sticky position="bottom-right" :offset="[18, 18]">
          <q-btn fab icon="add" color="pt-primary1" @click="openSubscribeDialog">
            <q-tooltip>{{ $t('SubscribeToPlan') || 'Subscribe to Plan' }}</q-tooltip>
          </q-btn>
        </q-page-sticky>
        </q-pull-to-refresh>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import SubscribeDialog from 'src/components/payment-hub/SubscribeDialog.vue'
import TopUpDialog from 'src/components/payment-hub/TopUpDialog.vue'
import SubscriptionDetailDialog from 'src/components/payment-hub/SubscriptionDetailDialog.vue'
import { PaymentHub } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'

// Add imports for subscription cancelling signing logic
import { Contract, SignatureTemplate, ElectrumNetworkProvider, TransactionBuilder } from 'cashscript13'
import { decodeCashAddress, encodeCashAddress } from '@bitauth/libauth'

const $store = useStore()
const $router = useRouter()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const wallet = ref(null)
const hub = ref(null)
const subscriptions = ref([])
const fetchingData = ref(false)
const subscriptionsPage = ref(1)
const hasNextSubscriptionsPage = ref(false)

const searchQuery = ref('')
const statusFilter = ref('ALL')
const statusOptions = ['ALL', 'ACTIVE', 'PENDING', 'CANCELLED', 'TERMINATED']
let searchTimeout = null

onMounted(() => {
  refreshPage()
})

function onSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    refreshPage()
  }, 500)
}

function topUp(sub) {
  if (sub.contract_address) {
    $q.dialog({
      component: TopUpDialog,
      componentProps: { subscription: sub }
    })
  }
}

async function initHub() {
  try {
    if (!wallet.value) {
      wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
    }
    if (!hub.value) {
      hub.value = new PaymentHub(wallet.value)
    }

    let registration = await hub.value.checkRegistration()
    if (!registration) {
      console.log('Wallet not registered on Payment Hub. Registering now...')
      registration = await hub.value.registerWallet()
    }

    return hub.value
  } catch (error) {
    console.error('Failed to init hub:', error)
    throw error
  }
}

async function refreshPage(done = null, showLoading = true) {
  if (showLoading) fetchingData.value = true
  subscriptionsPage.value = 1
  try {
    const paymentHub = await initHub()
    const subsData = await paymentHub.listSubscriptions({
      page: 1,
      customer: true,
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      search: searchQuery.value || undefined
    })
    subscriptions.value = subsData.results || []
    hasNextSubscriptionsPage.value = !!subsData.next
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    $q.notify({ type: 'negative', message: 'Failed to load subscriptions' })
  } finally {
    if (showLoading) fetchingData.value = false
    if (typeof done === 'function') done()
  }
}

async function onLoadMoreSubscriptions(index, done) {
  if (!hasNextSubscriptionsPage.value || fetchingData.value) {
    done()
    return
  }

  try {
    subscriptionsPage.value++
    const data = await hub.value.listSubscriptions({
      page: subscriptionsPage.value,
      customer: true,
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      search: searchQuery.value || undefined
    })
    if (data.results?.length) {
      subscriptions.value.push(...data.results)
    }
    hasNextSubscriptionsPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more subscriptions:', error)
  } finally {
    done()
  }
}

function openDetail(sub) {
  $q.dialog({
    component: SubscriptionDetailDialog,
    componentProps: { subscriptionId: sub.id, isCustomer: true }
  })
}

function copyAddress(address) {
  if (!address) return
  copyToClipboard(address)
  $q.notify({
    message: 'Address copied to clipboard',
    color: 'positive',
    icon: 'check',
    position: 'bottom',
    timeout: 2000
  })
}

async function cancelSubscription(sub) {
  $q.dialog({
    title: $t('CancelSubscription') || 'Cancel Subscription',
    message: ($t('CancelSubscriptionConfirm') || 'Are you sure you want to cancel the subscription to {plan}?').replace('{plan}', sub.plan_name || 'this plan'),
    ok: { label: $t('CancelSubscription') || 'Cancel Subscription', color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show({ message: 'Fetching cancellation kit...' })
      const kit = await hub.value.getSubscriptionCancelKit(sub.id)

      if (!kit.inputs || kit.inputs.length === 0) {
        throw new Error('No funds available to cancel. This subscription may have already been cancelled or drained.')
      }

      $q.loading.show({ message: 'Signing cancellation transaction...' })

      const getPayload = (addr) => {
        if (/^[0-9a-fA-F]{40}$/.test(addr)) {
          return new Uint8Array(addr.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
        }
        if (!addr.includes(':')) addr = 'bitcoincash:' + addr
        const decoded = decodeCashAddress(addr)
        if (typeof decoded === 'string') throw new Error(decoded)
        return decoded.payload
      }

      const merchantPayload = getPayload(sub.merchant_address)
      const funderPayload = getPayload(sub.funder_address)

      const isChipnet = $store.getters['global/isChipnet']
      const bchWallet = isChipnet ? wallet.value.BCH_CHIP : wallet.value.BCH

      // 1. Fetch contract artifact
      const artifactObj = await hub.value.getContractArtifact()
      const provider = new ElectrumNetworkProvider(isChipnet ? 'chipnet' : 'mainnet')
      const paytacaPayload = getPayload(kit.paytaca_address)
      const reversedCategoryHex = sub.category.match(/.{1,2}/g).reverse().join('')
      const categoryBytes = new Uint8Array(reversedCategoryHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))

      const contract = new Contract(artifactObj, [
        merchantPayload,
        funderPayload,
        paytacaPayload,
        BigInt(sub.max_fee),
        BigInt(sub.max_pledge || sub.pledge_satoshis), // fallback to pledge_satoshis if max_pledge is undefined
        BigInt(sub.min_period || sub.period_blocks),
        BigInt(sub.max_period || sub.period_blocks),
        categoryBytes,
        BigInt(sub.contract_timestamp),
        BigInt(sub.max_payments || 0)
      ], { provider })

      // 2. Fetch private key using the exact address index
      const addressIndex = sub.funder_address_index
      if (addressIndex == null) throw new Error('Funder address index not provided by backend')
      const pathStr = `0/${addressIndex}`

      const privKeyWif = await bchWallet.getPrivateKey(pathStr)
      console.log("Funder Payload Target:", String(funderPayload))
      console.log("Derived Path:", pathStr)
      if (!privKeyWif) throw new Error('Could not derive private key for funder address')

      // 3. Build & sign transaction
      const sig = new SignatureTemplate(privKeyWif)
      const toAddress = encodeCashAddress(
        isChipnet ? 'bchtest' : 'bitcoincash',
        'p2pkh',
        getPayload(kit.outputs[0].to)
      )
      const formattedInputs = kit.inputs.map(input => {
        const formattedInput = {
          ...input,
          satoshis: BigInt(input.satoshis)
        }
        if (input.token) {
          formattedInput.token = {
            ...input.token,
            amount: BigInt(input.token.amount)
          }
        }
        return formattedInput
      })
      const txBuilder = new TransactionBuilder({ provider })
      txBuilder.addInputs(formattedInputs, contract.unlock.reclaim(sig.getPublicKey(), sig))
      txBuilder.addOutput({ to: toAddress, amount: BigInt(kit.outputs[0].satoshis) })

      const rawTx = await txBuilder.build()

      // 4. Submit to Payment Hub
      $q.loading.show({ message: 'Submitting cancellation...' })
      await hub.value.submitSubscriptionCancel(sub.id, rawTx, false)

      await refreshPage()
      $q.notify({ type: 'positive', message: $t('SubscriptionCancelled') || 'Subscription cancelled successfully' })

    } catch (error) {
      console.error(error)
      const errorMsg = error.response?.data?.error || error.message
      $q.notify({ type: 'negative', message: ($t('ErrorCancellingSubscription') || 'Error cancelling subscription: ') + errorMsg })
    } finally {
      $q.loading.hide()
    }
  })
}

function openSubscribeDialog() {
  $q.dialog({
    component: SubscribeDialog
  }).onOk(async (formData) => {
    try {
      $q.loading.show()

      const isChipnet = $store.getters['global/isChipnet']
      const bchWallet = isChipnet ? wallet.value.BCH_CHIP : wallet.value.BCH

      const payload = {
        ...formData,
        wallet_hash: bchWallet.walletHash
      }

      const createdSub = await hub.value.createSubscription(payload)

      $q.notify({ type: 'positive', message: 'Successfully subscribed to plan' })
      await refreshPage()
      
      // Open TopUp Dialog
      $q.dialog({
        component: TopUpDialog,
        componentProps: { subscription: createdSub }
      })
    } catch (error) {
      console.error(error)
      const errorMsg = error.response?.data?.error || error.message
      $q.notify({ type: 'negative', message: 'Error subscribing: ' + errorMsg })
    } finally {
      $q.loading.hide()
    }
  })
}

</script>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
