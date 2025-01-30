<template>
  <q-dialog
    persistent
    seamless
    class="no-click-outside"
  >
    <q-card class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center">
        <span class="text-bold" style="font-size: 18px;">
          {{ $t('FilterNotifications') }}
        </span>
        <q-space/>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          align="right"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-separator />

      <div class="q-pt-sm">
        <div class="text-weight-bold text-subtitle1">{{ $t('Type') }}</div>
        <div class="q-pt-sm q-ml-sm q-gutter-y-sm q-gutter-x-md">
          <q-badge
            rounded
            color="blue-grey-6"
            class="q-px-sm q-py-xs text-subtitle2"
            :outline="!selectedAll"
            @click="allClicked"
          >
            {{ $t('All') }}
          </q-badge>
          <q-badge
            rounded
            v-for="(type, index) in notifTypesList"
            color="blue-grey-6"
            class="q-px-sm q-py-xs text-subtitle2"
            :outline="!type.selected"
            :key="`choice-${index}`"
            @click="itemClicked(type)"
          >
            {{ type.label }}
          </q-badge>
        </div>
      </div>

      <div class="q-mt-md row items-center justify-evenly">
        <q-btn
          outline
          v-close-popup
          :label="$t('Cancel')"
        />
        <q-btn
          v-close-popup
          :label="$t('Filter')"
          class="button"
          @click="emitFilteredList"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'NotificationsFilterDialog',

  props: {
    notifTypes: { type: Array }
  },

  data () {
    return {
      notifTypesList: [
        {
          value: 'TR',
          label: this.$t('Transactions'),
          selected: false
        },
        {
          value: 'MP',
          label: this.$t('Marketplace'),
          selected: false
        },
        {
          value: 'CB',
          label: this.$t('Cashback'),
          selected: false
        },
        {
          value: 'AH',
          label: 'AnyHedge',
          selected: false
        },
        {
          value: 'RP',
          label: 'P2P Exchange',
          selected: false
        },
        {
          value: 'NF',
          label: this.$t('Collectibles'),
          selected: false
        },
        {
          value: 'EP',
          label: this.$t('EventsAndPromotions'),
          selected: false
        }
      ],

      selectedAll: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  mounted () {
    this.notifTypesList.forEach(item => {
      if (this.notifTypes.includes(item.value)) {
        item.selected = true
      }
    })

    const selectedCount = this.notifTypesList.filter(item => item.selected).length
    this.selectedAll = selectedCount === this.notifTypesList.length
  },

  methods: {
    getDarkModeClass,

    allClicked () {
      this.selectedAll = !this.selectedAll
      this.notifTypesList.forEach(item => {
        item.selected = this.selectedAll
      })
    },
    itemClicked (item) {
      item.selected = !item.selected

      const selectedCount = this.notifTypesList.filter(item => item.selected).length
      this.selectedAll = selectedCount === this.notifTypesList.length
    },
    emitFilteredList () {
      const filteredList = this.notifTypesList
        .filter(item => item.selected)
        .map(item => item.value)

      this.$emit('ok', filteredList)
    }
  }
}
</script>
