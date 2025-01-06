<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
    position="bottom"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('Stablehedge') }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-carousel
        v-model="slide"
        transition-prev="slide-right"
        transition-next="slide-left"
        swipeable
        navigation
        animated
        control-color="brandblue"
        class="rounded-borders pt-card-2"
        :class="getDarkModeClass(darkMode)"
      >
        <q-carousel-slide name="intro">
          <div class="text-center text-body1">
            Stablehedge is the way to protect your BCH from volatility
          </div>
          <div class="text-center">
            Powered by 
            <a href="#">CashTokens</a>
            and
            <a href="#">BCH Bull</a>
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="deposit">
          Slide B
        </q-carousel-slide>
        <q-carousel-slide name="redeem">
          Slide C
        </q-carousel-slide>
        <q-carousel-slide name="dashboard-info">
          Slide D
        </q-carousel-slide>
      </q-carousel>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'
export default defineComponent({
  name: 'StablehedgePlatformInfoDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
  },
  setup(props, { emit: $emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const slide = ref('intro')
    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      slide,
    }
  }
})
</script>
