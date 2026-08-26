<template>
    <q-dialog ref="dialog" full-width persistent v-model="showCreateKeyDialog">
        <q-card class="q-pa-md br-15 pt-card text-bow text-center">
            <div class="row justify-center q-pb-md" >
                <q-spinner :color="themeColor" size="75px" :thickness="5"/>
            </div>

            Generating API Keys
        </q-card>
    </q-dialog>
</template>

<script>

export default {
    data () {
        return {
            showCreateKeyDialog: true
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
    mounted () {
        const vm = this

        vm.closeDialog()
    },
    methods: {
        closeDialog () {
            setTimeout(() => {
                this.$refs.dialog.hide()
            }, 2500)
        }
    }
}
</script>