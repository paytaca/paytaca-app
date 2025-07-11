<template>
  <q-dialog ref="dialogRef" full-width position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    >
    <q-card class="q-dialog-plugin q-pb-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
       <q-toolbar>
          <q-toolbar-title>
            <span class="q-mr-sm"></span>
          </q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
      <q-item-label header style="padding-top: 0px;padding-bottom:0px;">Wallet</q-item-label>
      <q-card-section class="flex flex-wrap justify-evenly"> 
        <q-btn flat dense no-caps @click="$emit('uploadWallet')" class="tile" :disable="isMultisigWalletSynced" v-close-popup>
          <template v-slot:default>
            <div class="row justify-around">
              <q-icon 
                :name="!isMultisigWalletSynced ? 'cloud_upload': 'mdi-cloud-check'" 
                class="col-12" 
                :color="!isMultisigWalletSynced? 'primary': 'green' ">
              </q-icon>
              <div class="col-12 tile-label">Share</div>
              
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('exportWallet')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-export" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Export</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('deleteWallet')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="delete_forever" class="col-12" color="red"></q-icon>
              <div class="col-12 tile-label">Delete</div>
            </div>
          </template>
        </q-btn>
      </q-card-section>
      <q-item-label header style="padding-top: 0px;padding-bottom:0px;">Transaction</q-item-label>
      <q-card-section class="flex flex-wrap justify-evenly"> 
        <q-btn 
          flat dense no-caps @click="$emit('importTx')" class="tile" 
          :disable="disable?.includes('import-tx')"
          v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-import" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Import</div>
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
              <div class="col-12 tile-label">Tx Proposal</div>
            </div>
          </template>
        </q-btn>
        <!--q-btn flat dense no-caps @click="$emit('createTxProposal')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="add" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">New Tx</div>
            </div>
          </template>
        </q-btn-->
         <q-btn flat dense no-caps @click="$emit('createSendBchProposal')" class="tile" :disable="disable?.includes('send-bch')" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="send" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Send BCH</div>
            </div>
          </template>
        </q-btn>
       <q-btn flat dense no-caps @click="$emit('receive')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="send_and_archive" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Deposit</div>
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
  'uploadWallet',
  'exportWallet',
  'deleteWallet',
  'importTx',
  'viewTxProposals',
  'createTxProposal',
  'createSendBchProposal',
  'receive',
  ...useDialogPluginComponent.emits
])

defineProps({
  darkMode: Boolean,
  txProposals: Array,
  isMultisigWalletSynced: Boolean,
  disable: Array
})
</script>
