<template>
  <q-pull-to-refresh
    id="app-container"
    class="multisig-app"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('Import Wallets')"
      backnavpath="/apps/multisig"
      class="apps-header"
    />
    <div class="row justify-center">
      <div class="col-xs-12 q-gutter-y-md">
          <q-list>
            <q-item>
             <q-item-section overline>
              <q-item-label>These are the wallets that you can import from the server.</q-item-label>
             </q-item-section>
             <q-item-section side top>
               <q-btn icon="refresh" @click="fetchWallets" flat dense></q-btn>
             </q-item-section>
            </q-item>
            <q-separator spaced/>
              <q-item v-if="multisigWalletsFromServer?.filter(w => !w.enabled).length === 0">
            <q-item-section>
            <q-item-label>No Data</q-item-label>
            </q-item-section>
            </q-item>	
            <q-item 
              v-for="wallet in multisigWalletsFromServer?.filter(w => !w.enabled)" 
              clickable v-ripple 
              class="q-my-md"
              @click="downloadWallet(wallet)"
              >
              <q-item-section>
                <q-item-label class="text-bold text-h6 q-mb-sm" >
                  <q-icon name="wallet" size="md" color="primary"></q-icon>
                  {{ wallet.name }}
                </q-item-label>
                <div class="q-ml-md">
                  <div class="flex items-center text-subtitle2 flex items-center">
                    <q-icon name="group" class="q-mr-sm" size="xs"></q-icon> :
                    <span v-for="signer, i in wallet?.signers" :key="`signer-${i}`" class="q-ml-xs text-caption">
                      {{signer.name}} {{ i < wallet.signers.length - 1? ',' : ''}}
                    </span>
                  </div>
                  <div class="text-subtitle2 flex items-center">
                    <q-icon name="mdi-identifier" class="q-mr-sm" size="xs"></q-icon>
                    <span class="text-caption">: {{ wallet.id }}</span>
                  </div>
                </div>
              </q-item-section>
              <q-item-section side top> 
                  <q-btn color="primary" icon="mdi-cloud-download-outline" flat></q-btn>
              </q-item-section>               
            </q-item>
            <q-separator></q-separator>
        </q-list>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { decryptAES256GCM, decryptECIES, splitAES256GCMIvAndEncrypted } from 'src/lib/multisig/encryption'
import { binToHex, decodeHdPrivateKey, decodeHdPublicKey, hexToBin } from 'bitauth-libauth-v3'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const router = useRouter()
const {
  getWalletsFromVault,
  multisigCoordinationServer
} = useMultisigHelpers()

const multisigWalletsFromServer = ref([])
const multisigWalletsFromServerHashSet = ref(new Set())

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const downloadWallet = (multisigWallet) => {
  multisigWallet.setStore($store)
  multisigWallet.save({
    store: $store
  })
  const index = multisigWalletsFromServer.value.findIndex((w) => w.id === multisigWallet.id)
  if (index !== -1) {
    multisigWalletsFromServer.value.splice(index, 1)
  }
  $q.notify({
    color: 'primary',
    message: `${multisigWallet?.name || 'Wallet'} imported from server.`,
    timeout: 2000
  })
  if (multisigWalletsFromServer.value?.length === 0) {
    router.push({ name: 'app-multisig' })
  }
}

const fetchWallets = async () => {

  const localWallets = await getWalletsFromVault()

  for (const localWallet of localWallets) {

    if (localWallet.deleted) continue 
    
    if (!localWallet.xpub) continue

    if (!localWallet.xprv) continue

    const multisigWalletsRetrievedFromServer = 
      await multisigCoordinationServer.getSignerWalletsByMasterFingerprint({ 
        masterFingerprint: localWallet.masterFingerprint 
      })
    
    multisigWalletsRetrievedFromServer?.forEach(async (wallet) => {

      const signer = wallet.signers.find((s) => s.masterFingerprint === localWallet.masterFingerprint)

      if (!signer) return

      const signerWalletDescriptorWrappedDek = signer.walletDescriptorWrappedDek

      const walletDescriptorDek = await decryptECIES(
        decodeHdPrivateKey(localWallet.xprv).node.privateKey,
        signerWalletDescriptorWrappedDek,
        'hex'
      )

      const { encryptedBytes, iv } = splitAES256GCMIvAndEncrypted(
        wallet.walletDescriptor
      )
      
      const decryptedWalletDescriptor = await decryptAES256GCM(
        encryptedBytes,
        hexToBin(walletDescriptorDek),
        iv
      )
      
      if (!decryptedWalletDescriptor?.includes(localWallet.xpub)) return 

      const parsedBsmsDescriptor = MultisigWallet.parseBsmsDescriptor(decryptedWalletDescriptor)
      const signers = parsedBsmsDescriptor.signers.map(s => {
        const name = wallet.signers.find((ws) => ws.masterFingerprint === s.masterFingerprint)?.name
        return {
          ...s,
          name
        }
      })

      const onlineMultisigWallet = new MultisigWallet({
        id: wallet.id,
        name: wallet.name,
        m: parsedBsmsDescriptor.m,
        signers,
        networks: {
          mainnet: {},
          chipnet: {}
        }
      })

      if (multisigWalletsFromServerHashSet.value?.has(onlineMultisigWallet.walletHash)) return
      const existingWallet = $store.getters['multisig/getWalletByHash'](onlineMultisigWallet.walletHash)
      if (existingWallet) return
      multisigWalletsFromServer.value.push(onlineMultisigWallet)
      multisigWalletsFromServerHashSet.value.add(onlineMultisigWallet.walletHash)

    })
  }
}

onMounted(async () => {
  await fetchWallets()
})
</script>

<style scoped>
.light {
  color: #141414;
}

.multisig-wallet-card {
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 16px;
  box-shadow: none !important;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.7);
    border-color: rgba(0, 0, 0, 0.16);
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }
  
  &:active {
    background-color: rgba(255, 255, 255, 0.65);
    border-color: rgba(0, 0, 0, 0.14);
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.18);
    }
  }
}
</style>i
