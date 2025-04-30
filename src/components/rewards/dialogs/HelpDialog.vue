<template>
  <q-dialog
    persistent
    seamless
    full-width
    position="bottom"
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card-2 text-bow br-15"
      style="height: 70vh;"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row justify-between items-center">
        <span class="q-ml-sm text-h6">{{ $t('Help') }}</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-carousel
        v-model="slide"
        swipeable
        animated
        arrows
        height="58vh"
        transition-prev="slide-right"
        transition-next="slide-left"
        :control-color="darkMode ? 'white' : 'black'"
        class="pt-card-2 text-subtitle1"
        :class="getDarkModeClass(darkMode)"
        :dark="darkMode"
      >
        <template v-if="page === 'home'">
          <q-carousel-slide name="home-1" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">{{ $t('RewardsHelpHome11') }}</h5>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpHome12') }}</p>
              <p>{{ $t('RewardsHelpHome13') }}</p>
              <p>{{ $t('RewardsHelpHome14') }}</p>
            </div>
          </q-carousel-slide>

          <q-carousel-slide name="home-2" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsHelpHome21') }}</h6>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpHome22') }}</p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('RewardsHelpHome23') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsHelpHome24') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('RewardsHelpHome25') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsHelpHome26') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>
        
        <template v-if="page === Promos.USERREWARDS">
          <q-carousel-slide :name="`${Promos.USERREWARDS}-1`" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">{{ $t('RewardsHelpUR11') }}</h5>
            <div class="row text-left">{{ $t('RewardsHelpUR12') }}</div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.USERREWARDS}-2`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsHelpUR11') }}</h6>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpUR12') }}</p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('OneTimePoints') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      <p>{{ $t('RewardsHelpUR13') }}</p>
                      <p class="no-margin">{{ $t('RewardsHelpUR14') }}</p>
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('ContinuousPoints') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsHelpUR15') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.USERREWARDS}-3`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsRedeem1') }}</h6>
            <div class="row text-left">
              <p>{{ $t('RewardsRedeem2') }}</p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('RewardsRedeem3') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsRedeem4') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('RewardsRedeem5') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsRedeem6') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>

        <template v-if="page === Promos.RFPROMO">
          <q-carousel-slide :name="`${Promos.RFPROMO}-1`" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">{{ $t('RewardsHelpRFP11') }}</h5>
            <div class="row text-left">{{ $t('RewardsHelpRFP12') }}</div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.RFPROMO}-2`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsHelpRFP21') }}</h6>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpRFP22') }}</p>
              <p>{{ $t('RewardsHelpRFP23') }}</p>
              <p>{{ $t('RewardsHelpRFP24') }}</p>
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.RFPROMO}-3`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsRedeem1') }}</h6>
            <div class="row text-left">
              <p>{{ $t('RewardsRedeem2') }}</p>
              <p>{{ $t('RewardsRedeemRP') }}</p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('RewardsRedeem3') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsRedeem4') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('RewardsRedeem5') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsRedeem6') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>
      </q-carousel>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Promos } from 'src/utils/engagementhub-utils/rewards'

export default {
  name: 'HelpDialog',

  props: {
    page: { type: String, default: 'home' }
  },

  data () {
    return {
      Promos,
      slide: 'home-1'
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  mounted () {
    this.slide = `${this.page}-1`
  },

  methods: {
    getDarkModeClass
  }
}
</script>

<style lang="scss" scoped>
.help-carousel-slide {
  padding-left: 50px;
  padding-right: 50px;
}
</style>
