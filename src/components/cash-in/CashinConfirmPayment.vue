<template>
  <q-scroll-area class="q-mx-md" style="height: 320px;">
    <div class="q-mt-xs" style="font-size: 20px;">
      <div class="text-center">{{ $t('BchEscrowed') }}</div>
    </div>
    <div class="text-center q-mt-md q-px-lg">
      <div style="font-size: 15px;">{{ $t('PleasePay') }}</div>
      <q-input
        dense
        type="text"
        inputmode="none"
        filled
        v-model="amount"
        readonly
        :dark="darkMode"
        style="font-size: medium;">
        <template v-slot:append>
          <div class="q-pr-sm" style="font-size: large;">
            {{ order?.ad?.fiat_currency?.symbol }}
          </div>
        </template>
      </q-input>
    </div>

    <div class="text-center q-my-sm">{{ $t('ToThisPaymentMethod') }}</div>

    <div class="q-mx-lg">
      <q-card flat bordered :dark="darkMode" v-for="(paymentMethod, index) in order?.payment_methods_selected" :key="index">
        <q-expansion-item
          class="pt-card text-bow"
          :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
          :default-opened=true
          :label="paymentMethod.payment_type"
          disable
          expand-separator >
            <q-card class="row q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
              <div class="col q-pr-sm q-py-xs">
                <div v-for="(field, index) in paymentMethod.values" :key="index">
                  <div v-if="field.value">{{ field.field_reference.fieldname }}:</div>
                  <div v-if="field.value" class="q-ml-sm text-weight-bold">
                    {{ field.value }}
                    <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(field.value)"/>
                  </div>
                </div>
                <div v-for="(field, index) in paymentMethod.dynamic_values" :key="index">
                    {{ field.fieldname }}
                    <div class="q-ml-sm text-weight-bold">
                      {{ dynamicVal(field) }}
                      <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(dynamicVal(field))"/>
                    </div>
                </div>
              </div>
            </q-card>
        </q-expansion-item>
      </q-card>

      <div v-if="url">
        <div class="row q-mt-md justify-center">
          <q-img
            :src="url"
            style="height: 140px; max-width: 150px"
            @click="showImageDialog=true">
            <template v-slot:error>
              <div class="absolute-full flex flex-center text-white">
                {{ $t('CannotLoadImage') }}
              </div>
            </template>
            <div class="absolute-bottom text-center" style="font-style: italic">
              {{ $t('ProofOfPayment') }}
            </div>
          </q-img>
        </div>
        <div class="row justify-center">
          <q-btn @click="onDeleteAttachment" flat dense color="red" icon="delete" :label="$t('Delete')" size="md"/>
        </div>
      </div>
      <div v-else class="text-center q-mt-md" style="font-style: italic; color: red">{{ $t('UploadProofOfPayment') }}</div>

      <q-file v-if="!url"
        :max-file-size="maxFileSize"
        :clearable="!uploading"
        v-model="attachment"
        accept=".jpg, image/*"
        class="q-pt-sm"
        filled
        dense
        outlined
        color="blue-12"
        :label="$t('SelectImage')"
        @update:model-value="onUploadAttachment"
        @rejected="onRejectedFilePick">
        <template v-slot:prepend>
          <q-icon name="image" />
        </template>
      </q-file>
    </div>
    <div class="row justify-center q-mt-md q-mx-lg q-px-md q-mb-sm">
      <q-btn :loading="loadSubmitButton" :disable="!url || disableButtons" class="col button" :class="getDarkModeClass(darkMode)" rounded :label="$t('ConfirmPayment')" @click="onPaid"/>
    </div>
    <div class="row justify-center q-mx-lg q-px-md">
      <q-btn :loading="loadCancelButton" :disable="disableButtons" rounded outline dense :label="$t('Cancel')" class="col q-px-lg button button-text-primary" :class="getDarkModeClass(darkMode)"
        @click="onClickCancel"/>
    </div>
  </q-scroll-area>
  <AttachmentDialog :show="showImageDialog" :url="url" @back="showImageDialog=false"/>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import AttachmentDialog from './AttachmentDialog.vue'
import { satoshiToBch } from 'src/exchange'

export default {
  components: {
    AttachmentDialog
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      attachment: null,
      showImageDialog: false,
      paid: false,
      loadSubmitButton: false,
      loadCancelButton: false
    }
  },
  emits: ['confirm-payment', 'refetch-order', 'upload', 'delete', 'appeal'],
  props: {
    order: Object,
    uploading: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    maxFileSize () {
      return 5 * 1024 * 1024
    },
    amount () {
      return Number((Number(satoshiToBch(this.order?.trade_amount)) * Number(this.order?.price)).toFixed(2)).toLocaleString()
    },
    url () {
      return this.order?.payment_methods_selected[0]?.attachments[0]?.image?.url
    },
    disableButtons () {
      return this.loadCancelButton || this.loadSubmitButton
    }
  },
  methods: {
    getDarkModeClass,
    onClickCancel () {
      this.loadCancelButton = true
      this.$emit('appeal')
    },
    onRejectedFilePick (rejectedEntries) {
      console.log('onRejectedFilePick:', rejectedEntries)
      let message = this.$t('FileValidationError')
      if (rejectedEntries.length > 0 && rejectedEntries[0]?.failedPropValidation === 'max-file-size') {
        message = this.$t('FileSizeError')
      }
      this.$q.notify({
        type: 'negative',
        message: message
      })
    },
    async onDeleteAttachment () {
      const attachmentId = this.order?.payment_methods_selected[0]?.attachments[0]?.id
      this.$emit('delete', attachmentId)
    },
    async onUploadAttachment () {
      const formData = new FormData()
      formData.append('image', this.attachment)
      this.$emit('upload', formData, this.order?.payment_methods_selected[0]?.order_payment_id)
    },
    onPaid () {
      this.loadSubmitButton = true
      this.paid = true
      this.$emit('confirm-payment')
    },
    dynamicVal (field) {
      if (field.model_ref === 'order') {
        if (field.field_ref === 'id') {
          return this.order?.id
        }
        if (field.field_ref === 'tracking_id') {
          return this.order?.tracking_id
        }
      }
    },
    copyToClipboard (value) {
      // console.log(value)

      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>
