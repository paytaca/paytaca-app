<template>
  <q-dialog v-model="innerVal" ref="dialogRef" position="bottom" @hide="onDialogCancel" seamless>
    <q-card class="pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pb-sm q-px-sm q-pt-sm">
        <div class="text-h5 q-space">
          {{ title }}
          <q-spinner v-if="loading"/>
        </div>
        <q-btn flat icon="close" padding="sm" v-close-popup/>
      </div>
      <q-card-section class="q-pt-none" style="max-height:calc(80vh - 6rem);overflow:auto;">
        <q-item dense class="q-mb-md">
          <q-item-section v-if="session?.peer?.metadata?.icons?.[0]" avatar>
            <img :src="session?.peer?.metadata?.icons?.[0]" width="50" alt=""/>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ session?.peer?.metadata?.name }}</q-item-label>
            <q-item-label v-if="session?.peer?.metadata?.url">
              <q-btn
                flat
                no-caps
                :label="session?.peer?.metadata?.url"
                :href="session?.peer?.metadata?.url"
                padding="none"
                target="_blank"
              />
            </q-item-label>
            <q-item-label>{{ session?.peer?.metadata?.description }}</q-item-label>
          </q-item-section>
        </q-item>
        <template v-if="sessionRequest?.params?.request?.method === 'bch_signTransaction'">
          <q-banner
            v-if="sessionRequest?.params?.request?.params?.userPrompt"
            class=" rounded-borders pt-card-2 text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            {{ sessionRequest?.params?.request?.params?.userPrompt }}
          </q-banner>
          <TransactionDetailsPanel
            :transaction="sessionRequest?.params?.request?.params?.transaction"
            class="q-ma-sm"
          />
        </template>
        <template v-else-if="sessionRequest?.params?.request?.method === 'bch_signMessage'">
          <div class="text-grey">{{$t('Message')}}</div>
          <q-banner class=" rounded-borders pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <div style="word-break: break-all;">
              {{ sessionRequest?.params?.request?.params?.message }}
            </div>
          </q-banner>
        </template>
        <template v-else>
          <JSONRenderer :value="sessionRequest?.params?.request" :darkMode="darkMode"/>
        </template>
      </q-card-section>
      <q-card-actions class="row justify-around q-pa-md q-mt-xl">
        <q-btn
            outline
            color="negative"
            :loading="loading"
            :disable="disable"
            no-caps
            :label="$t('Reject')"
            class="col-5 col-sm-3"
            @click.stop="() => emitReject()"
          />
        <q-btn
            :loading="loading"
            :disable="disable"
            color="primary"
            :label="$t('Accept')"
            rounded
            class="col-5 col-sm-3"
            no-caps
            @click.stop="() => emitAccept()"
          />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, ref, watch } from 'vue'
import JSONRenderer from 'src/components/JSONRenderer.vue';
import TransactionDetailsPanel from 'src/components/walletconnect/TransactionDetailsPanel.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $emit = defineEmits([
  'update:modelValue',
  'accepted',
  'rejected',

  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])

const props = defineProps({
  modelValue: Boolean,
  sessionRequest: Object,
  loading: Boolean,
  disable: Boolean,
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)

const session = computed(() => props.sessionRequest?.session)

const title = computed(() => {
  if (props.sessionRequest?.params?.request?.method === 'bch_signTransaction') return 'Sign Transaction'
  if (props.sessionRequest?.params?.request?.method === 'bch_signMessage') return 'Sign message'
  return 'Request'
})

function emitAccept() {
  $emit('accepted')
  onDialogOK()
}

function emitReject() {
  $emit('rejected')
  onDialogHide()
}
</script>
