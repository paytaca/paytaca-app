<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">   
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
                <div v-for="i in 5" :key="i" class="app-row q-mb-sm" :class="getDarkModeClass(darkMode)">
                    <!-- Icon -->
                    <div class="app-icon-tile" :class="getDarkModeClass(darkMode)">
                        <q-icon size="26px" :color="themeColor" name="key" />
                    </div>

                    <!-- Name / Description -->
                    <div class="app-info">
                        <div class="app-name q-pb-sm" :class="getDarkModeClass(darkMode)">Custom Key Name</div>
                        <div class="app-desc" :class="getDarkModeClass(darkMode)">sk-pytc-6a5aee41...</div>
                    </div>

                    <div class="app-row-end">
                        <!-- <span v-if="app.beta" class="app-beta-pill">BETA</span> -->
                        <q-btn outline rounded padding="sm" class="q-mr-xs" icon="edit" size="sm" :color="darkMode ? 'white' : 'blue-grey-8'" @click.stop="" />
                        <q-btn outline rounded padding="sm" icon="mdi-lock-off" size="sm" :color="darkMode ? 'white' : 'blue-grey-8'" @click.stop="" />
                    </div>

                </div>

                <!-- add button if there are more items to load -->
                <div class="text-center q-py-sm">
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
    </div>

    <CreateKeyDialog v-if="openCreateKeyDialog"/>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'

import CreateKeyDialog from 'src/components/ai-admin/create-key-dialog.vue'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            APIKeys: [],
            openCreateKeyDialog: false,
            loadingMore: false 
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
            // return this.APIKeys.length > 0
            return true
        }
    },
    components: {
        CreateKeyDialog
    },
    async mounted () {
        const vm = this
        console.log('ai admin keys')
        vm.APIKeys = await AIAdminUtils.getApiKeys()

        if (vm.APIKeys.length > 0) {
            console.log('has api keys:' + vm.hasAPIKeys)
        } else {
            console.log('empty')
        }
    },
    methods: {
        getDarkModeClass,
        createAPIKey() {
            const vm = this

            vm.openCreateKeyDialog = true
        },
        async loadMore () {
            this.loadingMore = true
            // TODO: replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1500))
            this.loadingMore = false
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
</style>