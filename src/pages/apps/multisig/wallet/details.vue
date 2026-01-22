<template>
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
        <header-nav :title="$t('WalletDetails', {}, 'Wallet Details')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}`" class="header-nav header-nav apps-header" />
        <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
          <div class="col-12 q-px-lg q-mt-md">
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
                        <q-list bordered class="settings-list" style="border-radius: 15px; ":class="getDarkModeClass(darkMode)">
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
                                    <div class="text-bold">Can Sign On This Device?</div>
                                    <div>{{ hdPrivateKeys?.[signer.xpub] ? 'Yes' : 'No' }}</div>
                                </div>
                            </q-item-label>
                            <div class="flex nowrap justify-end q-my-md q-mx-sm">
                                <CopyButton :text="JSON.stringify(signer)" :label="$t('CopySignerDetails', {}, 'Copy Signer Details')" />
                            </div>
                        </q-list>
                    </q-item-section>
                </q-item>
              </q-list>
          </div>
  
          <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Cosigner Coordination', {}, 'Cosigner Coordination') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item>
                  <q-item-section>
                    <q-item-label caption>{{ $t('WalletSetup', {}, 'Wallet Setup') }}</q-item-label>
                    <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                      {{ wallet.isOnline() ? 'Online or Offline (out-of-band)': 'Offline (out-of-band) only' }} 
                    </q-item-label>
                  </q-item-section>
                </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>{{ $t('WalletSetupOnlineId', {}, 'Wallet Setup Online Id') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                    {{ wallet.id }} 
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
    </div>
  </template>
  
<script setup>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'src/components/CopyButton.vue'

const $store = useStore()
const $q = useQuasar()
const route = useRoute()
const { multisigNetworkProvider, resolveXprvOfXpub, getSignerXPrv} = useMultisigHelpers()

const hdPrivateKeys = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})
const wallet = computed(() => {
  const storedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (storedWallet) {
    return MultisigWallet.importFromObject(storedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      resolveXprvOfXpub: resolveXprvOfXpub
    })
  }
  return null
})

const loadHdPrivateKeys = async (signers) => {
  if (!hdPrivateKeys.value) {
    hdPrivateKeys.value = {}
  }
  console.log('SIGNERS', signers)
  for (const signer of signers) {
    try {
      console.log('signer', signer.xpub)
      const xprv = await getSignerXPrv({
        xpub: signer.xpub
      })
      console.log('xprv', xprv)
      if (xprv) {
        hdPrivateKeys.value[signer.xpub] = xprv
      }
      
    } catch (e) {
      console.log('error', e)
    } // getSignerXPrv throws if xprv not found, we'll just ignore
  }
}

const openRenameDialog = () => {
  $q.dialog({
    component: RenameDialog,
    componentProps: {
      index: wallet.value.getIndex()
    }
  })
}

onMounted(async () => {
  console.log('wallet.value', wallet.value)
  await loadHdPrivateKeys(wallet.value?.signers)
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
