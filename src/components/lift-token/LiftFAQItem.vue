<template>
  <q-expansion-item
    :label="question"
    icon="help_outline"
    class="faq-item q-mb-sm"
    :class="getDarkModeClass(darkMode)"
    header-class="faq-header"
  >
    <q-card flat class="faq-content q-pa-md" :class="getDarkModeClass(darkMode)">
      <div class="text-body2" v-html="answer"></div>
      <q-btn
        v-if="ctaLabel && ctaAction"
        :label="ctaLabel"
        flat
        dense
        no-caps
        color="primary"
        class="q-mt-sm"
        @click="$emit('cta-click')"
      />
    </q-card>
  </q-expansion-item>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'LiftFAQItem',
  props: {
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    ctaLabel: String,
    ctaAction: String,
    darkMode: Boolean
  },
  emits: ['cta-click'],
  methods: {
    getDarkModeClass
  }
}
</script>

<style lang="scss" scoped>
.faq-item {
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.6);
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.03);
  }
  
  :deep(.faq-header) {
    padding: 12px 16px;
    font-weight: 500;
  }
  
  .faq-content {
    background-color: rgba(0, 0, 0, 0.02);
    
    &.dark {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
}
</style>

