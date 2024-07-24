<template>
  <div class="text-center q-pt-sm" style="font-size: 15px;">
    <div>BCH Escrowed</div>
    <div>Please Pay</div>
  </div>
  <div class="text-center q-mt-lg q-px-lg">
    <q-input
    dense
      type="text"
      inputmode="none"
      filled
      v-model="amount"
      readonly
      :dark="darkMode"
    >
      <template v-slot:append>
        <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
          <!-- currency -->
           PHP
        </div>
      </template>
    </q-input>
  </div>

  <div class="text-center q-my-sm">to</div>

  <div class="q-mx-lg">
    <q-card flat bordered :dark="darkMode">
      <q-expansion-item
        class="pt-card text-bow"
        :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
        :default-opened=true
        :label="paymentMethod.name"
        expand-separator >
          <q-card class="row q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
            <div class="col q-pr-sm q-py-xs">
              {{ paymentMethod.values }}
            </div>
          </q-card>
        </q-expansion-item>
      </q-card>

      <q-file clearable class="q-pt-md" filled dense outlined color="blue-12" v-model="attachment" label="Upload Receipt">
        <template v-slot:prepend>
          <q-icon name="attach_file" />
        </template>
      </q-file>

      <div class="row justify-center q-mt-lg">
      <q-btn :disable="!attachment" rounded color="blue-6" label="I have Paid"/>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  data () {
    return {
      amount: 1000,
      paymentMethod: { id: 1, name: 'GCash', values: '8394839'},
      attachment: null
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>
