<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
        <div class="row justify-center q-px-lg q-py-lg" v-if="hasSession">
            <q-btn rounded outline no-caps label="Buy Session" :color="themeColor" icon="mdi-timer"/>
        </div>

        <!-- Session List -->
        <div class="q-px-lg">
             <div class="text-center q-mt-lg q-pt-lg" v-if="!hasSession">
                <q-icon name="mdi-timer-off" size="75px" class="q-my-md" color="grey"/> 
                <!-- <q-im  g class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" /> -->
                <p :class="{ 'text-black': !darkMode }">{{ $t('NoAPIKeysToDisplay') }}</p>

                <div class="text-italic text-grey q-pb-md" v-html="$t('CreateAPIKeyDescription')"></div>

                <q-btn 
                    rounded 
                    outline 
                    no-caps 
                    label="Buy Session" 
                    :color="themeColor" 
                    icon="mdi-timer"
                />
            </div>

            <div v-else>
                 <div class="row justify-between">
                    <div class="q-pt-md lg-font-size text-italic text-weight-bold q-py-sm" :class="darkMode ? '' : 'text-grey-8'">Sessions</div>
                    <!-- <FilterBtn v-if="!initialLoading" :filters="filters" :services="services" @submit-data="filterOrder"/>	 -->
                    <q-btn flat round unelevated ripple dense size="md" icon="filter_list" class="button button-text-primary" padding="none"/>
                </div>

                <q-separator/>

                <div v-for="i in 5" :key="i">
                    <div class="q-my-md q-mx-sm">
                        Hello World
                    </div>
                    
                    <q-separator/>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            sessions: []
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
            // return this.sessions.length > 0
            return true
        }
    },
    methods: {
        getDarkModeClass,
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