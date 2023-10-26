<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-sm pt-card" :class="getDarkModeClass(darkMode)">

        <q-card-section class="pt-label" :class="getDarkModeClass(darkMode)">
            <span class="text-weight-medium">{{ $t('Confirmation') }}</span>
        </q-card-section>

        <q-separator />

        <q-card-section class="pt-label" :class="getDarkModeClass(darkMode)">
          <label>{{$t('AssetRemovalText') }}</label>
        </q-card-section>

        <q-separator class="q-mb-sm" />

        <q-card-actions align="right">
            <q-btn rounded class="button" padding="0.5em 1.5em 0.5em 1.5em" :label="$t('Continue')" @click="onOKClick" />
            <q-btn rounded class="button" padding="0.5em 2em 0.5em 2em" flat :label="$t('Cancel')" @click="onCancelClick" />
        </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  data () {
    return {
      assets: null
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    show () {
      this.$refs.dialog.show()
    },
    onOKClick () {
      this.$emit('ok')
      this.hide()
    },
    onCancelClick () {
      this.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    }
  }
}
</script>
