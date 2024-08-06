<template>
    <q-dialog v-model="showDialog" full-width position="bottom" @before-hide="$emit('back')">
        <q-card class="br-15 q-pa-md q-ma-sm text-bow" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
            <div class="q-mt-md q-mx-md" style="overflow: auto">
                <div class="row justify-center q-mb-lg" style="font-size: medium;">Order No. {{ statusHistory?.[0]?.order }} Status History</div>
                <q-separator class="q-my-sm" :dark="darkMode"/>
                <div v-for="(status, index) in statusHistory" :key="index" class="sm-font-size q-pb-sm">
                    <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                    <div class="row justify-between no-wrap q-mx-lg">
                    <span class="col">{{ formatOrderStatus(status.status) }}</span>
                    <span class="col text-nowrap q-ml-xs">
                        {{ formatDate(status.created_at) }}
                    </span>
                    </div>
                </div>
                <q-separator class="q-my-sm" :dark="darkMode"/>
            </div>
        </q-card>
    </q-dialog>
</template>
<script>
import { formatOrderStatus, formatDate } from 'src/exchange'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true
    }
  },
  emits: ['back'],
  props: {
    statusHistory: Array
  },
  methods: {
    formatOrderStatus,
    formatDate
  }
}
</script>
src/exchange