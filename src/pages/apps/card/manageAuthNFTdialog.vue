<template>
 
  <q-dialog v-model="showManageAuthNFTdialog" @show="refreshMerchants" persistent>
    <q-card style="min-width: 300px" class="br-15 q-pa-sm">
      <q-card-section>
        <div class="text-h6">Manage Auth NFTs</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="merchantSearch" 
          label="Search for Merchant" 
          outlined 
          dense 
          class="q-mb-md"
          placeholder="Type to search..."
        />

        <q-list
          v-if="filteredMerchants.length > 0" 
          bordered
          separator
          class="q-mb-md scroll shadow-1"
          style="max-height: 200px; border-radius: 8px;"
        >
          <q-item
            v-for="merchant in filteredMerchants"
            :key="merchant.id"
            clickable
            v-ripple
            @click="addMerchantToList(merchant)"
          >
            <q-item-section>
              <q-item-label>{{ merchant.name }}</q-item-label>
              <q-item-label caption>{{ merchant.address }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="add" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>

        <div class="column q-gutter-y-sm">
          <div class="row items-center justify-between q-pa-md border-outlined br-10">
            <div class="text-subtitle2 text-primary">Generic Auth NFT</div>
            <q-toggle 
              v-model="genericAuthEnabled"
              color="primary"
            />
          </div>

          <div
            v-for="(m, index) in selectedMerchants"
            :key="m.id"
            class="row items-center justify-between q-pa-sm q-pl-md border-outlined br-10 bg-grey-1"
          >
            <div class="column">
              <div class="text-subtitle2 ">{{ m.name }}</div>
              <div class="text-caption text-grey-7">{{ m.address }}</div>
            </div>

            <div class="row items-center">
              <q-toggle 
                v-model="m.isEnabled"
                color="secondary"
              />
              <q-btn
                flat
                round
                dense
                icon="close"
                color="negative"
                size="sm"
                class="q-ml-sm"
                @click="removeMerchant(index)"
              />
            </div>
          </div> 
        </div>

      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
          
    </q-card>
  </q-dialog>
  
</template>

<script>
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }
</script>