<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
        <h1>Sessions</h1>
    </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
        }
    },
    methods: {
        getDarkModeClass,
    }
}
</script>

<style lang="scss" scoped>

</style>