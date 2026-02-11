<template>
  <q-dialog
    persistent
    seamless
    ref="editRecordDialogRef"
    class="no-click-outside"
  >
    <q-card
      class="full-width pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section class="row justify-between items-center">
        <span class="text-h6 text-weight-bold">{{ title }}</span>
        <q-btn
          flat
          round
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <record-name-input-card v-model="recordName" v-if="isEditName" />
        <addresses-form-card v-model="addresses" v-else />

        <div class="row full-width justify-evenly q-mt-lg q-gutter-x-md">
          <q-btn
            unelevated
            rounded
            flat
            no-caps
            :class="getDarkModeClass(darkMode)"
            :label="$t('Cancel')"
            :disable="isLoading"
            v-close-popup
          />
          <q-btn
            unelevated
            rounded
            no-caps
            class="button"
            :class="getDarkModeClass(darkMode)"
            :label="$t('Update')"
            :disable="!canSaveRecord || isLoading"
            :loading="isLoading"
            @click="updateRecord"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { encryptMemo } from 'src/utils/transaction-memos';
import { ensureKeypair } from 'src/utils/memo-service';
import { raiseNotifyError } from 'src/utils/notify-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

import AddressesFormCard from './AddressesFormCard.vue';
import RecordNameInputCard from './RecordNameInputCard.vue';
import { patchRecord } from 'src/utils/address-book-utils';

export default {
  name: 'EditRecordDialog',

  components: {
    RecordNameInputCard,
    AddressesFormCard
  },

  props: {
    title: {
      type: String,
      required: true,
      default: ''
    },
    isEditName: {
      type: Boolean,
      required: true,
      default: false
    },
    record: { 
      type: Object,
      required: true,
      default: null
    },
    addressesProps: {
      type: Array,
      required: false,
      default: new Array
    }
  },

  data () {
    return {
      recordName: '',
      addresses: [],
      isLoading: false
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },

    canSaveRecord () {
      return this.isEditName ? Boolean(this.recordName) : true
    }
  },

  methods: {
    getDarkModeClass,

    async updateRecord () {
      this.isLoading = true

      if (this.isEditName) {
        try {
          const keypair = await ensureKeypair()
          const encryptedName = await encryptMemo(keypair.privkey, keypair.pubkey, this.recordName)
          if (!encryptedName) {
            throw new Error('Failed to encrypt record name')
          }

          const payload = { name: encryptedName }
          const patchSuccess = await patchRecord(this.record.id, payload)
          if (patchSuccess) {
            this.isLoading = false
            this.$refs.editRecordDialogRef.$emit('ok')
            this.$refs.editRecordDialogRef.hide();
          } else throw new Error('Server error. Check networks tab.')
        } catch (error) {
          console.log('An error occured while updating name: ', error)
          raiseNotifyError('Failed to update name. Please try again later.', 3000, 'top')
        }
      }
    }
  },

  mounted () {
    if (this.isEditName) this.recordName = this.record.name
    else this.addresses = this.addressesProps
  }
}
</script>