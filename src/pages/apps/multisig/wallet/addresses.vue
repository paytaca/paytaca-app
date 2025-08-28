<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <!-- <HeaderNav
      :title="$t('Wallet Details')"
      backnavpath="/apps/multisig"
      class="apps-header"
    /> -->
    <HeaderNav
      :backnavpath="`/apps/multisig/wallet/${route?.params?.wallethash}`"
      class="apps-header"
    />
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-8 q-px-xs">
        <template v-if="wallet">
            <div class="row q-mb-lg">
              <div class="col-xs-12 flex items-center justify-center q-mb-lg">
                <div class="text-h6 q-mr-md text-capitalize">{{wallet.name}} Addresses</div>
                <q-icon
                  size="sm" name="mdi-text-box-multiple"
                />
              </div>
            </div>
            <q-list>
              <q-separator spaced inset />
              <q-expansion-item v-model="depositAddressesExpanded"  label="Deposit Addresses">
                <template v-slot:header>
                  <div class="row justify-between items-center">
                    <div class="text-bold">
                      Deposit Addresses
                    </div>
                  </div>
                </template>
                <template v-slot:default>
                  <q-list>
                    <q-item v-for="i, index in ((wallet.lastUsedDepositAddressIndex ?? 0) + 20)" :key="'deposit-'+index">
                      <q-item-section>
                        <q-item-label class="flex justify-between items-center">
                            <span>
                                {{ index }} - {{ shortenString(wallet.getDepositAddress(index, cashAddressNetworkPrefix).address?.replace('bitcoincash:', ''), 30) }}
                                <q-badge v-if="wallet.lastUsedDepositAddressIndex !== undefined && index === wallet.lastUsedDepositAddressIndex">
                                    Last Used
                                </q-badge>
                            </span>
                            <CopyButton :text="wallet.getDepositAddress(index).address"/>
                            
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-separator spaced inset />
                  </q-list>
                </template>
              </q-expansion-item>
              <q-expansion-item v-model="changeAddressesExpanded"  label="Change Addresses">
                <template v-slot:default>
                  <q-list>
                    <q-item v-for="i, index in ((wallet.lastUsedChangeAddressIndex ?? 0) + 20)" :key="'change-' + index">
                      <q-item-section>
                        <q-item-label class="flex justify-between items-center">
                            <span>
                            {{ index }} - {{ shortenString(wallet.getChangeAddress(index, cashAddressNetworkPrefix).address?.replace('bitcoincash:', ''), 30) }}
                                <q-badge v-if="wallet.lastUsedChangeAddressIndex !== undefined && index === wallet.lastUsedChangeAddressIndex">
                                    Last Used
                                </q-badge>
                            </span>
                            <CopyButton :text="wallet.getChangeAddress(index).address"/>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </template>
              </q-expansion-item>
            </q-list>
        </template>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import Big from 'big.js'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  getRequiredSignatures,
  exportMultisigWallet,
  importPst,
  isMultisigWalletSynced,
  generateFilename,
  generateTransactionHash,
  MultisigWallet,
  Pst
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'components/CopyButton.vue'
import WalletActionsDialog from 'components/multisig/WalletActionsDialog.vue'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import UploadWalletDialog from 'components/multisig/UploadWalletDialog.vue'
import { CashAddressNetworkPrefix, sortObjectKeys } from 'bitauth-libauth-v3'
import { WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { shortenAddressForDisplay } from 'src/utils/address-utils'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getMultisigWalletBchBalance, multisigWallets, getSignerXPrv, getAssetTokenIdentity, cashAddressNetworkPrefix } = useMultisigHelpers()
const balances = ref()
const depositAddressesExpanded = ref(true)
const changeAddressesExpanded = ref(true)
const hdPrivateKeys = ref()
const depositAddresses = ref([])
const changeAddresses = ref([])

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})


const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: new WatchtowerNetworkProvider({
        network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
      })
    })
  }
  return null
})


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

const loadAddresses = () => {
    const high1 = (wallet.value.lastIssuedDepositAddressIndex ?? 0) > 20 ? wallet.value.lastIssuedDepositAddressIndex : 20
    for (let i = 0; i < high1; i++) {
        depositAddresses.value.push({
            index: i,
            address: wallet.value.getDepositAddress(i, cashAddressNetworkPrefix.value, cashAddressNetworkPrefix).address
        })
    }
    const high2 = (wallet.value.lastIssuedChangeAddressIndex ?? 0) > 20 ? wallet.value.lastIssuedChangeAddressIndex : 20
    for (let i = 0; i < high2; i++) {
        changeAddresses.value.push({
            index: i,
            address: wallet.value.getChangeAddress(i, cashAddressNetworkPrefix).address
        })
    }
}

onMounted(async () => {
  loadAddresses()
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>i
