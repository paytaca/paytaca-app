<template>
  <q-dialog full-width no-shake position="bottom" v-model="showDialog" @before-hide="$emit('back')">
    <q-card class="br-15 q-pt-sm text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <div class="row justify-center q-pt-md">
        <div class="text-weight-bold lg-font-size">{{ $t('ReportUser') }}</div>
      </div>
      <div class="q-pa-md">
        <div class="text-sm q-mb-md">{{ $t('ReportUserSelectReason') }}</div>
        <q-list>
          <q-item
            v-for="reason in reasons"
            :key="reason.value"
            tag="label"
            clickable
            v-ripple
          >
            <q-item-section side>
              <q-radio v-model="selectedReason" :val="reason.value" color="red-8" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ reason.label }}</q-item-label>
              <q-item-label caption>{{ reason.description }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div class="row q-mt-md q-gutter-sm">
          <q-btn
            flat
            no-caps
            :label="$t('Cancel')"
            color="grey"
            class="col button"
            v-close-popup
          />
          <q-btn
            no-caps
            :label="$t('Submit')"
            :disable="!selectedReason"
            color="red-8"
            class="col button"
            @click="submit"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ReportDialog',
  emits: ['back', 'submit'],
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      selectedReason: ''
    }
  },
  computed: {
    showDialog: {
      get () { return this.modelValue },
      set (val) { this.$emit('update:modelValue', val) }
    },
    darkMode () {
      return this.$q.dark.isActive
    },
    reasons () {
      return [
        {
          value: 'inactive',
          label: this.$t('ReportReasonInactive'),
          description: this.$t('ReportReasonInactiveDesc')
        },
        {
          value: 'spammer',
          label: this.$t('ReportReasonSpammer'),
          description: this.$t('ReportReasonSpammerDesc')
        },
        {
          value: 'scammer',
          label: this.$t('ReportReasonScammer'),
          description: this.$t('ReportReasonScammerDesc')
        }
      ]
    }
  },
  methods: {
    getDarkModeClass,
    submit () {
      if (this.selectedReason) {
        this.$emit('submit', this.selectedReason)
        this.showDialog = false
      }
    }
  }
}
</script>
