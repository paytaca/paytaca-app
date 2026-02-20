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
      class="q-pa-md pt-card-2 text-bow br-15 bottom-card-medium"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row justify-between items-center">
        <span class="q-ml-sm text-h6">{{ $t('Help') }}</span>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="close"
          class="close-button"
          :class="getDarkModeClass(darkMode)"
          v-close-popup
        />
      </div>

      <q-carousel
        v-model="slide"
        swipeable
        animated
        arrows
        height="90%"
        transition-prev="slide-right"
        transition-next="slide-left"
        :control-color="darkMode ? 'white' : 'black'"
        class="pt-card-2 text-subtitle1"
        :class="getDarkModeClass(darkMode)"
        :dark="darkMode"
      >
        <template v-if="page === 'home'">
          <q-carousel-slide name="home-1" class="q-px-xl">
            <div class="q-my-md text-center">
              <q-icon name="stars" size="56px" class="text-primary" />
            </div>
            <h5 class="q-ma-xs q-pb-md text-center text-bold">
              {{ $t('RewardsHelpHome11', 'Welcome to the Rewards Page') }}
            </h5>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpHome12', 'Start earning points today!') }}</p>
              <p>{{ $t('RewardsHelpHome13', "As a valued user, you'll accumulate points for engaging with the Paytaca ecosystem. The more you explore and interact with the ecosystem, the more points you'll earn. These points are directly convertible into LIFT tokens, rewarding your loyalty and engagement.") }}</p>
              <p>{{ $t('RewardsHelpHome14', 'Get started today and watch your points—and rewards—grow!') }}</p>
            </div>
          </q-carousel-slide>

          <q-carousel-slide name="home-2" class="q-px-xl">
            <h6 class="q-ma-xs q-pb-md text-center">
              {{ $t('RewardsHelpHome21', 'Paytaca Promos') }}
            </h6>
            <div class="row text-left q-pb-md">
              <p>{{ $t('RewardsHelpHome22', 'We have designed different promos for each kind of user, each with its own earning potential. Other promos will be added soon.') }}</p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="redeem" size="24px" class="text-primary" />
                      <span style="font-size: 18px;">
                        {{ $t('RewardsHelpHome23', 'User Rewards') }}
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsHelpHome24', 'A collection of points, called UP (User Points), earned by users from engaging with the different features of the app.') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="diversity_3" size="24px" class="text-primary" />
                      <span style="font-size: 18px;">
                        {{ $t('RewardsHelpHome25', 'Refer-a-friend Promo') }}
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      {{ $t('RewardsHelpHome26', 'Promo for referrals. Users who successfully invite friends to use Paytaca with a referral code will receive RP (Referral Points).') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>
        <!--
        <template v-if="page === Promos.USERREWARDS">
          <q-carousel-slide :name="`${Promos.USERREWARDS}-1`" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">{{ $t('RewardsHelpUR11') }}</h5>
            <div class="row text-left">{{ $t('RewardsHelpUR12') }}</div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.USERREWARDS}-2`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsHelpUR21') }}</h6>
            <div class="row text-left">
              <p>{{ $t('RewardsHelpUR22') }}</p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">{{ $t('OneTimePoints') }}</span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      <p>{{ $t('RewardsHelpUR23') }}</p>
                      <p class="no-margin">{{ $t('RewardsHelpUR24') }}</p>
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
                      {{ $t('RewardsHelpUR25') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.USERREWARDS}-3`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsRedeemUP') }}</h6>
            <div class="row text-left">
              <p>
                {{ $t(
                    'RewardsRedeemDyn1', { points: 'UP' },
                    'When redeeming your UP, you can either swap it to BCH or ' +
                    'convert it to Paytaca tokens (PTC). Both actions, if ' +
                    'successful, will deduct your points balance and ' +
                    'respective converted assets will appear in your wallet.'
                  )
                }}
              </p>
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
                      {{ $t(
                          'RewardsRedeemDyn2', { points: 'UP' },
                          'This action will convert your points to Paytaca tokens.' +
                          'Conversion rate is 1 UP = 1 PTC.'
                        )
                      }}
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
            <h6 class="q-ma-xs q-pb-md text-center">{{ $t('RewardsRedeemRP1') }}</h6>
            <div class="row text-left">
              <p>
                {{ $t(
                    'RewardsRedeemDyn1', { points: 'RP' },
                    'When redeeming your RP, you can either swap it to BCH or ' +
                    'convert it to Paytaca tokens (PTC). Both actions, if ' +
                    'successful, will deduct your points balance and ' +
                    'respective converted assets will appear in your wallet.'
                  )
                }}
              </p>
              <p>{{ $t('RewardsRedeemRP2') }}</p>
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
                      {{ $t(
                          'RewardsRedeemDyn2', { points: 'RP' },
                          'This action will convert your points to Paytaca tokens. ' +
                          'Conversion rate is 1 RP = 1 PTC.'
                        )
                      }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>-->
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
