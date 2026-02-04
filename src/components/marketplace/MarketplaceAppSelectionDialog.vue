<template>  
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card class="pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-pb-none">
        <div class="row items-center no-wrap q-pb-sm">
          <div class="text-h5 q-space">{{ $t('Marketplace') }}</div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div>
      </q-card-section>
      <q-item clickable v-ripple :to="{ name: 'app-marketplace' }">
        <q-item-section avatar>
          <q-icon name="storefront" size="2.25em"/>
        </q-item-section>
        <q-item-section>
          <q-item-section>{{ $t('GoToMarketplaceApp') }}</q-item-section>
        </q-item-section>
      </q-item>
      <q-item clickable v-ripple :to="{ name: 'app-marketplace-arbiter' }">
        <q-item-section avatar>
          <q-icon name="balance" size="2.25em"/>
        </q-item-section>
        <q-item-section>
          <q-item-section>{{ $t('OpenArbiterInterface') }}</q-item-section>
        </q-item-section>
      </q-item>
      <div class="q-py-sm"></div>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from "quasar";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";

const props = defineProps({
  modelValue: Boolean,
})

const $emit = defineEmits([
  'update:modelValue',
  'updated',

  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const innerVal = ref(props.modelValue)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))

</script>