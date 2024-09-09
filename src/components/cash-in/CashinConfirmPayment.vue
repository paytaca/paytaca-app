<template>
  <q-scroll-area class="q-mx-md" style="height: 320px;">
    <div class="q-mt-xs" style="font-size: 20px;">
      <div class="text-center">BCH Escrowed</div>
    </div>
    <div class="text-center q-mt-md q-px-lg">
      <div style="font-size: 15px;">Please pay</div>
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

    <div class="text-center q-my-sm">to this payment method</div>

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
                Cannot load image
              </div>
            </template>
            <div class="absolute-bottom text-center" style="font-style: italic">
              Proof of payment
            </div>
          </q-img>
        </div>
        <div class="row justify-center">
          <q-btn @click="onDeleteAttachment" flat dense color="red" icon="delete" label="delete" size="md"/>
        </div>
      </div>
      <div v-else class="text-center q-mt-md" style="font-style: italic; color: red">Please upload your proof of payment</div>

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
        label="Select Image"
        @update:model-value="onUploadAttachment"
        @rejected="onRejectedFilePick">
        <template v-slot:prepend>
          <q-icon name="image" />
        </template>
      </q-file>
    </div>
    <div class="row justify-center q-mt-md q-mx-lg q-px-md q-mb-sm">
      <q-btn :disable="!url" class="col" rounded color="blue-6" label="I have Paid" @click="onPaid"/>
    </div>
    <div class="row justify-center q-mx-lg q-px-md">
      <q-btn rounded outline dense label="Cancel" color="primary" class="col q-px-lg" @click="$emit('appeal')"/>
    </div>
  </q-scroll-area>
  <AttachmentDialog :show="showImageDialog" :url="url" @back="showImageDialog=false"/>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import AttachmentDialog from './AttachmentDialog.vue'

export default {
  components: {
    AttachmentDialog
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      attachment: null,
      showImageDialog: false
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
      return Number((Number(this.order?.crypto_amount) * Number(this.order?.locked_price)).toFixed(2)).toLocaleString()
    },
    url () {
      return this.order?.payment_methods_selected[0]?.attachments[0]?.image?.url
    }
  },
  methods: {
    getDarkModeClass,
    onRejectedFilePick (rejectedEntries) {
      console.log('onRejectedFilePick:', rejectedEntries)
      let message = 'File did not pass validation constraints'
      if (rejectedEntries.length > 0 && rejectedEntries[0]?.failedPropValidation === 'max-file-size') {
        message = 'File size should not exceed 5MB'
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
      formData.append('payment_id', this.order?.payment_methods_selected[0]?.order_payment_id)
      formData.append('image', this.attachment)
      this.$emit('upload', formData)
    },
    onPaid () {
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
      console.log(value)

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
