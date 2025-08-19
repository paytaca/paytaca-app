<template>
   <q-layout view="lHh Lpr lFf">
      <q-pull-to-refresh
        id="app-container"
        :class="getDarkModeClass(darkMode)"
        @refresh="refreshPage"
      >
        <HeaderNav
          :backnavpath="`/apps/multisig/wallet/${route?.params?.wallethash}`"
          class="apps-header"
        />
        <div class="row justify-center">
          <div class="col-xs-12 col-sm-8 q-px-xs q-mb-lg">
            <template v-if="wallet">
                <div class="row">
                  <div class="col-xs-12 flex items-center justify-center text-bold text-h6">
                    Send {{ assetHeaderName }}
                  </div>
                  <div class="col-xs-12 text-center q-mt-sm">
                    <div class="text-grey-6">Available Balance</div>
                    <div class="flex items-center justify-center q-gutter-x-sm">
                      <q-avatar v-if="assetHeaderIcon?.startsWith('http')" size="sm">
                        <img :src="assetHeaderIcon">
                      </q-avatar>
                      <q-icon v-else
                        :name="assetHeaderIcon"
                        size="sm"
                        :color="assetHeaderIcon === 'token'? 'grey': '' "
                      />
                      <span style="font-size: 2em">{{ balance !== undefined ? balance : "..." }}</span>
                    </div>
                    <div class="text-grey-6">{{ assetPrice? `=${assetPrice}` : '' }}</div>
                  </div>
                </div>
                <q-list>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="text-bold">From</div>
                        <q-input :model-value="wallet.name" dense :hint="shortenString(`${wallet.getWalletHash()}`, 20)">
                          <template v-slot:prepend>
                            <q-btn icon="wallet" flat dense></q-btn>
                          </template>
                        </q-input>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="text-bold">Purpose</div>
                        <q-input v-model="purpose" type="textarea" rows="2" outlined autogrow hint></q-input>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="text-bold">
                        Recipients
                      </q-item-label>

                    </q-item-section>
                    <q-item-section side>
                      <q-item-label side>
                        Total Amount: {{ totalAmount }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-for="recipient,i in recipients" :key="`recipient-${i}`">
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="flex justify-between items-center">
                            <span class="text-italic">Recipient {{ i + 1 }}</span>
                            <q-btn v-if="i > 0" @click="removeRecipient(i)" icon="remove" color="red" flat dense ></q-btn>
                        </div>
                        <q-input
                          v-model="recipient.address" :label="`Paste address of recipient ${i + 1}`"
                          outlined dense>
                          <template v-slot:append>
                            <q-btn icon="upload_file" flat dense disable></q-btn>
                            <q-btn icon="qr_code_scanner" flat dense disable></q-btn>
                          </template>
                        </q-input>
                        <q-input
                          v-model="recipient.amount" label="Amount"
                          outlined dense
                          :hint="assetDecimalsHint"
                          :rules="amountRules"
                          ref="amountRef"
                          >
                          <template v-slot:append>
                            <q-btn flat dense disable no-caps>Max</q-btn>
                          </template>
                        </q-input>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section></q-item-section>
                    <q-item-section side>
                      <div class="text-right">
                          <q-btn @click="addRecipient()" icon="add" color="primary" label="Add Recipient" flat dense no-caps></q-btn>
                        </div>
                    </q-item-section>
                  </q-item>
                </q-list>
            </template>
          </div>
        </div>  
      </q-pull-to-refresh>
    <q-footer class="pt-card text-bow q-pa-md" :class="getDarkModeClass(darkmode)" style="filter:opacity(98%)" rev>
        <q-btn
          style="width: 100%; filter: opacity((100%))"
          color="primary"
          :disable="!sendable"
          class="text-bold"
          no-caps
          @click="createProposal"
          >
          Create Proposal
        </q-btn>
    </q-footer>
  </q-layout>
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
  MultisigWallet
} from 'src/lib/multisig'
import { WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import darkmode from 'src/store/darkmode'
import { getSignerWalletFromVault } from 'src/utils/multisig-utils'

const $store = useStore()
const route = useRoute()
const balance = ref()
const balanceConvertionRates = ref()
const recipients = ref([])
const purpose = ref('')
const amountRef = ref()

const {
  getAssetTokenIdentity 
} = useMultisigHelpers()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const assetTokenIdentity = ref()

const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      provider: new WatchtowerNetworkProvider({
        network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
      })
    })
  }
  return null
})

const assetHeaderName = computed(() => {
  if (route.query.asset === 'bch') return 'BCH'
  if (assetTokenIdentity.value?.token?.symbol) return assetTokenIdentity.value?.token?.symbol
  return shortenString(route.query.asset, 10)
})

const assetHeaderIcon = computed(() => {
  if (route.query.asset === 'bch') return 'img:bitcoin-cash-circle.svg'
  return assetTokenIdentity.value?.uris?.icon || 'token'
})

const assetDecimalsHint = computed(() => {
  if (route.query.asset === 'bch') return ''
  if (assetTokenIdentity.value?.token?.decimals === undefined) {
    return 'Caution: Unable to get decimals spec of the token'
  }
  return `Decimal places: ${assetTokenIdentity.value.token.decimals}`
})

const amountRules = computed(() => {
  let rules = [
    v => ( v?.length === 0 || /^(\d+)?\.?(\d+)?$/.test(v)) || 'Invalid value.',
    v => Number(v) < balance.value || 'Value exceeds balance.'
  ]
  if (route.query.asset !== 'bch') {
    if (assetTokenIdentity.value?.token?.decimals === undefined || assetTokenIdentity.value?.token?.decimals === 0) {
      rules = rules.concat([
        v => (v==='' || Number(v) >= 1)  || 'Token has no decimals. Value should be greater or equal to 1.',
        v => !v.includes('.') || 'Token has no decimals. Invalid value.'
      ])
    }
  }
  return rules
})

const totalAmount = computed(() => {
  try {
    return recipients.value.reduce((total, nextR) => {
      total = Big(total).add(nextR.amount || 0)
      return total
    }, '0')  
  } catch (error) {
    return '!'
  }
})

const assetPrice = computed(() => {
  if (balanceConvertionRates.value?.length > 0) {
    const b = balanceConvertionRates.value?.find(priceData => (
       priceData.relative_currency?.toLowerCase() === route.query.asset
    ))
    if (!b) return ''
    return b[`assetPriceIn${b.currency}Text`]
  }
})

const sendable = computed(() => {
  return (
    recipients.value?.every(r => Boolean(r.address)) && 
    recipients.value?.every(r => Boolean(r.amount)) &&
    recipients.value?.length > 0 &&
    totalAmount.value !== '!' &&
    totalAmount.value > 0 &&  
    balance.value > totalAmount.value &&
    (amountRef.value?.hasError !== true || amountRef.value?.hasError === undefined)
  )
})

const removeRecipient = (index) => {
  recipients.value.splice(index, 1)
}

const addRecipient = () => {
  recipients.value.push({
    address: '',
    amount: '',
    asset: route.query.asset
  })
}

const createProposal = async () => {
    
  const walletVault = $store.getters['global/getVault']
  let creator = ''
  for (const signer of wallet.value.signers) {
    const signerWallet = getSignerWalletFromVault({ walletVault, xpub: signer.xpub })
    if (signerWallet) {
      creator = signer.xpub
    }
  }

  const pst = await wallet.value.createPstFromTransactionProposal({
    creator: creator,
    origin: 'paytaca-wallet',
    purpose: purpose.value,
    recipients: recipients.value
  })

  // TODO: save, sync pst
}

onMounted(async () => {
  addRecipient()
  balance.value = await wallet.value.getWalletBalance(route.query.asset)
  assetTokenIdentity.value = await getAssetTokenIdentity(route.query.asset)
  balanceConvertionRates.value = 
      await wallet.value.convertBalanceToCurrencies(
        route.query.asset,
        balance.value,
        [$store.getters['market/selectedCurrency'].symbol]
      )
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>i
