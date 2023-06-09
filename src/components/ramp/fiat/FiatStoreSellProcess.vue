<template>
  <div class="q-pa-md">
    <q-stepper
      v-model="step"
      ref="stepper"
      color="primary"
      active-icon="none"
      done-color="blue-4"
      active-color="blue-9"
      :contracted="$q.platform.is.mobile"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :dark="darkMode"
      transition-duration="150"
      animated
      alternative-labels
      flat
    >
      <q-step
        :name="1"
        title="Create Order"
        prefix="1"
        :done="step > 1"
      >
        <FiatStoreSellInit/>
      </q-step>

      <q-step
        :name="2"
        title="Await Payment"
        prefix="2"
        :done="step > 2"
      >
        An ad group contains one or more ads which target a shared set of keywords.
      </q-step>

      <q-step
        :name="3"
        title="Release Crypto"
        prefix="3"
      >
        Try out different ad text to see what brings in the most customers, and learn how to
        enhance your ads using features like ad extensions. If you run into any problems with
        your ads, find out how to tell if they're running and how to resolve approval issues.
      </q-step>

      <!-- <template v-slot:navigation>
        <q-stepper-navigation>
          <q-btn @click="$refs.stepper.next()" color="primary" :label="step === 4 ? 'Finish' : 'Continue'" />
          <q-btn v-if="step > 1" flat color="primary" @click="$refs.stepper.previous()" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </template> -->
    </q-stepper>
  </div>
</template>
<script>
import { ref } from 'vue'
import FiatStoreSellInit from './FiatStoreSellInit.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    FiatStoreSellInit
  },
  setup () {
    return {
      step: ref(1)
    }
  }
}
</script>
