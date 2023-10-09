<template>
  <q-dialog
    v-model="innerVal"
    ref="dialogRef"
    full-height
    full-width
    position="bottom"
    persistent
    @hide="onDialogHide"
  >
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">Call</div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div>
        <div class="q-my-sm">
          <div class="row items-center no-wrap">
            <q-input
              v-if="localIdentity"
              readonly
              :dark="darkMode"
              borderless dense
              label="Name"
              :model-value="localIdentity.name"
              debounce="1000"
            />
            <q-space/>
            <div class="text-right">
              <q-menu v-if="debugMode" :class="['q-pa-sm', darkMode ? 'pt-dark' : 'text-black']">
                <div>StreamID: {{ manager?.localStream?.id }}</div>
                <div>AudioTrackIDs: {{  manager?.localStream?.getAudioTracks?.()?.map(t => t.id)?.join(', ') }}</div>
                <div>VideoTrackIDs: {{  manager?.localStream?.getVideoTracks?.()?.map(t => t.id)?.join(', ') }}</div>
              </q-menu>
              <AVMedia
                v-if="manager?.localStream?.getAudioTracks?.().length"
                ref="localAudioBarRef"
                :id="`local-audio-bar-${manager?.localStream?.id}`"
                :media="manager?.localStream"
                type="vbar" class="audio-meter"
                style="justify-self: center;align-self: center;"
              />
              <div v-else class="text-grey">
                Mic is turned off
              </div>
              <div v-if="manager?.localPeerId" class="text-caption bottom">
                #{{ manager?.localPeerId }}
              </div>
            </div>
            <div
              class="row items-center q-ml-xs"
              :style="{
                height:'3rem',
                display: manager?.localStream?.getVideoTracks?.()?.length ? 'unset' : 'none',
              }"
            >
              <video
                ref="localAudioRef"
                :id="`local-stream-${manager?.localStream?.id}`"
                :srcObject="manager?.localStream"
                autoplay playsinline
                :muted="muteLocalStream"
                style="width:100%;height:100%;border-radius: 4px;"
              ></video>
            </div>
            <q-icon
              v-if="!manager?.localStream?.getVideoTracks?.()?.length"
              size="2rem"
              :name="manager?.constraints?.audio ? 'mic' : 'mic_off'"
            />
          </div>
          <template v-if="debugMode">
            <div class="row items-center">
              <q-toggle label="Keep manager" v-model="keepManager" dense class="q-mx-sm"/>
              <q-space/>
              <q-toggle label="Mute local stream" v-model="muteLocalStream" dense class="q-mx-sm"/>
            </div>
            <div class="row items-center q-mt-sm">
              <q-space/>
              <q-toggle
                dense
                :icon="constraints.audio ? 'mic' :'mic_off'"
                v-model="constraints.audio"
                class="q-mx-sm"
              />
              <q-space/>
              <q-toggle
                dense
                :icon="constraints.video ? 'video_cam' : 'video_cam_off'"
                v-model="constraints.video"
                class="q-mx-sm"
              />
              <q-space/>
            </div>
          </template>
        </div>
        <div class="row items-center justify-center chat-members-container">
          <q-banner
            v-if="!callRunning && sessionCreateError"
            class="col-12 bg-red text-white q-mb-sm self-start"
            rounded
          >
            {{ sessionCreateError }}
          </q-banner>
          <div
            v-if="fetchingSession || creatingSession || initializingWebsocket || loadingLocalStream"
            class="text-center"
          >
            <q-spinner size="3em"/>
            <div v-if="fetchingSession">Fetching session</div>
            <div v-if="creatingSession">Creating session</div>
            <div v-if="initializingWebsocket">Connecting to server</div>
            <div v-if="loadingLocalStream">Loading devices</div>
          </div>
          <div v-if="callRunning && !manager?.members?.length">
            Waiting for others to join call
          </div>

          <div v-for="(member, index) in manager?.members" :key="member.id" class="chat-member-container">
            <div class="chat-member-content">
              <div
                :style="{
                  position: 'absolute',
                  inset:0,
                  display: member.newTrackCtr && member.mediaStream?.getVideoTracks?.().length ? 'unset' : 'none',
                }"
              >
                <video
                  :ref="val => memberAudioRef[index] = val"
                  :id="`video-${member?.id}-${member?.mediaStream?.id}`"
                  :srcObject="member.mediaStream"
                  autoplay playsinline
                  style="width:100%;height:100%;border-radius:8px;"
                ></video>
              </div>
              <div class="text-center" style="position:relative;">
                <q-icon
                :name="member.audioEnabled ? 'mic' : 'mic_off'"
                size="3rem"
                />
                <AVMedia
                  v-if="member.newTrackCtr && member.mediaStream?.getAudioTracks?.().length"
                  :id="`audio-bar-${member?.id}-${member?.mediaStream?.id}`"
                  :ref="val => memberAudioBarRef[index] = val"
                  :media="member.mediaStream"
                  type="vbar" class="audio-meter"
                />
                <div v-if="member.name">{{ member.name }}</div>
                <div v-else >#{{ member.id }}</div>

                <q-menu v-if="debugMode" :class="['q-pa-sm', darkMode ? 'pt-dark' : 'text-black']">
                  <div>StreamID: {{ member?.mediaStream?.id }}</div>
                  <div>AudioTrackIDs: {{  member?.mediaStream?.getAudioTracks?.()?.map(t => t.id)?.join(', ') }}</div>
                  <div>VideoTrackIDs: {{  member?.mediaStream?.getVideoTracks?.()?.map(t => t.id)?.join(', ') }}</div>
                </q-menu>
              </div>
            </div>
          </div>
        </div>
        <div v-if="manager?.callId" class="row items-center justify-around q-mb-md">
          <div class="row items-center justify-around q-mb-md">
            <div class="text-center">
              <q-btn
                round
                :icon="!membersMuted ? 'volume_up' : 'volume_off'"
                color="grey"
                @click="() => {
                  membersMuted = !membersMuted
                }"
              />
              <div>{{ !membersMuted ? 'Mute' : 'Unmute' }}</div>
            </div>
          </div>
          <div class="text-center">
            <q-btn
              round
              icon="local_phone"
              :color="callRunning ? 'red' : 'green'"
              size="lg"
              @click="() => callRunning ? hangUp() : startCall()"
            />
            <div>{{ callRunning ? 'Hang-up' : 'Call' }}</div>
          </div>

          <div class="text-center">
            <q-btn
              round
              :icon="manager?.constraints?.audio ? 'mic' : 'mic_off'"
              color="grey"
              @click="() => {
                manager.constraints.audio = !manager?.constraints?.audio
                manager?.updateStreamConstraints()
              }"
            />
            <div>{{ manager?.constraints?.audio ? 'Mic on' : 'Mic off' }}</div>
          </div>
        </div>
        <div v-else class="row items-center q-gutter-x-sm">
          <template v-if="orderCallSession?.id && !orderCallSession?.endedAt">
            <q-btn
              :disable="fetchingSession || creatingSession"
              outline
              no-caps label="Cancel"
              class="q-space"
              v-close-popup
            />
            <q-btn
              :disable="fetchingSession || creatingSession"
              :loading="fetchingSession || creatingSession"
              no-caps label="Join call"
              color="brandblue"
              class="q-space"
              @click="() => prepareAndStartCall({ create: false })"
            />
          </template>
          <template v-else>
            <q-btn
              :disable="fetchingSession || creatingSession"
              outline
              no-caps label="Cancel"
              class="q-space"
              v-close-popup
            />
            <q-btn
              :disable="fetchingSession || creatingSession"
              :loading="fetchingSession || creatingSession"
              no-caps label="Create call"
              color="brandblue"
              class="q-space"
              @click="() => prepareAndStartCall({ create: true })"
            />
          </template>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend, signPaytacaCustomerData } from 'src/marketplace/backend'
import { OrderCallSession } from 'src/marketplace/objects'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { WebRtcCallManager } from 'src/marketplace/webrtc'
import { AVMedia } from 'vue-audio-visual'
import { errorParser } from 'src/marketplace/utils'

export default defineComponent({
  name: 'OrderCallDialog',
  components: {
    AVMedia,
  },
  emits: [
    'update:modelValue',
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    orderId: [String, Number],
    autoJoin: Boolean,
  },
  setup(props, { emit: $emit }) {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const debugMode = ref(false)

    onMounted(() => onLoadOrShow())
    watch(() => [props.orderId], () => onLoadOrShow())
    watch(innerVal, () => onLoadOrShow())
    function onLoadOrShow() {
      if (!innerVal.value) return
      getOrderCallSession()
        .then(() => {
          console.log(orderCallSession.value?.id, props.autoJoin)
          if (!orderCallSession.value?.id || !props.autoJoin) return
          startCall()
        })
    }

    onUnmounted(() => hangUp())
    watch(innerVal, () => {
      if (innerVal.value) return
      sessionCreateError.value = ''
      hangUp()
    })

    const orderCallSession = ref(OrderCallSession.parse())
    const fetchingSession = ref(false)
    const creatingSession = ref(false)
    const sessionCreateError = ref('')

    function getOrderCallSession() {
      fetchingSession.value = true
      return backend.get(`connecta/orders/${props.orderId}/call/`)
        .then(response => {
          orderCallSession.value = OrderCallSession.parse(response?.data)
          return response
        })
        .catch(error => {
          if (error?.response?.status == 400) orderCallSession.value = OrderCallSession.parse(response?.data)
          return Promise.reject(error)
        })
        .finally(() => {
          fetchingSession.value = false
        })
    }

    function createCallSession() {
      creatingSession.value = true
      return backend.post(`connecta/orders/${props.orderId}/call/`, { source: 'customer' })
        .finally(() => sessionCreateError.value = '')
        .then(response => {
          orderCallSession.value = OrderCallSession.parse(response?.data)
        })
        .catch(error => {
          const data = error?.response?.data
          let errorMessage = errorParser.firstElementOrValue(data?.non_field_errors) ||
                            errorParser.firstElementOrValue(data) ||
                            errorParser.firstElementOrValue(data?.detail)

          if (!errorMessage && typeof error?.message === 'string' && error?.message?.length < 200) {
            errorMessage = error?.message
          }
          sessionCreateError.value = errorMessage
        })
        .finally(() => {
          creatingSession.value = false
        })
    }

    async function prepareAndStartCall(opts={ create: false }) {
      if (opts?.create) await createCallSession()
      else await getOrderCallSession()

      if (!orderCallSession.value?.id) return
      return startCall()
    }

    const localAudioRef = ref()
    const localAudioBarRef = ref()
    const memberAudioRef = ref([])
    const memberAudioBarRef = ref([])
    window.mar = memberAudioRef.value
    window.mabr = memberAudioBarRef.value
    const muteLocalStream = ref(true)
    const keepManager = ref(false)
    const constraints = ref({ audio: true, video: false })
    const manager = ref([].map(() => new WebRtcCallManager())[0])
    const callRunning = computed(() => manager.value?.members?.length || manager.value?.signaller?.isWebsocketOpen)
    watch(constraints, () => {
      if (!manager.value) return
      manager.value.updateConstraints(constraints.value)
      if (constraints.value.audio || constraints.value.video) manager.value.getLocalStream()
    }, { deep: true })
    function initManager() {
      manager.value?.cleanUp?.()
      if (manager.value && keepManager.value) {
        manager.value.callId = orderCallSession.value.id
        return
      }
      manager.value = new WebRtcCallManager({
        callId: orderCallSession.value?.id,
        peerId: Date.now(),
        identity: localIdentity.value,
        constraints: constraints.value,
        signaller: {
          url: async (callId) => {
            const timestamp = Date.now()
            const data = Buffer.from(`${timestamp}`).toString('hex')
            const signResponse = await signPaytacaCustomerData(data)
            const paytacaCustomerSig = [
              signResponse.walletHash, timestamp, signResponse.signature
            ].join(':')
            const encodedPaytacaCustomerSig = encodeURIComponent(paytacaCustomerSig)

            const backendUrl = new URL(backend.defaults.baseURL)
            const host = backendUrl.host
            const scheme = backendUrl.protocol === 'https:' ? 'wss' : 'ws'
            const url = `${scheme}://${host}/ws/connecta/order-call-signaller/${callId}/?paytaca_customer_sig=${encodedPaytacaCustomerSig}`

            return url
          }
        }
      })
      window.m  = manager.value
    }
    function onWebsocketClose(...args) {
      console.log('Websocket closed', ...args)
      if (manager.value?.members?.length) {
        manager.value?.signaller.connectWs()
        console.log('Connecting signaller websocket')
      }
    }
    watch(() => manager.value?.signaller?._websocket, (newVal, prevVal) => {
      console.log('Websocket update to', newVal, 'from', prevVal)
      if (newVal) {
        newVal?.addEventListener?.('close', onWebsocketClose)
        console.log('Added onclose event listener on new websocket', newVal)
      }
      if (prevVal) {
        prevVal?.removeEventListener?.('close', onWebsocketClose)
        console.log('Removed onclose event listener on previous websocket', prevVal)
      }

      if (!newVal && manager.value?.members?.length) {
        console.log('Reconnecting signaller websocket')
        manager.value?.signaller.connectWs() 
      }
    })

    const localIdentity = computed(() => {
      const customer = $store.getters['marketplace/customer']
      return {
        id: customer?.id,
        type: 'customer',
        name: customer?.fullName,
      }
    })
    watch(localIdentity, () => {
      if (!manager.value) return
      manager.value.localIdentity = localIdentity.value
    }, { deep: true })

    const initializingWebsocket = ref(false)
    function initWebsocket() {
      initializingWebsocket.value = true
      return manager.value.signaller.connectWs()
        .finally(() => {
          initializingWebsocket.value = false
        })
    }

    const loadingLocalStream = ref(false)
    function loadLocalStream() {
      loadingLocalStream.value = true
      return manager.value.getLocalStream()
        .finally(() => {
          loadingLocalStream.value = false
        })
    }

    const membersMuted = ref(false)
    watch(membersMuted, () => updateMemberAudioStatus())
    function updateMemberAudioStatus() {
      if (!manager.value) return
      manager.value.members.forEach(member => {
        member.mediaStream.getAudioTracks().forEach(track => {
          track.enabled = !Boolean(membersMuted.value)
        })
      })
    }

    async function startCall() {
      await initManager()
      await Promise.all([
        initWebsocket(),
        loadLocalStream(),
      ])
      
      manager.value.joinRoom()
      runSignallerPing()
    }

    function hangUp() {
      manager.value?.cleanUp?.()
      if (!keepManager.value || !innerVal.value) manager.value = null
      membersMuted.value = false
      if (innerVal.value) getOrderCallSession()
    }

    const serverPingIntervalId = ref(false)
    watch(innerVal, () => innerVal.value ? runSignallerPing() : stopSignallerPing())
    onMounted(() => innerVal.value ? runSignallerPing() : stopSignallerPing())
    onUnmounted(() => stopSignallerPing())
    function pingSignaller() {
      if (!manager.value?.signaller?.isWebsocketOpen) return
      manager.value.signaller.sendSignal('server-ping')
    }
    function stopSignallerPing() {
      clearInterval(serverPingIntervalId.value)
      serverPingIntervalId.value = false
      console.log('Stopped signaller ping')
    }

    function runSignallerPing() {
      stopSignallerPing()
      serverPingIntervalId.value = setInterval(() => pingSignaller(), 60 * 1000)
      console.log('Started signaller ping')
    }

    return {
      darkMode,

      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,
      debugMode,

      orderCallSession,
      fetchingSession,
      creatingSession,
      sessionCreateError,

      getOrderCallSession,
      createCallSession,

      prepareAndStartCall,

      localAudioRef,
      localAudioBarRef,
      memberAudioRef,
      memberAudioBarRef,
      muteLocalStream,
      keepManager,
      constraints,

      manager,
      callRunning,
      initializingWebsocket,
      localIdentity,
      loadingLocalStream,
      membersMuted,
      startCall,
      hangUp,
    }
  },
})
</script>
<style lang="scss" scoped>
.chat-member-container {
  min-width: min(50%, 150px);
  padding: map-get($space-sm, 'y') map-get($space-sm, 'x');
}
.chat-member-container:not(:only-child.chat-member-container) {
  flex-grow: 1;
}

.chat-member-container .chat-member-content {
  // border: 1px solid grey;
  border-radius: 8px;
  padding: map-get($space-xs, 'y') map-get($space-xs, 'x');
  min-height: min(150px, 30vh);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.chat-members-container {
  position: relative;
  overflow:auto;
  height:100%;
  height: calc(75vh - 10rem);
  margin-bottom: map-get($space-md, 'y');
  border-radius: 8px;
}
</style>