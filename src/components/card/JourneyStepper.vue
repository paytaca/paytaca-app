<template>
  <div class="journey-steps full-width q-mb-md">
    <div class="text-subtitle1 text-weight-bold text-center q-mb-sm" :class="textColorClass">
      {{ title }}
    </div>

    <div class="journey-card q-pa-sm"
      :class="isDark ? 'journey-card-dark' : 'journey-card-light'">
      <div class="steps-row">
        <div class="steps-track" :style="trackStyle"></div>
        <div class="row no-wrap items-start justify-between steps-items">
          <div v-for="(step, index) in steps" :key="index"
            class="step-item column items-center"
            :style="{ width: `${100 / steps.length}%` }">
            <div class="step-indicator" :class="[step.status, isDark ? 'step-dark' : 'step-light']">
              <q-icon :name="step.status === 'done' ? 'check' : step.icon" size="18px" />
            </div>
            <div class="step-label text-center q-mt-xs" :class="'step-label-' + step.status">
              <div class="text-caption text-weight-bold">{{ step.label }}</div>
            </div>
            <div v-if="index < steps.length - 1" class="step-connector"
              :class="step.status === 'done' ? 'connector-done' : 'connector-pending'"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JourneyStepper',
  props: {
    steps: {
      type: Array,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    isDark: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    textColorClass() {
      return this.isDark ? 'text-white' : 'text-dark'
    },
    progressPercent() {
      const steps = this.steps
      const total = steps.length - 1
      let filled = 0
      for (let i = 0; i < total; i++) {
        if (steps[i].status === 'done') {
          filled++
        } else if (steps[i].status === 'active') {
          filled += 0.5
          break
        } else {
          break
        }
      }
      return (filled / total) * 100
    },
    trackStyle() {
      const pct = this.progressPercent
      return {
        background: `linear-gradient(to right, var(--q-primary) 0%, var(--q-primary) ${pct}%, rgba(128, 128, 128, 0.15) ${pct}%, rgba(128, 128, 128, 0.15) 100%)`
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// ====== Journey Steps ======
.journey-steps {
  max-width: 100%;
}

.journey-card-light {
  background: transparent;
}

.journey-card-dark {
  background: transparent;
}

.steps-row {
  position: relative;
}

.steps-items {
  position: relative;
  z-index: 1;
}

.step-item {
  position: relative;
  flex-shrink: 0;
}

.step-indicator {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
  position: relative;
}

.step-indicator.active {
  background: var(--q-primary);
  color: white;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--q-primary) 25%, transparent),
              0 4px 12px color-mix(in srgb, var(--q-primary) 30%, transparent);
  transform: scale(1.1);
}

.step-indicator.pending {
  color: rgba(128, 128, 128, 0.5);
}

.step-light.pending {
  background: rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(128, 128, 128, 0.2);
}

.step-dark.pending {
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.12);
}

.step-indicator.done {
  background: var(--q-positive);
  color: white;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--q-positive) 35%, transparent);
}

.step-label {
  transition: all 0.3s ease;
}

.step-label-active {
  color: var(--q-primary);
}

.step-label-pending {
  color: rgba(128, 128, 128, 0.5);
}

.step-label-done {
  color: var(--q-positive);
}

.steps-track {
  position: absolute;
  top: 18px;
  left: calc(12.5% + 18px);
  right: calc(12.5% + 18px);
  height: 3px;
  border-radius: 2px;
  z-index: 0;
  pointer-events: none;
  transition: background 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step-connector {
  position: absolute;
  top: 18px;
  left: 50%;
  width: 100%;
  height: 3px;
  transform: translateX(0);
  z-index: 0;
}

.connector-done {
  background: var(--q-positive);
}

.connector-pending {
  background: rgba(128, 128, 128, 0.15);
}

// ====== Responsive ======
@media (max-width: 599px) {
  .step-indicator {
    width: 32px;
    height: 32px;
  }

  .steps-track {
    top: 16px;
    left: calc(12.5% + 16px);
    right: calc(12.5% + 16px);
  }
}
</style>