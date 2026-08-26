<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">   
        <div class="row justify-end q-px-lg q-pt-md" v-if="hasAPIKeys">
            <q-btn rounded outline no-caps label="New API Key" :color="themeColor" icon="key"/>
        </div>

        <!-- Key List -->
        <div class="q-pt-lg">
            <div class="text-center q-mt-lg" v-if="!hasAPIKeys">
                <q-icon name="key_off" size="75px" class="q-my-md" color="grey"/> 
                <!-- <q-im  g class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" /> -->
                <p :class="{ 'text-black': !darkMode }">{{ $t('NoAPIKeysToDisplay') }}</p>

                <div class="text-italic text-grey q-pb-md">
                    Create an API key to use Paytaca AI <br>in any coding agent. 
                </div>

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

            <div v-else>
                <!-- List Here -->
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
            openCreateKeyDialog: false
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
            console.log('has api keys:' + hasAPIKeys)
        } else {
            console.log('empty')
        }
    },
    methods: {
        getDarkModeClass,
        createAPIKey() {
            const vm = this

            vm.openCreateKeyDialog = true
        }
    }
}
</script>

<style lang="scss" scoped>

</style>