<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
        <!-- Skeleton loader -->
        <div v-if="isLoading" class="q-px-lg q-pt-md">
            <div class="row justify-between items-center q-mb-md">
                <q-skeleton type="rect" width="150px" height="36px" style="border-radius: 18px;" />
                <q-skeleton type="rect" width="170px" height="36px" style="border-radius: 18px;" />
            </div>
            
            <div v-for="n in 4" :key="'skel-'+n" class="app-row q-mb-sm" :class="getDarkModeClass(darkMode)">
                <div class="app-info">
                    <q-skeleton type="text" width="50%" height="16px" class="q-mb-xs" />
                    <q-skeleton type="text" width="70%" height="12px" class="q-mb-xs" />
                    <q-skeleton type="rect" width="140px" height="4px" style="border-radius: 2px;" />
                </div>
                <div class="app-row-end">
                    <q-skeleton type="rect" width="60px" height="22px" style="border-radius: 10px;" />
                </div>
            </div>
        </div>

        <!-- Content -->
        <div v-else>
            <q-pull-to-refresh @refresh="refresh">
                <div class="q-px-lg">
                    <!-- Empty state (existing, unchanged) -->
                    <div v-if="!hasSession" class="text-center q-mt-lg q-pt-lg">
                        <q-icon name="mdi-timer-off" size="75px" class="q-my-md" color="grey"/>
                        <p :class="{ 'text-black': !darkMode }">{{ $t('NoSessionsToDisplay') }}</p>
                        <div class="text-italic text-grey q-pb-md" v-html="$t('CreateSessionDescription')"></div>
                        <q-btn rounded outline no-caps label="Buy Session" :color="themeColor" icon="mdi-timer"
                            @click="$router.replace({ name: 'ai-admin-buy-form' })" />

                        <div class="q-pt-sm">
                            <q-btn 
                            rounded
                            outline
                            no-caps 
                            label="Paytaca AI URL" 
                            icon="content_copy" 
                            :color="themeColor"
                            @click="copyBaseUrl()" />
                        </div>
                    </div>

                    <!-- Session list -->
                    <div v-else>
                        <div class="row justify-between items-center q-pt-md q-pb-lg">
                            <q-btn rounded outline no-caps label="Buy Session" :color="themeColor" icon="mdi-timer" size="md"
                                @click="$router.replace({ name: 'ai-admin-buy-form' })" />
                            <q-btn 
                                rounded
                                outline
                                no-caps 
                                label="Paytaca AI URL" 
                                icon="content_copy" 
                                :color="themeColor"
                                @click="copyBaseUrl()" 
                            />
                        </div>

                        <div v-for="session in sessions" :key="session.id" class="app-row q-mb-sm" :class="getDarkModeClass(darkMode)" @click="openSessionDetail(session)">
                            <div class="app-info">
                                <div class="app-name row items-center cursor-pointer" :class="getDarkModeClass(darkMode)"
                                    @click.stop="copyText(session.display_name, 'Model Name')">
                                    {{ session.display_name }}
                                    <q-icon name="content_copy" size="14px" class="q-ml-xs" :color="darkMode ? 'grey-5' : 'grey-7'" />
                                </div>
                                <div class="app-desc q-pt-xs" :class="getDarkModeClass(darkMode)">
                                    {{ formatTimeUsed(session.time_used_seconds) }} / {{ formatTimeUsed(session.time_credits_seconds) }} used
                                </div>
                                <q-linear-progress
                                    :value="getProgress(session)"
                                    :color="session.status === 'active' ? themeColor : 'grey'"
                                    size="4px"
                                    class="q-mt-xs rounded-borders"
                                    style="max-width: 200px;"
                                />
                                <div class="app-desc q-mt-xs" :class="getDarkModeClass(darkMode)">
                                    {{ formatDate(session.created_at) }}
                                </div>
                                <div class="row items-center q-gutter-xs q-mt-xs">
                                    <q-icon name="content_copy" size="14px" class="cursor-pointer" :color="darkMode ? 'grey-5' : 'grey-7'"
                                        @click.stop="copyText(session.model_id, 'Model ID')" />
                                    <span class="app-desc text-monospace cursor-pointer" :class="getDarkModeClass(darkMode)"
                                        @click.stop="copyText(session.model_id, 'Model ID')">{{ session.model_id }}</span>
                                </div>
                            </div>
                            <div class="app-row-end">
                                <q-badge rounded outline :color="statusColor(session.status)" :label="session.status" />
                            </div>
                        </div>

                        <!-- See more -->
                        <div v-if="hasMorePages" class="text-center q-py-sm">
                            <q-btn flat no-caps size="18px" class="text-bold" label="See more" :color="themeColor"
                                :loading="loadingMore" :disable="loadingMore" @click="loadMore" />
                        </div>
                    </div>
                </div>
            </q-pull-to-refresh>

            <SessionDetailsDialog
                v-if="showSessionDetailDialog"
                :session-id="selectedSessionId"
                @hide="showSessionDetailDialog = false"
            />
        </div>
    </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import { formatDistanceToNow } from 'date-fns'
import { bus } from 'src/wallet/event-bus.js'
import { copyToClipboard } from 'quasar'
import SessionDetailsDialog from 'src/components/ai-admin/session-details-dialog.vue'


export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            sessions: [],
            isLoading: true,
            currentPage: 1,
            pageSize: 20,
            totalCount: 0,
            loadingMore: false,
            showSessionDetailDialog: false,
            selectedSessionId: null
        }
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
        hasSession () {
            return this.sessions.length > 0
        },
        hasMorePages () {
            return this.sessions.length < this.totalCount
        }
    },
    components: {
        SessionDetailsDialog
    },
    async mounted () {
        bus.emit('ai-admin:loading', true)
        await this.fetchSessions(true)
        bus.emit('ai-admin:loading', false)
    },
    methods: {
        getDarkModeClass,
        async refresh (done) {
            bus.emit('ai-admin:loading', true)
            await this.fetchSessions(true)
            bus.emit('ai-admin:loading', false)
            if (typeof done === 'function') done()
        },
        async fetchSessions (overwrite = false) {
            const vm = this
            if (overwrite) {
                vm.currentPage = 1
                vm.isLoading = true
            } else {
                vm.loadingMore = true
            }

            const result = await AIAdminUtils.fetchSessions({
                page: vm.currentPage,
                pageSize: vm.pageSize
            })

            if (result.success && result.data) {
                if (overwrite) {
                    vm.sessions = result.data.data || []
                } else {
                    vm.sessions = [...vm.sessions, ...(result.data.data || [])]
                }
                vm.totalCount = result.data.count || 0
            } else if (result.error) {
                const errorMsg = result.error || 'Failed to fetch sessions'
                vm.$q.notify({ type: 'negative', message: result.error, timeout: 5000 })
                bus.emit('ai-admin:error', errorMsg)
            }

            vm.isLoading = false
            vm.loadingMore = false
        },
        async loadMore () {
            if (!this.hasMorePages || this.loadingMore) return
            this.currentPage++
            await this.fetchSessions(false)
        },
        formatTimeUsed (seconds) {
            const mins = Math.floor(seconds / 60)
            const secs = seconds % 60
            return `${mins}:${String(secs).padStart(2, '0')}`
        },
        getProgress (session) {
            if (!session.time_credits_seconds) return 0
            return session.time_used_seconds / session.time_credits_seconds
        },
        statusColor (status) {
            const map = { active: 'green', exhausted: 'orange', expired: 'grey' }
            return map[status] || 'grey'
        },
        formatDate (dateStr) {
            try {
                return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
            } catch {
                return dateStr
            }
        },
        openSessionDetail (session) {
            this.selectedSessionId = session.id
            this.showSessionDetailDialog = true
        },
        copyBaseUrl () {
            const baseUrl = process.env.PAYTACA_AI_API || ''
            if (!baseUrl) {
                this.$q.notify({ type: 'warning', message: 'Base URL not configured', timeout: 3000 })
                return
            }
            copyToClipboard(baseUrl)
            this.$q.notify({
                color: 'green',
                message: this.$t('CopiedToClipboard'),
                icon: 'mdi-clipboard-check',
                timeout: 2000
            })
        },
    copyText (text, label) {
        if (!text) return
        copyToClipboard(text)
        this.$q.notify({
            color: 'green',
            message: `${label} copied`,
            icon: 'mdi-clipboard-check',
            timeout: 2000
        })
    },
    }
}
</script>

<style lang="scss" scoped>
/* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }

  .app-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 10px;
    transition: background 0.15s ease;
    position: relative;
    -webkit-user-select: none;
    user-select: none;
    border-radius: 10px;

    &.dark {
      background: rgba(255,255,255,0.03);
    }
    &.light {
      background: rgba(0,0,0,0.025);
    }
    &.app-inactive {
      cursor: default;
      .app-name, .app-desc { opacity: 0.35; }
    }
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
    &.dark { color: #ffffff; }
    &.light { color: #000000; }
}

.app-desc {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    &.dark { color: rgba(255,255,255,0.75); }
    &.light { color: rgba(0,0,0,0.65); }
}

.app-row-end {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
}
</style>