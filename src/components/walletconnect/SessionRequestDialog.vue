<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide" seamless>
      <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <!-- <div class="row justify-end">
            <q-btn icon="close" @click.stop="() => onDialogCancel('hide')" ></q-btn>
        </div> -->
        <!-- <div class="row items-center q-pb-sm q-px-sm q-pt-sm">
          <div class="text-h5 q-space">
            {{ title }}
            <q-spinner v-if="loading"/>
          </div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div> -->
        <SessionInfo :session = "sessionRequest" session-type="request" :flat="true" hide-session-id hide-topic>
          <template v-slot:top-right>
            <q-btn icon="close" color="negative" @click.stop="onDialogHide" style="z-index: 1" flat label="Close" no-caps></q-btn>
          </template>
        </SessionInfo>
        <!-- style="max-height:calc(60vh - 6rem); overflow:auto;" -->
        <q-scroll-area style="height: 70vh; max-height: 80vh">
          <q-card-section class="q-pt-none">
          
            <template v-if="sessionRequest?.params?.request?.method === 'bch_signTransaction'">
              <!-- <q-banner
                v-if="sessionRequest?.params?.request?.params?.userPrompt"
                class=" rounded-borders pt-card-2 text-bow"
                :class="getDarkModeClass(darkMode)"
              >
                {{ sessionRequest?.params?.request?.params?.userPrompt }}
              </q-banner> -->
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
            
          <!-- <q-item dense class="q-mb-md">
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
          </q-item> -->
          
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
              :label="$t('Accept')"
              icon="check" color="green"
              padding="xs md"
              class="q-space q-mr-lg"
              @click.stop="() => onDialogOK({response: 'accept'})"
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
  import { computed, onMounted } from 'vue'
  import JSONRenderer from 'src/components/JSONRenderer.vue';
  import TransactionDetailsPanel from 'src/components/walletconnect/TransactionDetailsPanel.vue'
  import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
  import SessionInfo from './SessionInfo.vue'
  
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
  
  onMounted(() => {
    console.log('SESSION REQUEST', props.sessionRequest)
  })
  </script>
  

<style scoped>
:deep(.session-info:after) {
  border-radius: 0px !important;
}

:deep(.session-info-flat:after) {
  border-radius: 0px !important;
}
</style>