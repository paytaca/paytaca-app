<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-end items-center">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row justify-center text-center q-gutter-y-xs">
        <q-icon name="celebration" size="70px" color="green" />
        <span class="text-body1 q-mt-md">
          {{ $t('PointsReceivedDescription1') }}
        </span>
        <span v-if="hasReceivedCashinPoints" class="text-body1">
          {{ $t('PointsReceivedDescription2') }}
        </span>
        <span class="text-body2 q-mt-md">
          {{ $t('PointsReceivedDescription3') }}
        </span>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'PointsReceivedDialog',

  props: {
    hasReceivedCashinPoints: { type: Boolean, default: false },
    hasReceivedOneTimePoints: { type: Boolean, default: false }
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
