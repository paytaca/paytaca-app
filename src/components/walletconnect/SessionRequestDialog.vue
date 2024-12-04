<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide" seamless>
      <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <SessionInfo :session = "sessionRequest" session-type="request" :flat="true" hide-session-id hide-topic>
          <template v-slot:top-right>
            <q-btn icon="close" color="negative" @click.stop="onDialogHide" style="z-index: 1" flat label="Close" no-caps></q-btn>
          </template>
        </SessionInfo>
        <q-scroll-area style="height: 70vh; max-height: 80vh">
          <q-card-section class="q-pt-none">
            <template v-if="sessionRequest?.params?.request?.method === 'bch_signTransaction'">
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
        <q-card-actions align="right">
          <div class="row items-center q-gutter-x-sm q-my-md">
            <q-btn
              no-caps
              :label="$t('Reject')"
              icon="close" color="red"
              padding="xs md"
              class="q-space"
              @click.stop="() => onDialogOK({response: 'reject'})"
            />
            <q-btn
              no-caps
              :label="$t('Confirm')"
              icon="check" color="green"
              padding="xs md"
              class="q-space q-mr-lg"
              @click.stop="() => onDialogOK({response: 'confirm'})"
            />
          </div>
        </q-card-actions>
      </q-scroll-area>
      </q-card>
    </q-dialog>
  </template>
<script setup>
  import { useDialogPluginComponent } from 'quasar'
  import { useStore } from 'vuex';
  import { computed } from 'vue'
  import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
  import TransactionDetailsPanel from './TransactionDetailsPanel.vue'
  import SessionInfo from './SessionInfo.vue'
  import JSONRenderer from '../JSONRenderer.vue';
  
  const props = defineProps({
    sessionRequest: Object,
  })

  defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits
  ])

  const { dialogRef, onDialogHide, onDialogOK } 
  = useDialogPluginComponent()
  const $store = useStore()
  const darkMode = computed(() => $store.getters['darkmode/getStatus'])

</script>
  

<style scoped>
:deep(.session-info:after) {
  border-radius: 0px !important;
}

:deep(.session-info-flat:after) {
  border-radius: 0px !important;
}
</style>