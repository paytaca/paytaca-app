<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      backnavpath="/apps/multisig"
      class="header-nav"
    />
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-8 q-px-xs">
        <template v-if="wallet">
            <div class="row q-mb-lg justify-center">
              <div class="col-xs-12 flex items-center justify-center q-mb-lg">
                <div class="text-h6 q-mr-md">{{wallet.name}}</div>
                <q-btn 
                  size="md"
                  :icon="isMultisigWalletSynced(wallet)? 'mdi-cloud-check': 'mdi-cloud-upload'" 
                  :color="isMultisigWalletSynced(wallet)? 'green': 'grey'"
                  flat 
                  dense
                  @click="syncWallet"
                >
                </q-btn>
              </div>
              <div class="col-xs-12 q-mb-lg">
                <div class="items-center justify-center q-gutter-y-md">
                  <div class="text-grey-6 text-center">BCH Balance</div>
                  <div class="flex justify-center items-center q-gutter-x-sm">
                    <q-icon name="img:bitcoin-cash-circle.svg" size="md"></q-icon>
                    <span style="font-size: 1.5em" class="text-bold">{{ balances?.['bch'] ? balances?.['bch'] / 1e8 : "..." }}</span>
                    <q-btn 
                      @click="refreshBalance"
                      :icon="!balancesRefreshing? 'refresh': ''"
                      :loading="balancesRefreshing"
                      flat dense>
                      <template v-slot:loading>
                        <q-spinner-facebook></q-spinner-facebook>
                      </template>
                    </q-btn>
                  </div>
                </div>
              </div>
              <div class="col-xs-12 flex justify-between">
                <q-btn flat dense no-caps @click="showWalletReceiveDialog" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="send_and_archive" class="col-12" color="primary"></q-icon>
                      <div class="col-12 tile-label">Deposit</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps :to="{ name: 'app-multisig-wallet-proposals-view', params: { wallethash: wallet.getWalletHash() } }" class="tile" v-close-popup>
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
                <q-btn flat dense no-caps :to="{ name: 'app-multisig-wallet-addresses', params: { wallethash: wallet.getWalletHash() } }" class="tile" v-close-popup>
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
                  <!-- <q-item-label>Address - {{ wallet.lockingData?.hdKeys?.addressIndex}}</q-item-label> -->
                  <q-item-label>Address - 0 </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label >
                    {{ shortenString(wallet.getDepositAddress(0).address, 32) }} <CopyButton :text="wallet.getDepositAddress(0).address"/>
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
                            <div class="text-bold">{{balancesTokenIdentities[asset].token.symbol}}</div>
                            <sub  style="filter: brightness(80%)">{{balancesTokenIdentities[asset].name}}</sub>
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
import { useQuasar, QSpinnerDots } from 'quasar'
import Big from 'big.js'
import HeaderNav from 'components/header-nav'
import { withTimeout } from 'src/utils/async-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  isMultisigWalletSynced,
  generateFilename,
  MultisigWallet,
  Pst
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'components/CopyButton.vue'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import UploadWalletDialog from 'components/multisig/UploadWalletDialog.vue'
import { CashAddressNetworkPrefix, sortObjectKeys } from 'bitauth-libauth-v3'
import { WatchtowerNetwork, WatchtowerNetworkProvider, WatchtowerCoordinationServer } from 'src/lib/multisig/network'
import { createXprvFromXpubResolver } from 'src/utils/multisig-utils'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getSignerXPrv, getAssetTokenIdentity } = useMultisigHelpers()
const balances = ref()
const balancesTokenIdentities = ref({})
const balancesExpanded = ref(true)
const balancesRefreshing = ref(false)
const hdPrivateKeys = ref()
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  console.log('SAVED WALLET', savedWallet)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: new WatchtowerNetworkProvider({
        network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
      }),
      coordinationServer: new WatchtowerCoordinationServer({
        network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
      }),
      resolveXprvOfXpub: createXprvFromXpubResolver({
        walletVault: $store.getters['global/getVault']
      })
    })
  }
  return null
})

const transactions = computed(() => {
  return $store.getters['multisig/getTransactionsByWalletAddress']({
    address: route.params.address
  })?.filter(mt => mt.broadcastStatus !== 'done')
})

const psts = computed(() => {
  return $store.getters['multisig/getPstsByWalletHash'](route.params.wallethash)?.filter(p => !p.broadcastResult).map(p => Pst.fromObject(p))
})


// const deleteWallet = async () => {
//   await wallet.value.delete({ sync: false })
//   router.push({ name: 'app-multisig' })
// }

const exportWallet = () => {
  const data = wallet.value.exportToBase64()
  const blob = new Blob([data], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = generateFilename(wallet.value)
  document.body.appendChild(a)
  a.click()
}

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

const syncWallet = async () => {

  try {

    $q.loading.show({
      spinner: QSpinnerDots,
      spinnerColor: 'primary',
      messageColor: 'primary',
      message: 'Syncing...'
    })

    await withTimeout(wallet.value.sync(), 8000, 'Request timed-out!')
    
  } catch (error) {

    $q.notify({
        type: 'Warning',
        message: error,
        position: 'bottom',
        timeout: 3000,
        color: 'dark'
    })

  } finally {
    $q.loading.hide()
  }
}
const showWalletReceiveDialog = () => {
  const addressPrefix = $store.getters['global/isChipnet'] ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
  $q.dialog({
    component: WalletReceiveDialog,
    componentProps: {
      darkMode: darkMode.value,
      multisigWallet: wallet.value,
      cashAddressNetworkPrefix: addressPrefix
    }
  }).onOk(() => {
    openWalletActionsDialog()
  })
}

const openWalletActionsDialog = () => {
  const disableActions = []
  if (transactions.value?.length > 0) {
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
      console.log('delete wallet')
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
      exportWallet()
    }
  })

  // // $q.dialog({
  // //   component: WalletActionsDialog,
  // //   componentProps: {
  // //     darkMode: darkMode.value,
  // //     txProposals: transactions?.value,
  // //     isMultisigWalletSynced: isMultisigWalletSynced(wallet.value),
  // //     disable: disableActions,
  // //     onUploadWallet: () => {
  // //       uploadWallet()
  // //     },
  // //     onExportWallet: () => {
  // //       exportWallet()
  // //     },
  // //     onDeleteWallet: () => {
  // //       $q.dialog({
  // //         message: 'Are you sure you want to delete wallet?',
  // //         ok: { label: 'Yes' },
  // //         cancel: { label: 'No' },
  // //         class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  // //       }).onOk(() => {
  // //         deleteWallet(route.params.address)
  // //       }).onCancel(() => {
  // //         openWalletActionsDialog()
  // //       })
  // //     },
  // //     onViewTxProposals: () => {
  // //       router.push({ name: 'app-multisig-wallet-transactions', params: { address: route.params.address } })
  // //     }
  // //   }
  // })
}

const onTxProposalClick = async () => {
  await $store.dispatch('multisig/fetchTransactions', wallet.value)
  if (transactions.value.length > 0) {
    router.push({
      name: 'app-multisig-wallet-transactions',
      params: { address: route.params.address }
    })
  }
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
  } catch (error) {} finally {
    balancesRefreshing.value = false
    balances.value = await wallet.value.getWalletBalances()
    if (balances.value) {
      balances.value = sortObjectKeys(balances.value)
    }
  }
}

watch(wallet.value, async (newWallet) => {
  if (!wallet.value) {
    router.push({ name: 'app-multisig' })
  }
})

onMounted(async () => {
  try {
    balancesRefreshing.value = true
    balances.value = await wallet.value.getWalletBalances()

    if (balances.value) {
      balances.value = sortObjectKeys(balances.value)
    }
    await loadHdPrivateKeys(wallet.value?.signers)
    await loadCashtokenIdentitiesToBalances()
  } 
  catch (error) {}
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

</style>i
