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
        <q-page-container>
          <q-page class="q-pa-none">
            <div class="row justify-center">
              <div class="col-xs-12 col-sm-8 q-px-xs q-mb-lg" style="padding-bottom: 100px;">
            <template v-if="wallet">
                <div class="row">
                  <div class="col-xs-12 flex items-center justify-center text-bold text-h6">
                    {{ $t('Send') }} {{ assetHeaderName }}
                  </div>
                  <div class="col-xs-12 text-center q-mt-sm">
                    <div class="text-grey-6">{{ $t('AvailableBalance') }}</div>
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
                        <div class="text-bold">{{ $t('From') }}</div>
                        <q-input :model-value="wallet.name" dense :hint="shortenString(`${wallet.getWalletHash()}`, 20)" disable>
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
                        <div class="text-bold">{{ $t('Purpose') }}</div>
                        <q-input v-model="purpose" type="textarea" rows="2" outlined autogrow hint></q-input>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="text-bold">
                        {{ $t('Recipients') }}
                      </q-item-label>

                    </q-item-section>
                    <q-item-section side>
                      <q-item-label side>
                        {{ $t('TotalAmount') }}: {{ totalAmount }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-for="recipient,i in recipients" :key="`recipient-${i}`" :ref="el => { if (el) recipientRefs[i] = el.$el || el }">
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="flex justify-between items-center">
                            <span class="text-italic">{{ $t('RecipientLabel') }} {{ i + 1 }}</span>
                            <q-btn v-if="i > 0" @click="removeRecipient(i)" icon="remove" color="red" flat dense ></q-btn>
                        </div>
                        <q-input
                          v-model="recipient.address" :label="`${$t('PasteAddressOfRecipient')} ${i + 1}`"
                          :rules="recipientRules"
                          clearable
                          outlined dense
                          :ref="el => { if (el) addressInputRefs[i] = el }">
                          <template v-slot:append>
                            <q-btn icon="upload_file" flat dense disable></q-btn>
                            <q-btn icon="qr_code_scanner" flat dense disable></q-btn>
                          </template>
                        </q-input>
                        <q-input
                          v-model="recipient.amount" :label="$t('Amount')"
                          outlined dense
                          :hint="assetDecimalsHint"
                          :rules="amountRules"
                          clearable
                          :ref="el => { if (el) amountInputRefs[i] = el }"
                          >
                          <!-- <template v-slot:append>
                            <q-btn flat dense disable no-caps>{{ $t('Max') }}</q-btn>
                          </template> -->
                        </q-input>
                      </q-item-label>
                      <q-separator />
                    </q-item-section>
                    
                  </q-item>
                  
                  <q-item>
                    <q-item-section></q-item-section>
                    <q-item-section side>
                      <div class="text-right">
                          <q-btn @click="addRecipient()" icon="add" color="primary" :label="$t('AddRecipient')" flat dense no-caps></q-btn>
                        </div>
                    </q-item-section>
                  </q-item>
                </q-list>
            </template>
          </div>
            </div>
          </q-page>
        </q-page-container>
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
          {{ $t('CreateProposal') }}
        </q-btn>
    </q-footer>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import Big from 'big.js'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  MultisigWallet,
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import darkmode from 'src/store/darkmode'
import { getSignerWalletFromVault } from 'src/utils/multisig-utils'
import { decodeCashAddress } from 'bitauth-libauth-v3'

const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const balance = ref()
const balanceConvertionRates = ref()
const recipients = ref([])
const purpose = ref('')
const amountRef = ref()
const recipientRefs = ref([])
const addressInputRefs = ref([])
const amountInputRefs = ref([])

const {
  multisigNetworkProvider,
  multisigCoordinationServer,
  network,
  getAssetTokenIdentity,
  resolveXprvOfXpub
} = useMultisigHelpers()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const assetTokenIdentity = ref()

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
    return $t('CautionUnableToGetDecimals')
  }
  return `${$t('DecimalPlaces')}: ${assetTokenIdentity.value.token.decimals}`
})

const recipientRules = computed(() => {

  const correctAddressFormat = (v) => {
    const decoded = decodeCashAddress(v)
    if (typeof decoded === 'string') {
      return decoded
    }
    if (route.query.asset === 'bch') {
      if (decoded.type?.toLowerCase().includes('withtokens')) {
        return $t('BCHAddressRequired')
      }
    } else {
      if (!decoded.type?.toLowerCase().includes('withtokens')) {
        return $t('TokenAddressRequired')
      }
    }
    return true
  }

  return [correctAddressFormat]
})

const amountRules = computed(() => {
  let rules = [
    v => ( v?.length === 0 || /^(\d+)?\.?(\d+)?$/.test(v)) || $t('InvalidValue'),
    v => Number(v) < balance.value || $t('ValueExceedsBalance')
  ]
  if (route.query.asset !== 'bch') {
    if (assetTokenIdentity.value?.token?.decimals === undefined || assetTokenIdentity.value?.token?.decimals === 0) {
      rules = rules.concat([
        v => (v==='' || Number(v) >= 1)  || $t('TokenHasNoDecimals'),
        v => !v.includes('.') || $t('TokenNoDecimalsInvalid')
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

const addRecipient = async () => {
  recipients.value.push({
    address: '',
    amount: '',
    asset: route.query.asset
  })
  
  await nextTick()
  const newIndex = recipients.value.length - 1
  
  if (recipientRefs.value[newIndex]) {
    const element = recipientRefs.value[newIndex]
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    
    setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      if (rect.bottom > viewportHeight - 100) {
        const scrollOffset = rect.bottom - viewportHeight + 150 // 150px padding for footer
        window.scrollBy({ top: scrollOffset, behavior: 'smooth' })
      }
    }, 300)
  }
  
  if (addressInputRefs.value[newIndex]) {
    await nextTick() 
    addressInputRefs.value[newIndex].focus()
  }
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

  const options = {
    store: $store,
    provider: multisigNetworkProvider,
    coordinationServer: multisigCoordinationServer
  }

  try {

    const pst = await wallet.value.createPst({
      creator: creator,
      origin: 'paytaca-wallet',
      purpose: purpose.value,
      recipients: recipients.value
    }, options)
    
    await pst.save()
    
    router.push({ 
      name: 'app-multisig-wallet-pst-view', 
      params: { unsignedtransactionhash: pst.unsignedTransactionHash }
    })

  } catch (error) {
    $q.dialog({
      message: error,
      class: `q-my-mdpt-card text-bow br-15${getDarkModeClass(darkMode.value)}`,
      ok: {
        rounded: true,
        padding: 'xs md',
        color: 'primary',
        label: $t('OK')
      }
    })

  }
}

const refreshPage = async (done) => {
  try {
    if (wallet.value) {
      balance.value = await wallet.value.getWalletBalance(route.query.asset)
      balanceConvertionRates.value = 
        await wallet.value.convertBalanceToCurrencies(
          route.query.asset,
          balance.value,
          [$store.getters['market/selectedCurrency'].symbol]
        )
    }
  } catch (error) {
    console.error('Error refreshing page:', error)
  } finally {
    if (done) done()
  }
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

  const nextChangeCashAddress = wallet.value.getChangeAddress(wallet.value.getLastUsedChangeAddressIndex(network) + 1).address
  const promises = [
    (async () => $store.dispatch(
      'multisig/subscribeWalletAddress',
      nextChangeCashAddress
    ))()
  ]
  await Promise.allSettled(promises)
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>