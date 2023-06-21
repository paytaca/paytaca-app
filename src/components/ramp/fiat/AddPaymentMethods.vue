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
                    {{ method.type.toUpperCase() }}
                  </div>
                  <div class="subtext" style="font-weight: 500;">
                    {{ method.info }}
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
          @click="addMethod = true"
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
        @click="confirmPaymentMethod = true"
      />
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      paymentMethods: [],
    }
  },
  props: {
    confirmLabel: {
      type: String,
      default: 'Next'
    }
  },
  async mounted () {
    // get payment type list
  }
}
</script>
<style lang="scss" scoped>

</style>
