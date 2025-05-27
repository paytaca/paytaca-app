<template>
  <q-dialog ref="dialogRef" full-width position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    >
    <q-card class="q-dialog-plugin q-pb-md pt-card" :class="getDarkModeClass(darkMode)">
       <q-toolbar>
          <q-toolbar-title>
            <span class="q-mr-sm">{{ $t('Options')}}</span>
          </q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
      <q-item-label header style="padding-top: 0px;padding-bottom:0px;">Wallet</q-item-label>
      <q-card-section class="flex flex-wrap justify-evenly"> 
        <q-btn flat dense no-caps @click="$emit('publishWallet')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-around">
              <q-icon name="mdi-publish" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Publish Wallet</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('exportWallet')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-export" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Export Wallet</div>
            </div>
          </template>
        </q-btn>
      </q-card-section>
      <q-item-label header style="padding-top: 0px;padding-bottom:0px;">Transaction</q-item-label>
      <q-card-section class="flex flex-wrap justify-evenly"> 
        <q-btn flat dense no-caps @click="$emit('importTx')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-import" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Import Tx</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('viewTxProposals')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-text-box-multiple" class="col-12" color="primary" style="position:relative">
                <q-badge color="red" v-if="txProposals?.length > 0" style="margin-right: 20px;" floating>
                 {{txProposals.length}}
                </q-badge>
              </q-icon>
              <div class="col-12 tile-label">Tx Proposals</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('send')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="send" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Send</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('receive')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="call_received" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Receive</div>
            </div>
          </template>
        </q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $emit = defineEmits ([
  'publishWallet',
  'exportWallet',
  'importTx',
  'viewTxProposals',
  'send',
  'receive',
  ...useDialogPluginComponent.emits
])
defineProps({
  darkMode: Boolean,
  txProposals: Array
})
</script>
