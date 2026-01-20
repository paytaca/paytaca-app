<template>
  <q-dialog v-model="innerVal" ref="dialogRef" full-height @hide="onDialogHide" position="bottom">
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row no-wrap items-start">
          <slot name="title">
            <div class="text-h5">{{ title }}</div>
          </slot>
          <q-space/>
          <q-btn flat padding="xs" icon="close" v-close-popup class="close-button" />
        </div>
      </q-card-section>
      <div style="position: relative;">
        <div
          class="row items-center justify-center"
          style="overflow:auto;max-height:calc(87.5vh - 4rem);min-height:50vh;"
        >
          <img :src="image" alt="" :style="{
            'max-width': '100%',
            'max-height': '100%',
            'object-fit': 'contain',
            'transform': `scale(${zoom/100})`,
            'transform-origin': '0 0',
            'transition': 'transform ease-out 0.25s',
          }"/>
        </div>
        <q-btn
          fab icon="search"
          class="button"
          padding="sm"
          :style="{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
          }"
        >
          <q-menu
            class="text-center q-pa-sm pt-card text-bow"
            :class="getDarkModeClass(darkMode)"
            :offset="[0, 10]"
          >
            <div><q-icon name="zoom_in" size="2rem"/></div>
            <q-slider
              v-model="zoom"
              vertical
              reverse
              :min="100"
              :max="500"
              :label-value="zoom + '%'"
              class="q-my-sm"
            />
            <div><q-icon name="zoom_out" size="2rem"/></div>
          </q-menu>
        </q-btn>
      </div>
      <q-card-section></q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>

import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, ref, watch } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default defineComponent({
  name: 'ImageViewerDialog.vue',
  props: {
    modelValue: Boolean,
    image: String,
    title: String,
  },
  emits: [
    'update:modelValue',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit: $emit }) {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const zoom = ref(100)
    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      zoom,
    }
  },
  methods: {
    getDarkModeClass
  }
})
</script>
