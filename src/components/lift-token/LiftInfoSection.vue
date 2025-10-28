<template>
  <div class="lift-info-section q-mb-md">
    <q-expansion-item
      :model-value="defaultExpanded"
      :label="title"
      :icon="icon"
      expand-icon-class="text-grey-6"
      class="lift-expansion-item"
      :class="getDarkModeClass(darkMode)"
    >
      <template v-slot:header>
        <q-item-section avatar v-if="icon">
          <q-icon :name="icon" :color="iconColor" size="md" />
        </q-item-section>
        <q-item-section>
          <div class="text-subtitle1 text-weight-bold">{{ title }}</div>
          <div v-if="subtitle" class="text-caption text-grey-6">{{ subtitle }}</div>
        </q-item-section>
      </template>
      
      <q-card flat class="info-section-content q-pa-md" :class="getDarkModeClass(darkMode)">
        <slot></slot>
      </q-card>
    </q-expansion-item>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'LiftInfoSection',
  props: {
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    iconColor: {
      type: String,
      default: 'primary'
    },
    defaultExpanded: {
      type: Boolean,
      default: false
    },
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>

<style lang="scss" scoped>
.lift-info-section {
  border-radius: 12px;
  overflow: hidden;
  
  :deep(.lift-expansion-item) {
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .q-item {
      padding: 16px;
    }
  }
  
  .info-section-content {
    background-color: rgba(0, 0, 0, 0.02);
    
    &.dark {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
}
</style>

