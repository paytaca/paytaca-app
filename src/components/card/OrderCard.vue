<template>
  <div class="full-width q-pa-md">
    <div v-if="!processing && !done" class="column items-center">
      <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Order Your Paytaca Card</div>

      <div v-if="replacementReason" class="replacement-banner q-mb-md full-width">
        <q-banner class="q-pa-sm text-center" rounded :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-primary'" style="border-radius: 12px;">
          <div class="text-caption text-weight-bold text-white">
            Card Replacement — Reason: {{ replacementReason }}
          </div>
        </q-banner>
      </div>

      <!-- Card Name -->
      <div class="full-width q-mb-md">
        <div class="text-subtitle2 q-mb-sm" :class="textColor">Card Name</div>
        <q-input
          v-model="cardName"
          placeholder="Enter card name"
          dense
          outlined
          maxlength="10"
          counter
          :dark="$q.dark.isActive"
          class="order-card-input"
        />
      </div>

      <!-- Delivery Method -->
      <div class="full-width q-mb-md">
        <div class="text-subtitle2 q-mb-sm" :class="textColor">Delivery Method</div>
        <q-option-group
          v-model="deliveryMethod"
          :options="deliveryOptions"
          color="primary"
          inline
          :dark="$q.dark.isActive"
        />
      </div>

      <!-- Delivery Address Fields -->
      <div v-if="deliveryMethod === 'delivery'" class="full-width q-mb-md q-pa-md br-10" :class="$q.dark.isActive ? 'glassmorphic-dark' : 'glassmorphic-light'">
        <div class="text-subtitle2 q-mb-sm" :class="textColorGrey">Delivery Address</div>
        <q-input
          v-model="address.fullName"
          placeholder="Full Name"
          dense
          outlined
          :dark="$q.dark.isActive"
          class="q-mb-sm order-card-input"
        />
        <q-input
          v-model="address.street"
          placeholder="Street Address"
          dense
          outlined
          :dark="$q.dark.isActive"
          class="q-mb-sm order-card-input"
        />
        <q-input
          v-model="address.city"
          placeholder="City"
          dense
          outlined
          :dark="$q.dark.isActive"
          class="q-mb-sm order-card-input"
        />
        <div class="row q-gutter-sm">
          <q-input
            v-model="address.state"
            placeholder="State/Province"
            dense
            outlined
            :dark="$q.dark.isActive"
            class="col order-card-input"
          />
          <q-input
            v-model="address.zip"
            placeholder="ZIP Code"
            dense
            outlined
            :dark="$q.dark.isActive"
            class="col order-card-input"
          />
        </div>
        <q-input
          v-model="address.country"
          placeholder="Country"
          dense
          outlined
          :dark="$q.dark.isActive"
          class="q-mt-sm order-card-input"
        />
      </div>

      <!-- Pickup Info -->
      <div v-else class="full-width q-mb-md q-pa-md br-10" :class="$q.dark.isActive ? 'glassmorphic-dark' : 'glassmorphic-light'">
        <div class="row items-center q-gutter-sm">
          <q-icon name="store" color="primary" size="1.2rem" />
          <span class="text-body2" :class="textColorGrey">Available for pickup at our main office</span>
        </div>
      </div>

      <!-- Order Button -->
      <q-btn
        label="Order Card"
        color="primary"
        class="full-width q-mt-lg"
        unelevated
        rounded
        no-caps
        :disable="!isFormValid"
        @click="startOrderProcess"
      />
    </div>

    <!-- Processing -->
    <div v-else-if="processing" class="column items-center q-pa-lg">
      <q-spinner
        color="primary"
        size="3rem"
        class="q-mb-lg"
      />
      <div class="text-h6 text-weight-bold q-mb-md" :class="textColor">Processing Your Order</div>

      <div class="full-width" style="max-width: 400px;">
        <div
          v-for="(step, index) in steps"
          :key="step.key"
          class="row items-center q-mb-sm q-py-sm q-px-md br-10"
          :class="step.status === 'done' ? ($q.dark.isActive ? 'bg-positive-dark' : 'bg-positive-light') : step.status === 'active' ? ($q.dark.isActive ? 'bg-primary-dark' : 'bg-primary-light') : ''"
        >
          <q-icon
            :name="step.status === 'done' ? 'check_circle' : step.status === 'active' ? 'hourglass_top' : 'radio_button_unchecked'"
            :color="step.status === 'done' ? 'positive' : step.status === 'active' ? 'primary' : 'grey-5'"
            size="1.3rem"
            class="q-mr-sm"
          />
          <span class="text-body2" :class="step.status === 'done' ? 'text-positive' : textColor">{{ step.label }}</span>
          <q-spinner
            v-if="step.status === 'active'"
            color="primary"
            size="1rem"
            class="q-ml-sm"
          />
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-else-if="done" class="column items-center q-pa-lg">
      <q-icon name="check_circle" color="positive" size="4rem" class="q-mb-md" />
      <div class="text-h5 text-weight-bold q-mb-sm" :class="textColor">Order Successful!</div>
      <div class="text-body1 q-mb-md" :class="textColorGrey">{{ replacementReason ? 'Your Paytaca replacement card has been ordered.' : 'Your Paytaca card has been ordered.' }}</div>

      <div class="full-width q-mb-md q-pa-md br-10" :class="$q.dark.isActive ? 'glassmorphic-dark' : 'glassmorphic-light'" style="max-width: 400px;">
        <div class="row items-center q-mb-sm">
          <span class="text-caption" :class="textColorGrey" style="width: 90px;">Card Name:</span>
          <span class="text-body2 text-weight-medium" :class="textColor">{{ cardName }}</span>
        </div>
        <div class="row items-center q-mb-sm">
          <span class="text-caption" :class="textColorGrey" style="width: 90px;">Delivery:</span>
          <span class="text-body2 text-weight-medium" :class="textColor">{{ deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery' }}</span>
          <span class="text-caption q-ml-xs" :class="textColorGreyLight">(EST 7-10 business days)</span>
        </div>
        <div v-if="deliveryMethod === 'delivery'" class="q-mt-sm">
          <div class="text-caption" :class="textColorGrey" style="width: 90px;">Address:</div>
          <div class="text-body2" :class="textColorGrey">
            {{ address.fullName }}<br>
            {{ address.street }}<br>
            {{ address.city }}, {{ address.state }} {{ address.zip }}<br>
            {{ address.country }}
          </div>
        </div>
      </div>

      <q-btn
        label="Order Again"
        color="primary"
        class="full-width"
        unelevated
        rounded
        no-caps
        @click="resetForm"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrderCard',
  props: {
    card: { type: Object, required: false, default: () => ({}) },
    replacementReason: { type: String, required: false, default: '' }
  },
  data() {
    return {
      cardName: '',
      deliveryMethod: 'pickup',
      address: {
        fullName: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      },
      processing: false,
      done: false,
      steps: [
        { key: 'genesis', label: 'Creating genesis transaction', status: 'pending' },
        { key: 'auth', label: 'Creating authorization NFT', status: 'pending' },
        { key: 'contract', label: 'Creating smart contract', status: 'pending' },
        { key: 'encryptName', label: 'Encrypting card name', status: 'pending' },
        { key: 'encryptAddress', label: 'Encrypting delivery address', status: 'pending' },
      ],
      deliveryOptions: [
        { label: 'Pickup', value: 'pickup' },
        { label: 'Delivery', value: 'delivery' },
      ],
    }
  },
  computed: {
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-black'
    },
    textColorGrey() {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'
    },
    textColorGreyLight() {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'
    },
    isFormValid() {
      if (!this.cardName.trim()) return false
      if (this.deliveryMethod === 'delivery') {
        return this.address.fullName && this.address.street && this.address.city && this.address.country
      }
      return true
    }
  },
  methods: {
    async startOrderProcess() {
      this.processing = true
      this.done = false
      this.resetSteps()

      for (const step of this.steps) {
        step.status = 'active'
        await this.delay(1500)
        step.status = 'done'
      }

      this.processing = false
      this.done = true
    },
    resetSteps() {
      this.steps.forEach(s => { s.status = 'pending' })
    },
    resetForm() {
      this.cardName = ''
      this.deliveryMethod = 'pickup'
      this.address = { fullName: '', street: '', city: '', state: '', zip: '', country: '' }
      this.processing = false
      this.done = false
    },
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/css/app-card.scss";

.order-card-input :deep(.q-field__control) {
  border-radius: 12px;
}

.bg-positive-light {
  background: rgba(33, 186, 69, 0.08);
}

.bg-primary-light {
  background: rgba(25, 118, 210, 0.08);
}

.body--dark {
  .bg-positive-dark {
    background: rgba(33, 186, 69, 0.15);
  }
  .bg-primary-dark {
    background: rgba(25, 118, 210, 0.15);
  }
}
</style>
