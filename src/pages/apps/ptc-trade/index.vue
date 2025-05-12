<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="'PTC Trade'"
    />

    <div
      class="row q-mx-lg q-gutter-y-md"
      style="font-size: 18px; margin-top: -20px;"
    >
      <template v-if="isLoading">
        <div class="q-mt-xl q-pt-xl row flex-center text-center text-h5 full-width">
          <span class="q-mb-md col-12 text-bow" :class="getDarkModeClass(darkMode)">
            Retrieving contracts ...
          </span>
          <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
        </div>
      </template>

      <template v-else>
        <q-tabs
          v-model="saleTab"
          class="col-12"
          :indicator-color="isNotDefaultTheme(theme) ? 'transparent' : ''"
        >
          <q-tab
            name="seed"
            :label="'Seed Sale'"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
            :disable="isCreatingContract"
          />
          <q-tab
            name="priv"
            :label="'Private Sale'"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
            :disable="isCreatingContract"
          />
        </q-tabs>

        <q-tab-panels
          animated
          v-model="saleTab"
          style="background-color: transparent;"
          class="row full-width full-height text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          <q-tab-panel name="seed" style="padding: 5px 0;">
            <template v-if="seedSaleContract">
              contract yey
            </template>

            <template v-else>
              <div class="q-mt-md q-px-sm row flex-center text-center">
                <template v-if="isCreatingContract">
                  <span class="q-mb-md col-12 text-bow" :class="getDarkModeClass(darkMode)">
                    Creating seed sale contract ...
                  </span>
                  <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
                </template>

                <template v-else>
                  <span class="q-pb-md col-12">
                    You don't have a seed sale contract yet. Click the button below to generate one.
                  </span>
                  <q-btn
                    label="Generate Contract"
                    class="button"
                    @click="createSaleContract('seed')"
                  />
                </template>
              </div>
            </template>
          </q-tab-panel>

          <q-tab-panel name="priv" style="padding: 5px 0;">
            <template v-if="privSaleContract">
              contract yey
            </template>

            <template v-else>
              <div class="q-mt-md q-px-sm row flex-center text-center">
                <template v-if="isCreatingContract">
                  <span class="q-mb-md col-12 text-bow" :class="getDarkModeClass(darkMode)">
                    Creating private sale contract ...
                  </span>
                  <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
                </template>

                <template v-else>
                  <span class="q-pb-md col-12">
                    You don't have a private sale contract yet. Click the button below to generate one.
                  </span>
                  <q-btn
                    label="Generate Contract"
                    class="button"
                    @click="createSaleContract('priv')"
                  />
                </template>
              </div>
            </template>
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { createSaleContractApi, getPtcTradeData } from 'src/utils/engagementhub-utils/ptc-trade'

import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { raiseNotifyError } from 'src/utils/send-page-utils'

export default {
  name: 'PTCTradePage',

  components: {
    HeaderNav,
    ProgressLoader
  },

  data () {
    return {
      seedSaleContract: null,
      privSaleContract: null,

      isLoading: false,
      isCreatingContract: false,

      saleTab: 'seed'
    }
  },

  async mounted () {
    this.isLoading = true

    await getPtcTradeData()
      .then(data => { this.parseData(data) })

    this.isLoading = false
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,

    async createSaleContract (saleGroup) {
      this.isCreatingContract = true

      await createSaleContractApi(saleGroup)
        .then(data => { this.parseData(data) })

      this.isCreatingContract = false
    },
    parseData (data) {
      if (data) {
        if (data.seed_contract_ct_address) {
          this.seedSaleContract = {
            ctAddress: data.seed_contract_ct_address,
            dateCreated: data.seed_contract_created
          }
        }
      } else {
        raiseNotifyError('Unable to create your contract. Please try again later.')
      }
    }
  }
}
</script>