<template>
  <div class="q-pb-md">
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div>
      <div class="text-h5 q-mx-lg text-center" style="font-size: 18px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        POST BUY AD
      </div>
    </div>
    <!-- Price Settings -->
    <div class="q-px-lg">
      <div class="q-mx-lg q-pb-sm q-pt-md" style="font-weight: 500;">
        Price Setting
      </div>
      <div class="text-center q-mx-md">
        <q-btn-toggle
          dense
          v-model="priceSetToggle"
          spread
          class="my-custom-toggle br-15"
          no-caps
          unelevated
          toggle-color="blue-6"
          text-color="blue-6"
          :options="[
            {label: 'Fixed', value: 'fixed'},
            {label: 'Floating', value: 'float'}
          ]"
        />
      </div>
      <div class="row q-pt-sm q-gutter-sm q-px-md" style="font-size: 13px;">
        <div class="col-4">
          <div class="q-pl-sm q-pb-xs">Fiat Amount</div>
          <q-select dense :dark="darkMode" rounded outlined v-model="selectedCurrency" :options="Object.keys(availableFiat)" />
        </div>
        <div class="col">
          <!-- <q-select :dark="darkMode" rounded outlined v-model="selectedCurrency" :options="Object.keys(availableFiat)" label="Fiat Currency" /> -->
          <div class="q-pl-sm q-pb-xs">{{ priceSetToggle === 'fixed'? 'Fixed Price' : 'Floating Price Margin' }}</div>
          <q-input dense rounded :dark="darkMode" outlined bottom-slots v-model="fixedAmount">
            <template v-slot:prepend>
              <q-icon name="remove" @click="fixedAmount--"/>
            </template>
            <template v-slot:append>
              <q-icon name="add" @click="fixedAmount++" />
            </template>
          </q-input>
        </div>
      </div>
      <div style="font-size: 13px;">
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
          <div>
            <span>Your Price</span><br>
            <span style="font-size: 18px; font-weight: 500;">{{ fixedAmount }} {{ selectedCurrency }}</span>
          </div>
          <div >
            <span>Lower Your Price</span><br>
            <span style="float: right;font-size: 18px;">7311.78 {{ selectedCurrency }}</span>
          </div>
        </div>
      </div>
    </div>
    <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
    <!-- Total Amount -->
    <div class="q-mx-lg">
      <div class="q-mt-md q-px-md">
        <div class="q-pb-xs q-pl-sm" style="font-weight: 500;">Total Amount</div>
          <q-input
            dense
            outlined
            rounded=""
            :dark="darkMode"
            v-model="amount"
          >
            <template v-slot:prepend>
              <span style="font-size: 12px; font-weight: 400;">
                BCH
              </span>
            </template>
            <template v-slot:append>
              <q-icon size="xs" name="close" @click="amount = 0"/>
              <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
            </template>
          </q-input>
        </div>
      <div class="q-mt-sm q-px-md">
        <div class="q-pl-sm q-pb-xs" style="font-size: 13px;">Trade Limit</div>
        <div class="row">
          <div class="col-5">
            <q-input
              dense
              outlined
              rounded=""
              :dark="darkMode"
              v-model="amount"
            >
              <template v-slot:append>
                <span style="font-size: 12px;">{{ selectedCurrency  }}</span>
                <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
              </template>
            </q-input>
          </div>
          <div class="col text-center">
            <q-icon class="q-pt-sm" name="remove"/>
          </div>
          <div class="col-5">
            <q-input
              dense
              outlined
              rounded=""
              :dark="darkMode"
              v-model="amount"
            >
              <template v-slot:append>
                <span style="font-size: 12px;">{{ selectedCurrency  }}</span>
                <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
              </template>
            </q-input>
          </div>
        </div>
      </div>
      <div class="row q-mx-sm q-py-lg">
        <q-btn
          rounded
          no-caps
          label='Post Ad'
          color="blue-6"
          class="q-space"
        />
      </div>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      priceSetToggle: 'fixed',
      amount: 0,
      selectedCurrency: 'PHP',
      floatingPriceMargin: 100,
      fixedAmount: 0,
      availableFiat: {
        PHP: 'Philippine Peso',
        USD: 'United States Dollar',
        CAD: 'Canadian Dollar',
        JPY: 'Japanese Yen',
        RUB: 'Russian Ruble'
      },
    }
  },
  props: {
    transactionType: String,
    adsState: String
  },
  emits: ['back'],
  async mounted () {
    const vm = this

    console.log(vm.transactionType)
    console.log(vm.adsState)
  }
}
</script>
<style lang="sass" scoped>
.my-custom-toggle
  border: 1px solid #2196F3
</style>
