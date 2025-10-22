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
	    <q-item v-if="multisigWallets?.filter(w => !w.enabled).length === 0">
		<q-item-section>
		 <q-item-label>No Data</q-item-label>
		</q-item-section>
	    </q-item>	
            <q-item v-for="wallet in multisigWallets?.filter(w => !w.enabled)">
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
                   <q-btn color="primary" icon="cloud_download" @click="enableWallet(wallet)"  flat no-caps dense></q-btn>
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
import { shortenString, getSignerInfos, MultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { WatchtowerCoordinationServer, WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { createXprvFromXpubResolver } from 'src/utils/multisig-utils'
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

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const enableWallet = (multisigWallet) => {
  $store.commit('multisig/enableWallet', multisigWallet)
  $q.notify({
    color: 'primary',
    message: `${multisigWallet.template?.name || 'Wallet'} imported`,
    timeout: 500
  })
  nextTick(() => {
   if (multisigWallets.value?.filter((wallet) => wallet.id && !wallet.enabled)?.length === 0) {
     router.back() 
   }
  })
}

const fetchWallets = async () => {

 localWallets.value?.forEach(async (localWallet) => {
   
    if (localWallet?.deleted) return 
    
    if (!localWallet?.wallet?.bch?.xPubKey) return

    try {
      
      const wallets = await multisigCoordinationServer.fetchWallets({ 
        xpub: localWallet.wallet.bch.xPubKey,
        xprv: await resolveXprvOfXpub({ xpub: localWallet.wallet.bch.xPubKey }) 
      })

      console.log(`Wallets for ${localWallet.wallet.bch.xPubKey}`, wallets)
      wallets.forEach( async (wallet) => { 
        const fetchedWallet = MultisigWallet.importFromObject(wallet, {
          store: $store,
          provider: multisigNetworkProvider,
          coordinationServer: multisigCoordinationServer,
          resolveXprvOfXpub
        })
        fetchedWallet?.save()
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
