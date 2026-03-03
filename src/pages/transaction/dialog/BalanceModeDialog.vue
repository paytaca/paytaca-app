<template>
  <q-dialog
    ref="dialogRef"
    full-width
    position="top"
    transition-show="fade"
    transition-hide="fade"
    @hide="onDialogHide"
  >
    <q-card class="br-15 q-mt-xl q-mx-md balance-mode-dialog-card" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center q-pl-lg q-pr-sm q-pt-md q-pb-none">
        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">
          {{ $t('BalanceModeTitle', {}, 'Balance') }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-pt-sm q-px-lg">
        <p class="text-body2 q-mb-lg" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
          {{ $t('ChooseBalanceAssetsCaption', {}, 'Choose which assets are included in computing BCH balance of your wallet') }}
        </p>
        <q-list separator class="q-px-none" :class="darkMode ? 'text-white' : 'text-black'">
          <q-item
            v-for="opt in options"
            :key="opt.value"
            class="q-py-md balance-mode-option"
            clickable
            v-ripple
            :active="modelValue === opt.value"
            active-class="balance-mode-option-active"
            @click="onSelect(opt.value)"
          >
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ opt.label }}</q-item-label>
            </q-item-section>
            <q-item-section side v-if="modelValue === opt.value">
              <q-icon name="check" color="primary" size="sm" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'BalanceModeDialog',
  props: {
    modelValue: {
      type: String,
      default: 'bch-only'
    },
    options: {
      type: Array,
      default: () => []
    },
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    ...useDialogPluginComponent.emits
  ],
  setup () {
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
    return {
      dialogRef,
      onDialogHide,
      onDialogOK
    }
  },
  methods: {
    getDarkModeClass,
    onSelect (value) {
      this.onDialogOK(value)
    }
  }
}
</script>

<style lang="scss" scoped>
.balance-mode-dialog-card {
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  
  // Add more margin on mobile devices
  @media (max-width: 600px) {
    margin-left: 16px;
    margin-right: 16px;
  }
}

.balance-mode-option {
  border-radius: 8px;
  margin-bottom: 4px;
}

.balance-mode-option-active {
  background: rgba(59, 123, 246, 0.12);
}
</style>
