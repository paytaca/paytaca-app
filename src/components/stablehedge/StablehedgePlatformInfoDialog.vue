<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
    position="bottom"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          <!-- {{ $t('Stablehedge') }} -->
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-carousel
        v-model="slide"
        transition-prev="slide-right"
        transition-next="slide-left"
        swipeable
        navigation
        animated
        padding
        control-color="brandblue"
        class="rounded-borders pt-card-2"
        :class="getDarkModeClass(darkMode)"
      >
        <q-carousel-slide name="intro">
          <div class="column" style="min-height:100%;">
            <div class="text-center text-h4 q-mb-lg">Stablehedge</div>
            <div class="row items-center justify-center q-mb-md">
              <img src="assets/img/stablehedge/stablehedge-bch-logo.png" height="100"/>
            </div>
            <div class="text-center text-body1">
              Safeguard your funds from market volatility and access them whenever you need.
            </div>
            <q-space/>
            <div class="text-center">
              Powered by
              <a target="_blank" :href="cashtokensUrl">CashTokens</a> and
              <a target="_blank" :href="bchBullUrl">BCH Bull</a>
            </div>
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="deposit" style="min-height:100%;">
          <div class="text-h5 q-mb-md">Freeze BCH</div>
          <div class="text-body1 text-center q-mb-md">
            Freeze your BCH to maintain it's value against constant price changes
          </div>
          <div class="q-my-xl text-center">
            <q-icon name="ac_unit" size="75px"/>
          </div>
          <div class="text-center text-body2" style="line-height:1.2;">
            Exchange BCH and receive a stablehedge tokens of equal value based on the
            market price at the time of transaction
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="redeem">
          <div class="text-h5 q-mb-md">Unfreeze BCH</div>
          <div class="text-body1 text-center q-mb-md">
            Redeem back a part or all of your frozen BCH to use your funds again
          </div>
          <div class="q-my-xl text-center">
            <q-icon name="wb_sunny" size="75px"/>
          </div>
          <div class="text-center text-body2" style="line-height:1.2;">
            Exchange stablehedge tokens and receive BCH of equal value based on the
            market price at the time of transaction
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="how-it-works--contract">
          <div class="text-h4 q-mb-sm">How it works</div>
          <div class="q-space q-gutter-sm q-pb-xl" style="overflow-y:auto;">
            <div class="text-h6">Contracts</div>
            <div>
              Stabledge uses
              <a target="_blank" :href="cashscriptUrl">CashScript</a>
              smart contracts to store your funds and ensure that exchanged assets
              within transactions are correct
            </div>
  
            <div>
              The exchanged amounts are calculated based on the price values taken from
              <a target="_blank" :href="priceOraclesUrl">price oracles</a>
            </div>
          </div>
        </q-carousel-slide>

        <q-carousel-slide name="how-it-works--freeze-unfreeze">
          <div class="text-h4 q-mb-sm">How it works</div>
          <div class="q-space q-gutter-sm q-pb-xl" style="overflow-y:auto;">
            <div class="text-h6">Freeze</div>
            <div>
              Exchange BCH and receive a stablehedge tokens of equal value based on the
              market price at the time of transaction
            </div>

            <div class="text-subtitle1">Example:</div>
            <div class="q-my-md row items-center q-px-md">
              <div class="row items-center justify-center no-wrap">
                <div class="text-center">
                  <img src="bch-logo.png" height="25"/>
                  <div style="line-height:1;">5 BCH</div>
                </div>
                <q-icon name="east" class="text-h6 text-weight-medium q-mx-md"/>
                <div class="text-center">
                  <img src="ct-logo.png" height="25"/>
                  <div style="line-height:1;">50 TOKEN</div>
                </div>
              </div>
              <div class="text-right text-body2 q-space q-py-sm">at 5 TOKEN/BCH</div>
            </div>

            <q-separator spaced/>

            <div class="text-h6">Unfreeze</div>
            <div>
              Exchange stablehedge tokens and receive BCH of equal value based on the
              market price at the time of transaction
            </div>
            <div class="text-subtitle1">Example:</div>
            <div class="q-my-md row items-center q-px-md">
              <div class="row items-center justify-center no-wrap">
                <div class="text-center">
                  <img src="bch-logo.png" height="25"/>
                  <div style="line-height:1;">50 BCH</div>
                </div>
                <q-icon name="east" class="text-h6 text-weight-medium q-mx-md"/>
                <div class="text-center">
                  <img src="ct-logo.png" height="25"/>
                  <div style="line-height:1;">10 BCH</div>
                </div>
              </div>
              <div class="text-right text-body2 q-space">at 10 TOKEN/BCH</div>
            </div>
          </div>
        </q-carousel-slide>

        <q-carousel-slide name="how-it-works">
          <div class="column no-wrap" style="height:100%;">
            <div class="text-h4 q-mb-sm">How it works</div>
            <div class="q-space q-gutter-sm q-pb-xl" style="overflow-y:auto;">
              <div class="text-h6">Maintaining liquidity</div>
              <div>
                A part of your frozen funds are pooled with other users and
                locked in a leveraged short contract in
                <a target="_blank" :href="bchBullUrl">BCH Bull</a>
                to protect against price drops
              </div>
              <div>
                the remaining funds are kept in the smart contract to be used as
                liquidty for unfreezing BCH
              </div>
            </div>
          </div>
        </q-carousel-slide>
      </q-carousel>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'
export default defineComponent({
  name: 'StablehedgePlatformInfoDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
  },
  setup(props, { emit: $emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const slide = ref('intro')

    const cashtokensUrl = 'https://cashtokens.org/'
    const cashscriptUrl = 'https://cashscript.org/'
    const bchBullUrl = 'https://bchbull.com/'
    const priceOraclesUrl = 'https://oracles.cash'

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      slide,

      cashtokensUrl,
      cashscriptUrl,
      bchBullUrl,
      priceOraclesUrl,
    }
  }
})
</script>
