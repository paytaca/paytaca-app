<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="POS Admin"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />
    <q-card
      class="br-15 q-mx-md q-mb-md"
      :style="{ 'margin-top': $q.platform.is.ios ? '55px' : '0'}"
      :class="[
        darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
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
                  <span v-if="!merchantBranches.length" class="text-grey">No branches</span>
                  <span v-else>
                    {{ merchantBranches.length }} branch{{merchantBranches.length > 1 ? 'es': ''}}
                  </span>
                  <q-space/>
                  <q-icon name="more_horiz" size="1.5em" class="q-px-sm"/>
                </div>
                <q-menu anchor="bottom right" self="top right" :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-pa-sm']">
                  <q-list separator :dark="darkMode">
                    <q-item
                      v-for="branch in merchantBranches" :key="branch.id"
                      dense
                      clickable
                      v-ripple
                      @click="showBranchInfo(branch)"
                    >
                      <q-item-section>
                        <q-item-label>{{ branch.name }}</q-item-label>
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
              <q-item-label class="text-subtitle1">No merchant details</q-item-label>
              <q-item-label class="text-subtitle2 text-grey">Setup merchant details</q-item-label>
            </q-item-section>
          </template>
          <q-btn
            flat
            padding="sm"
            icon="edit"
            size="1em"
            class="text-grey float-right"
            style="position:absolute;top:0rem;right:0.25rem;"
            @click.stop="openMerchantInfoDialog()"
          />
        </q-item>
      </q-card-section>
    </q-card>

    <q-card
      class="br-15 q-pt-sm q-mx-md"
      :style="{ 'margin-top': $q.platform.is.ios ? '55px' : '0'}"
      :class="[
        darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
    >
      <q-card-section>
        <div class="row items-center">
          <div class="q-space text-h5">
            {{ $t('Devices') }}
          </div>
          <q-btn
            icon="add"
            padding="xs"
            round
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
                <q-icon name="phone_iphone" size="1.25em" class="q-mr-xs"/>
                <span>{{ posDevice?.linkedDevice?.name || posDevice?.linkedDevice?.deviceModel }}</span>
                <q-icon name="circle" :color="isDeviceOnline(posDevice) ? 'green': 'grey'" size=".75em" class="q-ml-xs"/>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn icon="more_vert" flat>
                <q-menu>
                  <q-list :class="{'pt-dark-card': darkMode, 'text-black': !darkMode }" style="min-width: 100px">
                    <q-item
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
                      @click="updatePosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>
                          {{ $t('Update', {}, 'Update') }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-if="posDevice?.isLinked?.()"
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
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
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
                      @click="openLinkDeviceDialog(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('Link', {}, 'Link') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
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
          No devices
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup>
import { backend as posBackend, parsePosDeviceData, padPosId } from 'src/wallet/pos'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import HeaderNav from 'src/components/header-nav.vue'
import BranchFormDialog from 'src/components/paytacapos/BranchFormDialog.vue'
import MerchantInfoDialog from 'src/components/paytacapos/MerchantInfoDialog.vue'
import PosDeviceDetailDialog from 'src/components/paytacapos/PosDeviceDetailDialog.vue'
import PosDeviceFormDialog from 'src/components/paytacapos/PosDeviceFormDialog.vue'
import { loadWallet } from 'src/wallet'
import PosDeviceLinkDialog from 'src/components/paytacapos/PosDeviceLinkDialog.vue'
import Watchtower from 'watchtower-cash-js'
import { RpcWebSocketClient } from 'rpc-websocket-client';


const $store = useStore()
const $q = useQuasar()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

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

const wallet = ref(null)
onMounted(() => {
  loadWallet('BCH').then(_wallet => {
    wallet.value = _wallet
    checkWalletLinkData()
  })
})
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
onMounted(() => checkWalletLinkData())

const merchantInfo = computed(() => $store.getters['paytacapos/merchantInfo'])
onMounted(() => $store.dispatch('paytacapos/refetchMerchantInfo', { walletHash: walletData.value.walletHash }))
watch(
  () => walletData.value.walletHash,
  () => $store.dispatch('paytacapos/refetchMerchantInfo', { walletHash: walletData.value.walletHash }),
)
function openMerchantInfoDialog() {
  $q.dialog({
    component: MerchantInfoDialog,
  })
}
const merchantBranches = computed(() => $store.getters['paytacapos/merchantBranches'])
onMounted(() => $store.dispatch('paytacapos/refetchBranches', { walletHash: walletData.value.walletHash }))
watch(
  () => walletData.value.walletHash,
  () => $store.dispatch('paytacapos/refetchBranches', { walletHash: walletData.value.walletHash }),
)
function merchantBranch (branchId) {
  return merchantBranches.value.find(branchInfo => branchInfo?.id === branchId)
}
function showBranchInfo(branch) {
  $q.dialog({
    component: BranchFormDialog,
    componentProps: {
      branchId: branch?.id,
    }
  })
}

function openNewBranchForm() {
  $q.dialog({
    component: BranchFormDialog,
    componentProps: {
      newBranch: true,
    }
  })
}

const posDevices = ref([ { walletHash: '', posid: -1, name: '', linkedDevice: null, lastActive: 0 } ])
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
onMounted(() => fetchPosDevices())
watch(() => walletData.value.walletHash, () => fetchPosDevices())
function fetchPosDevices(opts) {
  if (!walletData.value?.walletHash) return

  const params = {
    limit: opts?.limit || 10,
    offset: opts?.offset || 0,
    wallet_hash: walletData.value?.walletHash,
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
        const parsedData = parsePosDeviceData(response?.data)
        const index = posDevices.value.findIndex(device => 
          device?.walletHash == parsedData?.walletHash && device?.posid == parsedData?.posid
        )

        if (index >= 0) posDevices.value[index] = parsedData
        else if (append) posDevices.value.push(parsedData)
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
}

function displayPosDeviceInDialog(posDevice) {
  $q.dialog({
    component: PosDeviceDetailDialog,
    componentProps: { posId: posDevice?.posid, name: posDevice?.name }
  })
}

function openLinkDeviceDialog(posDevice) {
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

function confirmUnlinkPosDevice(posDevice) {
  const msgParams = { ID: posDevice?.posid, name: posDevice?.name ? ` '${posDevice?.name}'` : ''}
  const message = $t(
    'UnlinkPOSDeviceNumName', msgParams,
    `Unlink POS Device #${msgParams.ID}${msgParams.name}`
  )
  $q.dialog({
    title: $t('UnlinkPOSDevice', {}, 'Unlink POS device'),
    message: message,
    ok: {
      padding: 'xs md',
      flat: true,
      noCaps: true,
      label: $t('UnlinkDevice', {}, 'Unlink device'),
      color: 'red-5',
    },
    cancel: { noCaps: true, flat: true, padding: 'xs md' },
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
  })
    .onOk(() => {
      let updateDialogMsg = $t(
        'UnlinkingDeviceIDNo', {ID: padPosId(posDevice?.posid)},
        `Unlinking device #${padPosId(posDevice?.posid)}`,
      )
      const dialog = $q.dialog({
        message: updateDialogMsg,
        persistent: true,
        progress: true,
        class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
      })

      const walletHashPosid = `${posDevice?.walletHash}:${posDevice?.posid}`
      const watchtower = new Watchtower()
      watchtower.BCH._api.post(`paytacapos/devices/${walletHashPosid}/unlink_device/`)
        .then(response => {
          updateDialogMsg = $t(
            'UnlinkedDeviceIDNo', {ID: padPosId(posDevice?.posid)},
            `Unlinked device #${padPosId(posDevice?.posid)}`,
          )
          dialog.update({ message: updateDialogMsg })
          refetchPosDevice(parsePosDeviceData(response?.data))
        })
        .finally(() => {
          dialog.update({ persistent: false, progress: false })
        })
    })
}

function addNewPosDevice() {
  const dialog = $q.dialog({
    component: PosDeviceFormDialog,
    componentProps: {
      newDevice: true,
      branchOptions: merchantBranches.value,
    }
  })
    .onOk(apiCall => {
      const dialog = $q.dialog({
        title: $t('NewDevice', {}, 'New device'),
        message: $t('AddingNewDevice', {}, 'Adding new device'),
        persistent: true,
        progress: true,
        class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
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
    })
}

function updatePosDevice(posDevice) {
  const dialog = $q.dialog({
    component: PosDeviceFormDialog,
    componentProps: {
      newDevice: false,
      posDevice: posDevice,
      branchOptions: merchantBranches.value,
    }
  })
    .onOk(apiCall => {
      let updateDialogMsg = $t(
        'UpdatingDeviceIDNo', {ID: padPosId(posDevice?.posid)},
        `Updating device #${padPosId(posDevice?.posid)}`,
      )
      const dialog = $q.dialog({
        message: updateDialogMsg,
        persistent: true,
        progress: true,
        class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
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
    })
}

function confirmRemovePosDevice(posDevice) {
  const msgParams = { ID: posDevice?.posid, name: posDevice?.name ? ` '${posDevice?.name}'` : ''}
  const message = $t(
    'RemovePOSDeviceNumName', msgParams,
    `Remove POS Device #${msgParams.ID}${msgParams.name}`
  )
  $q.dialog({
    title: $t('RemovePOSDevice', {}, 'Remove POS device'),
    message: message,
    ok: {
      padding: 'xs md',
      flat: true,
      noCaps: true,
      label: $t('RemoveDevice', {}, 'Remove device'),
      color: 'red-5',
    },
    cancel: { noCaps: true, flat: true, padding: 'xs md' },
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
  })
    .onOk(() => {
      let updateDialogMsg = $t(
        'RemovingDeviceIDNo', {ID: padPosId(posDevice?.posid)},
        `Removing device #${padPosId(posDevice?.posid)}`,
      )
      const dialog = $q.dialog({
        message: updateDialogMsg,
        persistent: true,
        progress: true,
        class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
      })
      deletePosDevice(posDevice)
        .then(() => {
          updateDialogMsg = $t(
            'RemovedDeviceIDNo', {ID: padPosId(posDevice?.posid)},
            `Removed device #${padPosId(posDevice?.posid)}`,
          )
          dialog.update({ message: updateDialogMsg })
        })
        .finally(() => {
          dialog.update({ persistent: false, progress: false })
        })
    })
}

/**
 * @param {{ walletHash:String, posid:Number }} posDevice 
 */
function deletePosDevice(posDevice) {
  const handle = `${posDevice?.walletHash}:${posDevice?.posid}`
  return posBackend.delete(`paytacapos/devices/${handle}/`).then(() => fetchPosDevices())
}

onMounted(() => {
  window.t = () => {
    $store.commit('darkmode/setDarkmodeSatus', !darkMode.value)
  }
})

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
  console.debug(rpcResult)
  const updateData = rpcResult?.result?.update
  if (!updateData) return
  if (updateData?.resource === 'pos_device') {
    switch(updateData?.action) {
      case 'update':
      case 'link':
      case 'unlink':
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
  const host = new URL(new Watchtower().BCH._api.defaults.baseURL).host
  const RECONNECT_INTERVAL = 10 * 1000
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${scheme}://${host}/ws/paytacapos/updates/${walletData.value.walletHash}/`
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

</script>
