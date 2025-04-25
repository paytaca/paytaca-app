<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <HeaderNav
        :title="$t('Wallet Details')"
        backnavpath="/apps/multisig"
        class="apps-header"
      />
    </q-header>
    <q-footer reveal>
      <q-bar class="full-width pt-card text-bow" :class="getDarkModeClass(darkMode)" style="padding: 0px;">
        <q-btn
          icon="keyboard_arrow_up"
          class="full-width"
          @click="openWalletActionsDialog"
          flat>
        </q-btn>
      </q-bar>
    </q-footer>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <!-- <HeaderNav
              :title="$t('Multisig Wallet')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            /> -->
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 q-px-sm q-gutter-y-md">
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
                            <q-item-label class="text-bold">Address</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label >
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
                            <q-item-label class="text-capitalize text-bold" style="font-variant-numeric: proportional-nums">{{signerIndex}}. {{ wallet.signers[signerIndex].signerName }}</q-item-label>
                            <q-item-label caption class="text-weight-thin">{{ shortenString(wallet.signers[signerIndex].xpub, 20) }}</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption><CopyButton :text="wallet.signers[signerIndex].xpub"/></q-item-label>
                          </q-item-section>
                        </q-item>
                        <q-separator spaced inset />
                        <q-item
                          :clickable="transactions?.length > 0"
                          :to="{name: 'app-multisig-wallet-transactions', params: { address: route.params.address}}">
                          <q-item-section>
                            <q-item-label>Transaction Proposals</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>{{ transactions?.length || 0 }}</q-item-label>
                          </q-item-section>
                        </q-item>
                        <!-- <q-item
                          :clickable="psts?.length"
                          :to="{name: 'app-multisig-wallet-psts', params: { address: route.params.address }}">
                          <q-item-section>
                            <q-item-label>Partially Signed Transactions</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-item-label caption>{{ psts?.length || 0 }}</q-item-label>
                          </q-item-section>
                        </q-item> -->
                        <q-separator spaced inset />
                        <q-item>
                          <q-btn flat dense no-caps @click="$emit('receive')">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="call_received" class="col-12"></q-icon>
                                <div class="col-12">Receive</div>
                              </div>
                            </template>
                          </q-btn>
                          <q-btn flat dense no-caps @click="$emit('Send')">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="send" class="col-12"></q-icon>
                                <div class="col-12">Send</div>
                              </div>
                            </template>
                          </q-btn>
                          <q-btn flat dense no-caps @click="$emit('delete')">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="delete" class="col-12"></q-icon>
                                <div class="col-12">Delete</div>
                              </div>
                            </template>
                          </q-btn>
                          <q-btn flat dense no-caps @click="exportWallet">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="share" class="col-12"></q-icon>
                                <div class="col-12">Export</div>
                              </div>
                            </template>
                          </q-btn>
                        </q-item>
                      </q-list>
                    </div>
                  </template>
                </div>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst, shortenString, MultisigWallet } from 'src/lib/multisig'
import CopyButton from 'components/CopyButton.vue'
import Watchtower from 'src/lib/watchtower'
import WalletActionsDialog from 'components/multisig/WalletActionsDialog.vue'

const $store = useStore()
const $q = useQuasar()
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
      return MultisigWallet.createInstanceFromObject(walletObject)
    }
  }
  return null
})

const transactions = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getTransactionsByWalletAddress']({ address: route.params.address })
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

const exportWallet = () => {
  const data = wallet.value.export()
  const blob = new Blob([data], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wallet.value.name || `${wallet.value.m}-of-${wallet.value.n}`}.pmwif`
  document.body.appendChild(a)
  a.click()
}

const openWalletActionsDialog = () => {
  $q.dialog({
    component: WalletActionsDialog,
    componentProps: {
      darkMode: getDarkModeClass(darkMode.value),
      onDelete: () => { console.log('deleting beach') },
      onImport: () => { console.log('deleting beach') },
      onExport: () => { console.log('deleting beach') }
    }
  })
}

onMounted(async () => {
  console.log('🚀 ~ psts ~ psts:', psts)
  try {
    const watchtower = new Watchtower($store.getters['global/isChipnet'])
    const bch = await watchtower.getAddressBchBalance(wallet.value.address)
    console.log('🚀 ~ onMounted ~ balance:', balance)
    balance.value = bch.balance
    console.log('MULTISIG WALLET', wallet.value)
  } catch (error) {}
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>
