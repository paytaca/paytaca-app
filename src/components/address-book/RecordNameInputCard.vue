<template>
  <q-card flat bordered class="form-card name-card q-my-md">
    <q-card-section class="q-pt-md q-pb-sm">
      <div class="text-subtitle2 text-weight-medium q-mb-sm">
        {{ $t('ContactName') }}
      </div>
      <q-input
        v-model="recordName"
        class="full-width"
        filled
        dense
        :dark="darkMode"
        :placeholder="$t('EnterContactName')"
        :rules="[
          val => Boolean(val) || $t('NameIsRequired'),
        ]"
      />
    </q-card-section>
  </q-card>
</template>

<script>
export default {
  name: 'RecordNameInputCard',

  props: {
    modelValue: { type: String, default: '' }
  },

  emits: ['update:modelValue'],

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },

    recordName: {
      get () {
        return this.modelValue
      },
      set (val) {
        this.$emit('update:modelValue', val)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.form-card {
  border-radius: 5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 4px 5px rgba(0, 0, 0, 0.08);
  }

  .dark & {
    &:hover {
      box-shadow: 0 4px 5px rgba(0, 0, 0, 0.3);
    }
  }
}

.name-card {
  flex-shrink: 0;
}
</style>