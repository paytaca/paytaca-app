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
      class="br-15 q-pt-sm q-mx-md"
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
        <template v-for="posDevice in posDevices" :key="posDevice?.posid">
          <q-item dense>
            <q-item-section>
              <q-item-label class="text-subtitle1"> {{ $t('POSID') }}#{{ padPosId(posDevice?.posid) }}</q-item-label>
              <q-item-label v-if=" posDevice?.name" class="text-subtitle2 text-grey">
                {{ $t('Name') }}: {{ posDevice?.name }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn icon="more_vert" flat>
                <q-menu>
                  <q-list :class="{'pt-dark-card': darkMode}" style="min-width: 100px">
                    <q-item
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
                      @click="renamePosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>
                          {{ posDevice?.name ? $t('Rename') : $t('SetName', {}, 'Set name') }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
                      @click="displayPosDeviceInDialog(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('Link') }}</q-item-label>
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
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup>
import { backend as posBackend, parsePosDeviceData, padPosId } from 'src/wallet/pos'
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import HeaderNav from 'src/components/header-nav.vue'
import PosDeviceDetailDialog from 'src/components/PosDeviceDetailDialog.vue'
import { getMnemonic, Wallet } from 'src/wallet'

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
async function checkWalletLinkData() {
  if (!walletData.value?.xPubKey || !walletData.value?.walletHash) {
    console.log('Incomplete wallet link data. Updating xPubKey and walletHash')
    const mnemonic = await getMnemonic()
    const wallet = new Wallet(mnemonic, walletType)
    const newWalletData = Object.assign({ type: walletType }, walletData.value)
    newWalletData.walletHash = wallet.BCH.getWalletHash()
    newWalletData.xPubKey = await wallet.BCH.getXPubKey()

    $store.commit('global/updateXPubKey', newWalletData)
    $store.commit('global/updateWallet', newWalletData)
  }
}
onMounted(() => checkWalletLinkData())

const posDevices = ref([ { walletHash: '', posid: -1, name: '' } ])
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

function addNewPosDevice() {
  $q.dialog({
    title: $t('AddNewDevice', {}, 'Add new device'),
    message: $t('SetNewNameForDevice', {}, 'Set new name for device'),
    prompt: {
      dark: darkMode.value,
      outlined: true,
      standout: darkMode.value ? 'text-white bg-grey-3' : '',
    },
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
    cancel: true,
    persistent: true
  }).onOk(data => {
    const dialog = $q.dialog({
      title: $t('NewDevice', {}, 'New device'),
      message: $t('AddingNewDevice', {}, 'Adding new device'),
      persistent: true,
      progress: true,
      class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
    })
    savePosDevice({ posid: -1, name: data }, { refreshList: true })
      .then(response => {
        const newPaddedPosId = padPosId(response?.data?.posid)
        dialog.update({
          message: $t('DeviceAddedIDNo', { ID: newPaddedPosId }, `Device added #${newPaddedPosId}`),
        })
      })
      .catch(() => {
        dialog.update({
          message: $t('FailedAddingNewDevice', {}, 'Failed to add new device'),
        })
      })
      .finally(() => {
        dialog.update({ persistent: false, progress: false })
      })
  })
}

function renamePosDevice(posDevice) {
  // const inputStyle = darkMode.value ? 'color:white !important;' : ''
  const title = $t(
    'RenameDeviceNum', { ID: padPosId(posDevice?.posid) },
    `Rename device #${padPosId(posDevice?.posid)}`,
  )
  const message = $t('SetNewNameForDevice', {}, 'Set new name for device')
  $q.dialog({
    title: title,
    message: message,
    prompt: {
      dark: darkMode.value,
      outlined: true,
      standout: darkMode.value ? 'text-white bg-grey-3' : '',
    },
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
    cancel: true,
    persistent: true
  }).onOk(data => {
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
    savePosDevice({ posid: posDevice?.posid, name: data }, { refreshList: true })
      .then(() => {
        updateDialogMsg = $t(
          'UpdatedDeviceIDNo', {ID: padPosId(posDevice?.posid)},
          `Updated device #${padPosId(posDevice?.posid)}`,
        )
        dialog.update({ message: updateDialogMsg })
      })
      .catch(() => {
        updateDialogMsg = $t(
          'FailedUpdateDeviceIDNo', {ID: padPosId(posDevice?.posid)},
          `Failed to update device #${padPosId(posDevice?.posid)}`,
        )
        dialog.update({ message: updateDialogMsg })
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
 * @param {{ walletHash:String, posid:Number, name?:String }} posDevice 
 * @param {{ refreshList:Boolean }} opts
 */
function savePosDevice(posDevice, opts) {
  const data = {
    wallet_hash: posDevice?.walletHash || walletData?.value?.walletHash,
    posid: posDevice?.posid,
    name: posDevice?.name || '',
  }
  return posBackend.post('/paytacapos/devices/', data)
    .then(response => {
      if (response?.data?.wallet_hash && response?.data?.posid >= 0) {
        if (opts?.refreshList) fetchPosDevices()
        else refetchPosDevice(parsePosDeviceData(response?.data))

        return Promise.resolve(response)
      }
      return Promise.reject({ response })
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
</script>
