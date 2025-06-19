<template>
  <div class="row text-body1 justify-evenly" id="filter">
    <sale-group-chip
      :saleGroup="'all'"
      :outline="isChipOutline('all')"
      @click="filterRsvpList('all')"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.SEED"
      :outline="isChipOutline(SaleGroup.SEED)"
      @click="filterRsvpList(SaleGroup.SEED)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PRIVATE"
      :outline="isChipOutline(SaleGroup.PRIVATE)"
      @click="filterRsvpList(SaleGroup.PRIVATE)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PUBLIC"
      :outline="isChipOutline(SaleGroup.PUBLIC)"
      @click="filterRsvpList(SaleGroup.PUBLIC)"
    />
  </div>

  <q-separator spaced />

  <template v-if="finalRsvpList?.length === 0">
    <div class="row full-width flex-center text-center q-mt-md text-h5">
      <span class="q-mb-md">You don't have any reservations yet.</span>
      <span class="q-mb-sm">Don't miss out on the whitelisting opportunity!</span>
      <span>Visit the <a href="https://www.paytaca.com/token" target="_blank">LIFT token website</a> to learn more.</span>
    </div>
  </template>

  <template v-else>
    <q-scroll-area :style="`height: ${scrollAreaHeight}; width: 100%`">
      <div class="row q-pt-sm q-pb-md q-px-sm q-gutter-y-md">
        <q-card
          v-for="(rsvp, index) in finalRsvpList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="row col-12 q-mb-xs justify-between items-center">
            <div class="col-6">
              <span class="row col-12 text-body1 text-bold">
                {{ parseLiftToken(rsvp.reserved_amount_tkn) }}
              </span>
              <div class="row col-12 text-subtitle2 items-center">
                <span v-if="rsvp.discounted_amount > 0" class="q-pr-xs">
                  {{ parseFiatCurrency(rsvp.discounted_amount, 'USD') }}
                </span>
                <span v-else class="q-pr-xs">
                  {{ parseFiatCurrency(rsvp.reserved_amount_usd, 'USD') }}
                </span>
                <template v-if="rsvp.discount > 0">
                  <q-icon name="info" size="1em"/>
                  <q-menu
                    touch-position
                    class="pt-card text-bow q-py-sm q-px-md br-15"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <div class="row items-center q-gutter-sm">
                      <div class="q-space">
                        You have a {{ parseFiatCurrency(rsvp.reserved_amount_usd - rsvp.discounted_amount, 'USD') }} discount
                      </div>
                    </div>
                  </q-menu>
                </template>
              </div>
            </div>
            <div class="row col-6 justify-end">
              <sale-group-chip
                :saleGroup="rsvp.sale_group"
                @click="filterRsvpList(rsvp.sale_group)"
              />
            </div>
          </div>

          <div
            class="row col-12 justify-between text-subtitle2"
            style="line-height: 1.2em;"
          >
            <span class="col-6" style="overflow-wrap: anywhere;">
              {{ parseBchAddress(rsvp.bch_address) }}
            </span>
            <span class="col-6 text-right">
              Approved last {{ parseLocaleDate(rsvp.approved_date) }}
            </span>
          </div>

          <div class="row col-12 justify-center q-mt-md q-mb-xs">
            <q-btn
              label="Purchase"
              class="button"
              @click="openPayReservationDialog(rsvp)"
            />
          </div>
        </q-card>
      </div>
    </q-scroll-area>
  </template>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { parseLocaleDate, parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { SaleGroup } from 'src/utils/engagementhub-utils/lift-token'
import { getMnemonic, Wallet } from 'src/wallet'

import SaleGroupChip from 'src/components/lift-token/SaleGroupChip.vue'
import PayReservationDialog from 'src/components/lift-token/dialogs/PayReservationDialog.vue'

export default {
  name: 'ReservationsTabPanel',

  props: {
    reservationsList: { type: Array, default: null },
    liftSwapContractAddress: { type: String, default: null }
  },

  emits: ['on-successful-purchase'],

  components: {
    SaleGroupChip
  },

  data () {
    return {
      SaleGroup,

      finalRsvpList: [],

      wallet: null,
      selectedFilter: 'all',
      scrollAreaHeight: '63vh'
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    parseFiatCurrency,
    parseLocaleDate,
    parseLiftToken,

    async initWallet () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new Wallet(mnemonic, 'BCH')
      this.wallet = markRaw(wallet)
    },
    filterRsvpList (saleGroup) {
      this.selectedFilter = saleGroup
      if (saleGroup === 'all') {
        this.finalRsvpList = this.reservationsList
      } else {
        this.finalRsvpList = this.reservationsList.filter(
          a => a.sale_group === saleGroup
        )
      }
    },
    parseBchAddress (address) {
      const addLen = address.length
      return `${address.substring(0, 17)}...${address.substring(addLen - 7, addLen)}`
    },
    isChipOutline (saleGroup) {
      if (this.selectedFilter === 'all') return false
      return saleGroup !== this.selectedFilter
    },
    openPayReservationDialog (rsvp) {
      this.$q.dialog({
        component: PayReservationDialog,
        componentProps: {
          rsvp,
          wallet: this.wallet,
          liftSwapContractAddress: this.liftSwapContractAddress
        }
      })
        .onOk(() => {
          this.$q.notify({
            type: 'positive',
            timeout: 3000,
            message: 'Purchase processed successfully.'
          })
          this.$emit('on-successful-purchase')
        })
    }
  },

  async mounted () {
    this.finalRsvpList = this.reservationsList

    const headerNavHeight = document.getElementById('header-nav')?.clientHeight
    const sectionTabHeight = document.getElementById('section-tab')?.clientHeight
    const filterHeight = document.getElementById('filter')?.clientHeight

    const divsHeight = headerNavHeight + sectionTabHeight + filterHeight
    const screenHeight = this.$q.screen.height
    this.scrollAreaHeight = `${screenHeight - divsHeight - 35}px`

    await this.initWallet()
  }
}
</script>