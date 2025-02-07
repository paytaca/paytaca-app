<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
    position="bottom"
  >
    <q-card
      class="br-15 pt-card-2 text-bow bottom-card-medium q-px-md q-pt-lg"
      :class="getDarkModeClass(darkMode)"
    >
      <q-carousel
        ref="carousel"
        v-model="slide"
        transition-prev="slide-right"
        transition-next="slide-left"
        swipeable
        arrows
        animated
        padding
        control-color="brandblue"
        class="rounded-borders pt-card-2"
        :class="getDarkModeClass(darkMode)"
      >
        <q-carousel-slide name="intro">
          <div class="column" style="min-height:100%;">
            <div class="text-center text-h4 q-mb-lg">StableHedge</div>
            <div class="row items-center justify-center q-mb-md">
              <img src="assets/img/stablehedge/stablehedge-bch.svg" height="150"/>
            </div>
            <div class="text-center text-body1">
              {{ $t('StablehedgeIntroText') }}
            </div>
            <q-space/>
            <div class="text-center" v-html="introBottomText">
            </div>
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="deposit" style="min-height:100%;">
          <div class="text-h5 q-mb-md">{{ $t('Freeze') }} BCH</div>
          <div class="text-body1 text-center q-mb-md">
            {{ $t('StablehedgeFreezeShortDesc1') }}
          </div>
          <div class="q-my-xl text-center">
            <q-icon name="ac_unit" size="75px"/>
          </div>
          <div class="text-center text-body2" style="line-height:1.2;">
            {{ $t('StablehedgeFreezeShortDesc2') }}
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="redeem">
          <div class="text-h5 q-mb-md">{{ $t('Unfreeze') }} BCH</div>
          <div class="text-body1 text-center q-mb-md">
            {{ $t('StablehedgeUnfreezeShortDesc1') }}
          </div>
          <div class="q-my-xl text-center">
            <q-icon name="wb_sunny" size="75px"/>
          </div>
          <div class="text-center text-body2" style="line-height:1.2;">
            {{ $t('StablehedgeUnfreezeShortDesc2') }}
          </div>
        </q-carousel-slide>
        <q-carousel-slide name="how-it-works--contract">
          <div class="text-h4 q-mb-sm">{{ $t('HowItWorks') }}</div>
          <div class="q-space q-gutter-sm q-pb-xl" style="overflow-y:auto;">
            <div class="text-h6">{{ $t('Contract') }}</div>
            <div v-html="contractDesc1"></div>
            <div v-html="contractDesc2"></div>
          </div>
        </q-carousel-slide>

        <q-carousel-slide name="how-it-works--freeze-unfreeze">
          <div class="text-h4 q-mb-sm">{{ $t('HowItWorks') }}</div>
          <div class="q-space q-gutter-sm q-pb-xl" style="overflow-y:auto;">
            <div class="text-h6">{{ $t('Freeze') }}</div>
            <div>
              {{ $t('StablehedgeFreezeDesc') }}
            </div>

            <div class="text-subtitle1">{{ $t('Example') }}:</div>
            <div class="q-my-md row items-center justify-around q-px-md">
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
              <div class="text-right text-body2 q-space q-my-sm">at 5 TOKEN/BCH</div>
            </div>

            <q-separator spaced/>

            <div class="text-h6">{{ $t('Unfreeze') }}</div>
            <div>
              {{ $t('StablehedgeUnFreezeDesc') }}
            </div>
            <div class="text-subtitle1">{{ $t('Example') }}:</div>
            <div class="q-my-md row items-center justify-between q-px-md">
              <div class="row items-center justify-center no-wrap">
                <div class="text-center">
                  <img src="ct-logo.png" height="25"/>
                  <div style="line-height:1;">10 TOKEN</div>
                </div>
                <q-icon name="east" class="text-h6 text-weight-medium q-mx-md"/>
                <div class="text-center">
                  <img src="bch-logo.png" height="25"/>
                  <div style="line-height:1;">50 BCH</div>
                </div>
              </div>
              <div class="text-right text-body2 q-space q-my-sm">at 10 TOKEN/BCH</div>
            </div>
          </div>
        </q-carousel-slide>

        <q-carousel-slide name="how-it-works--liquidity">
          <div class="column no-wrap" style="height:100%;">
            <div class="text-h4 q-mb-sm">{{ $t('HowItWorks') }}</div>
            <div class="q-space q-gutter-sm q-pb-xl" style="overflow-y:auto;">
              <div class="text-h6">{{ $t('MaintainingLiquidity') }}</div>
              <div v-html="liquidityDesc1">
              </div>
              <div>
                {{ $t('StablehedgeLiquidityDesc2') }}
              </div>
            </div>
          </div>
        </q-carousel-slide>
      </q-carousel>
      <div class="q-pa-md">
        <q-btn
          color="brandblue"
          no-caps :label="isLastSlide ? $t('Close') : $t('Next')"
          class="full-width"
          @click="() => isLastSlide ? innerVal = false : carousel?.next?.()"
        />
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n';
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
    const { t: $t } = useI18n();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const carousel = ref()
    const slide = ref('intro')
    const isLastSlide = computed(() => slide.value === 'how-it-works--liquidity')
    watch(innerVal, () => {
      if (innerVal.value) slide.value = 'intro'
    })

    const cashtokensUrl = 'https://cashtokens.org/'
    const cashscriptUrl = 'https://cashscript.org/'
    const bchBullUrl = 'https://bchbull.com/'
    const priceOraclesUrl = 'https://oracles.cash'

    function linkTag(link, text) {
      return `<a href="${link}" target="_blank">${text}</a>`
    }
    const introBottomText = computed(() => {
      const ctLink = linkTag(cashtokensUrl, 'CashTokens');
      const BCHBullLink = linkTag(bchBullUrl, 'BCH Bull');
      return $t('StablehedgeIntroBottom', { ctLink, BCHBullLink })
    })

    const contractDesc1 = computed(() => {
      const cashscriptLink = linkTag(cashscriptUrl, 'CashScript');
      return $t('StablehedgeContractDesc1', { cashscriptLink })
    }) 
    const contractDesc2 = computed(() => {
      const priceOracleLink = linkTag(priceOraclesUrl, 'PriceOracle');
      return $t('StablehedgeContractDesc2', { priceOracleLink })
    }) 

    const liquidityDesc1 = computed(() => {
      const BCHBullLink = linkTag(bchBullUrl, 'BCH Bull');
      return $t('StablehedgeLiquidityDesc1', { BCHBullLink })
    })

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      carousel,
      slide,
      isLastSlide,

      cashtokensUrl,
      cashscriptUrl,
      bchBullUrl,
      priceOraclesUrl,

      introBottomText,
      contractDesc1,
      contractDesc2,

      liquidityDesc1,
    }
  }
})
</script>
