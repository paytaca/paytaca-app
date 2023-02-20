<template>
  <q-card
    class="br-15 q-pt-sm"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
  >
    <div class="text-center q-py-md">
      {{ $t('SwapFrom') }}:
    </div>

    <q-item clickable>
      <q-item-section avatar class="items-center">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="test"></div>
        <q-item-label>
          Symbol Name<q-icon name="expand_more"/>
        </q-item-label>
      </q-item-section>
      <q-item-section>
        <q-input
          dense
          filled
          :dark="darkMode"
        />
        <q-item-label
          class="text-right q-mt-sm"
          caption
          :class="darkMode ? 'text-grey-6' : ''"
        >
          Balance Daw
        </q-item-label>
      </q-item-section>
    </q-item>
    <div class="q-px-md q-my-xs row items-center justify-center">
        <q-btn
          icon="mdi-swap-vertical"
          round
          text-color="blue-9"
          color="grey-4"
          unelevated
        />
      </div>
  </q-card>
</template>

<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      test: null
    }
  },
  async mounted () {
    const vm = this
    console.log('Hello World')

    const resp = await vm.$axios.get('https://sideshift.ai/api/v2/coins/icon/bitcoin-lightning')
    vm.test = resp.data
    console.log(vm.test)
  }
}
</script>
