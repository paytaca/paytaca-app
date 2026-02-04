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
            <q-item v-for="wallet in multisigWalletsFromServer?.filter(w => !w.enabled)" clickable v-ripple class="q-my-md">
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
                  <q-btn color="primary" icon="mdi-cloud-download-outline" @click="downloadWallet(wallet)" dense round size="md"></q-btn>
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
import { decryptECIESMessage } from 'src/lib/multisig/ecies'
import { binToHex, decodeHdPrivateKey, decodeHdPublicKey } from 'bitauth-libauth-v3'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const router = useRouter()
const {
  localWallets,
  resolveXprvOfXpub,
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

  for (const localWallet of localWallets.value) {

    if (localWallet?.deleted) continue 
    
    if (!localWallet?.wallet?.bch?.xPubKey) continue

    const xpub = localWallet.wallet.bch.xPubKey
    const xprv = await resolveXprvOfXpub({ xpub })
    
    if (!xprv) continue

    const publicKey = binToHex(decodeHdPublicKey(xpub).node.publicKey)
    const onlineWallets = await multisigCoordinationServer.getSignerWallets({ publicKey })
    
    onlineWallets?.forEach(async (wallet) => {

      const signer = wallet.signers.find((s) => s.publicKey === publicKey)

      if (!signer) return

      const privateKey = decodeHdPrivateKey(xprv).node.privateKey
      const bsmsDescriptor = await decryptECIESMessage(privateKey, signer.walletDescriptor)

      if (!bsmsDescriptor?.includes(xpub)) return

      const parsedBsmsDescriptor = MultisigWallet.parseBsmsDescriptor(bsmsDescriptor)
      const signers = parsedBsmsDescriptor.signers.map(s => {
        const name = wallet.signers.find((ws) => ws.publicKey === binToHex(decodeHdPublicKey(s.xpub).node.publicKey))?.name
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
