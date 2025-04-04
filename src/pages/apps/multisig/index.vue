<template>
  <div class="static-container">
    <div id="app-container" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('Multisig Wallet')"
        backnavpath="/apps"
        class="q-px-sm apps-header gift-app-header"
      />
      <div class="row q-gutter-y-sm">
          <div class="col-xs-12 text-right q-px-sm q-gutter-x-sm">
              <q-btn
                no-caps
                icon="add"
                color="primary"
                :label="$t('Create Wallet')"
                class="button"
                :to="{ name: 'app-multisig-wallet-create'}"
              />
              <q-btn
                no-caps
                icon="add"
                color="primary"
                :label="$t('Delete All Wallets')"
                class="button"
                @click="deleteAllWallets"
              />
              <q-btn
                no-caps
                icon="qr_code_2"
                color="primary"
                :label="$t('QR Code')"
                class="button"
                :to="{ name: 'app-multisig-signer-qrcode'}"
              />
              <q-file clearable color="orange" standout bottom-slots v-model="pstFile" label="Label" counter>
                <template v-slot:prepend>
                  <q-icon name="upload_file" />
                </template>
                <template v-slot:append>
                  <q-icon name="favorite" />
                </template>

                <template v-slot:hint>
                  Field hint
                </template>
              </q-file>

              <q-btn
                label="Load File"
                color="primary"
                @click="loadPstFile"
              />
              <q-file ref="pstFileElementRef" v-model="pstFile" :multiple="false" style="visibility: hidden" @update:model-value="updatePstFile"></q-file>
          </div>
          <div class="col-xs-12 q-px-sm q-gutter-x-sm">
            <q-list v-if="wallets" bordered>
              <q-item v-for="wallet, i in wallets" :key="i" clickable :to="{ name: 'app-multisig-wallet-view', params: { address: wallet.address } }">
                <q-item-section>
                  <q-item-label>{{ wallet.template.name }}</q-item-label>
                  <q-item-label caption lines="2">
                    <span v-for="signerIndex in Object.keys(wallet.signers)" :key="`signer-${signerIndex}`" class="q-mx-2">
                      {{ signerIndex }}-{{ wallet.signers[signerIndex].signerName }}
                    </span>
                  </q-item-label>
                  <q-item-label>
                    {{ wallet.address }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn icon="delete" @click.stop="(e) => { e.preventDefault(); deleteWallet(wallet.address) }" color="secondary"></q-btn>
                </q-item-section>
              </q-item>
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
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Pst } from 'src/lib/multisig'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadLibauthHdWallet } from 'src/wallet'
const $store = useStore()
const router = useRouter()
const { t: $t } = useI18n()

const pstFileElementRef = ref()
const pstFile = ref()
const pstFromFile = ref()
const pstFromStore = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallets = computed(() => {
  return $store.getters['multisig/getWallets']
})

const deleteWallet = (address) => {
  $store.dispatch('multisig/deleteWallet', { address })
}

const deleteAllWallets = () => {
  $store.dispatch('multisig/deleteAllWallets')
}

const loadPstFile = () => {
  console.log('PSTFILE REF', pstFileElementRef.value)
  pstFileElementRef.value.pickFiles()
}

const updatePstFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      pstFromFile.value = Pst.createInstanceFromBase64(reader.result)
      const pstObjectFromStore = $store.getters['multisig/getPstById']({ id: pstFromFile.value.id })
      if (pstObjectFromStore) {
        // TODO: ask before combine? redirect to pst compare page
        // TODO: combine with multiple pst files
        pstFromStore.value = Pst.createInstanceFromObject(pstObjectFromStore)
        pstFromStore.value.combine({ psts: [pstFromFile.value] })
        pstFromStore.value.save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
        return router.push({
          name: 'app-multisig-wallet-pst-view',
          params: { address: pstFromStore.value.address, id: pstFromStore.value.id }
        })
      }
      pstFromFile.value.save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
      router.push({
        name: 'app-multisig-wallet-pst-view',
        params: { address: pstFromFile.value.address, id: pstFromFile.value.id }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}

onMounted(async () => {
  // $store.getters['global/getWallet']('bch') = Loads the currently selected wallet from the homepage
  const currentWallet = $store.getters['global/getWallet']('bch')
  console.log('CURRENT WALLET', currentWallet)
  const wx = await loadLibauthHdWallet()
  console.log('🚀 ~ onMounted ~ wx:', wx)
  const w1 = await loadLibauthHdWallet(0)
  console.log('🚀 ~ onMounted ~ w1:', w1)
  const w2 = await loadLibauthHdWallet(1)
  console.log('🚀 ~ onMounted ~ w2:', w2)
  const w3 = await loadLibauthHdWallet(2)
  console.log('🚀 ~ onMounted ~ w3:', w3)
})
</script>
