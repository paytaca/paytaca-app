<template>
    <q-dialog ref="dialog" full-width persistent v-model="showCreateKeyDialog" @hide="$emit('hide')">
        <q-card class="q-pa-md br-15 pt-card text-bow text-center">

            <div v-if="generating">
                <div class="row justify-center q-pb-md" >
                    <q-spinner :color="themeColor" size="75px" :thickness="5"/>
                </div>

                Generating API Keys
            </div>

            <div v-else>
                <!-- Close button -->
                <div class="row justify-end">
                    <q-btn flat round dense color="red" icon="close" v-close-popup />
                </div>


                <!-- To Generate Key -->
                 <div v-if="!keyGenerated">
                    <div class="text-left md-font-size text-bold q-pb-xs">Enter API Name</div>
                    <q-input class="q-pb-md" outlined v-model="keyName"/>

                    <q-btn rounded label="Generate New Key" :color="themeColor" @click="createKey()"/>
                 </div>

                <!-- After Success Generation -->
                 <div v-else>
                    <div v-if="errorMsg" class="text-left q-mb-sm">
                        <div class="row items-center">
                            <q-icon name="error" color="red" size="24px" class="q-mr-sm"/>
                            <div class="text-caption text-red q-ml-sm">{{ errorMsg }}</div>
                        </div>
                    </div>

                    <div v-else>
                        <div class="row items-center q-mb-sm">
                            <q-icon name="check_circle" :color="themeColor" size="32px" class="q-mr-sm"/>
                            <div class="text-left">
                                <div class="text-bold">API Key Generated</div>
                                <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                                    {{ keyData?.name}}
                                </div>
                            </div>
                        </div>

                        <q-input outlined readonly :model-value="keyData?.key" class="q-mb-sm" placeholder="API Key">
                            <template v-slot:append>
                                <q-btn flat round dense icon="content_copy" @click="copyKey"/>
                            </template>
                        </q-input>

                        <div class="text-caption text-amber q-mx-lg" :class="darkMode ? 'text-orange-3' : 'text-orange-9'">
                                The full key will not be displayed again after closing.
                        </div>

                        <q-btn
                            rounded
                            no-caps
                            label="Done"
                            :color="themeColor"
                            class="full-width q-mt-md"
                            @click="$refs.dialog.hide()"
                        />
                    </div>
                 </div>
            </div>
        </q-card>
    </q-dialog>
</template>

<script>
import { copyToClipboard } from 'quasar'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            showCreateKeyDialog: true,
            generating: false,
            keyName: 'Custom API Key',
            keyGenerated: false,
            keyData: null,
            errorMsg: ''
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
    },
    emits: ['hide', 'key-created'],
    methods: {
        closeDialog () {
            setTimeout(() => {
                this.$refs.dialog.hide()
            }, 2500)
        },
        async createKey () {
            const vm = this
            vm.generating = true
            const result = await AIAdminUtils.createAPIKey(vm.keyName)
            vm.generating = false
            if (result.success) {
                vm.keyData = result.data
                vm.keyGenerated = true
                vm.$emit('key-created')  
            } else {
                vm.errorMsg = result.error || "Failed to generate API Key."
            }

        },
        copyKey () {
            if (!this.keyData?.key) return
            copyToClipboard(this.keyData.key)
            this.$q.notify({
                color: 'green',
                message: this.$t('CopiedToClipboard'),
                icon: 'mdi-clipboard-check',
                timeout: 2000
            })
        }
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
</style>