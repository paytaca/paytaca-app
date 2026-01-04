<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <div class="column items-center text-center" style="margin:auto;">
      <img src="~/assets/paytaca_logo.png" alt="" style="width:min(50vw, 250px)">
      <div v-if="loading">
        {{ loadingMsg }}
        <q-spinner/>
      </div>
      <div v-else-if="errorMsg">
        {{ errorMsg }}
      </div>
      <q-btn v-else flat no-caps :label="$t('GoToHome')" to="/" class="text-underline" />
    </div>
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getMnemonic } from 'src/wallet';
import { getCurrentWalletHash } from 'src/utils/wallet-storage';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const $router = useRouter()
const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)
const openedNotification = computed(() => $store.getters['notification/openedNotification'])
const loading = ref(false)
const loadingMsg = ref(`${t('Loading')}...`)
const errorMsg = ref('')

const currentWalletIndex = computed(() => $store.getters['global/getWalletIndex'])

async function hasValidMnemonic(walletHashOrIndex) {
  if (!walletHashOrIndex) return false

  try {
    const mnemonic = await getMnemonic(walletHashOrIndex)
    if (typeof mnemonic !== 'string' || !mnemonic?.length) return false

    const words = mnemonic.trim().split(' ')
    if (words.length !== 12 && words.length !== 24) return false

    return true
  } catch(error) {
    console.error(error)
    return false
  }
}

async function switchWallet(walletHashOrIndex) {
  if (!walletHashOrIndex) return

  // Check if we're already on the target wallet
  if (typeof walletHashOrIndex === 'number') {
    // Index-based check
    if (walletHashOrIndex === currentWalletIndex.value) return
  } else if (typeof walletHashOrIndex === 'string') {
    // Wallet hash-based check
    const currentWalletHash = getCurrentWalletHash()
    if (currentWalletHash && currentWalletHash.trim() === walletHashOrIndex.trim()) return
  }

  const canSwitchToWallet = await hasValidMnemonic(walletHashOrIndex)
  if (!canSwitchToWallet) {
    const msg1 = t('UnableToSwitchWallet', {}, 'Unable to switch wallet.')
    const msg2 = t('WalletIsNotInDevice', {}, 'Wallet is not in device')
    errorMsg.value = `${msg1} ${msg2}`
    return
  }

  // Save current wallet assets before switching
  const asset = $store.getters['assets/getAllAssets']
  if (typeof walletHashOrIndex === 'number') {
    $store.commit('assets/updateVaultSnapshot', { index: currentWalletIndex.value, snapshot: asset })
  }

  // global/switchWallet already supports both wallet hash and index
  await $store.dispatch('global/switchWallet', walletHashOrIndex)
  $router.go(0)
}

async function handleOpenedNotification() {
  // Check if app is locked
  const lockAppEnabled = $store.getters['global/lockApp']
  const isUnlocked = $store.getters['global/isUnlocked']
  
  if (lockAppEnabled && !isUnlocked) {
    loadingMsg.value = t('Unlocking') + '...'
    // Redirect to lock screen with the current path as redirect target
    await $router.replace({
      path: '/lock',
      query: { redirect: $router.currentRoute.value.fullPath }
    })
    return
  }
  
  loadingMsg.value = t('ResolvingRoute') + '...'
  const route = await $store.dispatch('notification/getOpenedNotificationRoute')

  // Check for wallet_hash first (newer wallets)
  const notificationWalletHash = openedNotification.value?.data?.wallet_hash
  const currentWalletHash = getCurrentWalletHash()

  if (notificationWalletHash && typeof notificationWalletHash === 'string') {
    // Compare wallet hashes (normalize by trimming)
    const normalizedNotificationHash = notificationWalletHash.trim()
    const normalizedCurrentHash = currentWalletHash ? currentWalletHash.trim() : null

    if (normalizedCurrentHash && normalizedNotificationHash !== normalizedCurrentHash) {
      loadingMsg.value = t('SwitchingWallet') + '...'
      // this function is expected to reload the page
      await switchWallet(normalizedNotificationHash)
      return
    }
    // If wallet hashes match, continue with routing
  } else {
    // Fall back to multi_wallet_index for backward compatibility (old wallets)
    const notifWalletIndex = parseInt(openedNotification.value?.data?.multi_wallet_index)

    if (Number.isSafeInteger(notifWalletIndex) && notifWalletIndex !== currentWalletIndex.value) {
        'Switching wallet..',
      )
      loadingMsg.value = t('SwitchingWallet') + '...'
      // this function is expected to reload the page
      await switchWallet(notifWalletIndex)
      return
    }
  }

  loadingMsg.value = t('Redirecting') + '...'
  if (route) await $router.replace(route)
  else await $router.replace('/')

  $store.dispatch('notification/emitOpenedNotification')
}

onMounted(async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    await handleOpenedNotification()
  } finally {
    loading.value = false
  }
})
</script>
