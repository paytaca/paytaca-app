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
      <div class="col-xs-12 q-px-xs q-gutter-y-md">
          <q-list >
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
            <q-item v-for="wallet in multisigWalletsFromServer?.filter(w => !w.enabled)">
               <q-item-section>
                 <q-item-label>{{ wallet.name }}</q-item-label>
                 <q-item-label caption lines="2">
                  <div class="flex items-center">
                      <q-icon name="group" class="q-mr-sm"></q-icon>
                      <span v-for="signer, i in wallet?.signers" :key="`signer-${i}`" class="q-mr-xs">
                        {{signer.name}} {{ i < wallet.signers.length - 1? ',' : ''}}
                      </span>
                    </div>
                 </q-item-label>
               </q-item-section>
               <q-item-section side top> 
                   <q-btn color="primary" icon="cloud_download" @click="downloadWallet(wallet)"  flat no-caps dense></q-btn>
               </q-item-section>               
            </q-item>
            
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
import { WatchtowerCoordinationServer, WatchtowerNetwork } from 'src/lib/multisig/network'
import { decryptECIESMessage } from 'src/lib/multisig/ecies'
import { decodeHdPrivateKey } from 'bitauth-libauth-v3'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const router = useRouter()
const {
  localWallets,
  resolveXprvOfXpub
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

    const multisigCoordinationServer = new WatchtowerCoordinationServer({
      network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
    })

    const pubkeyZero = MultisigWallet.extractPublicKeyZeroFromXpub(xpub)

    const onlineWallets = await multisigCoordinationServer.fetchSignerWallets({ 
        authCredentials: MultisigWallet.generateAuthCredentials({ xprv, xpub }),
        pubkeyZero
      })
    

    onlineWallets.forEach(async (wallet) => {

      const signer = wallet.signers.find((s) => s.pubkeyZero === pubkeyZero)

      if (!signer) return

      const privateKey = decodeHdPrivateKey(xprv).node.privateKey
      const bsmsDescriptor = await decryptECIESMessage(privateKey, signer.walletBsmsDescriptor)
      const parsedBsmsDescriptor = MultisigWallet.parseBSMSRecord(bsmsDescriptor)
      const signers = parsedBsmsDescriptor.signers.map(s => {
        return {
          ...s,
          name: wallet.signers.find((ws) => MultisigWallet.extractPublicKeyZeroFromXpub(s.xpub) === ws.pubkeyZero)?.name
        }
      })
      const onlineMultisigWallet = new MultisigWallet({
        id: wallet.id,
        name: wallet.walletName,
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
</style>i
