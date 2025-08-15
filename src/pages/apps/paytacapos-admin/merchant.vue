<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('POSAdmin')"
      class="apps-header"
    />
    <q-card
      class="br-15 q-mx-md q-mt-lg q-mb-md pt-card text-bow"
      :style="{'margin-top': $q.platform.is.ios ? '35px' : '0'}"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section>
        <q-item
          dense
          class="q-px-sm"
          style="flex-wrap:wrap;"
        >
          <template v-if="merchantInfo?.id">
            <q-item-section>
              <q-item-label class="text-h6">
                <q-icon name="storefront" size="1.25em"/>
                {{ merchantInfo?.name }}
              </q-item-label>
              <q-item-label v-if="merchantInfo?.primaryContactNumber" class="text-subtitle1 text-weight-light">
                <q-icon name="phone" size="1rem" class="q-mr-sm"/>
                {{ merchantInfo?.primaryContactNumber }}
              </q-item-label>
              <q-item-label v-if="merchantInfo?.formattedLocation" class="text-subtitle2 text-weight-light ellipsis-2-lines">
                <q-icon name="location_on" size="1rem" class="q-mr-sm"/>
                {{ merchantInfo?.formattedLocation }}
              </q-item-label>
              <q-item-label
                class="text-subtitle1 text-weight-light ellipsis-2-lines"
                v-ripple style="position:relative;"
              >
                <div class="row items-center">
                  <q-icon name="store" size="1rem" class="q-mr-sm"/>
                  <span v-if="!merchantBranches.length" class="text-grey">{{ $t('NoBranches') }}</span>
                  <span v-else>
                    {{ merchantBranches.length }} {{merchantBranches.length > 1 ? $t('Branches'): $t('BranchSmall')}}
                  </span>
                  <q-space/>
                  <q-icon name="more_horiz" size="1.5em" class="q-px-sm"/>
                </div>
                <q-menu
                  anchor="bottom right"
                  self="top right"
                  class="q-pa-sm pt-card text-bow"
                  :class="getDarkModeClass(darkMode)"
                >
                  <q-list separator :dark="darkMode">
                    <q-item
                      v-for="branch in merchantBranches" :key="branch.id"
                      dense
                      clickable
                      v-ripple
                      @click="showBranchInfo(branch)"
                    >
                      <q-item-section>
                        <q-item-label>
                          {{ branch.name }}
                          <span v-if="branch?.isMain" class="text-caption text-grey">
                            ({{ $t('MainBranch', {}, 'Main Branch') }})
                          </span>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      dense
                      clickable
                      v-ripple
                      @click="openNewBranchForm()"
                    >
                      <q-item-section>
                        <q-item-label>
                          {{ $t('Add', {}, 'Add') }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon name="add" color="green"/>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-item-label>
            </q-item-section>
          </template>
          <template v-else>
            <q-item-section>
              <q-item-label class="text-subtitle1">{{ $t('NoMerchantDetails') }}</q-item-label>
              <q-item-label class="text-subtitle2 text-grey">{{ $t('SetupMerchantDetails') }}</q-item-label>
            </q-item-section>
          </template>
          <div class="row edit-merchant-info-button">
            <q-btn
              dense
              flat
              padding="none"
              icon="edit"
              size="1em"
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click.stop="openMerchantInfoDialog()"
            />
            <q-btn-dropdown
              dense
              flat
              dropdown-icon="more_vert"
              size="1em"
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)">
              <q-list class="q-mt-sm">
                <q-item :disable="isCardPaymentsEnabled" clickable @click="enableCardPayments()">
                  <div>
                    <q-icon v-if="isCardPaymentsEnabled" name="check_circle" color="green" size="1.25em" class="q-ml-xs"/>
                    <q-icon v-else name="credit_card" size="1.25em" class="q-mr-xs"/>
                    {{ !isCardPaymentsEnabled ? $t('Enable Card Payments') : $t('Card Payments Enabled') }}
                  </div>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>
        </q-item>
        <!-- TODO: Uncomment this when cashout is ready -->
        <!-- <div class="text-center q-pt-xs q-px-md">
          <q-btn
            outline
            rounded
            dense
            :disable="!isCashoutAvailable"
            :loading="cashoutBtnLoading"
            label="Cash out"
            icon="payments"
            class="button button-text-primary full-width"
            :class="getDarkModeClass(darkMode)"
            @click="openCashoutPage()"
          />
          <div class="q-pt-xs text-grey-6 text-italic" style="font-size: 10px;">
            {{ cashoutErrorMsg }}
          </div>
        </div> -->
      </q-card-section>
    </q-card>

    <q-card
      class="br-15 q-pt-sm q-mx-md pt-card text-bow"
      :style="{ 'margin-top': $q.platform.is.ios ? '55px' : '0'}"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section>
        <div class="row items-center">
          <div class="q-space text-h5">
            {{ $t('Devices') }}
          </div>
          <q-btn
            icon="assessment"
            padding="xs"
            round
            :color="darkMode ? 'grad' : 'brandblue'"
            class="q-mr-sm button"
            @click="displaySalesReportDialog()"
          />
          <q-btn
            icon="add"
            padding="xs"
            round
            class="button"
            :color="darkMode ? 'grad' : 'brandblue'"
            @click="addNewPosDevice()"
          />
        </div>
        <q-separator :color="darkMode ? 'white' : 'grey-7'" class="q-mt-md q-mb-lg"/>
        <div v-if="parsedPosDevicePagination.pages > 1" class="row justify-end q-mb-sm q-px-md">
          <q-pagination
            :modelValue="parsedPosDevicePagination.currentPage"
            :max="parsedPosDevicePagination.pages"
            :max-pages="5"
            input
            :dark="darkMode"
            size="lg"
            @update:modelValue="val => fetchPosDevices({
              limit: parsedPosDevicePagination.pageSize,
              offset: parsedPosDevicePagination.pageSize * (val - 1)
            })"
          />
        </div>
        <div v-if="fetchingPosDevices" class="q-mt-sm q-px-md q-gutter-md">
          <q-skeleton v-for="i in 3" height="3.25rem"/>
        </div>
        <template v-else v-for="posDevice in posDevices" :key="posDevice?.posid">
          <q-item dense>
            <q-item-section>
              <q-item-label class="text-subtitle1">
                {{ posDevice?.name || 'POSID' }} #{{ padPosId(posDevice?.posid) }}
              </q-item-label>
              <q-item-label v-if="merchantBranch(posDevice?.branchId)?.name" class="row items-center text-subtitle2 text-grey">
                <q-icon name="store" size="1.25em" class="q-mr-xs"/>
                {{ merchantBranch(posDevice?.branchId)?.name }}
              </q-item-label>
              <q-item-label v-if="posDevice?.isLinked?.()" class="row items-center text-subtitle2 text-grey">
                <q-icon v-if="posDevice?.linkedDevice?.unlinkRequest?.id" name="phonelink_erase" size="1.25em" class="q-mr-xs" />
                <q-icon v-else-if="posDevice?.linkedDevice?.isSuspended" name="phonelink_lock" size="1.25em" class="q-mr-xs"/>
                <q-icon v-else name="phone_iphone" size="1.25em" class="q-mr-xs"/>
                <span>{{ posDevice?.linkedDevice?.name || posDevice?.linkedDevice?.deviceModel }}</span>
                <q-icon name="circle" :color="isDeviceOnline(posDevice) ? 'green': 'grey'" size=".75em" class="q-ml-xs"/>
                <q-popup-proxy
                  v-if="(posDevice?.linkedDevice?.isSuspended || posDevice?.linkedDevice?.unlinkRequest?.id)"
                  :breakpoint="0"
                >
                  <div class="q-px-md q-py-smtext-caption pt-card-2 pt-label device-tooltip" :class="getDarkModeClass(darkMode)">
                    <div v-if="posDevice?.linkedDevice?.isSuspended">{{ $t("DeviceSuspendedPOS") }}</div>
                    <div v-if="posDevice?.linkedDevice?.unlinkRequest?.id">{{ $t('UnlinkPending') }}</div>
                  </div>
                </q-popup-proxy>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn icon="more_vert" flat>
                <q-menu>
                  <q-list style="min-width: 100px" class="pt-card" :class="getDarkModeClass(darkMode, '', 'text-black')">
                    <q-item
                      clickable
                      v-close-popup
                      @click="displayDeviceSalesReportDialog(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('SalesReport', {}, 'Sales Report') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="updatePosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>
                          {{ $t('Update', {}, 'Update') }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-if="posDevice?.isLinked?.() && posDevice?.linkedDevice?.unlinkRequest?.id"
                      clickable
                      v-close-popup
                      @click="confirmCancelUnlinkPosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>
                          {{ $t('Cancel', {}, 'Cancel') }}
                          {{ $t('Unlink', {}, 'Unlink').toLowerCase() }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-else-if="posDevice?.isLinked?.()"
                      clickable
                      v-close-popup
                      :disabled="posDevice?.linkedDevice?.unlinkRequest?.id"
                      @click="confirmUnlinkPosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('Unlink', {}, 'Unlink') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-else
                      clickable
                      v-close-popup
                      @click="openLinkDeviceDialog(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('Link', {}, 'Link') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-if="posDevice?.isLinked?.()"
                      clickable
                      v-close-popup
                      @click="updateDeviceSuspension(posDevice, !posDevice?.linkedDevice?.isSuspended)"
                    >
                      <q-item-section>
                        <q-item-label>
                          <template v-if="posDevice?.linkedDevice?.isSuspended">
                            {{ $t('UnsuspendDevice', {}, 'Unsuspend device') }}
                          </template>
                          <template v-else>
                            {{ $t('SuspendDevice', {}, 'Suspend device') }}
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="confirmRemovePosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('Remove') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-item-section>
          </q-item>
          <q-separator :color="darkMode ? 'white' : 'grey-7'" spaced inset/>
        </template>
        <div v-if="!posDevices?.length && !fetchingPosDevices" class="text-grey text-center">
          {{ $t('NoDevices') }}
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ml-sm">{{ $t('DeviceVerificationMintingFeeMsg') }}</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('OK')" color="brandblue" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <MerchantInfoDialog v-model="showMerchantInfoDialog" :merchant="merchantInfo" />
    <BranchFormDialog
      v-model="branchFormDialog.show"
      :branch-id="branchFormDialog.branch?.id"
      :new-branch="!branchFormDialog.branch?.id"
      :merchant-id="merchantId"
    />
    <PosDeviceFormDialog
      v-model="posDeviceFormDialog.show"
      :new-device="!Boolean(posDeviceFormDialog.posDevice)"
      :pos-device="posDeviceFormDialog.posDevice"
      :merchant-id="parseInt(merchantId)"
      :branch-options="merchantBranches"
      @ok="onSubmitPosDeviceFormDialog"
    />
    <SalesReportDialog
      v-model="salesReportDialog.show"
      :wallet-hash="walletData?.walletHash"
      :pos-device="salesReportDialog.posDevice"
      :merchant-id="merchantId"
    />
  </q-pull-to-refresh>
</template>

<script setup>
import BCHJS from '@psf/bch-js';
import { backend as posBackend, parsePosDeviceData, padPosId, authToken } from 'src/wallet/pos'
import { bus } from 'src/wallet/event-bus';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { debounce, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import HeaderNav from 'src/components/header-nav.vue'
import BranchFormDialog from 'src/components/paytacapos/BranchFormDialog.vue'
import MerchantInfoDialog from 'src/components/paytacapos/MerchantInfoDialog.vue'
import PosDeviceFormDialog from 'src/components/paytacapos/PosDeviceFormDialog.vue'
import { loadWallet } from 'src/wallet'
import PosDeviceLinkDialog from 'src/components/paytacapos/PosDeviceLinkDialog.vue'
import SalesReportDialog from 'src/components/paytacapos/SalesReportDialog.vue'
import Watchtower from 'watchtower-cash-js'
import { RpcWebSocketClient } from 'rpc-websocket-client';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useRouter } from 'vue-router'
import { createTerminal } from 'src/services/card/api';
import { getPublicKeyAt } from 'src/utils/wallet';

const bchjs = new BCHJS()

const $router = useRouter()
const $store = useStore()
const $q = useQuasar()
const $t = useI18n().t

const confirm = ref(false)
const wallet = ref(null)
const walletType = 'bch'
const merchantId = JSON.parse(history.state.merchantId)
const merchantData = ref(history.state.merchantData)

const isCardPaymentsEnabled = computed(() => {
  console.log('merchantData?.nfc_payments_enabled || false:', merchantData.value?.nfc_payments_enabled || false)
  return merchantData.value?.nfc_payments_enabled || false
})
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
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

async function enableCardPayments() {
  console.log('enableCardPayments', merchantData.value)
  if (merchantData.value.nfc_payments_enabled) {
    return
  }

  const payload = {
    nfc_payments_enabled: true,
  }

  await posBackend.patch(`paytacapos/merchants/${merchantId}/`, payload)
    .then(response => {
      console.log('Card payments enabled:', response.data)
      $q.notify({
        type: 'positive',
        message: $t('CardPaymentsEnabled', {}, 'Card payments enabled'),
      })
      merchantData.value.nfc_payments_enabled = true
    })
    .catch(error => {
      console.error('Failed to enable card payments:', error)
      $q.notify({
        type: 'negative',
        message: $t('FailedToEnableCardPayments', {}, 'Failed to enable card payments'),
      })
    })

  const network = $store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet';
  const addressIndex = 1000;
  const terminalPayload = {
    wallet_hash: walletData.value.walletHash,
    public_key: await getPublicKeyAt('bch', network, addressIndex),
    address_path: `0/${addressIndex}`,
    name: merchantData.value.name,
  }
  console.log('Creating terminal with payload:', terminalPayload);
  const response = await createTerminal(terminalPayload)
  console.log(response)
}
async function initWallet() {
  const _wallet = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
  wallet.value = _wallet
  await checkWalletLinkData()
}
async function checkWalletLinkData() {
  if (!walletData.value?.xPubKey || !walletData.value?.walletHash) {
    console.log('Incomplete wallet link data. Updating xPubKey and walletHash')
    const newWalletData = Object.assign({ type: walletType }, walletData.value)
    newWalletData.walletHash = wallet.value.BCH.getWalletHash()
    newWalletData.xPubKey = await wallet.value.BCH.getXPubKey()

    $store.commit('global/updateXPubKey', newWalletData)
    $store.commit('global/updateWallet', newWalletData)
  }
}

const authWallet = ref({ walletHash: '', walletType: '' })
async function fetchAuthWallet() {
  return posBackend.get(`auth/wallet`, { authorize: true })
    .finally(() => {
      authWallet.value = { walletHash: '', walletType: '' }
    })
    .then(response => {
      const data = response?.data
      authWallet.value = {
        walletHash: data?.wallet_hash,
        walletType: data?.wallet_type,
      }
      return response
    })
    .catch(error => {
      if(error)
      return Promise.reject(error)
    })
}

function openCashoutPage () {
  $router.push({ name: 'app-pos-cashout', state: { merchantId: this.merchantInfo?.id } })
}

const merchantsList = computed(() => $store.getters[`paytacapos/merchants`])
const merchantInfo = computed(() => merchantsList.value.find(merchant => merchant?.id == merchantId))
const showMerchantInfoDialog = ref(false)
function openMerchantInfoDialog() {
  hidePopups()
  showMerchantInfoDialog.value = !showMerchantInfoDialog.value
}
const merchantBranches = computed(() => {
  return $store.getters['paytacapos/merchantBranches']
    .filter(branch => branch?.merchant?.id == merchantId)
})
function fetchBranches() {
  return $store.dispatch(
    'paytacapos/refetchBranches',
    { walletHash: walletData.value.walletHash, merchantId: parseInt(merchantId) },
  )
}
watch(
  () => walletData.value.walletHash,
  () => $store.dispatch(
    'paytacapos/refetchBranches',
    { walletHash: walletData.value.walletHash, merchantId: merchantId }
  ),
)
function merchantBranch (branchId) {
  return merchantBranches.value.find(branchInfo => branchInfo?.id === branchId)
}

const branchFormDialog = ref({ show: false, branch: null })
function showBranchInfo(branch) {
  hidePopups()
  branchFormDialog.value = { show: true, branch: branch }
}

function openNewBranchForm() {
  hidePopups()
  branchFormDialog.value = { show: true, branch: null }
}

const posDevices = ref([].map(parsePosDeviceData))
posDevices.value = []
const posDevicesPageData = ref({ count: 0, limit: 10, offset: 0 })
const parsedPosDevicePagination = computed(() => {
  const pageData = posDevicesPageData?.value
  const data = { pages: 0, currentPage: 0, pageSize: 0 }
  if (pageData?.limit) data.pages = Math.ceil(pageData?.count / pageData?.limit)
  data.pageSize = pageData?.limit
  if (pageData?.offset) data.currentPage = Math.floor(pageData?.offset / pageData?.limit) + 1
  else data.currentPage = 1
  return data
})
const fetchingPosDevices = ref(false)
watch(() => walletData.value.walletHash, () => fetchPosDevices())
function fetchPosDevices(opts) {
  const walletHash = walletData.value?.walletHash
  if (!walletHash) return

  const params = {
    limit: opts?.limit || 10,
    offset: opts?.offset || 0,
    wallet_hash: walletHash,
    merchant_id: parseInt(merchantId),
  }
  fetchingPosDevices.value = true
  return posBackend.get('paytacapos/devices/', { params })
    .then(response => {
      if (Array.isArray(response?.data?.results)) {
        posDevices.value = response?.data?.results.map(parsePosDeviceData)
        posDevicesPageData.value.count = response?.data?.count || 0
        posDevicesPageData.value.limit = response?.data?.limit || 0
        posDevicesPageData.value.offset = response?.data?.offset || 0
        if (rpcClient.ws.readyState == WebSocket.OPEN) posDevices.value.forEach(updateLastActive)
      }
    })
    .then(() => {
      if (!posDevices.value?.length) return
      const missingBranchIds = []
      posDevices.value.forEach(posDevice => {
        if (!posDevice?.branchId) return
        if (!merchantBranch(posDevice?.branchId)) missingBranchIds.push(posDevice?.branchId)
      })

      missingBranchIds
        .filter((e,i,s) => s.indexOf(e) === i)
        .forEach(branchId => $store.dispatch('paytacapos/refetchBranchInfo', { branchId, walletHash }))
    })
    .finally(() => {
      fetchingPosDevices.value = false
    })
}

/**
 *
 * @param {{ walletHash:String, posid:Number }} posDevice
 * @param {Boolean} append append data to list if doesnt exist in current pos devices list state
 */
function refetchPosDevice(posDevice, append=false) {
  const handle = `${posDevice?.walletHash}:${posDevice?.posid}`
  posBackend.get(`/paytacapos/devices/${handle}/`)
    .then(response => {
      if (response?.data?.wallet_hash && response?.data?.posid >= 0) {
        syncPosDevice(parsePosDeviceData(response?.data), append)
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
}

function syncPosDevice(posDevice, append=false) {
  const index = posDevices.value.findIndex(device =>
    device?.walletHash == posDevice?.walletHash && device?.posid == posDevice?.posid
  )

  if (index >= 0) posDevices.value[index] = posDevice
  else if (append) posDevices.value.push(posDevice)
}

function openLinkDeviceDialog(posDevice) {
  hidePopups()
  $q.dialog({
    component: PosDeviceLinkDialog,
    componentProps: {
      posid: posDevice?.posid,
      name: posDevice?.name,
      wallet: wallet.value,
    }
  })
    .onDismiss(() => refetchPosDevice(posDevice))
}

async function deviceUnlinkRequest(posDevice) {
  const dialog = $q.dialog({
    title: $t('UnlinkDevice', {}, 'Unlink device'),
    message: $t('CreatingUnlinkDeviceRequest', {}, 'Creating unlink device request'),
    persistent: true,
    progress: true,
    seamless: true,
    ok: false,
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })

  return Promise.resolve(posDevice)
    .then(async (posDevice) => {
      dialog.update({ message: $t('GeneratingRandomSignature', {}, 'Generating random signature') })
      const nonce = Math.floor(Math.random() * (2 ** 31-1))
      const privkey = await wallet.value.BCH.getPrivateKey(nonce)
      const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, posDevice.linkedDevice.linkCode)
      return { posDevice, nonce, signature }
    })
    .catch(error => {
      console.error(error)
      dialog.update({
        title: $t('UnlinkDeviceRequestFailed', {}, 'Unlink device request failed'),
        message: $t('FailedToCreateRandomSig', {}, 'Failed to create random signature'),
    })
      return Promise.resolve({ skip: true })
    })
    .then(async ({ skip, posDevice, nonce, signature }) => {
      if (skip) return { skip }
      dialog.update({ message: $t('CreatingUnlinkDeviceRequest', {}, 'Creating unlink device request') })
      const data = { nonce, signature }
      const watchtower = new Watchtower()
      const response = await watchtower.BCH._api.post(`paytacapos/devices/${posDevice.walletHash}:${posDevice.posid}/unlink_device/request/`, data)
      syncPosDevice(parsePosDeviceData(response?.data))
      dialog.update({
        title: $t('UnlinkDeviceRequestCreated', {}, 'Unlink device request created'),
        message: $t('NotifyPOSDeviceToConfirmUnlinking', {}, 'Notify POS device to confirm unlinking'),
      })
    })
    .catch(error => {
      console.error(error)
      dialog.update({
        title: $t('UnlinkDeviceRequestFailed', {}, 'Unlink device request failed'),
        message: 'Failed to create unlink request',
    })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true })
    })
}

const confirmCancelUnlinkPosDeviceDialog = ref()
function confirmCancelUnlinkPosDevice(posDevice) {
  hidePopups()
  const dialog = $q.dialog({
    title: $t('UnlinkDevice', {}, 'Unlink device'),
    message: $t('CancellingUnlinkRequest', {}, 'Cancelling unlink request'),
    persistent: true,
    progress: true,
    seamless: true,
    ok: false,
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  confirmCancelUnlinkPosDeviceDialog.value = dialog
    .onDismiss(() => {
      confirmCancelUnlinkPosDeviceDialog.value = null
    })

  const handle = `${posDevice?.walletHash}:${posDevice?.posid}`
  const watchtower = new Watchtower()
  watchtower.BCH._api.post(`paytacapos/devices/${handle}/unlink_device/cancel/`)
    .then(response => {
      syncPosDevice(parsePosDeviceData(response?.data))
      dialog.update({ message: $t('UnlinkRequestCancelled', {}, 'Unlink request cancelled') })
    })
    .catch(error => {
      console.error(error)
      let message = $t('CancelUnlinkRequestError', {}, 'Cancel unlink request error')
      dialog.update({ message: message })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true })
    })
}

function updateDeviceSuspension(posDevice, isSuspended) {
  const handle = `${posDevice?.walletHash}:${posDevice?.posid}`
  const data = { is_suspended: Boolean(isSuspended) }
  const dialog = $q.dialog({
    title: data.is_suspended ? $t('SuspendDevice', {} , 'Suspend device') : $t('UnsuspendDevice', {}, 'Unsuspend device'),
    message: data.is_suspended ? $t('SuspendingDevice', {} , 'Suspending device') : $t('UnsuspendingDevice', {}, 'Unsuspending device'),
    ok: false,
    cancel: false,
    persistent: true,
    seamless: true,
    progress: true,
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  const watchtower = new Watchtower()
  watchtower.BCH._api.post(`paytacapos/devices/${handle}/suspend/`, data)
    .then(response => {
      syncPosDevice(parsePosDeviceData(response?.data))
      dialog.update({
        title: $t('Success', {}, 'Success'),
        message: data.is_suspended ? $t('Devicesuspended', {} , 'Device suspended') : $t('DeviceUnsuspended', {}, 'Device unsuspended'),
      })
    })
    .catch(error => {
      console.error(error)
      let message = ''
      if (Array.isArray(error?.response?.data?.non_field_errors)) {
        message = error?.response?.data?.non_field_errors.find(errorMsg => {
          if (errorMsg === 'pos device not found') return $t('POSDeviceNotFound', {}, 'POS device not found')
          if (errorMsg === 'pos device is not linked') return $t('POSDeviceIsNotLinked', {}, 'POS device is not linked')
        })
      } else if (error?.response?.status === 404) {
        message = $t('POSDeviceNotFound', {}, 'POS device not found')
      }
      if (!message) message = $t('UnknownErrorOccurred', {}, 'Unknown error occurred')
      dialog.update({
        title: $t('Error', {}, 'Error'),
        message: message,
      })
    })
    .finally(() => {
      dialog.update({ progress: false, persistent: false, ok: true })
    })
}


const salesReportDialog = ref({ show: false, posDevice: null })
function displayDeviceSalesReportDialog(posDevice) {
  hidePopups()
  salesReportDialog.value = { show: true, posDevice: posDevice }
}
function displaySalesReportDialog() {
  hidePopups()
  salesReportDialog.value = { show: true, posDevice: null }
}

function deviceLastActive(posDevice) {
  return $store.getters['paytacapos/devicesLastActive']?.find?.(
    data => data?.walletHash === posDevice?.walletHash && data?.posid === posDevice?.posid
  )?.lastActive
}

function isDeviceOnline(posDevice) {
  const lastActive = deviceLastActive(posDevice)
  return (lastActive + 60) * 1000 > Date.now()
}

/**
 * @param {Object} posDevice
 * @param {String} posDevice.walletHash
 * @param {Number} posDevice.posid
 */
function updateLastActive(posDevice) {
  if(!posDevice?.walletHash || !Number.isSafeInteger(posDevice?.posid)) return
  rpcClient.call('last_active', [posDevice?.walletHash, posDevice.posid])
    .then(lastActive => {
      $store.commit('paytacapos/setDeviceLastActive', {
        walletHash: posDevice.walletHash,
        posid: posDevice.posid,
        lastActive: Number(lastActive),
      })
    })
}

const confirmUnlinkPosDeviceDialog = ref()
function confirmUnlinkPosDevice(posDevice) {
  if (posDevice?.linkedDevice?.unlinkRequest?.id) return
  hidePopups()

  const msgParams = { ID: posDevice?.posid, name: posDevice?.name ? ` '${posDevice?.name}'` : ''}
  const message = $t(
    'UnlinkPOSDeviceNumName', msgParams,
    `Unlink POS Device #${msgParams.ID}${msgParams.name}`
  )
  const dialog = $q.dialog({
    title: $t('UnlinkPOSDevice', {}, 'Unlink POS device'),
    message: message,
    ok: {
      padding: 'xs md',
      flat: true,
      noCaps: true,
      label: $t('UnlinkDevice', {}, 'Unlink device'),
      color: 'red-5',
    },
    seamless: true,
    cancel: { noCaps: true, flat: true, padding: 'xs md' },
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
    .onOk(() => {
      return deviceUnlinkRequest(posDevice)
    })

  confirmUnlinkPosDeviceDialog.value = dialog
    .onDismiss(() => {
      if (confirmUnlinkPosDeviceDialog.value === dialog) {
        confirmUnlinkPosDeviceDialog.value = null
      }
    })
}

const posDeviceFormDialog = ref({ show: false, posDevice: null })
function onSubmitPosDeviceFormDialog(...args) {
  return posDeviceFormDialog.value.posDevice
    ? onSubmitUpdatePosDevice(...args)
    : onSubmitNewPosDevice(...args)
}
function onSubmitNewPosDevice(apiCall) {
  const dialog = $q.dialog({
    title: $t('NewDevice', {}, 'New device'),
    message: $t('AddingNewDevice', {}, 'Adding new device'),
    persistent: true,
    progress: true,
    seamless: true,
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
    color: 'brandblue',
  })
  apiCall
    .then(response => {
      if (response?.data?.wallet_hash && response?.data?.posid >= 0) {
        fetchPosDevices()
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
    .then(response => {
      const newPaddedPosId = padPosId(response?.data?.posid)
      dialog.update({
        message: $t('DeviceAddedIDNo', { ID: newPaddedPosId }, `Device added #${newPaddedPosId}`),
      })
    })
    .catch(error => {
      let title = ''
      let message = $t('FailedAddingNewDevice', {}, 'Failed to add new device')
      let onErrorDismiss = () => {}
      if (String(error?.response?.data?.wallet_hash).match('does not have merchant information')) {
        title = message
        message = $t('MerchantDetailsRequired', {}, 'Merchant details required')
        onErrorDismiss = () => openMerchantInfoDialog()
      }
      dialog.update({ title: title, message: message })
        .onDismiss(() => onErrorDismiss())
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false })
    })
}

function onSubmitUpdatePosDevice(apiCall) {
  const posDevice = posDeviceFormDialog.value.posDevice

  let updateDialogMsg = $t(
    'UpdatingDeviceIDNo', {ID: padPosId(posDevice?.posid)},
    `Updating device #${padPosId(posDevice?.posid)}`,
  )
  const dialog = $q.dialog({
    message: updateDialogMsg,
    persistent: true,
    progress: true,
    seamless: true,
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
    color: 'brandblue',
  })
  apiCall
    .then(response => {
      if (response?.data?.wallet_hash && response?.data?.posid >= 0) {
        refetchPosDevice(parsePosDeviceData(response?.data))
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
    .then(() => {
      updateDialogMsg = $t(
        'UpdatedDeviceIDNo', {ID: padPosId(posDevice?.posid)},
        `Updated device #${padPosId(posDevice?.posid)}`,
      )
      dialog.update({ message: updateDialogMsg })
    })
    .catch(error => {
      let title = ''
      let message = $t(
        'FailedUpdateDeviceIDNo', {ID: padPosId(posDevice?.posid)},
        `Failed to update device #${padPosId(posDevice?.posid)}`,
      )
      let onErrorDismiss = () => {}
      if (String(error?.response?.data?.wallet_hash).match('does not have merchant information')) {
        title = message
        message = $t('MerchantDetailsRequired', {}, 'Merchant details required')
        onErrorDismiss = () => openMerchantInfoDialog()
      }

      dialog.update({ title: title, message: message })
        .onDismiss(() => onErrorDismiss())
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false })
    })
}

function addNewPosDevice() {
  hidePopups()
  posDeviceFormDialog.value = { show: true, posDevice: null }
}

function updatePosDevice(posDevice) {
  hidePopups()
  posDeviceFormDialog.value = { show: true, posDevice: posDevice }
}

const confirmRemovePosDeviceDialog = ref()
function confirmRemovePosDevice(posDevice) {
  const msgParams = { ID: posDevice?.posid, name: posDevice?.name ? ` '${posDevice?.name}'` : ''}
  const message = $t(
    'RemovePOSDeviceNumName', msgParams,
    `Remove POS Device #${msgParams.ID}${msgParams.name}`
  )
  hidePopups()
  const dialog = $q.dialog({
    title: $t('RemovePOSDevice', {}, 'Remove POS device'),
    message: message,
    ok: {
      padding: 'xs md',
      flat: true,
      noCaps: true,
      label: $t('RemoveDevice', {}, 'Remove device'),
      color: 'red-5',
    },
    seamless: true,
    cancel: { noCaps: true, flat: true, padding: 'xs md', label: $t('Cancel') },
    class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
    .onOk(() => {
      let updateDialogMsg = $t(
        'RemovingDeviceIDNo', {ID: padPosId(posDevice?.posid)},
        `Removing device #${padPosId(posDevice?.posid)}`,
      )
      const dialog = $q.dialog({
        message: updateDialogMsg,
        persistent: true,
        seamless: true,
        progress: true,
        class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
      })
      deletePosDevice(posDevice)
        .then(() => {
          updateDialogMsg = $t(
            'RemovedDeviceIDNo', {ID: padPosId(posDevice?.posid)},
            `Removed device #${padPosId(posDevice?.posid)}`,
          )
          dialog.update({ message: updateDialogMsg })
        })
        .catch(error => {
          console.error(error)
          let message = ''
          if (Array.isArray(error?.response?.data)) {
            message = error?.response?.data.find(errorMsg => {
              if (String(errorMsg).indexOf('device is linked') >= 0) return $t('POSDeviceMustBeUnlinked', {}, 'POS Device must be unlinked')
            })
          }

          if (!message && error?.response?.status === 404) message = $t('POSDeviceNotFound', {}, 'POS device not found')

          if (!message) message = $t('FailedToRemoveDevice', {}, 'Failed to remove device')

          dialog.update({
            title: $t('RemoveDeviceFailed', {}, 'Remove Device Failed'),
            message: message,
          })
        })
        .finally(() => {
          dialog.update({ persistent: false, progress: false })
        })
    })

  confirmRemovePosDeviceDialog.value = dialog
    .onDismiss(() => {
      confirmRemovePosDeviceDialog.value = null
    })
}

/**
 * @param {{ walletHash:String, posid:Number }} posDevice
 */
function deletePosDevice(posDevice) {
  const handle = `${posDevice?.walletHash}:${posDevice?.posid}`
  return posBackend.delete(`paytacapos/devices/${handle}/`, { authorize: true }).then(() => fetchPosDevices())
    .catch(error => {
      if (error?.response?.status == 403) bus.emit('paytaca-pos-relogin')
      return Promise.reject(error)
    })
}

function hidePopups() {
  try {
    confirmRemovePosDeviceDialog.value?.hide?.()
  } catch {}
  try {
    confirmUnlinkPosDeviceDialog.value?.hide?.()
  } catch {}
  posDeviceFormDialog.value.show = false
  showMerchantInfoDialog.value = false
  branchFormDialog.value.show = false
  salesReportDialog.value.show = false
}


onMounted(() => bus.on('paytaca-pos-relogin', reLogin))
onMounted(() => enableCardPayments())
onUnmounted(() => bus.off('paytaca-pos-relogin', reLogin))
const reLogin = debounce(async (opts = {silent: false }) => {
  const loadingKey = 'paytacapos-relogin'
  try {
    if (!opts?.silent) {
      $q.loading.show({ group: loadingKey, message: $t('LoggingYouIn') })
    }
    await authToken.generate(wallet.value)
  } finally {
    $q.loading.hide(loadingKey)
  }
}, 500)

/**
 * @param {Object} rpcResult
 * @param {Object} rpcResult.result
 * @param {Object} rpcResult.result.update
 * @param {String} rpcResult.result.update.resource
 * @param {String} rpcResult.result.update.action
 * @param {Object} [rpcResult.result.update.object]
 * @param {Object} [rpcResult.result.update.data]
*/
const rpcUpdateHandler = (rpcResult) => {
  const updateData = rpcResult?.result?.update
  if (!updateData) return
  if (updateData?.resource === 'pos_device') {
    switch(updateData?.action) {
      case 'update':
      case 'link':
      case 'unlink':
      case 'suspend':
      case 'unsuspend':
        refetchPosDevice({
          walletHash:updateData?.object?.wallet_hash,
          posid:updateData?.object?.posid,
        })
        break
      case 'create':
        fetchPosDevices()
        break
      case 'ping':
        $store.commit('paytacapos/setDeviceLastActive', {
          walletHash:updateData?.object?.wallet_hash,
          posid:updateData?.object?.posid,
          lastActive: Number(updateData?.data?.timestamp),
        })
        break
    }
  }
}

const rpcClient = new RpcWebSocketClient()
const enableRpcReconnection = ref(true)
const rpcReconnectTimeout = ref(null)
if (rpcClient.onNotification.indexOf(rpcUpdateHandler) < 0) {
  rpcClient.onNotification.push(rpcUpdateHandler)
}
rpcClient.onClose(error => {
  if (rpcReconnectTimeout.value == null && enableRpcReconnection.value) {
    console.log('RPC client closed', error)
    connectRpcClient({ retries: 5 })
  }
})
rpcClient.onOpen(() => {
  posDevices.value.forEach(updateLastActive)
})
onMounted(() => connectRpcClient({retries: 5}))
onUnmounted(() => {
  enableRpcReconnection.value = false
  console.log('Closing rpc client', rpcClient?.ws?.close())
  console.log('Cancelling reconnect timeout', rpcReconnectTimeout.value, clearTimeout(rpcReconnectTimeout.value))
})
/**
 * @param {Object} opts
 * @param {Number} [opts.retries]
 */
function connectRpcClient(opts) {
  const apiUrl = new URL(new Watchtower().BCH._api.defaults.baseURL)
  const RECONNECT_INTERVAL = 10 * 1000
  const scheme = apiUrl.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${scheme}://${apiUrl.host}/ws/paytacapos/updates/${walletData.value.walletHash}/`
  rpcClient.connect(url)
    .then(response => {
      console.log('RPC Client connected:', response)
      clearTimeout(rpcReconnectTimeout.value)
      rpcReconnectTimeout.value = null
    })
    .catch(error => {
      console.error('RPC Client connection error:', error)
      if (opts?.retries > 0 && enableRpcReconnection.value) {
        console.log('Retrying reconnection after', RECONNECT_INTERVAL/1000, 'second/s')
        clearTimeout(rpcReconnectTimeout.value)
        rpcReconnectTimeout.value = setTimeout(() => connectRpcClient({ retries: opts?.retries - 1 }), RECONNECT_INTERVAL)
      } else {
        console.log('Skipping reconnection')
      }
    })
}

onMounted(() => refreshPage())
async function refreshPage(done=() => {}) {
  resetCashoutData()
  try {
    await initWallet()
    await fetchAuthWallet()
      .finally(() => {
        if (walletData.value?.walletHash == authWallet.value?.walletHash) return
        reLogin({ silent: true })
      })

    await Promise.all([
      fetchPosDevices(),
      fetchBranches(),
      checkCashoutAvailability(),
    ])
  } finally {
    done?.()
  }

}

let isCashoutAvailable = false
let cashoutErrorMsg = null
let cashoutBtnLoading = true

async function checkCashoutAvailability () {
  await $store.dispatch('global/fetchAppControl')
  const merchantData = $store.getters['global/merchantActivity']
  const appControl = $store.getters['global/appControl']
  const country = $store.getters['global/country']

  const cashoutControl = appControl.find(item => item.feature_name === 'MERCHANT_CASH_OUT')

  if (cashoutControl?.is_enabled) {
    isCashoutAvailable = true

    if (!cashoutControl.enabled_countries.includes(country.code)) {
      isCashoutAvailable = false

      cashoutErrorMsg = 'Cash out is unavailable in your country'
    } else {
      if (!(merchantData.active && merchantData.verified)) {
        isCashoutAvailable = false

        cashoutErrorMsg = 'Cash out is available only for active and verified merchants'
      }
    }
  } else {
    isCashoutAvailable = false

    cashoutErrorMsg = 'Cash out is unavailable at the moment'
  }

  cashoutBtnLoading = false
}

function resetCashoutData () {
  isCashoutAvailable = false
  cashoutErrorMsg = null
  cashoutBtnLoading = true
}
</script>
<style lang="scss" scoped>
  .device-tooltip > div::before {
    content: "- ";
  }
  .device-tooltip > div:only-child::before {
    content: "";
  }
  .edit-merchant-info-button {
    position: absolute;
    top: 0rem;
    right: 0.25rem;
  }
  .cashout-button {
    position: absolute;
    top: 0rem;
    right: 2.5rem;
  }
</style>
