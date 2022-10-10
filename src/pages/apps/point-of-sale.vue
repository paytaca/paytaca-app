<template>
  
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="POS"
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
            Devices
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

        <template v-for="posDevice in posDevices" :key="posDevice?.id">
          <q-item dense>
            <q-item-section>
              <q-item-label class="text-subtitle1">POS-ID#{{ padPosId(posDevice?.id) }}</q-item-label>
              <q-item-label v-if=" posDevice?.name" class="text-subtitle2 text-grey">
                Name: {{ posDevice?.name }}
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
                        <q-item-label>{{ posDevice?.name ? 'Rename' : 'Set name' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
                      @click="displayPosDeviceInDialog(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>Scan</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
                      @click="confirmRemovePosDevice(posDevice)"
                    >
                      <q-item-section>
                        <q-item-label>Remove</q-item-label>
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
import { PosDeviceManager, padPosId } from 'src/wallet/pos'
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import HeaderNav from 'src/components/header-nav.vue'
import PosDeviceDetailDialog from 'src/components/PosDeviceDetailDialog.vue'
import { getMnemonic, Wallet } from 'src/wallet'

const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

async function checkWalletLinkData() {
  const walletType = 'bch'
  const walletData = $store.getters['global/getWallet'](walletType)
  if (!walletData?.xPubKey || !walletData?.walletHash) {
    console.log('Incomplete wallet link data. Updating xPubKey and walletHash')
    const mnemonic = await getMnemonic()
    const wallet = new Wallet(mnemonic, walletType)
    const newWalletData = Object.assign({ type: walletType }, walletData)
    newWalletData.walletHash = wallet.BCH.getWalletHash()
    newWalletData.xPubKey = await wallet.BCH.getXPubKey()

    $store.commit('global/updateXPubKey', newWalletData)
    $store.commit('global/updateWallet', newWalletData)
  }
}
onMounted(() => checkWalletLinkData())

const manager = new PosDeviceManager()
const posDevices = ref([
  { id: -1, name: '' },
])
onMounted(() => {
  posDevices.value = manager.fetchPosDevices()
})
watch(posDevices, () => manager.savePosDevices(posDevices.value), { deep: true })

function displayPosDeviceInDialog(posDevice) {
  $q.dialog({
    component: PosDeviceDetailDialog,
    componentProps: { posId: posDevice?.id, name: posDevice?.name }
  })
}

function addNewPosDevice() {
  let newId = 0
  if (posDevices.value.length > 0) {
    newId = Math.max(...posDevices.value.map(posDevice => posDevice?.id)) + 1
  }
  $q.dialog({
    title: `Add new device #${padPosId(newId)}`,
    message: 'Set new name for device',
    prompt: {
      model: `Device ${newId}`,
      dark: darkMode.value,
      outlined: true,
      standout: darkMode.value ? 'text-white bg-grey-3' : '',
    },
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
    cancel: true,
    persistent: true
  }).onOk(data => {
    posDevices.value.push({ id: newId, name: data })
  })
}

function renamePosDevice(posDevice) {
  // const inputStyle = darkMode.value ? 'color:white !important;' : ''
  $q.dialog({
    title: `Rename device #${padPosId(posDevice?.id)}`,
    message: 'Set new name for device',
    prompt: {
      dark: darkMode.value,
      outlined: true,
      standout: darkMode.value ? 'text-white bg-grey-3' : '',
    },
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
    cancel: true,
    persistent: true
  }).onOk(data => {
    posDevice.name = data
  })
}

function confirmRemovePosDevice(posDevice) {
  let message =`Remove POS Device #${posDevice?.id}`
  if (posDevice?.name) message += ` '${posDevice?.name}'`
  $q.dialog({
    title: 'Remove POS device',
    message: message,
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
  })
    .onOk(() => {
      removePosDevice(posDevice?.id)
    })
}

function removePosDevice(posId) {
  posDevices.value = posDevices.value.filter(posDevice => posDevice?.id !== posId)
}

onMounted(() => {
  window.t = () => {
    $store.commit('darkmode/setDarkmodeSatus', !darkMode.value)
  }
})
</script>
