<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Transaction')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.address}`}`" class="header-nav">
    </HeaderNav>
    <div class="row justify-center" style="margin-bottom: 4em;">
      <div class="col-xs-12 col-md-8 q-px-xs">
        <template v-if="multisigWallet && multisigTransaction?.transaction">
          <div>
            <q-list>
              <q-item>
                <q-item-section>
                  <!-- <q-item-label class="text-h6">{{ transactionUserPrompt }}</q-item-label> -->
                  <!-- <q-item-label caption lines="2">Origin: {{ transactionOrigin }}</q-item-label> -->
                    <q-item-label class="text-h6">{{ multisigTransaction.metadata?.prompt }}</q-item-label>
                    <q-item-label caption lines="2">Origin: {{ multisigTransaction.metadata?.origin }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <!-- <q-item-label caption>5 min ago</q-item-label> -->
                  <q-icon name="payment" color="grad"></q-icon>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Number of recipients</q-item-label>
                </q-item-section>
                <q-item-section side>
                  {{ multisigTransaction.transaction.outputs.length }}&nbsp;
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Spending</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{ getTotalBchInputAmount(multisigTransaction.transaction) }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Debit</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{
                      getTotalBchOutputAmount(
                        multisigTransaction.transaction
                      )
                    }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Credit/Change</q-item-label>
                  <q-item-label caption lines="2">*Returned to wallet</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{
                      getTotalBchChangeAmount(
                        multisigTransaction.transaction, route.params.address,
                        isChipnet? toP2shTestAddress: null
                      )
                    }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Fee</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{ getTotalBchFee(multisigTransaction.transaction) }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-expansion-item>
                <template v-slot:header>
                  <q-item-section>
                    Raw Tx Details
                  </q-item-section>
                </template>
                <q-item-label class="q-pa-md">
                  <code style="word-break: break-all; filter: brightness(80%)">
                    {{ multisigTransaction.transaction }}
                  </code>
                </q-item-label>
              </q-expansion-item>
              <q-item>
                <q-item-section>
                  <q-icon name="mdi-wallet-outline" color="grad" size="md"></q-icon>
                </q-item-section>
                <q-item-section side>
                  <q-item-label >
                    {{ shortenString(multisigWallet.address, 20) }}
                  </q-item-label>
                  <!-- <q-icon name="bch" color="green" /> -->
                </q-item-section>
              </q-item>
              <q-separator spaced inset></q-separator>
              <!-- <q-item>
                <q-item-section>
                  <q-item-label class="text-h6">Wallet</q-item-label>
                  <q-item-label caption lines="2">{{ multisigWallet.address }}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                </q-item-section>
              </q-item> -->
              <q-item>
                <q-item-section>
                  <q-item-label class="text-h6">Signatures</q-item-label>
                </q-item-section>
                <!-- <q-item-section side top>
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                </q-item-section> -->
              </q-item>
              <q-item>
                <q-item-section>
                  <div class="flex flex-wrap items-center">
                    Required Signatures <q-icon name="draw" flat dense size="xs" class="q-ml-xs"></q-icon>
                  </div>
                </q-item-section>
                <q-item-section side>
                  {{ multisigWallet.m }}&nbsp;
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <div class="flex flex-wrap items-center">
                    Current Signatures <q-icon name="draw" flat dense size="xs" class="q-ml-xs"></q-icon>
                  </div>
                </q-item-section>
                <q-item-section side>
                  {{ multisigTransaction.getSignatureCount() }}&nbsp;
                </q-item-section>
              </q-item>
              <q-expansion-item>
                <template v-slot:header>
                  <q-item-section>
                    Raw Sig Details
                  </q-item-section>
                </template>
                <q-item-label class="q-pa-md">
                  <code style="word-break: break-all; filter: brightness(80%)">
                    {{ stringify(multisigTransaction.signatures) }}
                  </code>
                </q-item-label>
              </q-expansion-item>
              <q-item v-for="signerEntityIndex in Object.keys(multisigWallet.signers)" :key="signerEntityIndex">
                <q-item-section >
                  <div class="flex flex-wrap justify-left items-center q-gutter-x-xs">
                    <div>
                      {{ multisigWallet.signers[signerEntityIndex].name || `Signer ${signerEntityIndex}` }}
                    </div>
                    <q-icon
                      :color="signerSigned({ multisigTransaction, signerEntityIndex })? 'green': 'grey-8'"
                      :name="signerSigned({ multisigTransaction, signerEntityIndex })? 'done_all': ''"
                      size="sm"
                      >
                    </q-icon>
                  </div>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    label="Sign"
                    :disable="!signerCanSign({ signerEntityIndex })"
                    :icon="signerCanSign({ signerEntityIndex })? 'draw': 'edit_off'"
                    @click="signTransaction({ signerEntityIndex, xprv: multisigWallet.signers[signerEntityIndex]?.xprv })"
                    dense
                    no-caps
                    flat
                    :class="signerCanSign({ signerEntityIndex }) ? 'default-text-color': 'inactive-color'"
                    >
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label>Status</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn
                    @click="() => multisigTransaction.refreshStatus()"
                    :loading="multisigTransaction.metadata.isBroadcasting || multisigTransaction.metadata?.isRefreshingStatus"
                    flat
                    no-caps
                    dense
                  >
                    <template v-slot:loading>
                      <div class="flex flex-nowrap items-center">
			 <span v-if="multisigTransaction.metadata?.isBroadcasting">Broadcasting Tx</span>
			 <span v-else-if="multisigTransaction.metadata?.isRefreshingStatus">Checking</span>
			 <q-spinner-radio v-if="multisigTransaction.metadata?.isBroadcasting" class="on-right"></q-spinner-radio>
			 <q-spinner-facebook v-else-if="multisigTransaction.metadata?.isRefreshingStatus" class="on-right"></q-spinner-facebook>
                      </div>
                  </template>
                    <template v-slot:default>
                      <div class="flex flex-nowrap items-center">
			 <span>{{ multisigTransaction.status }}</span>
			 <q-icon name="refresh" size="sm" class="q-ml-sm"></q-icon>
                      </div>
                  </template>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item v-if="multisigTransaction?.metadata?.status >= 3">
                <q-item-section>
		   <q-item-label>Transaction Id</q-item-label>
                   <q-item-label caption lines="2">{{shortenString(multisigTransaction?.signedTransactionId,10)}}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-item-label>
	          <q-btn icon="launch" no-caps flat @click="openURL(`${txExplorerUrl}/${multisigTransaction?.signedTransactionId}`)">View</q-btn>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item>
                <q-item-section >
                  <div class="flex flex-wrap justify-around relative">
                    <q-btn @click="deleteTransaction" class="footer-icon-btn default-text-color" flat dense no-caps :color="!darkMode && 'primary'">
                      <template v-slot:default>
                        <div class="row justify-center">
                          <q-icon name="delete_outline" class="col-12"></q-icon>
                          <div class="col-12">Delete</div>
                        </div>
                      </template>
                    </q-btn>
                    <q-btn @click="downloadPST" flat dense no-caps :color="!darkMode && 'primary'">
                      <template v-slot:default>
                        <div class="row justify-center">
                          <q-icon name="mdi-file-export-outline" class="col-12"></q-icon>
                          <div class="col-12">Export</div>
                        </div>
                      </template>
                    </q-btn>
                    <q-btn
                      v-if="multisigTransaction.isFinalized"
                      @click="broadcastTransaction"
                      flat dense no-caps
                      :loading="multisigTransaction.isBroadcasting"
                      :disable="multisigTransaction?.metadata?.status >= 3"
                      >
                      <template v-slot:default>
                        <div class="row justify-center">
                          <q-icon name="cell_tower" class="col-12"></q-icon>
                          <div class="col-12">Broadcast</div>
                        </div>
                      </template>
                      <template v-slot:loading>
                        <q-spinner-radio class="on-left" />
                      </template>
                    </q-btn>
                    <q-inner-loading :showing="visible">
                      <q-spinner-gears size="50px" color="primary" />
                    </q-inner-loading>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </template>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useQuasar, openURL } from 'quasar'
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { stringify, CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
import { toP2shTestAddress } from 'src/utils/address-utils'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  MultisigTransaction,
  getTotalBchInputAmount,
  getTotalBchOutputAmount,
  getTotalBchChangeAmount,
  getTotalBchFee,
  shortenString
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const {
  getSignerXPrv,
  deleteTransaction,
  multisigWallets,
  updateTransaction,
  txExplorerUrl
} = useMultisigHelpers()

const multisigTransaction = ref()
const signerSigned = computed(() => {
  return ({ signerEntityIndex }) => {
    if (multisigWallet.value && multisigTransaction.value) {
      return multisigTransaction.value?.signerSigned({
        multisigWallet: multisigWallet.value,
        signerEntityId: `signer_${signerEntityIndex}`
      })
    }
  }
})

const signerCanSign = computed(() => {
  return ({ signerEntityIndex }) => {
    return multisigWallet.value?.signerCanSign({ signerEntityIndex })
  }
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const isChipnet = computed(() => $store.getters['global/isChipnet'])

const multisigWallet = computed(() => {
  return multisigWallets.value?.find((wallet) => {
    return wallet.address === decodeURIComponent(route.params.address)
  })
})

const signTransaction = async ({ signerEntityIndex }) => {
  if (!multisigWallet.value) return
  multisigTransaction.value.signTransaction({
    signerEntityIndex
  })
}

const broadcastTransaction = async () => {
  const cashAddressNetworkPrefix =
    isChipnet.value ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet

  if (!multisigTransaction.value?.isFinalized) {
    multisigTransaction.value?.finalize({
      lockingData: multisigWallet.value.lockingData,
      template: multisigWallet.value.template,
      cashAddressNetworkPrefix
    })
  }

  if (multisigTransaction.value?.signedTransaction) {
    const network = isChipnet.value ? 'chipnet' : 'mainnet'
    await multisigTransaction.value.broadcast({ network })
  }
}

const downloadPST = () => {
  const defaultFilename = (multisigTransaction.value.metadata?.prompt || '').toLowerCase().replace(' ', '-')
  $q.dialog({
    title: 'Enter Filename',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
    prompt: {
      type: 'text',
      model: defaultFilename
    }
  }).onOk((filename) => {
    if (!filename) return
    const data = multisigTransaction.value.exportPST({ signers: multisigWallet.value.signersSafe })
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.ppst`
    document.body.appendChild(a)
    a.click()
  }).onCancel(() => {})
}

watch(() => multisigTransaction.value?.status, async (status, prevStatus) => {
  if (status !== prevStatus) {
    await updateTransaction({
      index: route.params.index,
      multisigTransaction: JSON.parse(JSON.stringify(multisigTransaction.value))
    })
  }
})
onMounted(async () => {
  if (multisigWallet.value) {
    await multisigWallet.value?.loadSignerXprivateKeys(getSignerXPrv)
    const transactions =
      $store.getters['multisig/getTransactionsByWalletAddress']({
        address: route.params.address
      })
    if (transactions[route.params.index]) {
      multisigTransaction.value =
        MultisigTransaction.createInstanceFromObject({
          ...structuredClone(transactions[route.params.index]),
          multisigWallet: multisigWallet.value
        })
      await multisigTransaction.value.refreshStatus(multisigWallet.value)
    }
  }
})

</script>

<style lang="scss" scoped>
  .light {
    color: #141414;
  }
  .mb-2 {
    margin-bottom: 2px;
  }
  .fixed-footer {
    position: fixed;
    padding-top: 5px;
    width: 100%;
    bottom: 0;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 6;
    margin: 0 auto;
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 60px;
      height: 50px;
      outline: none;
      background-color: transparent;
      font-size: 12px;
      color: black;
      line-height: 20px;
      min-width: 50px;
    }
    .footer-btn-container {
      // margin-top: 1px !important;
      overflow-x: auto;
      overflow-y: hidden;
      flex-wrap: nowrap;
    }
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
    .inactive-color {
      color: gray;
    }
  }

  .enabled {
    color: rgb(60, 100, 246) !important;
  }

  .disabled {
    color: $blue-grey-8;
  }

</style>
