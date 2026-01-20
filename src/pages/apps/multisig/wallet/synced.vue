<template>
  <q-pull-to-refresh
    id="app-container"
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
                      <span v-for="signer,i in wallet?.signers" :key="`signer-${signerEntityKey}`" class="q-mr-xs">
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
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const {
  localWallets,
  multisigWallets,
  multisigNetworkProvider,
  multisigCoordinationServer,
  resolveXprvOfXpub
} = useMultisigHelpers()

const multisigWalletsFromServer = ref([])

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})


const downloadWallet = (multisigWallet) => {
  multisigWallet.save()
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

 const xpubSet = new Set()

 localWallets.value?.forEach(async (localWallet) => {
   
    if (localWallet?.deleted) return 
    
    if (!localWallet?.wallet?.bch?.xPubKey) return

    if (xpubSet.has(localWallet.wallet.bch.xPubKey)) return

    try {
      
      const wallets = await multisigCoordinationServer.fetchWallets({ 
        xpub: localWallet.wallet.bch.xPubKey,
        xprv: await resolveXprvOfXpub({ xpub: localWallet.wallet.bch.xPubKey }) 
      })

      wallets.forEach( async (wallet) => { 
        const fetchedWallet = MultisigWallet.importFromObject(wallet, {
          store: $store,
          provider: multisigNetworkProvider,
          coordinationServer: multisigCoordinationServer,
          resolveXprvOfXpub
        })

        if (multisigWalletsFromServer.value.find((w) => w.walletHash === fetchedWallet.walletHash)) {
          return
        }
        if (multisigWallets.value.find((w) => w.walletHash === fetchedWallet.walletHash)) {
          return
        }

        multisigWalletsFromServer.value.push(fetchedWallet)        
        
        xpubSet.add(localWallet.wallet.bch.xPubKey)
      })

    } catch (e) {
      console.error('Error resolving xprv for xpub', e)
    }
 })
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
