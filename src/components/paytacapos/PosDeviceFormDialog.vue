<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :persistent="loading" full-width seamless>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h6 q-space q-mt-sm">
          <template v-if="newDevice">
            {{ $t('AddNewDevice', {}, 'Add new device') }}
          </template>
          <template v-else>
            {{ $t('UpdateDeviceIDNo', { ID: padPosId(posDevice?.posid) }, `Update device #${padPosId(posDevice?.posid)}`) }}
          </template>
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-form @submit="savePosDevice()" class="q-gutter-y-sm">
          <q-input
            outlined
            dense
            :label="$t('DeviceName')"
            :disable="loading"
            :dark="darkMode"
            v-model="posDeviceForm.name"
            :rules="[
              val => Boolean(val) || $t('Required', {}, 'Required'),
            ]"
          />
          <q-select
            outlined
            dense
            :label="$t('Branch')"
            :disable="loading"
            :dark="darkMode"
            :options="branchOpts"
            option-label="name"
            option-value="id"
            emit-value
            map-options
            clearable
            :popup-content-class="darkMode ? '': 'text-black'"
            v-model="posDeviceForm.branchId"
            popup-content-style="color: black;"
          />
          <div v-if="loading" class="text-center q-mt-md">
            <template v-if="newDevice">
              {{ newDeviceLoadingMsg }}
            </template>
            <template v-else>
              {{$t('UpdatingDeviceIDNo', {ID: padPosId(posDevice?.posid)}, `Updating device #${padPosId(posDevice?.posid)}`)}}
            </template>
            <q-spinner size="1.5em" class="q-ml-xs"/>
          </div>
          <div class="row items-center justify-end q-mt-md">
            <q-btn
              flat
              :disable="loading"
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              :label="$t('Cancel', {}, 'Cancel')"
              @click="onDialogCancel"
            />
            <q-btn
              flat
              type="submit"
              :disable="loading"
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              :label="newDevice ? $t('Create', {}, 'Create') : $t('Update', {}, 'Update')"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { backend as posBackend, padPosId } from 'src/wallet/pos'
import { bus } from 'src/wallet/event-bus';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadWallet } from "src/wallet"
import { VerificationTokenMinter } from 'src/vouchers/verification_token_minter.js'

// dialog plugins requirement
const emit = defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $q = useQuasar()
const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  newDevice: Boolean,
  posDevice: Object,
  merchantId: [Number, String],
  branchOptions: Array,
})

const newDeviceLoadingMsg = ref($t('AddingNewDevice'))
const walletType = 'bch'
const walletData = computed(() => {
  const _walletData = $store.getters['global/getWallet'](walletType)
  // extract necessary data
  const data = {
    walletHash: _walletData?.walletHash,
    xPubKey: _walletData?.xPubKey,
  }

  // Object.assign to pass all other data that might come in handy
  Object.assign(data, _walletData)
  return data
})

const loading = ref(false)
const posDeviceForm = ref({
  name: '',
  branchId: null,
})
const branchOpts = computed(() => {
  let opts = []
  if (Array.isArray(props.branchOptions)) opts.push.apply(opts, props.branchOptions)
  return opts
})
onMounted(() => resetForm())
function resetForm(opts={ clear: false }) {
  if (opts?.clear) {
    posDeviceForm.value.name = ''
    posDeviceForm.value.branchId = null
    return
  }
  posDeviceForm.value.name = props.posDevice?.name || ''
  posDeviceForm.value.branchId = props.posDevice?.branchId || defaultBranch.value?.id
}

const defaultBranch = computed(() => {
  const mainBranch = props.branchOptions?.filter?.(branch => branch?.isMain)
  if(mainBranch?.length === 1) return mainBranch[0]
  return
})

async function getFirstPosPubkeys (posid) {
  const wallet = await loadWallet('BCH')
  const posFirstIndex = '1' + padPosId(posid)
  const pubkeys = await wallet.BCH.getPublicKey(undefined, undefined, true, Number(posFirstIndex))
  return pubkeys
}

async function getZerothAddressAndWif () {
  const wallet = await loadWallet('BCH')
  const address = await wallet.BCH.getAddressSetAt(0)
  const wif = await wallet.BCH.getPrivateKey(undefined, undefined, true)
  return {
    address: address.receiving,
    wif: wif.receiving,
  }
}

// device vault token address
async function mintMintingNftToDeviceVault (tokenAddress) {  
  const { address, wif } = await getZerothAddressAndWif()
  const opts = {
    params: {
      merchant: {
        category,
      },
      funder: {
        address,
        wif,
      }
    },
    options: {
      network: $store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet',
    }
  }
  
  const minter = new VerificationTokenMinter(opts)
  await minter.mintMintingNft(tokenAddress)
  loading.value = false
}

async function checkBalance () {
  const wallet = await loadWallet('BCH')
  const response = await wallet.BCH.getBalance()
  const enough = response.balance >= 0.00003
  if (!enough) {
    $q.notify({
      color: 'brandblue',
      message: $t('DeviceVerificationMintingFeeMsg'),
      icon: 'mdi-information',
      timeout: 3000
    })
  }
  return enough
}

async function savePosDevice() {
  const posid = props.posDevice?.posid
  const data = Object.assign({
    wallet_hash: props.posDevice?.walletHash || walletData?.value?.walletHash,
    branch_id: posDeviceForm.value.branchId,
    merchant_id: props.posDevice?.merchantId || props.merchantId,
  }, posDeviceForm.value)

  if (!props.newDevice) {
    data.posid = posid
    
    const url = `/vouchers/device-vaults/?posid=${posid}&wallet_hash=${data.wallet_hash}`
    const response = await posBackend.get(url)
    if (response.data.length === 0) {
      const enough = await checkBalance()
      if (!enough) return
    }
  } else {
    data.posid = -1
    const payload = { wallet_hash: data.wallet_hash }
    const response = await posBackend.post('/paytacapos/devices/latest_posid/', payload)
    posid = response.posid
  }

  const receivingPubkey = await getFirstPosPubkeys(posid)
  data.pubkey = receivingPubkey.receiving
  loading.value = true

  const apiRequest = posBackend.post(`/paytacapos/devices/`, data, { authorize: true })
    .catch(error => {
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
    .finally(() => {
      loading.value = false
      const url = `/vouchers/device-vaults/?posid=${posid}&wallet_hash=${data.wallet_hash}`
      posBackend.get(url).then(response => {
        if (response.data.length > 0) {
          const deviceVault = response.data[0]
          mintMintingNftToDeviceVault(deviceVault.token_address)
        }
      })
    })

  onDialogOK(apiRequest)
}
</script>
