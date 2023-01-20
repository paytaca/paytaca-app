<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:100px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="Push Notification"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <q-card
      class="br-15 q-mx-md q-mb-md q-mt-sm"
      :class="[
       darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
      style="transition: height 0.5s"
    >
      <q-card-section class="q-gutter-sm" style="word-break:break-all;">
        <div>
          Platform: {{ platform }}
        </div>
        <div>
          Device ID: {{ $pushNotifications.deviceId }}
        </div>
        <div>
          <span v-show="false">{{ foo }}</span>
          Registration Token: {{ $pushNotifications.registrationToken }}
          <q-btn
            v-if="!$pushNotifications.registrationToken"
            no-caps
            label="Get registration token"
            @click="fetchRegistrationToken()"
          />
        </div>
        <div>
          <span v-show="false">{{ foo }}</span>
          Registration Token Error: {{ $pushNotifications.registrationTokenError }}
        </div>
        <div>
          Permission: {{ permissionStatus }}
          <div class="row items-center no-wrap">
            <q-btn no-caps label="Check Permissions" @click="checkPermissions()"/>
            <q-btn no-caps label="Request Permissions" @click="requestPermission()"/>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card
      class="br-15 q-mx-md q-mb-md q-mt-sm"
      :class="[
       darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
    >
      <q-card-section style="word-break:break-all;">
        <div class="q-mb-md">
          <q-input
            :dark="darkMode"
            label="Dev server base URL"
            v-model="devBaseUrl"
            hint="Base url for subscribing push notifications"
          />
          <q-btn
            no-caps
            label="Subscribe"
            :disable="subscribing"
            :loading="subscribing"
            @click="subscribe()"
          />
        </div>
        <q-separator :dark="darkMode"/>
        <div>
          Subscribe Status:
          <span v-show="false">{{ foo }}</span>
          <div v-if="$pushNotifications?.subscriptionInfo?.gcm_device?.id || $pushNotifications?.subscriptionInfo?.apns_device?.id">
            <JSONRenderer :value="$pushNotifications?.subscriptionInfo" :dark-mode="darkMode"/>
          </div>
          <div v-else>
            {{ $pushNotifications?.subscriptionInfo }}
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, inject, markRaw, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar';
import HeaderNav from 'src/components/header-nav.vue'
import JSONRenderer from 'src/components/JSONRenderer.vue'
import { Capacitor } from '@capacitor/core';
import { loadWallet } from 'src/wallet';


const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const devBaseUrl = ref(window.devBaseUrl || '')
watch(devBaseUrl, () => window.devBaseUrl = devBaseUrl.value)
const $pushNotifications = inject('$pushNotifications')
const platform = ref(Capacitor.getPlatform())
const wallet = ref(null)

onMounted(() => {
  loadWallet().then(_wallet => {
    wallet.value = markRaw(_wallet)
  })
})

const subscribing = ref(false)
const foo = ref(0)
function subscribe() {
  const walletHashes = [
    wallet.value.BCH.getWalletHash(),
    wallet.value.SLP.getWalletHash(),
    wallet.value.sBCH.getWalletHash(),
  ]
  
  subscribing.value = true
  $pushNotifications.subscribe(walletHashes)
    .then((console.log))
    .catch(error => {
      console.error(error)
      $pushNotifications.subscriptionInfo = `${new Date()}: ${error?.message || error?.error || error}`
    })
    .finally(() => {
      foo.value++
      subscribing.value = false
    })
}

const permissionStatus = ref({
  success: null,
  error: null,
})
function checkPermissions() {
  $pushNotifications.checkPermissions()
    .then(data => permissionStatus.value.success = data)
    .catch(error => permissionStatus.value.error = error)
}
function requestPermission() {
  $pushNotifications.requestPermission()
    .then(data => permissionStatus.value.success = data)
    .catch(error => permissionStatus.value.error = error)
}
function fetchRegistrationToken() {
  const dialog = $q.dialog({
    title: 'Fetching reg token',
    progress: true,
    persistent: true,
    ok: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black'
  })
  $pushNotifications.fetchRegistrationToken()
    .then(data => {
      dialog.update({
        title: 'Reg token success',
        message: data,
      })
    })
    .catch(error => {
      dialog.update({
        title: 'Reg token error',
        message: error?.message,
      })
    })
    .finally(() => {
      foo.value++
      dialog.update({
        ok: true, progress: false, persistent: false
      })
    })
}
</script>
