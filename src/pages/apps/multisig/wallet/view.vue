<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow multisig-app"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('Wallet')"
      backnavpath="/apps/multisig"
      class="header-nav"
    />
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-8 q-px-xs">
        <template v-if="wallet">
            <div class="row q-mb-lg justify-center">
              <div class="col-xs-12">
                <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px; color:white">
                  <div class="flex justify-between items-center q-ma-md">
                    <div class="flex items-center q-gutter-x-sm">
                      <q-icon name="wallet" size="sm"></q-icon>
                      <span class="text-bold text-h5">{{wallet.name}}</span>
                    </div>
                    <q-icon v-if="wallet.isOnline()" name="mdi-cloud-check" size="sm" flat></q-icon>
                  </div>
                  <q-card-section class="row items-center justify-between">
                    <div class="flex justify-start items-center q-gutter-x-sm">
                      <q-icon name="img:bitcoin-cash-circle.svg" size="md"></q-icon>
                      <span class="text-h5 text-bold">{{ balances?.['bch'] || balances?.['bch'] == 0 ? balances?.['bch'] / 1e8 : "..." }}</span>
                      <q-btn 
                        @click="refreshBalance"
                        :icon="!balancesRefreshing? 'refresh': ''"
                        :loading="balancesRefreshing"
                        size="md"
                        flat
                        dense>
                        <template v-slot:loading>
                          <q-spinner-facebook></q-spinner-facebook>
                        </template>
                      </q-btn>
                    </div>
                    <div class="col-xs-12 q-mt-md text-subtitle2">{{ assetPrice? `=${assetPrice}` : '' }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-xs-12 flex justify-between">
                <q-btn flat dense no-caps @click="showWalletDepositDialog" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="send_and_archive" class="col-12" color="primary" round></q-icon>
                      <div class="col-12 tile-label">{{ $t('Deposit') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn v-if="proposals && proposals.length > 0 || !proposalsFromServer?.length " flat dense no-caps :to="{ name: 'app-multisig-wallet-psts', params: { wallethash: wallet.getWalletHash() } }" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-text-box" class="col-12" color="primary" style="position:relative">
                        <q-badge color="red" v-if="proposals?.length > 0" style="margin-right: 20px;" floating>
                        {{ proposals.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label">{{ $t('Proposals') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn v-else-if="proposalsFromServer?.length > 0" @click="showProposalsImportSelectionDialog" flat dense no-caps class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-cloud" class="col-12" color="primary" style="position:relative">
                        <q-badge color="red" v-if="proposalsFromServer?.length > 0" style="margin-right: 20px;" floating>
                        {{ proposalsFromServer.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label">{{ $t('Proposals') }}</div>
                    </div>
                  </template>
                </q-btn>
                
                <q-btn  flat dense no-caps :to="{ name: 'app-multisig-wallet-addresses', params: { wallethash: wallet.getWalletHash() } }" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-text-box-multiple" class="col-12" color="primary" style="position:relative">
                      </q-icon>
                      <div class="col-12 tile-label">{{ $t('Addresses') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps @click="openWalletActionsDialog" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="more_horiz" class="col-12" color="primary"></q-icon>
                      <div class="col-12 tile-label">{{ $t('More') }}</div>
                    </div>
                  </template>
                </q-btn>
              </div>
            </div>
            <q-list>
              <q-separator spaced inset />
              <q-item v-if="wallet.isOnline()">
                <q-item-section>
                  <q-item-label><q-icon name="mdi-identifier" size="sm" ></q-icon><q-icon name="mdi-cloud-check" size="sm" ></q-icon></q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label >
                   <span class="flex flex-wrap items-center">
                    {{ wallet.id }} 
                  </span> 
                 </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="text-subtitle2">{{ $t('WalletHash') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label>
                   <span class="flex flex-wrap items-center">
                    {{ shortenString(`${wallet.walletHash}`, 20)}}<CopyButton :text="wallet.walletHash"/>
                  </span> 
                 </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="text-subtitle2">{{ $t('RequiredSignatures') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ wallet.m }} of {{ wallet.signers.length }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item >
                <q-item-section>
                  <q-item-label class="text-subtitle2 q-mb-md">{{ $t('Signers') }}</q-item-label>
                  <div class="flex flex-wrap items-center q-gutter-xs ellipsis">
                    <q-chip v-for="signer, i in wallet.signers.slice(0, 3)" :key="`app-multisig-view-signer-${i}`" style="height:fit-content" flat dense class="q-px-md">
                      <q-avatar>
                        <q-icon v-if="hdPrivateKeys?.[signer.xpub]" name="mdi-account-key" size="sm" style="color:#D4AF37"></q-icon>
                        <q-icon v-else name="person" size="sm"></q-icon>
                      </q-avatar>
                      <div class="flex flex-column">
                        <div class="ellipsis" style="max-width:3.5em">
                          {{ signer.name }}
                        </div>
                      </div>
                    </q-chip>
                  </div>
                </q-item-section>
                <q-item-section side class="flex items-base">
                  <q-btn icon="mdi-dots-horizontal" flat dense @click="router.push({ name: 'app-multisig-wallet-details', params: { wallethash: wallet.walletHash } })"></q-btn>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-expansion-item v-model="balancesExpanded">
                <template v-slot:header>
                  <q-item-section class="text-subtitle2">
                    {{ $t('Balances') }}
                  </q-item-section>
                </template>
                <q-item clickable :to="{name: 'app-multisig-wallet-asset', params: { wallethash: wallet.getWalletHash() }, query: { asset: 'bch' } }">
                  <q-item-section>
                    <div class="flex items-center q-gutter-x-sm">
                      <q-icon name="img:bitcoin-cash-circle.svg" size="md"></q-icon>
                      <div>
                        <div class="text-bold">BCH</div>
                        <sub style="filter: brightness(80%)">Bitcoin Cash</sub>
                      </div>
                    </div>
                  </q-item-section>
                  <q-item-section side>
                    {{ balances?.['bch'] ? balances?.['bch'] / 1e8: '...' }}
                  </q-item-section>
                </q-item>
                <q-item v-for="asset in Object.keys(balances || {}).filter(a => a !== 'bch')" clickable :to="{name: 'app-multisig-wallet-asset', params: { wallethash: wallet.getWalletHash()}, query: { asset }}">
                    <q-item-section>
                      <div class="flex items-center q-gutter-x-sm">
                        <q-avatar size="md">
                          <q-img v-if="balancesTokenIdentities[asset]?.uris?.icon" :src="assetIconUrl(balancesTokenIdentities[asset]?.uris?.icon)"></q-img>
                          <q-icon v-else name="token" size="md"></q-icon>
                        </q-avatar>
                        <div>
                          <div v-if="balancesTokenIdentities[asset]?.token?.symbol">
                            <div class="text-bold">{{balancesTokenIdentities[asset].token.symbol}} </div>
                            <sub  style="filter: brightness(80%)">{{balancesTokenIdentities[asset].name}} [{{ shortenString(asset, 13) }}]</sub>
                          </div>
                          <div v-else-if="balancesTokenIdentities[asset]?.name">
                            <div class="text-bold">{{balancesTokenIdentities[asset].name}}</div>
                          </div>
                          <span v-else>
                            {{shortenString(asset, 18)}}
                          </span>
                        </div>
                      </div>
                  </q-item-section>
                  <q-item-section side>
                    {{ balances?.[asset] ? Big(balances[asset]).div(`1e${balances?.[asset]?.decimals || 0}`) : '...' }}
                  </q-item-section>
                </q-item>
              </q-expansion-item>
            </q-list>
        </template>
      </div>
    </div>
    <q-file
        ref="pstFileElementRef"
        v-model="pstFileModel"
        :multiple="false"
        style="visibility: hidden"
        @update:model-value="onUpdateTransactionFile">
      </q-file>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import Big from 'big.js'
import { binToBase64, sortObjectKeys } from 'bitauth-libauth-v3'
import { cborEncode } from '@ngraveio/bc-ur/dist/cbor'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  generateFilename,
  MultisigWallet,
  Pst,
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'components/CopyButton.vue'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import WalletShareOptionsDialog from 'components/multisig/WalletShareOptionsDialog.vue'
import WalletQrDialog from 'components/multisig/WalletQrDialog.vue'
import ImportProposalSelectionDialog from 'components/multisig/ImportProposalSelectionDialog'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { 
  multisigCoordinationServer, 
  multisigNetworkProvider, 
  resolveXprvOfXpub,
  getSignerXPrv, 
  getAssetTokenIdentity,
  cashAddressNetworkPrefix,
  resolveMnemonicOfXpub
} = useMultisigHelpers()
const balances = ref()
const balancesTokenIdentities = ref({})
const balancesExpanded = ref(true)
const balancesRefreshing = ref(false)
const balanceConvertionRates = ref()
const walletSyncing = ref(false)

const hdPrivateKeys = ref()
const pstFileElementRef = ref()
const pstFileModel = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer,
      resolveXprvOfXpub,
      resolveMnemonicOfXpub
    })
  }
  return null
})

const proposals = computed(() => {
  const psbts = $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)
  return psbts?.map(psbtBase64 => {
    return Pst.fromPsbt(psbtBase64)
  })
})

const proposalsFromServer = ref()

const assetPrice = computed(() => {
  if (balanceConvertionRates.value?.length > 0) {
    const b = balanceConvertionRates.value?.find(priceData => (
       priceData.relative_currency?.toLowerCase() === 'bch'
    ))
    return b?.[`assetPriceIn${b?.currency}Text`] || ''
  }
})

const assetIconUrl = computed(() => {
  return (iconUrl) => {
    if (iconUrl?.includes('nftstorage.link') || iconUrl?.startsWith('ipfs://')) {
      return `https://cashtokens.studio/api/ipfs-image?url=${encodeURIComponent(iconUrl)}`
    }
    return iconUrl
  }
})

const showWalletDepositDialog = () => {
  $q.dialog({
    component: WalletReceiveDialog,
    componentProps: {
      darkMode: darkMode.value,
      multisigWallet: wallet.value,
      cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
    }
  }).onOk((payload) => {
    if (payload?.addressIndex) {
      wallet.value.issueDepositAddress(payload.addressIndex)
    }
  })
}

const showWalletQrDialog = () => {
  $q.dialog({
    component: WalletQrDialog,
    componentProps: {
      darkMode: darkMode.value,
      wallet: wallet.value,
    }
  }).onOk(() => {
    openWalletActionsDialog()
  })
}

const showProposalsImportSelectionDialog = () => {
  const decodedProposals = []

  for(const p of proposalsFromServer.value) {

    if (p.proposalFormat && p.proposalFormat !== 'psbt') continue 
    try {
      const decoded = Pst.import(p.proposal) 
      decoded.id = p.id     
      decodedProposals.push(decoded)
    } catch (error) {
      console.log(error)
      // ignore proposal that can't be decoded
    }
  }

  if (decodedProposals?.length > 0) {
    $q.dialog({
      component: ImportProposalSelectionDialog,
      componentProps: {
        darkMode: darkMode.value,
        proposals: decodedProposals
      }
    }).onOk(async (selectedProposal) => {
      try {
        selectedProposal.setStore($store)
        selectedProposal.save()  
        router.push({ 
          name: 'app-multisig-wallet-pst-view', 
          params: { 
            wallethash: wallet.value.walletHash, 
            unsignedtransactionhash: selectedProposal.unsignedTransactionHash 
          } 
        })
      } catch (error) {
        $q.notify({
          message: $t('ImportSelectedProposalError', {}, 'Error importing proposal'),
          color: 'negative'
        })
      }
      
    }).onCancel(() => {
      // Dialog was closed without action
    })
  }
  
}

const downloadWalletFile = (walletToExport) => {
  const cborEncoded = cborEncode(walletToExport.export())
  const blob = new Blob([binToBase64(cborEncoded)], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = generateFilename(walletToExport)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const handleDeleteWalletAction = () => {
  $q.dialog({
    message: $t('AreYouSureDeleteWallet'),
    ok: { 
      label: $t('Yes'),
      color: 'primary',
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)}`,
    },
    cancel: { 
      label: $t('No'),
      color: 'default',
      outline: true,
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)} `,
    },
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
  }).onOk(() => {
    wallet.value.delete({ sync: false })
    router.push({ name: 'app-multisig' })
  }).onCancel(() => {
    openWalletActionsDialog()
  })
}

const handlShareWalletAction = () => {
  $q.dialog({
    component: WalletShareOptionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      wallet: wallet.value,
      cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
    }
  }).onOk(async (payload) => {
    if (payload?.action === 'display-qr') {
      showWalletQrDialog()
    } else if (payload?.action === 'download-wallet') {
      downloadWalletFile(payload.wallet || wallet.value)
    } else if (payload?.action === 'upload-wallet') {
      try {
        walletSyncing.value = true
        await wallet.value.upload()
      } catch (error) {
        $q.notify({
          type: 'error',
          color: 'red',
          message: error.message,
        })
      } finally {
        walletSyncing.value = false
      }
    } else {
      openWalletActionsDialog()
    }
  }).onCancel(() => {
    // Dialog was closed without action
  })
}

const handleScanWalletUtxosAction = () => {
  try {
    
  } catch (error) {
    
  }
}

const handleWalletActions = async (action) => {
    if (action.value === 'delete-wallet') {
      handleDeleteWalletAction()
    }
    if (action.value === 'share-wallet') {
      handlShareWalletAction()
    }
    if (action.value === 'scan-wallet-utxos') {
      await handleScanWalletUtxosAction()
    }
    if (action.value === 'view-wallet-details') {
      router.push({ name: 'app-multisig-wallet-details', params: { wallethash: wallet.value.getWalletHash() } })
    }
}
  
const openWalletActionsDialog = () => {
  const disableActions = []
  if (proposals.value?.length > 0) {
    disableActions.push('send-bch')
    disableActions.push('import-tx')
  }

  $q.bottomSheet({
    title: $t('WalletOptions'),
    grid: true,
    actions: [
      {
        icon: 'delete_forever',
        label: $t('DeleteWallet'),
        value: 'delete-wallet',
        color: 'red'
      },
      {
        icon: 'mdi-share',
        label: $t('ShareWallet'),
        value: 'share-wallet',
        color: 'primary'
      },
      {
        icon: 'mdi-database-search-outline',
        label: $t('ScanUTXOs', {}, 'Scan UTXOs'),
        value: 'scan-wallet-utxos',
        color: 'primary'
      },
      {
        icon: 'mdi-file-cog',
        label: $t('WalletDetails', {}, 'Wallet Details'),
        value: 'view-wallet-details',
        color: 'primary'
      },

    ],
    class: `${getDarkModeClass(darkMode.value)} custom-bottom-sheet pt-card text-bow justify-between`

  }).onOk(handleWalletActions)
}

const loadHdPrivateKeys = async (signers) => {
  if (!hdPrivateKeys.value) {
    hdPrivateKeys.value = {}
  }
  for (const signer of signers) {
    const xprv = await getSignerXPrv({
      xpub: signer.xpub
    })
    if (xprv) {
      hdPrivateKeys.value[signer.xpub] = xprv
    } 
  }
}

const loadCashtokenIdentitiesToBalances = async() => {
  const promises = []
  for(const asset of Object.keys(balances.value || {})) {
    if (asset === 'bch') continue
    const tokenIdentityPromise = async () => {
      balancesTokenIdentities.value[asset] = await getAssetTokenIdentity(asset)
    }
    promises.push(tokenIdentityPromise())
  }
  await Promise.all(promises)
}

const refreshBalance = async () => {
  try {
    balancesRefreshing.value = true
    balances.value = await wallet.value.getWalletBalances()
    
    if (balances.value) {
      balances.value = sortObjectKeys(balances.value)
    }
    balanceConvertionRates.value = 
      await wallet.value.convertBalanceToCurrencies(
        'bch',
        (balances.value?.['bch'] || 0) / 1e8,
        [$store.getters['market/selectedCurrency'].symbol]
      )
  } catch (error) {} finally {
    balancesRefreshing.value = false
  }
}

const refreshPage = async (done) => {
  try {
    balancesRefreshing.value = true
    await refreshBalance()
    await loadCashtokenIdentitiesToBalances()
  } catch (_) {
    // ignore; pull-to-refresh should always resolve
  } finally {
    balancesRefreshing.value = false
    if (typeof done === 'function') done()
  }
}

const onUpdateTransactionFile = (file) => {
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const importedPst = Pst.import(reader.result)
      importedPst.setStore($store)
      importedPst.save()

      router.push({
        name: 'app-multisig-wallet-pst-view',
        params: {
          unsignedtransactionhash: importedPst.unsignedTransactionHash,
          wallethash: route.params.wallethash
        }
      })
    } catch (e) {
      console.error('Error importing transaction file:', e)
      $q.notify({
        message: $t('FailedToImportTransaction', {}, 'Failed to import transaction'),
        color: 'negative'
      })
    } finally {
      // allow re-selecting the same file
      pstFileModel.value = null
    }
  }
  reader.onerror = (err) => {
    console.error(err)
    pstFileModel.value = null
  }
  reader.readAsText(file)
}

const queryServerForProposals = async () => {
  if (!proposals.value || proposals.value?.length === 0) {
    const p = await wallet.value?.fetchProposals()
    proposalsFromServer.value = p
  }
}

watch(wallet, async (newWallet) => {
  if (!newWallet) {
    router.push({ name: 'app-multisig' })
  }
})



onMounted(async () => {
  try {
    await loadHdPrivateKeys(wallet.value?.signers)
    await refreshBalance()
    await loadCashtokenIdentitiesToBalances()
    if (!proposals.value || proposals.value?.length === 0) {
      await queryServerForProposals()
    }
  } 
  catch (error) {
    $q.notify({
      type: 'warning',
      message: `Warning: ${error.message}`,
      color: 'warning'
    })
  }
})

</script>

<style lang="scss">

.light {
  color: #141414;
} 

.custom-bottom-sheet .q-bottom-sheet__item .q-icon {
  font-size: xx-large;
}

</style>
