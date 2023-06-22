<template>
 <div>
    <div class="q-mx-sm q-mb-sm text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      PAYMENT METHODS
    </div>
    <div class="subtext q-pt-xs q-pl-lg"><i>Add up to 5 methods</i></div>
    <div>
      <div v-if="paymentMethods.length === 0" class="relative text-center" style="margin-top: 50px;">
        <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="lg" name="mdi-delete-empty"/>
        <p class="q-pt-sm" :class="{ 'text-black': !darkMode }">No Payment Method Added</p>
      </div>
      <div v-else>
        <q-card-section style="max-height:38vh;overflow-y:auto;">
          <q-virtual-scroll :items="paymentMethods">
            <template v-slot="{ item: method, index }">
              <q-item clickable :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                <q-item-section>
                  <div class="text-h5" style="font-size: 15px;">
                    {{ method.paymentType.name. toUpperCase() }}
                  </div>
                  <div class="subtext bold-text">
                    {{ method.accountNumber }}
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-virtual-scroll>
        </q-card-section>
      </div>
    </div>
    <div>
      <div class="row q-pt-lg q-mx-sm">
        <q-btn
          outline
          rounded
          no-caps
          label='Add'
          class="q-space text-white"
          color="blue-6"
          @click="openDialog = true"
          v-show="paymentMethods.length < 5"
        />
      </div>
    </div>
    <div class="row q-pt-lg q-mx-sm">
      <q-btn
        :disable="paymentMethods.length === 0"
        rounded
        no-caps
        :label="confirmLabel"
        class="q-space text-white"
        color="blue-6"
        @click="submitPaymentMethod"
      />
    </div>
  </div>

  <div v-if="openDialog">
    <MiscDialogs
      :type="dialogType"
      v-on:back="openDialog = false"
      v-on:submit="receiveDialogInfo"
    />
  </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue';

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      paymentMethods: [],
      openDialog: false,
      dialogType: 'addPaymentMethod'
    }
  },
  emits: ['submit'],
  components: {
    MiscDialogs
  },
  props: {
    confirmLabel: {
      type: String,
      default: 'Next'
    },
    currentPaymentMethods: {
      type: Array,
      default: []
    }
  },
  methods: {
    receiveDialogInfo (data) {
      const vm = this
      console.log(data)
      switch (vm.dialogType) {
        case 'addPaymentMethod':
          this.updatePayment(data)
          break
        case 'confirmPaymentMethod':
          this.$emit('submit', this.paymentMethods)
          break
      }
    },
    updatePayment (data) {
      this.paymentMethods.push(data)
      // console.log(this.paymentMethods)
    },
    submitPaymentMethod () {
      this.dialogType = 'confirmPaymentMethod'

      this.openDialog = true
      // console.log(this.paymentMethods)
      // this.$emit('submit', this.paymentMethods)
    }
  },
  async mounted () {
    // get payment type list
    this.paymentMethods = this.currentPaymentMethods
    console.log(this.paymentMethods)
  }
}
</script>
<style lang="scss" scoped>
.bold-text {
  font-weight: 500;
}
.sm-font-size {
  font-size: 12px;
}
.md-font-size {
  font-size: 13px
}
.lg-font-size {
  font-size: 18px;
}
.subtext {
  opacity: .5;
}
</style>
