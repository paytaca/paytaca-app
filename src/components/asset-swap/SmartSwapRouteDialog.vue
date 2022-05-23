<template>
  <q-dialog v-model="val">
    <q-card :class="[darkMode ? 'pt-dark' : 'text-black']">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-subtitle1 q-space">Routing</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section>
        <div class="column items-center justify-center q-mb-sm">
          <img
            :src="inputCurrency.image_url"
            height="30"
            style="border-radius:50%"
          >
          <q-item-label>{{ inputCurrency.symbol }}</q-item-label>
        </div>
        <div class="row items-center justify-center q-my-sm">
          <q-icon name="arrow_downward"/>
        </div>

        <q-list style="max-height: 30vh;overflow-y:auto;">
          <q-item
            v-for="(routeGroup, index) in parsedGroupedRoute"
            :key="index"
            :class="[
              'round-borders',
              'q-mb-sm',
              darkMode ? 'pt-dark-card' : 'bg-grey-2',
            ]"
          >
            <q-item-section avatar class="items-center">
              <img
                :src="routeGroup.logo"
                height="30"
                style="border-radius:50%"
              >
              <q-item-label>{{ routeGroup.currency }}</q-item-label>
            </q-item-section>
            <q-item-section top>
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
          <q-icon name="arrow_downward"/>
        </div>    
        <div class="column items-center justify-center">
          <img
            :src="outputCurrency.image_url"
            height="30"
            style="border-radius:50%"
          >
          <q-item-label>{{ outputCurrency.symbol }}</q-item-label>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>

const routeGroupCurrencyLogoMap = {
  BCH: 'bch-logo.png',
  TANGO: 'tango-logo.png',
  flexUSD: 'flexusd-logo.png',
}

export default {
  name: 'SmartSwapRouteDialog',
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    steps: {
      type: Number,
    },
    groupedRoute: {
      type: Object,
    },
    darkMode: {
      type: Boolean,
    },
    inputCurrency: {
      default: () => {
        return {
          symbol: '',
          image_url: '',
        }
      }
    },
    outputCurrency: {
      type: Object,
      default: () => {
        return {
          symbol: '',
          image_url: '',
        }
      }
    },
  },
  data() {
    return {
      val: this.value
    }
  },
  computed: {
    parsedGroupedRoute() {
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
    },
  },
  watch: {
    val() {
      this.$emit('input', this.val)
    },
    value() {
      this.val = this.value
    }
  },
}
</script>