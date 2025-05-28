<template>
<div class="static-container">
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('Transactions')"
      :backnavpath="`/apps/multisig/wallet/${route.params.address}`"
      class="q-px-sm apps-header gift-app-header"
    />
    <div class="row q-gutter-y-sm">
        <div class="col-xs-12 text-right q-px-sm q-gutter-x-sm">
            <q-btn
              v-if="multisigTransactions?.length > 0"
              no-caps
              icon="delete"
              :label="$t('Clear All')"
              @click="deleteAllTransactions"
              flat
              dense
            />
        </div>
        <div class="col-xs-12">
          <q-list v-if="multisigWallet && multisigTransactions?.length > 0">
            <q-item
              v-for="multisigTransaction, i in multisigTransactions"
              :key="i" clickable
              :to="{ name: 'app-multisig-wallet-transaction-view', params: { address: route.params.address, index: i } }"
              class="q-py-md"
            >
              <q-item-section>
                <q-item-label class="text-weight-bold flex items-center">
                  <q-icon name="mdi-file-settings-outline" class="q-mr-sm"></q-icon><span>{{ multisigTransaction.metadata.prompt }}</span>
                </q-item-label>
                <q-item-label caption>
                  Origin: {{ multisigTransaction.metadata.origin }}
                </q-item-label>
                <q-item-label caption>
                  Required Signatures: {{ multisigWallet.requiredSignatures }}
                </q-item-label>
                <q-item-label caption>
                  Current Signatures: {{ getSignatureCount({ multisigWallet, multisigTransaction }) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side top>
                <q-btn
                  icon="close"
                  @click.stop="() => { deleteTransaction({ index: i }) }"
                  flat
                  >
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator inset />
          </q-list>
        </div>
    </div>
    <!-- display created wallets  -->
  </div>
</div>
</template>

<script setup>

import { computed, onMounted, ref, onBeforeMount } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getSignatureCount } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import HeaderNav from 'components/header-nav'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getSignerXPrv, getTransactionsByWalletAddress, multisigWallets } = useMultisigHelpers()
const multisigWallet = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const multisigTransactions = computed(() => {
 return getTransactionsByWalletAddress({ address: route.params.address })
})

const deleteAllTransactions = async () => {
  await $store.dispatch('multisig/deleteAllTransactions')
  router.back()
}

onBeforeMount(async () => {
  if (route.params?.address) {
    multisigWallet.value = multisigWallets.value?.find((wallet) => wallet.address === route.params.address)
  }
})

onMounted(() => {
  console.log('multisig tx', multisigTransactions.value)
  if (multisigTransactions.value?.length === 0) {
    router.push({ name: 'app-multisig-wallet-view', params: { address: route.params.address } })
  }
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
