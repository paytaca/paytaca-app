<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('New Tx Proposal')"
              :backnavpath="`/apps/multisig/wallet/${route.params.address}`"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row justify-center">
              <div class="col-xs-12 q-px-sm q-gutter-y-sm">
               <template v-if="multisigWallet && multisigTransaction">
                <q-form class="q-gutter-md"> 
                 <div class="q-gutter-y-sm">
                   <q-label>Select Asset</q-label>
                   <q-select
                    :options="assetOptions"
		    v-model="assetSelected"
                    hint="The asset to send"
                    outlined dense>
                   </q-select>
                  </div>

                  <div class="q-gutter-y-sm">
                   <q-label>Prompt</q-label>
                   <q-input
		    v-model="multisigTransaction.metadata.userPrompt"
                    hint="Friendly message for cosigner"
                    outlined dense>
                   </q-input>
                  </div>
                  <div class="q-gutter-y-sm">
                   <q-label>From</q-label>
                   <q-input :model-value="multisigWallet.template.name" readonly outlined dense >
                     <template v-slot:append>
                       <q-btn icon="content_copy"
                         @click="$copyText(getMultisigCashAddress({ ...multisigWallet, cashAddressNetworkPrefix }))"
                         no-capse dense flat
                       />
                     </template>
                   </q-input>
                  </div>
                  <div class="q-gutter-y-sm">
                   <q-label>To</q-label>
                   <q-input 
                     v-for="output, i in multisigTransaction.transaction.outputs"
                     v-model="output.address" :label="`Paste address for recipient ${i + 1}`"
                     outlined dense>
                   </q-input>
                  </div>
                </q-form>
               </template>
              </div>
            </div>
            <!-- display created wallets  -->
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch, onBeforeMount, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { createTemplate, getMultisigCashAddress, shortenString, generateTempId, initEmptyMultisigTransaction } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import LocalWalletsSelectionDialog from 'components/multisig/LocalWalletsSelectionDialog.vue'

const $store = useStore()
const $q = useQuasar()
const $copyText = inject('$copyText')
const router = useRouter()
const route = useRoute()
const { t: $t } = useI18n()
const { cashAddressNetworkPrefix } = useMultisigHelpers()
const multisigWallet = ref()
const multisigTransaction = ref({name: ''})
const assetSelected = ref('Bitcoin Cash')
const assetOptions = ref(['Bitcoin Cash'])

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const utxos = computed(() => {
 return structuredClone($store.getters['multisig/getWalletUtxos']({ address: route.params.address }))
})

const utxosLastUpdate = computed(() => {
 return utxos.value?.lastUpdate
})

const addRecipient = () => {
  multisigTransaction.value.transaction.outputs.push({
   address: '',
   lockingBytecode: new Uint8Array([]),
   valueSatoshis: "0"
  })
}

const updateAssetsOptions = (utxos) => {
 const options = new Set()
 utxos?.forEach((utxo) => {
  if (utxo?.token?.category) options.add(utxo.token.category)
 })
 assetOptions.value = ['Bitcoin Cash', ...Array.from(options)]
}

watch(utxosLastUpdate.value, (value, oldValue) => {
   updateAssetsOptions(utxos.value?.utxos)
})

onBeforeMount(async () => {
   await $store.dispatch('multisig/fetchWalletUtxos', route.params.address )
})


onMounted(() => {
  multisigWallet.value = $store.getters['multisig/getWalletByAddress']({ address: route.params.address })
  multisigTransaction.value = initEmptyMultisigTransaction({
   userPrompt: 'Spend BCH from wallet', walletId: multisigWallet.id
  })
  addRecipient()
  updateAssetsOptions(utxos.value?.utxos)
})
</script>

