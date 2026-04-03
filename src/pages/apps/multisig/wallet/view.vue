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
      <div class="col-xs-12 q-px-xs">
        <template v-if="wallet">
            <div class="row q-mb-lg justify-center">
              <div class="col-xs-12 q-px-sm">
                <q-card id="bch-card" style="border-radius: 15px; color:white">
                  <div class="flex justify-between items-center q-mt-md q-mx-md">
                    <div class="flex items-center q-gutter-x-sm">
                      <q-icon name="wallet" size="sm"></q-icon>
                      <span class="text-bold text-h6">{{wallet.name}}</span>
                    </div>
                    <q-icon v-if="wallet.isOnline()" name="mdi-cloud-check" size="sm" flat></q-icon>
                  </div>
                  <q-card-section class="row items-center justify-between">
                    <div class="flex justify-start items-center q-gutter-x-sm">
                      <q-icon name="img:bitcoin-cash-circle.svg" size="md"></q-icon>
                      <div class="text-h6 text-bold">
                        <q-skeleton 
                          v-if="balances?.['bch'] === undefined || balancesRefreshing"
                          type="text" 
                          width="5em" 
                          height="2.7em"
                        >
                        </q-skeleton>
                        <span v-else>{{ (balances?.['bch'] ?? 0) / 1e8 }}</span>
                      </div>
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
              <div class="col-xs-12 flex justify-between no-wrap q-gutter-x-xs q-mt-md">
                <q-btn flat dense no-caps @click="showWalletDepositDialog" class="tile col" size="14px" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-avatar>
                        <q-img src="app-receive.svg" height="20px" width="20px"></q-img>
                      </q-avatar>
                      <div class="col-12 tile-label" style="font-size: 13px;">{{ $t('Deposit') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn v-if="proposals && proposals.length > 0 || !proposalsFromServer?.length" flat dense no-caps :to="{ name: 'app-multisig-wallet-psts', params: { wallethash: wallet.walletHash } }" class="tile col" size="14px" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-text-box-outline" class="col-12" size="20px" style="position:relative" :class="getDarkModeClass(darkMode)">
                        <q-badge color="red" v-if="proposals?.length > 0" style="margin-right: 20px;" floating>
                        {{ proposals.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label" style="font-size: 13px;">{{ $t('Proposals') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn v-else-if="proposalsFromServer?.length > 0" @click="() => showProposalsImportSelectionDialog()" flat dense no-caps size="14px" class="tile col" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-cloud-outline" class="col-12" size="20px" color="primary" style="position:relative">
                        <q-badge color="red" v-if="proposalsFromServer?.length > 0" style="margin-right: 20px;" floating>
                        {{ proposalsFromServer.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label" style="font-size: 13px;">{{ $t('Proposals') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps @click="() => handleShareWalletAction()" size="14px" class="tile col" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-share" class="col-12" size="20px" style="position:relative">
                      </q-icon>
                      <div class="col-12 tile-label" style="font-size: 13px;">{{ $t('Share') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps @click="() => openWalletActionsDialog()" class="tile col" size="14px">
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="more_horiz" class="col-12" size="20px"></q-icon>
                      <div class="col-12 tile-label" style="font-size: 13px;">{{ $t('More') }}</div>
                    </div>
                  </template>
                </q-btn>
              </div>
            </div>
            <q-list>
              <q-separator spaced inset />
              <q-item v-if="wallet.isOnline()">
                <q-item-section>
                  <q-item-label><q-icon name="mdi-identifier" size="sm" ></q-icon><q-icon name="mdi-cloud-check" size="xs" ></q-icon></q-item-label>
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
              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label class="text-subtitle2">{{ $t('RequiredSignatures') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ wallet.m }} of {{ wallet.signers.length }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-expansion-item v-if="wallet.signers?.length > 3" :label="$t('Signers')">
                <q-item>
                  <q-item-section>
                    <div class="flex flex-wrap items-center q-gutter-xs ellipsis">
                      <q-chip v-for="signer, i in wallet.signers?.sort((sa, sb) => (sa.name || '').localeCompare((sb.name || '')))" :key="`app-multisig-view-signer-${i}`" style="height:fit-content" flat dense class="q-px-md">
                        <q-avatar>
                          <q-icon v-if="Boolean(signer?.xprv)" name="mdi-account-key" size="sm" style="color:#D4AF37"></q-icon>
                          <q-icon v-else name="person" size="sm"></q-icon>
                        </q-avatar>
                        <div class="flex flex-column">
                          <div class="ellipsis" style="max-width:5em">
                            {{ signer.name }}
                          </div>
                        </div>
                      </q-chip>
                    </div>
                  </q-item-section>
                </q-item>
              </q-expansion-item>
              <q-item v-else>
                <q-item-section>
                  <q-item-label class="text-subtitle2 q-mb-md">{{ $t('Signers') }}</q-item-label>
                  <div class="flex flex-wrap items-center q-gutter-xs ellipsis">
                    <q-chip v-for="signer, i in wallet.signers?.sort((sa, sb) => (sa.name || '').localeCompare((sb.name || '')))" :key="`app-multisig-view-signer-${i}`" style="height:fit-content" flat dense class="q-px-md">
                      <q-avatar>
                        <q-icon v-if="Boolean(signer?.xprv)" name="mdi-account-key" size="sm" style="color:#D4AF37"></q-icon>
                        <q-icon v-else name="person" size="sm"></q-icon>
                      </q-avatar>
                      <div class="flex flex-column">
                        <div class="ellipsis" style="max-width:5em">
                          {{ signer.name }}
                        </div>
                      </div>
                    </q-chip>
                  </div>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-expansion-item v-model="balancesExpanded">
                <template v-slot:header>
                  <q-item-section class="text-subtitle2">
                    {{ $t('Balances') }}
                  </q-item-section>
                </template>
                <q-item clickable :to="{name: 'app-multisig-wallet-asset', params: { wallethash: wallet.walletHash }, query: { asset: 'bch' } }">
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
                <template v-if="balancesRefreshing">
                  <q-item v-for="i in 3" :key="i">
                    <q-item-section>
                      <div class="flex items-center q-gutter-x-sm">
                        <q-skeleton type="QAvatar" size="md" />
                        <div>
                          <q-skeleton type="text" width="80px" class="q-mb-xs" />
                          <q-skeleton type="text" width="120px" />
                        </div>
                      </div>
                    </q-item-section>
                    <q-item-section side>
                      <q-skeleton type="text" width="60px" />
                    </q-item-section>
                  </q-item>
                </template>
                <template v-else>
                  <q-item v-for="asset in Object.keys(balances || {}).filter(a => a !== 'bch' && Number(balances[a] || 0) > 0)" clickable :to="{name: 'app-multisig-wallet-asset', params: { wallethash: wallet.walletHash}, query: { asset }}">
                      <q-item-section>
                        <div class="flex items-center q-gutter-x-sm">
                          <q-avatar size="md">
                            <q-img v-if="tokenIdentities[asset]?.uris?.icon" :src="assetIconUrl(tokenIdentities[asset]?.uris?.icon)"></q-img>
                            <q-icon v-else name="token" size="md"></q-icon>
                          </q-avatar>
                          <div>
                            <div v-if="tokenIdentities[asset]?.token?.symbol">
                              <div class="text-bold">{{tokenIdentities[asset].token.symbol}} </div>
                              <sub  style="filter: brightness(80%)">{{tokenIdentities[asset].name}} [{{ shortenString(asset, 13) }}]</sub>
                            </div>
                            <div v-else-if="tokenIdentities[asset]?.name">
                              <div class="text-bold">{{tokenIdentities[asset].name}}</div>
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
                </template>
              </q-expansion-item>
            </q-list>
        </template>
        <template v-else>
          <div class="row q-mb-lg justify-center">
            <div class="col-xs-12">
              <q-card class="q-ma-md" style="border-radius: 15px;">
                <div class="flex justify-between items-center q-ma-md">
                  <div class="flex items-center q-gutter-x-sm">
                    <q-skeleton type="QAvatar" size="sm" />
                    <q-skeleton type="text" width="150px" height="24px" />
                  </div>
                  <q-skeleton type="QAvatar" size="sm" />
                </div>
                <q-card-section class="row items-center justify-between">
                  <div class="flex justify-start items-center q-gutter-x-sm">
                    <q-skeleton type="QAvatar" size="md" />
                    <q-skeleton type="text" width="100px" height="28px" />
                    <q-skeleton type="QAvatar" size="md" />
                  </div>
                  <div class="col-xs-12 q-mt-md">
                    <q-skeleton type="text" width="80px" height="16px" />
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-xs-12 flex justify-between no-wrap q-gutter-x-xs">
              <q-skeleton type="rect" class="tile col" height="60px" style="border-radius: 8px;" />
              <q-skeleton type="rect" class="tile col" height="60px" style="border-radius: 8px;" />
              <q-skeleton type="rect" class="tile col" height="60px" style="border-radius: 8px;" />
              <q-skeleton type="rect" class="tile col" height="60px" style="border-radius: 8px;" />
            </div>
          </div>
          <q-list>
            <q-separator spaced inset />
            <q-item>
              <q-item-section>
                <q-skeleton type="text" width="100px" height="14px" />
              </q-item-section>
              <q-item-section side>
                <q-skeleton type="text" width="150px" height="14px" />
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-skeleton type="text" width="120px" height="14px" />
              </q-item-section>
              <q-item-section side>
                <q-skeleton type="text" width="60px" height="14px" />
              </q-item-section>
            </q-item>
            <q-separator spaced inset />
            <q-item>
              <q-item-section>
                <q-skeleton type="text" width="80px" height="14px" class="q-mb-md" />
                <div class="flex q-gutter-xs">
                  <q-skeleton type="QChip" width="80px" />
                  <q-skeleton type="QChip" width="80px" />
                  <q-skeleton type="QChip" width="80px" />
                </div>
              </q-item-section>
            </q-item>
            <q-separator spaced inset />
            <q-item>
              <q-item-section>
                <q-skeleton type="text" width="70px" height="14px" />
              </q-item-section>
            </q-item>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, useInterval } from 'quasar'
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Platform } from 'quasar';
import Big from 'big.js'
import { binToBase64, hexToBin, secp256k1, sortObjectKeys } from 'bitauth-libauth-v3'
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
import ShareWalletOptionsDialog from 'components/multisig/ShareWalletOptionsDialog.vue'
import WalletQrDialog from 'components/multisig/WalletQrDialog.vue'
import ImportProposalSelectionDialog from 'components/multisig/ImportProposalSelectionDialog'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { registerInterval, removeInterval } = useInterval()
const { 
  multisigCoordinationServer, 
  multisigNetworkProvider, 
  resolveXprvOfXpub,
  getAssetTokenIdentity,
  cashAddressNetworkPrefix,
  resolveMnemonicOfXpub
} = useMultisigHelpers()
const balances = ref()
const tokenIdentities = ref({})
const balancesExpanded = ref(true)
const balancesRefreshing = ref(false)
const balanceConvertionRates = ref()
const walletSyncing = ref(false)
const pstFileElementRef = ref()
const pstFileModel = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = ref()

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
    refreshBalance()
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

const showCoordinatorUnverifiedConfirmationDialog = async () => {
  return await new Promise((resolve) => {
    $q.dialog({
      title: `<div class="flex items-center q-gutter-x-sm"><i class="q-icon text-orange mdi mdi-alert" aria-hidden="true"> </i><span>${$t('Warning')}</span></div>`,
      message: $t('CoordinatorVerificationFailedMessage', {}, 'Unable to verify coordinator. The coordinator either did not attach a stamp to this proposal or the stamp is invalid.<br><br><span class="text-caption text-bow-muted">A Proposal Stamp is a signature created by signing the unsigned transaction hash using the coordinator\'s Auth Private Key (derived at path 999/0).</span><br><br>Do you want to proceed with importing this proposal?'),
      ok: { 
        label: $t('YesProceed', {}, 'Yes, Proceed'),
        color: 'primary',
        rounded: true,
        class: `button-default ${getDarkModeClass(darkMode.value)}`,
        noCaps: true
      },
      cancel: { 
        label: $t('No'),
        color: 'default',
        outline: true,
        rounded: true,
        noCaps: true,
        class: `button-default ${getDarkModeClass(darkMode.value)}`,
      },
      html: true,
      class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
    }).onOk(() => {
      resolve('yes')
    }).onCancel(() => {
      resolve('no')
    })
  })
}

const showProposalsImportSelectionDialog = () => {
  const decodedProposals = []

  for(const p of proposalsFromServer.value) {
    if (p.proposalFormat && p.proposalFormat !== 'psbt') continue 
    try {
      const decoded = Pst.import(p.combinedPsbt || p.proposal) 
      decoded.id = p.id     
      decoded.coordinatorProposalSignature = p.coordinatorProposalSignature
      decoded.coordinatorProposalSignatureScheme = p.coordinatorProposalSignatureScheme
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
      let coordinatorVerified = false 
      if (selectedProposal.coordinatorProposalSignature) {
        if (selectedProposal.coordinatorProposalSignatureScheme === 'schnorr') {
          coordinatorVerified = secp256k1.verifySignatureSchnorr(
            hexToBin(selectedProposal.coordinatorProposalSignature),
            hexToBin(selectedProposal.coordinatorInfo.authPublicKey),
            hexToBin(selectedProposal.unsignedTransactionHash)
          )
        }
      }
      
      if (!coordinatorVerified) {
        const proceed = await showCoordinatorUnverifiedConfirmationDialog()
        if (proceed === 'no') return
      }

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

const downloadWalletFile = async (walletToExport) => {

  try {
    const cborEncoded = cborEncode(walletToExport.export())
    const data = binToBase64(cborEncoded)
    const fullFilename = generateFilename(walletToExport)
      
    if (Platform.is.nativeMobile) {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        await Filesystem.requestPermissions();
      }
      const result = await Filesystem.writeFile({
        path: fullFilename,
        data: data, 
        directory: Directory.Cache, 
        encoding: 'utf8' 
      });

      return await Share.share({
        title: $t('DownloadOrShareFile'),
        url: result.uri,
      });
    } 

    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fullFilename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a)
      }, 100)
    
  } catch (error) {
    if (error?.message.includes('Share canceled')) return
    $q.notify({
      type: 'error',
      message: `Error: ${error.message}`,
      color: 'negative'
    })
  }
  
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
    component: ShareWalletOptionsDialog,
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

const openWalletActionsDialog = () => {
  $q.bottomSheet({
    title: $t('MoreOptions'),
    grid: true,
    persistent: false,
    actions: [
      {
        icon: 'collections',
        label: $t('Nfts', {}, 'Nfts'),
        value: 'view-nfts',
        color: 'primary'
      },
      {
        icon: 'mdi-file-cog',
        label: $t('WalletSettings', {}, 'Wallet Settings'),
        value: 'view-wallet-settings',
        color: 'primary'
      },
      {
        icon: 'delete_forever',
        label: $t('DeleteWallet'),
        value: 'delete-wallet',
        color: 'red'
      },

    ],
    class: `${getDarkModeClass(darkMode.value)} custom-bottom-sheet pt-card text-bow justify-between`

  }).onOk((action) => {
    if (action.value === 'delete-wallet') {
      handleDeleteWalletAction()
    }
    if (action.value === 'share-wallet') {
      handlShareWalletAction()
    }
    if (action.value === 'view-wallet-settings') {
      router.push({ name: 'app-multisig-wallet-settings', params: { wallethash: route.params.wallethash } })
    }
    if (action.value === 'view-nfts') {
      router.push({ name: 'app-multisig-wallet-nfts', params: { wallethash: route.params.wallethash} })
    }
  })
}

const discoverTokenIdentities = async (balances) => {
  const assets = Object.keys(balances || {}).filter(asset => asset && asset !== 'bch')
  
  const results = await Promise.all(
    assets.map(async (asset) => ({
      asset,
      identity: await getAssetTokenIdentity(asset)
    }))
  )
  return Object.fromEntries(results.map(r => [r.asset, r.identity]))
}

const refreshBalance = async () => {
  try {
    balancesRefreshing.value = true
    balances.value = await wallet.value.getWalletBalances()
    if (balances.value) {
      balances.value = sortObjectKeys(balances.value)
    }
    const [r1, r2]  = await Promise.allSettled([
      wallet.value.convertBalanceToCurrencies(
        'bch',
        (balances.value?.['bch'] || 0) / 1e8,
        [$store.getters['market/selectedCurrency'].symbol]
      ),
      discoverTokenIdentities(balances.value)
    ])

    if (r1.status === 'fulfilled') {
      balanceConvertionRates.value = r1.value
    }
    if (r2.status === 'fulfilled') {
      tokenIdentities.value = r2.value
    }
  } catch (error) {} finally {
    balancesRefreshing.value = false
  }
}

const refreshPage = async (done) => {
  try {
    balancesRefreshing.value = true
    await refreshBalance()
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
    pstFileModel.value = null
  }
  reader.readAsText(file)
}

const queryServerForProposals = async () => {
  if ((!proposals.value || proposals.value?.length === 0) && wallet.value?.id) {
    proposalsFromServer.value = await wallet.value?.fetchProposals()
    registerInterval(() => {
      if (proposals.value?.length > 0 || proposalsFromServer.value?.length > 0) {
        removeInterval()
        return
      }
      wallet.value?.fetchProposals().then((p) => {
        if ((!proposals.value || proposals.value?.length === 0) && wallet.value?.id) {
          proposalsFromServer.value = p
        }
      })
    }, 3000)
  }
}

const init = async () => {
  
  const responses = await Promise.allSettled([
    wallet.value?.sync(),
    wallet.value?.loadSignersXPrv(),
    refreshBalance(),
    queryServerForProposals()
  ])

  for (const response of responses) {
    if (response?.status === 'rejected') {
      $q.notify({
        type: 'warning',
        message: `Warning: ${response?.reason}`,
        color: 'warning'
      })
    }
  }
}

onMounted(async () => {
  try {
    const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
    if (savedWallet) {
      wallet.value = MultisigWallet.importFromObject(savedWallet, {
        store: $store,
        provider: multisigNetworkProvider,
        coordinationServer: multisigCoordinationServer,
        resolveXprvOfXpub,
        resolveMnemonicOfXpub
      })
    }

    setTimeout(() => {
      init()
    }, 500)
    
    
  } catch (error) {
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
