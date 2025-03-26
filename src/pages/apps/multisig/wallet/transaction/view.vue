<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('View Template')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <q-card
                    flat bordered class="my-card" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'">
                    <q-card-section>
                      <div class="row items-center no-wrap">
                        <div class="col">
                          <div class="text-h6">{{ transactionUserPrompt }}</div>
                          <div class="text-subtitle2">Origin: {{ transactionOrigin }}</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-section>
                      {{ transaction }}
                    </q-card-section>
                    <q-card-section>
                      <div>Spend Summary</div>
                      {{ spendSummary(transactionData.transaction) }}
                    </q-card-section>
                    <q-separator />
                    <q-card-section>
                      <div>Number of recipients: {{ transactionData.transaction.outputs.length }}</div>
                    </q-card-section>
                    <q-separator />
                    <q-card-actions>
                      <q-btn flat @click="partiallySign">Partially Sign</q-btn>
                    </q-card-actions>
                  </q-card>
                </div>
            </div>
          </div>
        </div>
        <FooterMenu v-if="wallet" :address="wallet.address"/>
      </q-page>

    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'components/header-nav'
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst } from 'src/lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()

const transactionData = computed(() => {
  const transactions = $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  return transactions[route.params.index]
})

const transactionOrigin = computed(() => {
  if (transactionData.value?.sessionRequest?.verifyContext) {
    return transactionData.value?.sessionRequest?.verifyContext?.verified?.origin || 'Unknown Origin'
  }
  return 'Wallet'
})

const transactionUserPrompt = computed(() => {
  return transactionData.value?.sessionRequest?.params?.request?.params?.userPrompt || 'Signature Request'
})

const spendSummary = computed(() => {
  return (transaction) => {
    let satoshis = 0
    const tokens = {}
    transaction.inputs.forEach((input) => {
      satoshis += Number(String(input.sourceOutput?.valueSatoshis || '0'))
      const token = input.sourceOutput?.token?.category
      if (token && token.category) {
        if (!tokens[token.category]) {
          tokens[token.category] = 0
        }
        tokens[token.category] += (token.amount || 0)
      }
    })
    return { satoshis, tokens }
  }
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const partiallySign = () => {
  console.log('TODO: CREATE PSBT, AND REDIRECT TO PSBT PAGE')
  const pst = new Pst()
  console.log('🚀 ~ partiallySign ~ pst:', pst)
}

onMounted(() => {
  const x = $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  console.log('🚀 ~ onMounted ~ transactions:', x)
  console.log('Wallet', wallet.value)
})

// Transaction sample
// {
//   "inputs": [
//     {
//       "outpointIndex": 0,
//       "outpointTransactionHash": {
//         "0": 193,
//         "1": 228,
//         "2": 90,
//         "3": 72,
//         "4": 36,
//         "5": 111,
//         "6": 132,
//         "7": 59,
//         "8": 133,
//         "9": 139,
//         "10": 105,
//         "11": 87,
//         "12": 32,
//         "13": 216,
//         "14": 216,
//         "15": 236,
//         "16": 143,
//         "17": 241,
//         "18": 147,
//         "19": 214,
//         "20": 125,
//         "21": 102,
//         "22": 253,
//         "23": 228,
//         "24": 174,
//         "25": 49,
//         "26": 161,
//         "27": 51,
//         "28": 126,
//         "29": 158,
//         "30": 107,
//         "31": 54
//       },
//       "sequenceNumber": 0,
//       "unlockingBytecode": {},
//       "sourceOutput": {
//         "outpointIndex": 0,
//         "outpointTransactionHash": {
//           "0": 193,
//           "1": 228,
//           "2": 90,
//           "3": 72,
//           "4": 36,
//           "5": 111,
//           "6": 132,
//           "7": 59,
//           "8": 133,
//           "9": 139,
//           "10": 105,
//           "11": 87,
//           "12": 32,
//           "13": 216,
//           "14": 216,
//           "15": 236,
//           "16": 143,
//           "17": 241,
//           "18": 147,
//           "19": 214,
//           "20": 125,
//           "21": 102,
//           "22": 253,
//           "23": 228,
//           "24": 174,
//           "25": 49,
//           "26": 161,
//           "27": 51,
//           "28": 126,
//           "29": 158,
//           "30": 107,
//           "31": 54
//         },
//         "sequenceNumber": 0,
//         "unlockingBytecode": {},
//         "lockingBytecode": {
//           "0": 169,
//           "1": 20,
//           "2": 120,
//           "3": 53,
//           "4": 14,
//           "5": 73,
//           "6": 22,
//           "7": 236,
//           "8": 124,
//           "9": 31,
//           "10": 216,
//           "11": 22,
//           "12": 146,
//           "13": 132,
//           "14": 163,
//           "15": 112,
//           "16": 107,
//           "17": 155,
//           "18": 223,
//           "19": 183,
//           "20": 146,
//           "21": 221,
//           "22": 135
//         },
//         "valueSatoshis": "500000",
//         "address": "bitcoincash:ppur2rjfzmk8c87cz6fgfgmsdwdaldujm5ddwjq4a5"
//       }
//     }
//   ],
//   "locktime": 0,
//   "outputs": [
//     {
//       "lockingBytecode": {
//         "0": 169,
//         "1": 20,
//         "2": 120,
//         "3": 53,
//         "4": 14,
//         "5": 73,
//         "6": 22,
//         "7": 236,
//         "8": 124,
//         "9": 31,
//         "10": 216,
//         "11": 22,
//         "12": 146,
//         "13": 132,
//         "14": 163,
//         "15": 112,
//         "16": 107,
//         "17": 155,
//         "18": 223,
//         "19": 183,
//         "20": 146,
//         "21": 221,
//         "22": 135
//       },
//       "valueSatoshis": "1000",
//       "address": "bitcoincash:ppur2rjfzmk8c87cz6fgfgmsdwdaldujm5ddwjq4a5"
//     },
//     {
//       "lockingBytecode": {
//         "0": 169,
//         "1": 20,
//         "2": 120,
//         "3": 53,
//         "4": 14,
//         "5": 73,
//         "6": 22,
//         "7": 236,
//         "8": 124,
//         "9": 31,
//         "10": 216,
//         "11": 22,
//         "12": 146,
//         "13": 132,
//         "14": 163,
//         "15": 112,
//         "16": 107,
//         "17": 155,
//         "18": 223,
//         "19": 183,
//         "20": 146,
//         "21": 221,
//         "22": 135
//       },
//       "valueSatoshis": "498773",
//       "address": "bitcoincash:ppur2rjfzmk8c87cz6fgfgmsdwdaldujm5ddwjq4a5"
//     }
//   ],
//   "version": 2
// }

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
