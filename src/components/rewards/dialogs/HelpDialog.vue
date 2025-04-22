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
        <span class="q-ml-sm text-h6">Help</span>
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
        height="60vh"
        transition-prev="slide-right"
        transition-next="slide-left"
        class="pt-card-2 text-subtitle1"
        :class="getDarkModeClass(darkMode)"
        :dark="darkMode"
      >
        <template v-if="page === 'home'">
          <q-carousel-slide name="home-1" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">Welcome to the Rewards Page</h5>
            <div class="row text-left">
              <p>
                Start earning points today!
              </p>
              <p>
                As a valued user, you'll accumulate points for engaging with the Paytaca ecosystem. The more you explore and interact with the ecosystem, the more points you'll earn. These points are directly convertible into either real currency or tokens, rewarding your loyalty and engagement.
              </p>
              <p>
                Get started today and watch your points—and rewards—grow!
              </p>
            </div>
          </q-carousel-slide>

          <q-carousel-slide name="home-2" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">Paytaca Promos</h6>
            <div class="row text-left">
              <p>
                We've designed different promos for each kind of user, each with its own earning potential. Other promos will be added soon.
              </p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        User Rewards
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      Not considered a promo, but a collection of points, called UP (User Points), earned by users from engaging with the different features of the app.
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        Refer-a-friend Promo
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      Promo for referrals. Users who successfully invite friends to use Paytaca with a referral code will receive RP (Referral Points).
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>
        
        <template v-if="page === Promos.USERREWARDS">
          <q-carousel-slide :name="`${Promos.USERREWARDS}-1`" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">Welcome to the User Rewards Page</h5>
            <div class="row text-left">
              User Rewards is a collection of points, called UP (User Points), earned throughout your interaction with the Paytaca app.
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.USERREWARDS}-2`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">Earning User Points</h6>
            <div class="row text-left">
              <p>
                There are 2 ways you can earn UP. Note that points are awarded only after successfully completing the actions.
              </p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        One-time Points
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      These are points you can earn once. Incomplete actions are marked red, while completed actions are marked green. After earning these points, you cannot earn them again.
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        Continuous Points
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      These are points you can earn multiple times, as long as you complete the specified actions.
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.USERREWARDS}-3`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">Redeeming User Points</h6>
            <div class="row text-left">
              <p>
                When redeeming your UP, you can either swap it to BCH or convert it to Paytaca cashtoken. Both actions, if successful, will deduct your points balance and respective converted assets will appear in your wallet.
              </p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        Swap to BCH
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      This action will swap your points to BCH. BCH conversion rate may vary depending on the BCH market value.
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        Convert to Tokens
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      This action will convert your points to Paytaca tokens. Conversion rate is 1 UP = 1 PTC.
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-carousel-slide>
        </template>

        <template v-if="page === Promos.RFPROMO">
          <q-carousel-slide :name="`${Promos.RFPROMO}-1`" class="help-carousel-slide">
            <h5 class="q-ma-xs q-pb-md text-center text-bold">Welcome to the Refer-a-friend (RF) Promo Page</h5>
            <div class="row text-left">
              Refer-a-friend (RF) Promo is built to encourage users to invite friends to use the Paytaca app and explore the Paytaca ecosystem. Referees will earn RP (Referral Points) for each successful referral.
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.RFPROMO}-2`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">Earning Referral Points</h6>
            <div class="row text-left">
              <p>
                To earn RP, refer your friends or other users to use Paytaca.
              </p>
              <p>
                When they create their new wallet, have them scan your referral QR code. After the new user created their wallet and completing their very first transaction, you will receive 5 RFP.
              </p>
              <p>
                There is no limit as to how much RFP you can earn, so refer lots of new users as much as you can!
              </p>
            </div>
          </q-carousel-slide>
          <q-carousel-slide :name="`${Promos.RFPROMO}-3`" class="help-carousel-slide">
            <h6 class="q-ma-xs q-pb-md text-center">Redeeming Referral Points</h6>
            <div class="row text-left">
              <p>
                When redeeming your RP, you can either swap it to BCH or convert it to Paytaca cashtoken. Both actions, if successful, will deduct your points balance and respective converted assets will appear in your wallet.
              </p>
              <p>
                Note that you can only redeem up to 10,000 RP per month.
              </p>
              <q-list class="full-width q-gutter-y-md">
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        Swap to BCH
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      This action will swap your points to BCH. BCH conversion rate may vary depending on the BCH market value.
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="no-padding">
                  <q-item-section>
                    <q-item-label class="q-gutter-x-sm row items-center">
                      <q-icon name="fiber_manual_record" />
                      <span style="font-size: 18px;">
                        Convert to Tokens
                      </span>
                    </q-item-label>
                    <q-item-label class="q-pl-xl">
                      This action will convert your points to Paytaca tokens. Conversion rate is 1 RP = 1 PTC.
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
