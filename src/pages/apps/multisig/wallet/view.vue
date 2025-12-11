<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
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
                <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px;">
                  <div class="flex justify-between items-center q-ma-md">
                    <div class="text-bold text-h5">{{wallet.name}}</div>
                    <q-icon name="wallet" size="lg"></q-icon>
                  </div>
                  <q-card-section class="row items-center justify-between">
                    <div class="flex justify-start items-center q-gutter-x-sm">
                      <q-icon name="img:bitcoin-cash-circle.svg" size="md"></q-icon>
                      <span class="text-h5 text-bold">{{ balances?.['bch'] ? balances?.['bch'] / 1e8 : "..." }}</span>
                      <q-btn 
                        @click="refreshBalance"
                        :icon="!balancesRefreshing? 'refresh': ''"
                        :loading="balancesRefreshing"
                        size="md"
                        flat dense>
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
                      <q-icon name="send_and_archive" class="col-12" color="primary"></q-icon>
                      <div class="col-12 tile-label">Deposit</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps :to="{ name: 'app-multisig-wallet-psts', params: { wallethash: wallet.getWalletHash() } }" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-text-box" class="col-12" color="primary" style="position:relative">
                        <q-badge color="red" v-if="psts?.length > 0" style="margin-right: 20px;" floating>
                        {{ psts.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label">Proposals</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn  flat dense no-caps :to="{ name: 'app-multisig-wallet-addresses', params: { wallethash: wallet.getWalletHash() } }" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-text-box-multiple" class="col-12" color="primary" style="position:relative">
                      </q-icon>
                      <div class="col-12 tile-label">Addresses</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps @click="openWalletActionsDialog" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="more_horiz" class="col-12" color="primary"></q-icon>
                      <div class="col-12 tile-label">More</div>
                    </div>
                  </template>
                </q-btn>
              </div>
            </div>
            <q-list>
              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label>Id</q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label class="flex flex-wrap items-center">
                   <span>{{ shortenString(`${wallet.id}`, 20)}}</span>
                 </q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item>
                <q-item-section>
                  <q-item-label>Required Signatures</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ wallet.m }} of {{ wallet.signers.length }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item v-for="signer, i in wallet.signers" :key="`app-multisig-view-signer-${i}`">
                <q-item-section>
                  <q-item-label
                    class="text-capitalize text-bold"
                    style="font-variant-numeric: proportional-nums">
                    {{ signer.name }} <q-icon v-if="hdPrivateKeys?.[signer.xpub]" name="key" color="warning"></q-icon>
                  </q-item-label>
                  <q-item-label caption >{{ shortenString(signer.xpub, 20) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption><CopyButton :text="signer.xpub"/></q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-expansion-item v-model="balancesExpanded">
                <template v-slot:header>
                  <q-item-section>
                    Balances
                  </q-item-section>
                </template>
                <q-item clickable :to="{name: 'app-multisig-wallet-asset', params: {wallethash: wallet.getWalletHash()}, query: { asset: 'bch' } }">
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
                          <q-img v-if="balancesTokenIdentities[asset]?.uris?.icon" :src="balancesTokenIdentities[asset]?.uris?.icon"></q-img>
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
import UploadWalletDialog from 'components/multisig/UploadWalletDialog.vue'
import WalletExportOptionsDialog from 'components/multisig/WalletExportOptionsDialog.vue'
import WalletQrDialog from 'components/multisig/WalletQrDialog.vue'
import { cborEncode } from '@ngraveio/bc-ur/dist/cbor'

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
  cashAddressNetworkPrefix
} = useMultisigHelpers()
const balances = ref()
const balancesTokenIdentities = ref({})
const balancesExpanded = ref(true)
const balancesRefreshing = ref(false)
const balanceConvertionRates = ref()

const hdPrivateKeys = ref()

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
      resolveXprvOfXpub
    })
  }
  return null
})

const psts = computed(() => {
  const psbts = $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)
  return psbts?.map(psbtBase64 => {
    return Pst.fromPsbt(psbtBase64)
  })
})

const assetPrice = computed(() => {
  if (balanceConvertionRates.value?.length > 0) {
    const b = balanceConvertionRates.value?.find(priceData => (
       priceData.relative_currency?.toLowerCase() === 'bch'
    ))
    return b?.[`assetPriceIn${b?.currency}Text`] || ''
  }
})

const uploadWallet = () => {
  $q.dialog({
    component: UploadWalletDialog,
    componentProps: {
      multisigWallet: wallet.value,
      darkMode: darkMode.value
    }
  }).onOk(async () => {
    await $store.dispatch('multisig/uploadWallet', wallet.value)
  })
}

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

const showWalletExportOptionsDialog = () => {
  $q.dialog({
    component: WalletExportOptionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      wallet: wallet.value,
      cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
    }
  }).onOk((payload) => {
    if (payload?.action === 'display-qr') {
      showWalletQrDialog()
    } else if (payload?.action === 'download-wallet') {
      downloadWalletFile(payload.wallet || wallet.value)
    } else {
      openWalletActionsDialog()
    }
  }).onCancel(() => {
    // Dialog was closed without action
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


const openWalletActionsDialog = () => {
  const disableActions = []
  if (psts.value?.length > 0) {
    disableActions.push('send-bch')
    disableActions.push('import-tx')
  }

  $q.bottomSheet({
    title: 'Wallet Options',
    grid: true,
    actions: [
      {
        icon: 'delete_forever',
        label: 'Delete Wallet',
        value: 'delete-wallet',
        color: 'red'
      },
      {
        icon: 'cloud_upload',
        label: 'Sync Wallet',
        value: 'sync-wallet',
        color: 'primary'
      },
      {
        icon: 'mdi-file-export',
        label: 'Export Wallet',
        value: 'export-wallet',
        color: 'primary'
      }
    ],
    class: `${getDarkModeClass(darkMode.value)} custom-bottom-sheet pt-card text-bow justify-between`

  }).onOk(async (action) => {
    if (action.value === 'delete-wallet') {
       $q.dialog({
          message: 'Are you sure you want to delete wallet?',
          ok: { label: 'Yes' },
          cancel: { label: 'No' },
          class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        }).onOk(() => {
          wallet.value.delete({ sync: false })
          router.push({ name: 'app-multisig' })
        }).onCancel(() => {
          openWalletActionsDialog()
        })
    }
    if (action.value === 'sync-wallet') {
      uploadWallet()
    }
    if (action.value === 'export-wallet') {
      showWalletExportOptionsDialog()
    }
  })
}

const loadHdPrivateKeys = async (signers) => {
  if (!hdPrivateKeys.value) {
    hdPrivateKeys.value = {}
  }
  for (const signer of signers) {
    try {
      const xprv = await getSignerXPrv({
        xpub: signer.xpub
      })
      if (xprv) {
        hdPrivateKeys.value[signer.xpub] = xprv
      }
      
    } catch (e) {} // getSignerXPrv throws if xprv not found, we'll just ignore
  }
}

const loadCashtokenIdentitiesToBalances = async() => {
  const promises = []
  for(const asset of Object.keys(balances.value || {})) {
    if (asset === 'bch') continue
    const tokenIdentityPromise = async () => {
      const tk = await getAssetTokenIdentity(asset)
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

watch(wallet.value, async (newWallet) => {
  if (!wallet.value) {
    router.push({ name: 'app-multisig' })
  }
})

onMounted(async () => {
  try {
    await loadHdPrivateKeys(wallet.value?.signers)

    balancesRefreshing.value = true
    balances.value = await wallet.value.getWalletBalances()
    await refreshBalance()

    if (balances.value) {
      balances.value = sortObjectKeys(balances.value)
    }
    
    await loadCashtokenIdentitiesToBalances()

  } 
  catch (error) {
    // ! Notify warning
  }
  finally {
    balancesRefreshing.value = false
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
