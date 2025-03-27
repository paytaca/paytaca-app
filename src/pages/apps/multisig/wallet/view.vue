<template>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Multisig Wallet')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <template v-if="wallet">
                    <div class="q-pa-md">
                      <q-list>
                        <q-item>
                          <q-item-section>
                            <q-item-label>{{ wallet.template.name }}</q-item-label>
                            <q-item-label caption lines="2">{{ wallet.template.description }}</q-item-label>
                            <q-item-label caption lines="2">{{ shortenString(wallet.address, 15) }}</q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <!-- <q-item-label caption>5 min ago</q-item-label> -->
                            <q-icon name="wallet" color="yellow" />
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Balance</q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label caption>1 BCH</q-item-label>
                            <!-- <q-icon name="bch" color="green" /> -->
                          </q-item-section>
                        </q-item>
                        <q-separator spaced inset />
                        <q-item-label header>Signers</q-item-label>
                        <q-item v-for="signerIndex in Object.keys(wallet.signers)" :key="`app-multisig-view-signer-${signerIndex}`">
                          <q-item-section>
                            <q-item-label>{{ wallet.signers[signerIndex].signerName }}</q-item-label>
                            <q-item-label caption>{{ shortenString(wallet.signers[signerIndex].xPubKey, 20) }}</q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label caption>{{ signerIndex }}</q-item-label>
                            <q-item-label caption>Copy</q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-item
                          :clickable="transactions?.length"
                          :to="{name: 'app-multisig-wallet-transactions', params: { address: route.params.address}}">
                          <q-item-section>
                            <q-item-label>Unsigned Transactions</q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label caption>{{ transactions?.length || 0 }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </template>
                </div>
            </div>
          </div>
        </div>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()

const shortenString = (str, maxLength) => {
  // If the string is shorter than or equal to the maxLength, return it as is.
  if (str.length <= maxLength) {
    return str
  }
  // Calculate how much to keep before and after the '...'.
  const halfLength = Math.floor((maxLength - 3) / 2)
  const start = str.slice(0, halfLength)
  const end = str.slice(-halfLength)

  return `${start}...${end}`
}

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const transactions = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  }
  return []
})

// TODO: SHOW DIALOG IF WALLET NOT FOUND, NAV BACK ON DIALOG CLOSE
</script>

<style scoped>
.light {
  color: #141414;
}
</style>
