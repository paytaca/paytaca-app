<template>
  <q-layout view="lHh Lpr lFf" :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page']">
    <q-header class="shadow-2" :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
      <HeaderNav
        :title="$t('HubSubscriptions') || 'Hub Subscriptions'"
        :backnavpath="{ name: 'apps-dashboard' }"
        class="apps-header"
      />
    </q-header>

    <q-page-container>
      <q-page :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'" class="column no-wrap q-pa-md">
        <div class="row items-center q-mb-md">
          <div class="text-h6 text-bow" :class="getDarkModeClass(darkMode)">
            {{ $t('MySubscriptions') || 'My Subscriptions' }}
          </div>
          <q-space />
          <q-btn flat round dense icon="refresh" color="pt-primary1" @click="refreshPage(null, false)" />
        </div>

        <q-linear-progress v-if="fetchingData" query rounded color="pt-primary1" class="q-mb-md" />

        <div v-if="!fetchingData && subscriptions.length === 0" class="text-center q-mt-xl">
          <q-icon name="autorenew" size="4em" class="text-grey q-mb-md" />
          <div class="text-h6 text-grey q-mb-xs">{{ $t('NoSubscriptions') || 'No Subscriptions' }}</div>
          <div class="text-body2 text-grey q-mb-lg">{{ $t('YouHaveNoSubscriptions') || "You don't have any active subscriptions." }}</div>
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
                    <div class="col-auto text-right q-pr-sm" style="width: 40px;">
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

      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import SubscribeDialog from './SubscribeDialog.vue'
import SubscriptionDetailDialog from './SubscriptionDetailDialog.vue'
import { PaymentHub } from 'src/wallet/payment-hub'
import { loadWallet } from 'src/wallet'

// Add imports for subscription cancelling signing logic
import { Contract, SignatureTemplate, ElectrumNetworkProvider } from 'cashscript'
import { decodeCashAddress, encodeCashAddress } from '@bitauth/libauth'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const wallet = ref(null)
const hub = ref(null)
const subscriptions = ref([])
const fetchingData = ref(false)
const subscriptionsPage = ref(1)
const hasNextSubscriptionsPage = ref(false)

onMounted(() => {
  refreshPage()
})

async function initHub() {
  try {
    if (!wallet.value) {
      wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
    }
    if (!hub.value) {
      hub.value = new PaymentHub(wallet.value)
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
    const subsData = await paymentHub.listSubscriptions({ page: 1, customer: true })
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
    const data = await hub.value.listSubscriptions({ page: subscriptionsPage.value, customer: true })
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
    componentProps: { subscriptionId: sub.id }
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
      const contract = new Contract(artifactObj, [
        merchantPayload,
        funderPayload,
        BigInt(sub.pledge_satoshis),
        BigInt(sub.period_blocks)
      ], { provider })

      // 2. Fetch private key
      // Search the current wallet for the path of the funder_address
      let pathStr = null
      const funderPayloadStr = String(funderPayload)
      const searchLimit = Math.max(bchWallet.lastAddressIndex || 0, 50) + 200
      for (let i = 0; i <= searchLimit; i++) {
        const addressSet = await bchWallet.getAddressSetAt(i)
        if (String(decodeCashAddress(addressSet.receiving).payload) === funderPayloadStr) {
          pathStr = `0/${i}`
          break
        }
        if (String(decodeCashAddress(addressSet.change).payload) === funderPayloadStr) {
          pathStr = `1/${i}`
          break
        }
      }

      if (!pathStr) throw new Error('Could not find derivation path for funder address in current wallet')

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
      const formattedInputs = kit.inputs.map(input => ({
        ...input,
        satoshis: BigInt(input.satoshis)
      }))
      const txBuilder = contract.functions.reclaim(sig.getPublicKey(), sig)
        .from(formattedInputs)
        .to(toAddress, BigInt(kit.outputs[0].satoshis))

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

      await hub.value.createSubscription(payload)

      $q.notify({ type: 'positive', message: 'Successfully subscribed to plan' })
      await refreshPage()
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
