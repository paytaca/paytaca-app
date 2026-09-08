<template>
    <q-dialog ref="dialog" v-model="showDialog" @hide="$emit('hide')" @show="fetchDetail">
        <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)" style="width: 100%; max-width: 400px;">
            <!-- Header -->
            <q-card-section class="row items-center" :class="getDarkModeClass(darkMode)">
                <div class="text-h6 text-bold">Session Details</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <!-- Loading -->
            <div v-if="isLoading" class="text-center q-pa-lg">
                <q-spinner :color="themeColor" size="36px" />
            </div>

            <!-- Detail content -->
            <q-card-section v-else-if="detail" :class="getDarkModeClass(darkMode)">
                <div class="row justify-between items-center q-mb-sm">
                    <div class="row items-center cursor-pointer" @click="copyText(detail.display_name, 'Model Name')">
                        <span class="text-bold text-subtitle1">{{ detail.display_name }}</span>
                        <q-icon name="content_copy" size="14px" class="q-ml-xs" :color="darkMode ? 'grey-5' : 'grey-7'" />
                    </div>
                    <q-badge rounded outline :color="statusColor(detail.status)" :label="detail.status" />
                </div>

               <div class="row items-center q-gutter-xs cursor-pointer"
                    @click="copyText(detail.model_id, 'Model ID')">
                    <q-icon name="content_copy" size="14px" :color="darkMode ? 'grey-5' : 'grey-7'" />
                    <span class="text-caption text-monospace" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                        {{ detail.model_id }}
                    </span>
                </div>


                <q-separator :color="darkMode ? 'grey-7' : 'grey-4'" class="q-my-md" />

                <div class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Duration</span>
                    <span :class="darkMode ? 'text-white' : ''">{{ detail.duration_minutes }} min</span>
                </div>

                <div class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Time Credits Used</span>
                    <span :class="darkMode ? 'text-white' : ''">
                        {{ formatTimeUsed(detail.time_used_seconds) }} / {{ formatTimeUsed(detail.time_credits_seconds) }}
                    </span>
                </div>

                <div class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Requests</span>
                    <span :class="darkMode ? 'text-white' : ''">{{ detail.total_requests ?? '—' }}</span>
                </div>

                <div class="row justify-between items-center q-mb-sm">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Tokens Used</span>
                    <span :class="darkMode ? 'text-white' : ''">{{ detail.total_tokens ?? '—' }}</span>
                </div>

                <div class="row justify-between items-center">
                    <span class="text-weight-bold" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">Created</span>
                    <span class="text-caption" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                        {{ formatDate(detail.created_at) }}
                    </span>
                </div>
            </q-card-section>

            <!-- Progress bar at bottom -->
            <q-card-section v-if="detail" :class="getDarkModeClass(darkMode)" class="q-pt-sm">
                <div class="text-caption q-mb-xs" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">
                    Time Credits: {{ formatTimeUsed(detail.time_remaining_seconds) }} remaining
                </div>
                <q-linear-progress
                    :value="getProgress(detail)"
                    :color="detail.status === 'active' ? themeColor : 'grey'"
                    size="8px"
                    rounded
                />
            </q-card-section>
        </q-card>
    </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import { formatDistanceToNow } from 'date-fns'
import { copyToClipboard } from 'quasar'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            showDialog: true,
            isLoading: false,
            detail: null

        }
    },
    props: {
        sessionId: { type: String, required: true }
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
        }

    },
    emits: ['hide'],
    methods: {
        getDarkModeClass,
        async fetchDetail () {
            this.isLoading = true
            const result = await AIAdminUtils.fetchSessionDetails(this.sessionId)
            if (result.success && result.data) {
                this.detail = result.data
            } else if (result.error) {
                this.$q.notify({ type: 'negative', message: result.error, timeout: 5000 })
                this.$refs.dialog.hide()
            }
            this.isLoading = false
        },
        formatTimeUsed (seconds) {
            if (seconds == null) return '0:00'
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
            } catch (e) {
                return dateStr
            }
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