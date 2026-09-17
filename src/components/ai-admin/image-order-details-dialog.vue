<template>
    <q-dialog ref="dialog" v-model="showDialog" @hide="$emit('hide')" @show="fetchDetails">
        <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)" style="width: 100%; max-width: 400px;">
            <!-- Header -->
            <q-card-section class="row items-center q-pb-none" :class="getDarkModeClass(darkMode)">
                <div class="text-h6 text-bold">Order Details</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <!-- Loading -->
            <div v-if="isLoading" class="text-center q-pa-lg">
                <q-spinner :color="themeColor" size="36px" />
            </div>

            <!-- Detail content -->
            <q-card-section v-else-if="order" :class="getDarkModeClass(darkMode)">
                <!-- Model + Status -->
                <div class="row justify-between items-center q-mb-sm">
                    <div class="text-bold text-subtitle1">{{ order.model_display_name }}</div>
                    <q-badge rounded outline :color="statusColor(order.status)" :label="statusLabel(order.status)" />
                </div>

                <!-- Prompt -->
                <div class="q-mb-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ order.prompt }}
                </div>

                <q-separator :color="darkMode ? 'grey-7' : 'grey-4'" class="q-my-md" />

                <!-- Price -->
                <div v-if="order.price_sats" class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">Price</span>
                    <div class="text-right">
                        <div :class="darkMode ? 'text-white' : ''">{{ formatBch(order.price_sats) }} BCH</div>
                        <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">
                            {{ formatBchFiat(order.price_sats) }}
                        </div>
                    </div>
                </div>

                <!-- Date (show completed_at if present, else created_at) -->
                <div class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">Date</span>
                    <span class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-6'">
                        {{ formatDate(order.completed_at || order.created_at) }}
                    </span>
                </div>

                <!-- Refund TX -->
                <div v-if="order.settlement_txid" class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Refund TX</span>
                    <span class="text-caption text-monospace" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                        {{ order.settlement_txid }}
                    </span>
                </div>

                <!-- Error -->
                <div v-if="order.error" class="row justify-between items-center">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Error</span>
                    <span class="text-caption text-negative">{{ order.error }}</span>
                </div>
            </q-card-section>
        </q-card>
    </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import { formatDistanceToNow } from 'date-fns'
import { satoshiToBch } from 'src/exchange'
import { parseFiatCurrency } from 'src/utils/denomination-utils'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            showDialog: false,
            isLoading: true,
            localImage: null,
            localMedia: null
        }
    },
    props: {
        orderId: { type: String, required: true },
        order: { type: Object, default: null }
    },
    computed: {
        theme () {
            return this.$store.getters['global/theme']
        },
        themeColor () {
            const themeMap = {
                'glassmorphic-blue': 'blue-6',
                'glassmorphic-green': 'green-6',
                'glassmorphic-gold': 'orange-6',
                'glassmorphic-red': 'pink-6'
            }
            return themeMap[this.theme] || 'blue-6'
        },
        selectedCurrency () {
            return this.$store.getters['market/selectedCurrency']?.symbol || 'USD'
        },
        bchMarketPrice () {
            return this.$store.getters['market/getAssetPrice']('bch', this.selectedCurrency)
        },
    },
    emits: ['hide'],
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
            try {
                return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
            } catch {
                return dateStr
            }
        },
        async fetchDetails () {
            this.isLoading = true
            this.localImage = null
            this.localMedia = null

            // Fetch image if status is completed
            if (this.order?.status === 'completed') {
                const result = await AIAdminUtils.getImageStatus(this.orderId)
                if (result.success && result.data?.image) {
                    this.localImage = result.data.image
                    this.localMedia = result.data.media_type
                }
            }

            this.isLoading = false
        },
        show () {
            this.showDialog = true
        },
        hide () {
            this.showDialog = false
        },
        formatBch (sats) {
            if (!sats && sats !== 0) return '0'
            return satoshiToBch(sats).toFixed(8).replace(/\.?0+$/, '')
        },
        formatBchFiat (sats) {
            if (!sats || !this.bchMarketPrice) return ''
            const bchAmount = satoshiToBch(sats)
            const fiatAmount = bchAmount * this.bchMarketPrice
            return parseFiatCurrency(fiatAmount, this.selectedCurrency)
        },
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