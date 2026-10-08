<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
        <!-- Loading State -->
        <div v-if="isLoading" class="q-px-lg q-pt-md">
            <!-- Button skeleton -->
            <div class="row justify-between items-center q-pb-md">
                <q-skeleton type="rect" width="160px" height="36px" style="border-radius: 18px;" />
            </div>

            <!-- Order card skeletons -->
            <div v-for="n in 4" :key="'skel-'+n" class="app-row q-mb-sm" :class="getDarkModeClass(darkMode)">
                <div class="app-info">
                    <q-skeleton type="text" width="50%" height="16px" class="q-mb-xs" />
                    <q-skeleton type="text" width="70%" height="12px" class="q-mb-xs" />
                    <q-skeleton type="text" width="40%" height="12px" />
                </div>
                <div class="app-row-end">
                    <q-skeleton type="rect" width="60px" height="22px" style="border-radius: 10px;" />
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="orders.length === 0" class="text-center q-mt-lg q-pt-lg">
            <q-icon name="hide_image" size="75px" class="q-my-md" color="grey" />
            <div class="text-italic text-grey q-pb-md">{{ $t('NoImageToDisplay') }}</div>
            <q-btn
                rounded outline no-caps
                label="Generate Image"
                :color="themeColor"
                icon="add"
                @click="$router.push({ name: 'ai-admin-image-generate' })"
            />
        </div>

        <!-- Populated State -->
        <div v-else>
            <q-pull-to-refresh @refresh="refresh">
                <div class="q-px-lg">
                    <div class="row justify-between items-center q-pt-md q-pb-lg">
                        <q-btn
                            rounded outline no-caps
                            label="Generate Image"
                            :color="themeColor"
                            icon="add"
                            size="md"
                            @click="$router.push({ name: 'ai-admin-image-generate' })"
                        />
                    </div>

                    <div v-for="order in orders" :key="order.id" class="app-row q-mb-sm" :class="getDarkModeClass(darkMode)" @click="openOrderDetail(order)">
                        <div class="app-info order-item">
                            <!-- Status badge (absolute top-right) -->
                            <q-badge rounded outline :color="statusColor(order.status)" :label="statusLabel(order.status)" class="order-status-badge" />

                            <!-- Model display name (wraps below badge) -->
                            <div class="app-name text-bold" :class="getDarkModeClass(darkMode)">
                                {{ order.model_display_name || order.model }}
                            </div>
                            <!-- Prompt -->
                            <div class="app-desc q-pt-xs" :class="getDarkModeClass(darkMode)">
                                {{ order.prompt }}
                            </div>
                            <!-- Date -->
                            <div class="app-desc q-mt-xs" :class="getDarkModeClass(darkMode)">
                                {{ formatDate(order.completed_at || order.created_at) }}
                            </div>
                        </div>
                    </div>

                    <!-- See More -->
                    <div v-if="hasMorePages" class="text-center q-py-sm">
                        <q-btn flat no-caps size="18px" class="text-bold" label="See more" :color="themeColor"
                            :loading="loadingMore" :disable="loadingMore" @click="loadMore" />
                    </div>
                </div>
            </q-pull-to-refresh>
        </div>

        <!-- Order Detail Dialog -->
        <ImageOrderDetailsDialog
            v-if="selectedOrderId"
            ref="orderDetailDialog"
            :order-id="selectedOrderId"
            :order="selectedOrder"
            @hide="selectedOrder = null; selectedOrderId = null"
        />
    </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import ImageOrderDetailsDialog from 'src/components/ai-admin/image-order-details-dialog.vue'
import { formatDistanceToNow } from 'date-fns'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            orders: [],
            isLoading: true,
            currentPage: 1,
            pageSize: 10,
            totalCount: 0,
            loadingMore: false,
            selectedOrderId: null,
            selectedOrder: null
        }
    },
    components: {
        ImageOrderDetailsDialog
    },
    computed: {
        themeColor () {
            const theme = this.$store.getters['global/theme']
            const themeMap = {
                'glassmorphic-blue': 'blue',
                'glassmorphic-green': 'green',
                'glassmorphic-gold': 'orange',
                'glassmorphic-red': 'red'
            }

            return themeMap[theme] || 'blue'
        },
        hasMorePages () {
            return this.orders.length < this.totalCount
        }
    },
    async mounted () {
        await this.fetchOrders(true)
    },
    methods: {
        getDarkModeClass,
        // formatDate (dateStr) {
        //     if (!dateStr) return ''
        //     const date = new Date(dateStr)
            
        //     return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        // },
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
        async fetchOrders (overwrite = false) {
            const vm = this
            if (overwrite) {
                vm.currentPage = 1
                vm.isLoading = true
            } else {
                vm.loadingMore = true
            }

            const result = await AIAdminUtils.fetchImageOrders({
                page: vm.currentPage,
                pageSize: vm.pageSize
            })

            if (result.success && result.data) {
                if (overwrite) {
                vm.orders = result.data.data || []
                } else {
                vm.orders = [...vm.orders, ...(result.data.data || [])]
                }
                vm.totalCount = result.data.count || 0
            } else if (result.error) {
                vm.$q.notify({ type: 'negative', message: result.error, timeout: 5000 })
            }

            vm.isLoading = false
            vm.loadingMore = false
        },
        async loadMore () {
            if (!this.hasMorePages || this.loadingMore) return
            this.currentPage++
            await this.fetchOrders(false)
        },
        async refresh (done) {
            bus.emit('ai-admin:loading', true)
            await this.fetchOrders(true)
            bus.emit('ai-admin:loading', false)
            if (typeof done === 'function') done()
        },
        openOrderDetail (order) {
            this.selectedOrder = order
            this.selectedOrderId = order.id
            this.$nextTick(() => {
                this.$refs.orderDetailDialog.show()
            })
        },
        formatDate (dateStr) {
            try {
                return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
            } catch {
                return dateStr
            }
        },    
    },
}
</script>

<style lang="scss" scoped>
.app-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 10px;
  border-radius: 10px;
  &.dark { background: rgba(255,255,255,0.03); }
  &.light { background: rgba(0,0,0,0.025); }
}

.app-info {
  flex: 1;
  min-width: 0;
}

.app-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-desc {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  margin-top: 2px;
}

.app-row-end {
  flex-shrink: 0;
}

.order-item {
    position: relative;
    padding-right: 80px; // space for the badge
}

.order-status-badge {
    position: absolute;
    top: 0;
    right: 0;
}
</style>