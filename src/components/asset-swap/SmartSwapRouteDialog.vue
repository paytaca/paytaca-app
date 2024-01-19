<template>
  <q-dialog v-model="val" persistent seamless>
    <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-subtitle1 q-space q-pt-sm text-section" :class="{'text-blue-5': darkMode}">{{ $t('Routing') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          class="close-button"
        />
      </div>
      <q-card-section>
        <div class="column items-center justify-center q-mb-sm">
          <img
            :src="inputCurrency.image_url"
            height="30"
            style="border-radius:50%"
            alt=""
          >
          <q-item-label class="q-mt-sm">{{ inputCurrency.symbol }}</q-item-label>
        </div>
        <div class="row items-center justify-center q-my-sm">
          <q-icon name="arrow_downward" :color="darkMode ? 'grey': ''" />
        </div>

        <q-list style="max-height: 30vh;overflow-y:auto;">
          <q-item
            v-for="(routeGroup, index) in parsedGroupedRoute"
            class="br-15 q-mb-sm pt-card-2"
            :key="index"
            :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
          >
            <q-item-section avatar class="items-center">
              <img
                :src="routeGroup.logo"
                height="30"
                style="border-radius:50%"
                alt=""
              >
              <q-item-label class="q-mt-sm">{{ routeGroup.currency }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label
                v-for="(route, index1) in routeGroup.routes"
                :key="index + '-' + index1"
              >
                {{ route.exchange }}:
                {{ route.percentage }}%
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="row items-center justify-center q-my-sm">
          <q-icon name="arrow_downward" :color="darkMode ? 'grey': ''" />
        </div>
        <div class="column items-center justify-center">
          <img
            :src="outputCurrency.image_url"
            height="30"
            style="border-radius:50%"
            alt=""
          >
          <q-item-label class="q-mt-sm">{{ outputCurrency.symbol }}</q-item-label>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const routeGroupCurrencyLogoMap = {
  BCH: 'bch-logo.png',
  TANGO: 'tango-logo.png',
  flexUSD: 'flexusd-logo.png'
}

export default {
  name: 'SmartSwapRouteDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    steps: {
      type: Number
    },
    groupedRoute: {
      type: Object
    },
    darkMode: {
      type: Boolean
    },
    inputCurrency: {
      default: () => {
        return {
          symbol: '',
          image_url: ''
        }
      }
    },
    outputCurrency: {
      type: Object,
      default: () => {
        return {
          symbol: '',
          image_url: ''
        }
      }
    }
  },
  data () {
    return {
      val: this.modelValue
    }
  },
  computed: {
    parsedGroupedRoute () {
      if (!this.groupedRoute) return []

      return Object.entries(this.groupedRoute)
        .map(entry => {
          if (!Array.isArray(entry)) return
          if (!Array.isArray(entry[1])) return

          let currency = entry[0]
          let logo = routeGroupCurrencyLogoMap[entry[0]]
          if (entry[0] === 'DIRECT_SWAP') {
            currency = this.outputCurrency && this.outputCurrency.symbol || ''
            logo = this.outputCurrency && this.outputCurrency.image_url || ''
          }

          return {
            currency: currency,
            logo: logo,
            routes: entry[1]
          }
        })
        .filter(Boolean)
    }
  },
  watch: {
    val () {
      this.$emit('update:modelValue', this.val)
    },
    modelValue () {
      this.val = this.modelValue
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>
