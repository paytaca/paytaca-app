<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)"> 
         <!-- Skeleton loader -->
        <div v-if="loading" class="q-mx-lg q-pt-md">
            <!-- Button skeleton -->
            <div class="q-pb-md">
                <q-skeleton type="rect" width="160px" height="36px" style="border-radius: 18px;" />
            </div>

            <!-- Key card skeletons -->

            <div v-for="n in 3" :key="'skel-' + n" class="app-row q-mb-sm" :class="getDarkModeClass(darkMode)">
                <!-- Icon tile skeleton -->
                <q-skeleton type="rect" width="48px" height="48px" style="border-radius: 14px;" />

                <!-- Name + key prefix skeleton -->
                <div class="app-info">
                    <div class="row items-center q-pb-sm no-wrap">
                        <q-skeleton type="text" width="40%" height="16px" />
                    </div>
                    <q-skeleton type="text" width="60%" height="12px" />
                </div>

                <!-- Button skeletons -->
                <div class="app-row-end">
                    <q-skeleton type="rect" width="32px" height="32px" style="border-radius: 16px;" />
                    <q-skeleton type="rect" width="32px" height="32px" style="border-radius: 16px;" />
                </div>
            </div>
        </div>  

        <div v-else>
            <q-pull-to-refresh @refresh="refresh">
                <div class="row q-px-lg q-pt-md" v-if="hasAPIKeys">
                    <q-btn rounded outline no-caps label="New API Key" :color="themeColor" icon="key" @click="createAPIKey()"/>
                </div>

                <!-- Key List -->
                <div class="q-pt-lg">
                    <div class="text-center q-mt-lg" v-if="!hasAPIKeys">
                        <q-icon name="key_off" size="75px" class="q-my-md" color="grey"/> 
                        <!-- <q-im  g class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" /> -->
                        <p :class="{ 'text-black': !darkMode }">{{ $t('NoAPIKeysToDisplay') }}</p>

                        <div class="text-italic text-grey q-pb-md" v-html="$t('CreateAPIKeyDescription')"></div>

                        <q-btn 
                            rounded 
                            outline 
                            no-caps 
                            label="New API Key" 
                            :color="themeColor" 
                            icon="key"
                            @click="createAPIKey()"
                        />
                    </div>

                    <div v-else class="q-mx-lg">
                        <!-- List Here -->
                        <div v-for="key in APIKeys" :key="key.id" class="app-row q-mb-sm" :class="[getDarkModeClass(darkMode), { 'key-not-local': !key.hasLocalCopy }]">
                            <!-- Icon -->
                            <div class="app-icon-tile" :class="getDarkModeClass(darkMode)">
                                <q-icon size="26px" :color="themeColor" name="key" />
                            </div>

                            <!-- Name / Description -->
                            <div class="app-info">
                                <!-- Editing mode -->
                                <div v-if="editKeyId === key.id" class="row items-center q-pb-sm no-wrap">
                                    <q-input
                                        v-model="editName"
                                        dense
                                        outlined
                                        class="col q-mr-xs"
                                        input-class="text-bold"
                                        @keyup.enter="saveEdit(key)"
                                        @keyup.escape="cancelEdit"
                                        autofocus
                                    />
                                    <q-btn flat round dense icon="check" size="sm" :color="themeColor" @click.stop="saveEdit(key)" />
                                    <q-btn flat round dense icon="close" size="sm" color="red" @click.stop="cancelEdit" />
                                </div>

                                <!-- Display mode -->
                                <div v-else class="row items-center q-pb-sm no-wrap">
                                    <div class="app-name text-truncate" :class="getDarkModeClass(darkMode)">{{ key.name }}</div>
                                    <q-btn flat round dense icon="edit" size="sm" class="q-ml-xs" :color="themeColor" @click.stop="startEdit(key)" />
                                </div>

                                <div class="app-desc" :class="getDarkModeClass(darkMode)">{{ key.key_prefix }}</div>
                                <div v-if="!key.hasLocalCopy" class="text-caption text-amber q-mt-xs">
                                    <q-icon name="info_outline" size="12px" class="q-mr-xs"/>
                                    Not available on this device. Create a new key to copy.
                                </div>
                            </div>

                            <div class="app-row-end">
                                <q-btn 
                                    outline 
                                    rounded 
                                    padding="sm" 
                                    icon="content_copy" 
                                    size="sm" 
                                    :color="darkMode ? 'white' : 'blue-grey-8'" 
                                    @click.stop="copyKey(key.id)" 
                                    :disable="!key.hasLocalCopy"
                                />
                                <q-btn 
                                    outline 
                                    rounded 
                                    padding="sm" 
                                    icon="mdi-lock-off"
                                    size="sm" 
                                    :color="darkMode ? 'white' : 'blue-grey-8'" 
                                    @click.stop="confirmRevoke(key)" />
                            </div>

                        </div>

                        <!-- add button if there are more items to load -->
                        <div v-if="hasMorePages" class="text-center q-py-sm">
                            <q-btn
                                flat
                                no-caps
                                size="18px"
                                class="text-bold"
                                label="See more"
                                :color="themeColor"
                                :loading="loadingMore"
                                :disable="loadingMore"
                                @click="loadMore"
                            />
                        </div>
                    </div>
                </div>
            </q-pull-to-refresh>
        </div>
    </div>

    <CreateKeyDialog v-if="openCreateKeyDialog" @hide="openCreateKeyDialog = false" @key-created="refresh()"/>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { copyToClipboard } from 'quasar'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'
import CreateKeyDialog from 'src/components/ai-admin/create-key-dialog.vue'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            APIKeys: [],
            openCreateKeyDialog: false,
            loadingMore: false,
            page: 1,
            loading: false,
            totalCount: 0,
            pageSize: 10,
            editKeyId: null,
            editName: ''
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
        themeColorHex () {
            const themeMap = {
                'glassmorphic-blue': '#42a5f5',
                'glassmorphic-green': '#4caf50',
                'glassmorphic-gold': '#ffa726',
                'glassmorphic-red': '#f54270'
            }
            return themeMap[this.theme] || '#42a5f5'
        },
        hasAPIKeys () {
            return this.APIKeys.length > 0
            // return true
        },
        hasMorePages () {
            return this.totalCount > this.page * this.pageSize
        }
    },
    components: {
        CreateKeyDialog
    },
    async mounted () {
        const vm = this
        bus.emit('ai-admin:loading', true)
        vm.loading = true
        console.log('ai admin keys')
        await vm.fetchKeys(true)
        vm.loading = false
        bus.emit('ai-admin:loading', false)
    },
    methods: {
        getDarkModeClass,
        createAPIKey() {
            const vm = this

            vm.openCreateKeyDialog = true
        },
        async loadMore () {
            this.loadingMore = true
            this.page++
            await this.fetchKeys(false)
            this.loadingMore = false
        },
        async fetchKeys (overwrite = false) {
            const vm = this
            const serverResult = await AIAdminUtils.fetchAPIKeys({ page: vm.page, pageSize: vm.pageSize })
            const localKeys = await AIAdminUtils.getApiKeys()

            if (serverResult.success && Array.isArray(serverResult.data?.data)) {
                vm.totalCount = serverResult.data.count || 0
                const keys = serverResult.data.data.map(key => ({
                    ...key,
                    hasLocalCopy: localKeys.some(local => local.id === key.id)
                }))

                if (overwrite) {
                    vm.APIKeys = keys
                } else {
                    vm.APIKeys.push(...keys)
                }
            } else {
                vm.APIKeys = []
                vm.totalCount = 0
                console.error('Failed to fetch API keys:', serverResult.error)
            }
        },
        async refresh (done) {
            this.loading = true
            this.page = 1
            await this.fetchKeys(true)
            this.loading = false

            if (typeof done === 'function') done()
        },
        async onKeyDialogHide () {
            this.openCreateKeyDialog = false
            await this.fetchKeys(true)
        },
        async copyKey (keyId) {
            const fullKey = await AIAdminUtils.getApiKeyById(keyId)
            if (!fullKey) {
                this.$q.notify({ type: 'warning', message: 'Key not available on this device', timeout: 3000 })
                return
            }
            copyToClipboard(fullKey)
            this.$q.notify({
                color: 'green',
                message: this.$t('CopiedToClipboard'),
                icon: 'mdi-clipboard-check',
                timeout: 2000
            })
        },
        confirmRevoke (key) {
            this.$q.dialog({
                title: 'Revoke API Key',
                message: `Are you sure you want to revoke "${key.name}"? This action cannot be undone.`,
                cancel: { label: 'Cancel', flat: true, noCaps: true },
                ok: { label: 'Revoke', color: 'red', flat: true, noCaps: true },
                persistent: true
            }).onOk(async () => {
                const result = await AIAdminUtils.revokeAPIKey(key.id)
                if (result.success) {
                    this.loading = true
                    this.$q.notify({ type: 'positive', message: 'API Key revoked', timeout: 2000 })
                    await this.fetchKeys(true)
                    this.loading = false
                } else {
                    this.$q.notify({ type: 'negative', message: result.error || 'Failed to revoke key', timeout: 5000 })
                }
            })
        },
        startEdit (key) {
            this.editKeyId = key.id
            this.editName = key.name
        },
        cancelEdit () {
            this.editKeyId = null
            this.editName = ''
        },
        async saveEdit (key) {
            if (!this.editName.trim()) {
                this.$q.notify({ type: 'warning', message: 'Name cannot be empty', timeout: 3000 })
                return
            }
            const result = await AIAdminUtils.updateAPIKey(key.id, this.editName.trim())
            if (result.success) {
                // Update local copy if it exists
                await AIAdminUtils.updateKeyName(key.id, this.editName.trim())
                key.name = this.editName.trim()
                this.$q.notify({ type: 'positive', message: 'Key name updated', timeout: 2000 })
            } else {
                this.$q.notify({ type: 'negative', message: result.error || 'Failed to update name', timeout: 5000 })
            }
            this.editKeyId = null
            this.editName = ''
        }
    }
}
</script>

<style lang="scss" scoped>
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

.app-icon-tile {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    -webkit-touch-callout: none;
    &.tile-inactive { filter: grayscale(1) opacity(0.4); }

    &.dark {
        background: rgba(255, 255, 255, 0.03);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    &.light {
        background: rgba(0, 0, 0, 0.03);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
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

.app-chevron {
    &.dark { color: rgba(255,255,255,0.3); }
    &.light { color: rgba(0,0,0,0.25); }
}

.clickable-icon {
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    transition: background 0.15s ease;
    &:active { background: rgba(0,0,0,0.08); }
    &.dark {
        &:active { background: rgba(255,255,255,0.1); }
    }
}

.key-not-local {
    opacity: 0.6;
}
</style>