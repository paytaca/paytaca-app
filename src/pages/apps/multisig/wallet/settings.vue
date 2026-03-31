<template>
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
        <header-nav :title="$t('WalletSettings', {}, 'Wallet Settings')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}`" class="header-nav header-nav apps-header" />
        <div v-if="wallet" class="row text-bow" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
          <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('AboutWallet', {}, 'About Wallet') }}</p>
              <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
                <q-item clickable v-ripple @click="openRenameDialog()">
                  <q-item-section>
                    <q-item-label caption>{{ $t('WalletType') }}</q-item-label>
                    <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                      Multisig Wallet
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="openRenameDialog()">
                  <q-item-section>
                    <q-item-label caption>{{ $t('WalletName') }}</q-item-label>
                    <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                      {{ wallet.name }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                    <q-icon name="edit" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>{{ $t('RequiredSignatures') }}</q-item-label>
                    <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                      {{ wallet.m }} of {{ wallet.signers.length }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="wallet?.isOnline()">
                  <q-item-section>
                    <q-item-label caption >{{ $t('WalletId', {}, 'Wallet Id').toUpperCase() }}</q-item-label>
                    <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                      {{ wallet.id }} 
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-icon name="mdi-cloud-outline"></q-icon>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>{{ $t('WalletHash') }}</q-item-label>
                    <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                      {{ shortenString(wallet.walletHash, 20) }} 
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <CopyButton :text="wallet.walletHash" />
                  </q-item-section>
                </q-item>
                <q-item-label header>Signers</q-item-label>
                <q-item v-for="signer in wallet.signers" :key="signer.xpub" >
                    <q-item-section>
                        <q-list class="settings-list" :class="getDarkModeClass(darkMode)">
                            <q-item>
                                <q-item-section>
                                <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                                    {{ signer.name }}
                                </q-item-label>
                                </q-item-section>
                                <q-item-section avatar>
                                    <q-icon v-if="hdPrivateKeys?.[signer.xpub]" name="mdi-account-key" size="sm" style="color:#D4AF37"></q-icon>
                                    <q-icon v-else name="person" size="sm" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                                </q-item-section>
                              </q-item>
                            <q-item-label caption>
                                <div class="flex nowrap justify-between q-ma-sm">
                                    <div class="text-bold">Master Fingerprint:</div>
                                    <div>{{ signer.masterFingerprint }}</div>
                                </div>
                            </q-item-label>
                            <q-item-label caption>
                                <div class="flex nowrap justify-between q-ma-sm">
                                    <div class="text-bold">XPub:</div>
                                    <div>{{ shortenString(signer.xpub, 15) }}</div>
                                </div>
                            </q-item-label>
                            <q-item-label caption>
                                <div class="flex nowrap justify-between q-ma-sm">
                                    <div class="text-bold">Derivation Path:</div>
                                    <div>{{ signer.path || `m/44'/145'/0'` }}</div>
                                </div>
                            </q-item-label>
                            <q-item-label caption>
                                <div class="flex nowrap justify-between q-ma-sm">
                                    <div class="text-bold">{{ $t('CanSignOnThisDevice', {}, 'Can Sign On This Device?') }}</div>
                                    <div>{{ hdPrivateKeys?.[signer.xpub] ? 'Yes' : 'No' }}</div>
                                </div>
                            </q-item-label>
                            <q-item-label caption v-if="hdPrivateKeys?.[signer.xpub]">
                                <div class="flex nowrap justify-between q-ma-sm">
                                    <div class="text-bold">{{ $t('SignerServerIdentityId', {}, `Signer's Server Identity ID`) }}:</div>
                                    <div>{{ signer.serverIdentityId || 'None' }}</div>
                                </div>
                            </q-item-label>
                            <div class="flex  justify-end q-my-md q-mx-sm q-gutter-x-sm ">
                              <q-btn v-if="hdPrivateKeys?.[signer.xpub]" @click="openCreateServerIdentityDialog(signer)" text-color="primary" rounded no-caps dense>{{ $t('CreateMultisigServerIdentity', {}, 'Create Server Identity') }}</q-btn> 
                              <CopyButton :text="JSON.stringify(signer)" :label="$t('CopySignerDetails', {}, 'Copy Signer Details')" color="primary"/>
                            </div>
                        </q-list>
                    </q-item-section>
                </q-item>
              </q-list>
          </div>
          <div v-if="wcActiveSessions" class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('WalletConnect') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-expansion-item :model-value="true" :label="$t('ActiveSessions')">
                <q-item v-for="session in wcActiveSessions" :key="session.topic">
                    <q-item-section avatar>
                      <q-avatar v-if="session.peer.metadata.icons?.length > 0">
                          <img :src="session.peer.metadata.icons[0]" alt="">
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="ellipsis">ID: {{ session.topic }}</q-item-label>
                      <q-item-label class="pt-label q-gutter-y-sm" :class="getDarkModeClass(darkMode)">
                        <div class="ellipsis">{{ session.peer.metadata.name }}</div>
                        <div v-if="session.peer.metadata.url">
                          {{ session.peer.metadata.url }}
                        </div>
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn 
                        @click="() => wcDisconnectSession(session)" 
                        icon="mdi-connection" color="red" 
                        rounded flat no-caps
                        :loading="wcProcessingSession[session.topic]"
                        >
                      </q-btn>
                    </q-item-section>
                </q-item>
                <q-item v-if="wcActiveSessions?.length === 0">
                  <q-item-section>
                    <q-item-label caption>
                      {{ $t("NoActiveSessions") }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-expansion-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>{{ $t('DefaultAccount', {}, 'Default Account (Address 0)') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" >
                    <div style="overflow-wrap: break-word">{{ wallet.wcGetDefaultAddress() }} </div>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                    {{ $t('ReserveWcAccountUtxos', {}, 'Reserve WalletConnect Account UTXOs?') }}
                  </q-item-label>
                  <q-item-label caption class="pt-sm">
                    {{ $t('ReserveWcAccountUtxosDesc', {}, `If "Yes", balances of the Default Account are reserved for WalletConnect transactions only`) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="flex items-center">
                    {{ $t('No') }}
                    <q-toggle
                      :model-value="wallet?.settings?.reserveWcAccountUtxos ?? true"
                      @update:model-value="toggleReserveWcAccountUtxos"
                      :color="toggleColor"
                      keep-color
                    />
                    {{ $t('Yes') }}
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('CosignerCoordination') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              
              <q-item>
                <q-item-section>
                  <q-item-label caption>{{ $t('WalletSetupSharing', {}, 'Wallet Setup Sharing') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                    {{ wallet.isOnline() ? 'Online or Offline (out-of-band)': 'Offline (out-of-band) only' }} 
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>{{ $t('TransactionSigning', {}, 'Transaction Signing') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                    {{ wallet.isOnline() ? 'Online or Offline (out-of-band)': 'Offline (out-of-band) only' }} 
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item clickable v-ripple @click="confirmDeleteWallet">
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)" style="color: #f44336;">
                    {{ $t('DeleteWallet') }}
                  </q-item-label>
                  <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                    {{ $t('DeleteWalletWarning', {}, 'Permanently remove this wallet and all its data. This action cannot be undone.') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section avatar>
                  <q-icon name="delete_forever" color="red"></q-icon>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
        <template v-else >
          <div class="row text-bow" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
            <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
              <q-skeleton type="text" width="120px" />
            </p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item>
                <q-item-section>
                  <q-item-label caption><q-skeleton type="text" width="80px" /></q-item-label>
                  <q-item-label class="pt-label"><q-skeleton type="text" width="140px" /></q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption><q-skeleton type="text" width="80px" /></q-item-label>
                  <q-item-label class="pt-label"><q-skeleton type="text" width="100px" /></q-item-label>
                </q-item-section>
                <q-item-section avatar>
                  <q-skeleton type="circle" size="24px" />
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption><q-skeleton type="text" width="120px" /></q-item-label>
                  <q-item-label class="pt-label"><q-skeleton type="text" width="60px" /></q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption><q-skeleton type="text" width="80px" /></q-item-label>
                  <q-item-label class="pt-label"><q-skeleton type="text" width="200px" /></q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-skeleton type="circle" size="32px" />
                </q-item-section>
              </q-item>
              <q-item-label header><q-skeleton type="text" width="60px" /></q-item-label>
              <q-item v-for="i in 2" :key="i">
                <q-item-section>
                  <q-list class="settings-list" :class="getDarkModeClass(darkMode)">
                    <q-item>
                      <q-item-section>
                        <q-item-label class="pt-setting-menu"><q-skeleton type="text" width="100px" /></q-item-label>
                      </q-item-section>
                      <q-item-section avatar>
                        <q-skeleton type="circle" size="24px" />
                      </q-item-section>
                    </q-item>
                    <q-item-label caption>
                      <div class="flex nowrap justify-between q-ma-sm">
                        <div class="text-bold"><q-skeleton type="text" width="140px" /></div>
                        <div><q-skeleton type="text" width="80px" /></div>
                      </div>
                    </q-item-label>
                    <q-item-label caption>
                      <div class="flex nowrap justify-between q-ma-sm">
                        <div class="text-bold"><q-skeleton type="text" width="40px" /></div>
                        <div><q-skeleton type="text" width="120px" /></div>
                      </div>
                    </q-item-label>
                    <q-item-label caption>
                      <div class="flex nowrap justify-between q-ma-sm">
                        <div class="text-bold"><q-skeleton type="text" width="100px" /></div>
                        <div><q-skeleton type="text" width="80px" /></div>
                      </div>
                    </q-item-label>
                  </q-list>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
              <q-skeleton type="text" width="100px" />
            </p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item>
                <q-item-section>
                  <q-item-label caption><q-skeleton type="text" width="120px" /></q-item-label>
                  <q-item-label class="pt-label"><q-skeleton type="text" width="180px" /></q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption><q-skeleton type="text" width="100px" /></q-item-label>
                  <q-item-label class="pt-label"><q-skeleton type="text" width="180px" /></q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          </div>
        </template>
    </div>
  </template>
  
<script setup>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'src/components/CopyButton.vue'
import { generateCoordinatorServerIdentityFromMnemonic } from 'src/lib/multisig/coordination.js'
import { getWeb3Wallet as wcGetWalletKit, disconnectAllSessions as wcDisconnectAllSessions, disconnectAllSessions } from 'src/wallet/walletconnect2'
import { getSdkError } from '@walletconnect/utils'

const { t: $t } = useI18n()
const $store = useStore()
const $q = useQuasar()
const route = useRoute()
const { 
  multisigNetworkProvider, 
  resolveXprvOfXpub, 
  getSignerXPrv, 
  resolveMnemonicOfXpub, 
  multisigCoordinationServer 
} = useMultisigHelpers()

const hdPrivateKeys = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const toggleColor = computed(() => {
  const theme = $store.getters['global/theme']
  if (theme === 'glassmorphic-red') return 'pink-6'
  if (theme === 'glassmorphic-green') return 'green-6'
  if (theme === 'glassmorphic-gold') return 'amber-7'
  return 'blue-6'
})

const wcActiveSessions = ref([])
const wcProcessingSession = ref({})
const wallet = ref()

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

const onProceedCreateServerIdentity = async (name, xpub) => {
  const mnemonic = await resolveMnemonicOfXpub({
    xpub
  })

  if (mnemonic) {
    const serverIdentity = generateCoordinatorServerIdentityFromMnemonic({
      name,
      mnemonic,
      network: wallet.value.options?.provider?.network
    })
    
    await wallet.value.options.coordinationServer.createServerIdentity({ 
      serverIdentity, 
      authCredentialsGenerator: wallet.value 
    })
    await wallet.value.loadSignersServerIdentity()
  }
}

const openCreateServerIdentityDialog = (signer) => {
  const firstLineIndentStyle = 'text-indent: 2em; margin-top: 0;text-align: justify;';
  const messageHtml = `
    <p style="${firstLineIndentStyle}">
      ${$t('CreateMultisigServerIdentityConfirmation', {}, 'This action will create a Server-Identity for this signer.')}
    </p>
    <p style="${firstLineIndentStyle}">
      ${$t('WhatIsAServerIdentity', {}, 'The multisig coordination Server-Identity contains the name, a public key derived from this wallet using a different derivation path from the wallet that holds your funds. This is used when interacting with Paytaca\'s Multisig Coordination Server.')}
    </p>
    <p style="${firstLineIndentStyle}">
      ${$t('NoPrivateKeyIsUploadedGuarantee', {}, 'This action is considered safe, as no private key is uploaded to the server.')}
    </p>
    <p style="${firstLineIndentStyle}">
      ${$t('DoYouWantToProceed', {}, 'Do you want to proceed?')}
    </p>
  `;
  
  $q.dialog({
    message: messageHtml,
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
    html: true,
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
  }).onOk(() => {
    onProceedCreateServerIdentity(signer.name, signer.xpub)
  })
}

const openRenameDialog = () => {
  $q.dialog({
    component: RenameDialog,
    componentProps: {
      index: wallet.value.getIndex()
    }
  })
}

const wcLoadActiveSessions = async () => {
  wcActiveSessions.value = []
  const activeSessions = await wcGetWalletKit().getActiveSessions()
  for (const topic of Object.keys(activeSessions || {})) {
    const accountFound = activeSessions[topic]?.namespaces?.bch?.accounts?.find((account) => {
      return account.includes(wallet.value.wcGetDefaultAddress())
    })
    if (accountFound) {
      wcActiveSessions.value.push(activeSessions[topic])
    }
  }
}

const wcDisconnectSession = async (activeSession) => {
  const wcWalletKit = wcGetWalletKit()
  wcProcessingSession.value[activeSession.topic] = 'Disconnecting'
  try {
    await new Promise((resolve, reject) => {
      $q.dialog({
        message: `Are you sure you want to disconnect ${activeSession.peer?.metadata?.name}?`,
        ok: {
          label: $t('Yes'),
          noCaps: true,
          color: 'primary',
          rounded: true
        },
        cancel: {
          noCaps: true,
          rounded: true,
          outline: true,
          color: 'negative',
          label: $t('No')
        },
        class: `br-15 pt-card text-caption text-bow ${getDarkModeClass(darkMode.value)}`
      }).onOk(() => resolve()).onCancel(() => reject())
    })
    
    await wcWalletKit.disconnectSession({
      topic: activeSession.topic,
      reason: getSdkError('USER_DISCONNECTED')
    })

    await wcLoadActiveSessions()
  } catch (error) {
    console.log(error)
  } finally {
    delete wcProcessingSession.value[activeSession.topic]
  }
}

const toggleReserveWcAccountUtxos = (value) => {
  wallet.value.settings.reserveWcAccountUtxos = value 
  wallet.value.save()
}

const init = async () => {

  const storedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (storedWallet) {
    wallet.value = MultisigWallet.importFromObject(storedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer,
      resolveXprvOfXpub,
      resolveMnemonicOfXpub
    })

    await Promise.allSettled([
      loadHdPrivateKeys(wallet.value?.signers),
      wallet.value.loadSignersServerIdentity(),
      wcLoadActiveSessions()
    ])  
    
  }
  
}

onMounted(async () => {
  setTimeout(() => {
    init()
  }, 200)
})

</script>

<style lang="scss" scoped>
  .section-title {
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    opacity: 0.85;
    
    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .pt-setting-menu {
    font-weight: 400;
    font-size: 15px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-setting-avatar-dark {
    color: #A6ACAF;
  }

  .pt-label {
    font-size: 14px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-card {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .settings-list {
    .q-item {
      padding: 16px 20px;
      min-height: 64px;
      
      &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      &.dark:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    :deep(.q-item__label--caption) {
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.3;
      font-size: 13px;
    }
  }

  #app-container {
    &.dark {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
    }
    
    &.light {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }
  }

  .glass-input {
    :deep(.q-field__control) {
      transition: all 0.3s ease;
    }
    
    :deep(.q-field__native) {
      font-weight: 500;
    }
  }
</style>
