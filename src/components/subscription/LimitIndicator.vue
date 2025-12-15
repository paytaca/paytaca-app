<template>
  <div class="limit-indicator" :class="getDarkModeClass(darkMode)">
    <div class="row items-center q-gutter-xs">
      <span class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
        {{ current }} / {{ limit }} {{ label }}
      </span>
      <q-linear-progress
        :value="progress"
        :color="progressColor"
        size="4px"
        class="limit-progress"
        rounded
      />
    </div>
    <div v-if="showWarning" class="text-caption text-warning q-mt-xs">
      <q-icon name="warning" size="0.8em" class="q-mr-xs" />
      {{ warningMessage }}
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'LimitIndicator',
  props: {
    current: {
      type: Number,
      required: true
    },
    limit: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      default: ''
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    showWarning: {
      type: Boolean,
      default: true
    }
  },
  setup (props) {
    const { t: $t } = useI18n()

    const progress = computed(() => {
      if (props.limit === 0) return 0
      return Math.min(props.current / props.limit, 1)
    })

    const progressColor = computed(() => {
      if (progress.value >= 1) return 'negative'
      if (progress.value >= 0.8) return 'warning'
      return 'positive'
    })

    const warningMessage = computed(() => {
      if (props.current >= props.limit) {
        return $t('LimitReached', {}, 'Limit reached')
      }
      if (props.current >= props.limit * 0.8) {
        return $t('ApproachingLimit', {}, 'Approaching limit')
      }
      return ''
    })
    
    return {
      progress,
      progressColor,
      warningMessage,
      getDarkModeClass
    }
  }
}
</script>

<style scoped>
.limit-indicator {
  width: 100%;
}

.limit-progress {
  flex: 1;
  max-width: 100px;
}
</style>

