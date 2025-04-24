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
              no-caps
              icon="delete"
              :label="$t('Clear All')"
              @click="deleteAllTransactions"
              flat
              dense
            />
        </div>
        <div class="col-xs-12">
          <q-list v-if="multisigTransactions" separator>
            <q-item
              v-for="transaction, i in multisigTransactions"
              :key="i" clickable
              :to="{ name: 'app-multisig-wallet-transaction-view', params: { address: route.params.address, index: i } }"
              class="q-py-md"
            >
              <q-item-section>
                <q-item-label class="text-h6 text-weight-bold flex items-center">
                  <q-icon name="mdi-file-settings-outline" class="q-mr-sm"></q-icon><span>{{ transaction.metadata.prompt }}</span>
                </q-item-label>
                <q-item-label caption>
                  Origin: {{ transaction.metadata.origin }}
                </q-item-label>
                <q-item-label caption>
                  {{ transaction.signatures }}
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
            <q-separator  inset />
          </q-list>
        </div>
    </div>
    <!-- display created wallets  -->
  </div>
</div>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const route = useRoute()
const router = useRouter()
const { t: $t } = useI18n()

const transactions = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const multisigTransactions = computed(() => {
  return $store.getters['multisig/getTransactionsByWalletAddress']({ address: route.params.address })
})

const deleteAllTransactions = async () => {
  await $store.dispatch('multisig/deleteAllTransactions')
}

onMounted(() => {
  transactions.value = $store.getters['multisig/getTransactionsByWalletAddress']({ address: route.params.address })
  // if (transactions.value && transactions.value?.length === 1) {
  //   router.push({ name: 'app-multisig-wallet-transaction-view', params: { address: route.params.address, index: 0 } })
  // }
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
