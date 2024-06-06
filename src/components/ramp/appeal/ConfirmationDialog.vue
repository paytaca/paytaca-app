<template>
    <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless full-width>
      <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-mx-lg">
          <div class="text-center lg-font-size">{{ title }}</div>
        </q-card-section>
        <q-card-section class="q-mx-lg">
          <div class="text-center">{{ message }}</div>
        </q-card-section>
        <q-card-actions class="text-center" align="center">
          <q-btn flat label="Cancel" color="red-6" @click="$emit('hide')" v-close-popup />
          <q-btn
            flat
            label="Confirm"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="$emit('ok')"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  emits: ['ok', 'hide'],
  props: {
    title: String,
    message: String
  },
  methods: {
    getDarkModeClass,
    show () {
      this.$refs.dialog.show()
    },
    hide () {
      this.$refs.dialog.show()
    },
    onDialogHide () {
      this.$emit('hide')
    }
  }
}
</script>
