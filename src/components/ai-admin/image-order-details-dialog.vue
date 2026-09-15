<template>
  <q-dialog :value="value" @input="$emit('input', $event)" maximized position="bottom">
    <q-card class="full-height" :class="getDarkModeClass(darkMode)">
      <q-toolbar>
        <q-toolbar-title>Order Details</q-toolbar-title>
        <q-btn flat round icon="close" v-close-popup />
      </q-toolbar>

      <q-scroll-area class="full-height">
        <q-card-section v-if="order">
          <!-- Image Preview -->
          <div v-if="order.status === 'completed' && localImage" class="text-center q-mb-md">
            <img :src="'data:' + localMedia + ';base64,' + localImage" class="order-image" />
          </div>

          <!-- Model -->
          <div class="text-subtitle1 text-bold q-mb-xs">{{ order.model }}</div>

          <!-- Prompt -->
          <div class="q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
            {{ order.prompt }}
          </div>

          <!-- Details List -->
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label caption>Status</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge rounded :color="statusColor(order.status)" :label="statusLabel(order.status)" />
              </q-item-section>
            </q-item>

            <q-item v-if="order.price_usd">
              <q-item-section>
                <q-item-label caption>Price</q-item-label>
              </q-item-section>
              <q-item-section side>
                ${{ order.price_usd }} · {{ order.price_sats }} sats
              </q-item-section>
            </q-item>

            <q-item v-if="order.estimated_cost_usd">
              <q-item-section>
                <q-item-label caption>Estimated Cost</q-item-label>
              </q-item-section>
              <q-item-section side>
                ${{ order.estimated_cost_usd }}
              </q-item-section>
            </q-item>

            <q-item v-if="order.actual_cost_usd">
              <q-item-section>
                <q-item-label caption>Actual Cost</q-item-label>
              </q-item-section>
              <q-item-section side>
                ${{ order.actual_cost_usd }}
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label caption>Created</q-item-label>
              </q-item-section>
              <q-item-section side>
                {{ formatDate(order.created_at) }}
              </q-item-section>
            </q-item>

            <q-item v-if="order.completed_at">
              <q-item-section>
                <q-item-label caption>Completed</q-item-label>
              </q-item-section>
              <q-item-section side>
                {{ formatDate(order.completed_at) }}
              </q-item-section>
            </q-item>

            <q-item v-if="order.settlement_txid">
              <q-item-section>
                <q-item-label caption>Refund TX</q-item-label>
              </q-item-section>
              <q-item-section side class="text-caption">
                {{ order.settlement_txid }}
              </q-item-section>
            </q-item>

            <q-item v-if="order.error">
              <q-item-section>
                <q-item-label caption>Error</q-item-label>
              </q-item-section>
              <q-item-section side class="text-negative text-caption">
                {{ order.error }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-scroll-area>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'

export default {
  name: 'ImageOrderDetailDialog',
  props: {
    value: Boolean,
    order: Object
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      localImage: null,
      localMedia: null
    }
  },
  watch: {
    value (val) {
      if (val && this.order) {
        this.fetchDetails()
      }
    }
  },
  methods: {
    getDarkModeClass,
    statusColor (status) {
      const colors = {
        completed: 'positive',
        processing: 'blue',
        pending_payment: 'orange',
        failed: 'negative',
        refunded: 'grey'
      }
      return colors[status] || 'grey'
    },
    statusLabel (status) {
      return status?.replace(/_/g, ' ') || ''
    },
    formatDate (dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
    async fetchDetails () {
      if (!this.order?.id) return

      // Only fetch image if status is completed
      if (this.order.status === 'completed') {
        const result = await AIAdminUtils.getImageStatus(this.order.id)
        if (result.success && result.data?.image) {
          this.localImage = result.data.image
          this.localMedia = result.data.media_type
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.order-image {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 12px;
}
</style>