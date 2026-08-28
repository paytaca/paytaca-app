<template>
    <div class="text-bow q-pb-md" :class="getDarkModeClass(darkMode)">
        <!-- <div class="row justify-end q-px-lg q-pt-md" v-if="hasSession">
            <q-btn rounded outline no-caps label="Buy Session" :color="themeColor" icon="mdi-timer"/>
        </div> -->

        <!-- Session List -->
        <div class="q-px-lg">
             <div class="text-center q-mt-lg q-pt-lg" v-if="!hasSession">
                <q-icon name="mdi-timer-off" size="75px" class="q-my-md" color="grey"/> 
                <!-- <q-im  g class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" /> -->
                <p :class="{ 'text-black': !darkMode }">{{ $t('NoSessionsToDisplay') }}</p>

                <div class="text-italic text-grey q-pb-md" v-html="$t('CreateSessionDescription')"></div>

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
                 <div class="row justify-between items-center q-pt-md q-pb-lg">
                    <q-btn
                        rounded
                        outline
                        no-caps
                        label="Buy Session"
                        :color="themeColor"
                        icon="mdi-timer"
                        size="md"
                    />
                    <q-btn
                        flat
                        round
                        unelevated
                        ripple
                        dense
                        size="md"
                        icon="filter_list"
                        class="button button-text-primary"
                        padding="none"
                    />

                </div>

                <!-- <q-separator class="q-mb-md"/> -->

                <div v-for="i in 5" :key="i" class="app-row q-mb-sm " :class="getDarkModeClass(darkMode)">
                    <!-- Name + time progress -->
                    <div class="app-info">
                        <div class="app-name" :class="getDarkModeClass(darkMode)">DeepSeek V4 Flash (Budget)</div>
                        <div class="app-desc q-pt-xs" :class="getDarkModeClass(darkMode)">
                            6:15 remaining of 10:00
                        </div>
                        <!-- Progress bar for time usage -->
                        <q-linear-progress
                            :value="0.375"
                            :color="themeColor"
                            size="4px"
                            class="q-mt-xs rounded-borders"
                            style="max-width: 200px;"
                        />
                    </div>

                    
                    <div class="app-row-end">
                        <q-badge rounded outline
                            :color="themeColor"
                            label="active" />
                    </div>
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