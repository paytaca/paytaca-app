<template>
    <q-dialog v-model="showDialog" full-width position="bottom" @before-hide="$emit('back')">
        <q-card class="br-15 q-pa-md q-ma-sm text-bow" bordered flat :class="[darkMode ? 'pt-card-2 dark' : 'light']">
            <div class="q-mt-md q-mx-md" style="overflow: auto">
                <div class="row justify-center q-mb-md lg-font-size">Order Status History</div>
                <div v-for="(status, index) in statusHistory" :key="index" class="sm-font-size q-pb-sm">
                  <q-card flat :class="['card', darkMode ? 'dark' : 'light']">
                    <div class="row q-pa-sm">
                      <div class="col q-py-sm q-pl-sm" >{{formatOrderStatus(status.status)}}</div>
                      <div class="col subtext" style="text-align: end">{{ formatDate(status.created_at) }}</div>
                    </div>
                  </q-card>
                </div>
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
<style scoped>
.subtext {
  opacity: .5;
}

.lg-font-size {
  font-size: large;
}

.card.dark {
  background-color: #1c2833;
  color: white;
}

.card.light {
  background-color: #edf4fa;
  color: black
}

</style>
