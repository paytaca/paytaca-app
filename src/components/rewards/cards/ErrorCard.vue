<template>
  <div v-if="isPointsCard" class="row flex-center">
    <q-icon 
      :name="darkMode ? 'mdi-emoticon-sad' : 'mdi-emoticon-sad-outline'" 
      size="52px" 
      class="row text-bow-muted q-mb-md" 
      :class="getDarkModeClass(darkMode)" 
    />
    <span class="text-body1 q-mb-sm">{{ errorText }}</span>
    <q-btn
      rounded
      outline
      no-caps
      :label="$t('Retry')"
      icon="refresh"
      class="text-bow-muted"
      :class="getDarkModeClass(darkMode)"
      @click="$emit('on-retry')"
    />
  </div>

  <div
    v-else
    class="row flex-center"
    :class="isRewardsHomePage ? ' q-mx-lg q-pt-md' : ''"
    style="min-height: 33vh;"
  >
    <div class="error-state-card text-center q-pa-xl" :class="getDarkModeClass(darkMode)">
      <q-icon 
        name="cloud_off" 
        size="64px" 
        class="text-bow-muted q-mb-md" 
        :class="getDarkModeClass(darkMode)" 
      />
      <div class="text-subtitle1 text-bow-muted q-mb-md" :class="getDarkModeClass(darkMode)">
        {{ errorText }}
      </div>
      <q-btn
        rounded
        outline
        no-caps
        :label="$t('Retry')"
        icon="refresh"
        class="text-bow-muted"
        :class="getDarkModeClass(darkMode)"
        @click="$emit('on-retry')"
      />
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ErrorCard',

  props: {
    isPointsCard: { type: Boolean, default: false },
    isRewardsHomePage: { type: Boolean, default: false },
    errorText: { type: String, default: '' }
  },

  emits: ['on-retry'],

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
.error-state-card {
  border-radius: 16px;
  max-width: 400px;
  width: 100%;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);

  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>