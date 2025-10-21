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

async function hasValidMnemonicInWalletIndex(index) {
  if (!Number.isSafeInteger(index)) return false

  try {
    const mnemonic = await getMnemonic(index)
    if (typeof mnemonic !== 'string' || !mnemonic?.length) return false

    const words = mnemonic.trim().split(' ')
    if (words.length !== 12 && words.length !== 24) return false

    return true
  } catch(error) {
    console.error(error)
    return false
  }
}

async function switchWallet(index) {
  if (!Number.isSafeInteger(index)) return
  if (index === currentWalletIndex.value) return
  const canSwitchToWallet = await hasValidMnemonicInWalletIndex(index)
  if (!canSwitchToWallet) {
    const msg1 = t('UnableToSwitchWallet', {}, 'Unable to switch wallet.')
    const msg2 = t('WalletIsNotInDevice', {}, 'Wallet is not in device')
    errorMsg.value = `${msg1} ${msg2}`
    return
  }
  const asset = $store.getters['assets/getAllAssets']

  $store.commit('assets/updateVaultSnapshot', { index: currentWalletIndex.value, snapshot: asset })
  $store.commit('assets/updatedCurrentAssets', index)
  await $store.dispatch('global/switchWallet', index)
  $router.go(0)
}

async function handleOpenedNotification() {
  loadingMsg.value = t('ResolvingRoute') + '...'
  const route = await $store.dispatch('notification/getOpenedNotificationRoute')
  const notifWalletIndex = parseInt(openedNotification.value?.data?.multi_wallet_index)

  if (Number.isSafeInteger(notifWalletIndex) && notifWalletIndex !== currentWalletIndex.value) {
    console.log(
      'Expecting different wallet index loaded.',
      'Has', currentWalletIndex.value, ',',
      'Expecting', notifWalletIndex, '.',
      'Switching wallet..',
    )
    loadingMsg.value = t('SwitchingWallet') + '...'
    // this function is expected to reload the page
    await switchWallet(notifWalletIndex)
    return
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
