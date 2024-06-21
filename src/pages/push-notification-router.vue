<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <div class="column items-center text-center" style="margin:auto;">
      <img src="~/assets/paytaca_logo.png" alt="" style="width:min(50vw, 250px)">
      <div v-if="loading">
        {{ loadingMsg }}
        <q-spinner/>
      </div>
      <q-btn v-else flat no-caps label="Go to Home" to="/" class="text-underline" />
    </div>
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { computed, onMounted, ref } from 'vue';

const $router = useRouter()
const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)
const openedNotification = computed(() => $store.getters['notification/openedNotification'])
const loading = ref(false)
const loadingMsg = ref('Loading ...')

const currentWalletIndex = computed(() => $store.getters['global/getWalletIndex'])
async function switchWallet(index) {
  if (!Number.isSafeInteger(index)) return
  if (index === currentWalletIndex.value) return
  const asset = $store.getters['assets/getAllAssets']

  $store.commit('assets/updateVaultSnapshot', { index: currentWalletIndex.value, snapshot: asset })
  $store.commit('assets/updatedCurrentAssets', index)
  await $store.dispatch('global/switchWallet', index)
  $router.go(0)
}

async function handleOpenedNotification() {
  loadingMsg.value = 'Resolving route ...'
  const route = await $store.dispatch('notification/getOpenedNotificationRoute')
  const notifWalletIndex = parseInt(openedNotification.value?.data?.multi_wallet_index)

  if (Number.isSafeInteger(notifWalletIndex) && notifWalletIndex !== currentWalletIndex.value) {
    console.log(
      'Expecting different wallet index loaded.',
      'Has', currentWalletIndex.value, ',',
      'Expecting', notifWalletIndex, '.',
      'Switching wallet..',
    )
    loadingMsg.value = 'Switching wallet ...'
    // this function is expected to reload the page
    await switchWallet(notifWalletIndex)
    return
  }

  loadingMsg.value = 'Redirecting ...'
  if (route) await $router.replace(route)
  else await $router.replace('/')

  $store.dispatch('notification/emitOpenedNotification')
}

onMounted(async () => {
  try {
    loading.value = true
    await handleOpenedNotification()
  } finally {
    loading.value = false
  }
})
</script>
