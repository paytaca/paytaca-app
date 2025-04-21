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
                    <div>
                      <q-list>
                        <q-item>
                          <q-item-section>
                            <q-item-label class="text-h6">{{ wallet.template.name }}</q-item-label>
                            <q-item-label caption lines="2">{{ wallet.template.description }}</q-item-label>
                            <!-- <q-item-label caption lines="2">{{ shortenString(wallet.address, 15) }}</q-item-label> -->
                          </q-item-section>
                          <q-item-section side>
                            <!-- <q-item-label caption>5 min ago</q-item-label> -->
                            <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Address</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>
                              {{ shortenString(wallet.address, 20) }} <CopyButton :text="wallet.address"/>
                            </q-item-label>
                            <!-- <q-icon name="bch" color="green" /> -->
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Balance</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>{{ balance || 0 }}</q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Required Signatures</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>{{ wallet.m }} of {{ wallet.n }}</q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-separator spaced inset />
                        <q-item-label header>Signers</q-item-label>
                        <q-item v-for="signerIndex in Object.keys(wallet.signers)" :key="`app-multisig-view-signer-${signerIndex}`">
                          <q-item-section>
                            <q-item-label class="text-capitalize" style="font-variant-numeric: proportional-nums">{{signerIndex}}. {{ wallet.signers[signerIndex].signerName }}</q-item-label>
                            <q-item-label caption class="text-weight-thin">{{ shortenString(wallet.signers[signerIndex].xpub, 20) }}</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption><CopyButton :text="wallet.signers[signerIndex].xpub"/></q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-separator spaced inset />
                        <q-item
                          :clickable="transactions?.length"
                          :to="{name: 'app-multisig-wallet-transactions', params: { address: route.params.address}}">
                          <q-item-section>
                            <q-item-label>Unsigned Transactions</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>{{ transactions?.length || 0 }}</q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-item
                          :clickable="psts?.length"
                          :to="{name: 'app-multisig-wallet-psts', params: { address: route.params.address }}">
                          <q-item-section>
                            <q-item-label>Partially Signed Transactions</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>{{ psts?.length || 0 }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </template>
                </div>
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-md row justify-around">
                  <q-btn color="primary" class="col-5">Receive</q-btn>
                  <q-btn color="primary" class="col-5">Send</q-btn>
                </div>
                <div class="col-xs-12 col-md-8 q-px-lg q-pt-lg row justify-center">
                  <q-btn
                    color="red"
                    class="full-width"
                    @click="() => deleteWallet(route.params.address)"
                    outline>
                    Delete Wallet
                  </q-btn>
                </div>
            </div>
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
import { Pst, shortenString, MultisigWallet } from 'src/lib/multisig'
import CopyButton from 'components/CopyButton.vue'
import Watchtower from 'src/lib/watchtower'
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const balance = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  if (route.params?.address) {
    const walletObject = $store.getters['multisig/getWallet']({ address: route.params.address })
    if (walletObject) {
      return MultisigWallet.fromObject(walletObject)
    }
  }
  return null
})

const transactions = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  }
  return []
})

const psts = computed(() => {
  if (!wallet.value?.address) return []
  const _psts = $store.getters['multisig/getPsts']
  return _psts.map((p) => {
    const instance = new Pst(p)
    return instance
  }).filter((p) => {
    return p.address === wallet.value.address
  })
})

const deleteWallet = (address) => {
  $store.dispatch('multisig/deleteWallet', { address })
  router.push({ name: 'app-multisig' })
}

onMounted(async () => {
  console.log('🚀 ~ psts ~ psts:', psts)
  const watchtower = new Watchtower($store.getters['global/isChipnet'])
  const bch = await watchtower.getAddressBchBalance(wallet.value.address)
  console.log('🚀 ~ onMounted ~ balance:', balance)
  balance.value = bch.balance
  console.log('MULTISIG WALLET', wallet.value)
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>
