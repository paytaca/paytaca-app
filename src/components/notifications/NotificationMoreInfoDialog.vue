<template>
  <q-dialog
    persistent
    class="no-click-outside"
  >
    <q-card class="q-pa-md pt-card-2 full-width text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row col-12 justify-between items-center">
        <span class="text-bold col-11" style="font-size: 18px;">{{ title }}</span>
        <q-space/>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          align="right"
          class="close-button col-1"
          v-close-popup
        />
      </div>

      <q-separator />

      <div class="q-py-sm">
        {{ message }}
      </div>

      <div class="q-pt-sm">
        {{ $t('ExternalLinks') }}
        <div v-for="(link, index) in url" :key="index" class="q-ml-sm q-pb-xs">
          <a target="_blank" :href="link">{{ link }}</a>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'NotificationMoreInfoDialog',

  props: {
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    url: { type: Array, default: Array }
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

<style lang="scss" scoped>
a {
  overflow-wrap: anywhere;
}
</style>
