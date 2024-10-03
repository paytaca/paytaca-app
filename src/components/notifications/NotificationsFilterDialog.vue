<template>
  <q-dialog persistent>
    <q-card class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center">
        <span class="text-bold" style="font-size: 18px;">
          Filter Notifications
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
        <div class="text-weight-bold text-subtitle1">Type</div>
        <div class="q-pt-sm q-ml-sm q-gutter-y-sm q-gutter-x-md">
          <q-badge
            rounded
            color="blue-grey-6"
            class="q-px-sm q-py-xs text-subtitle2"
            :outline="!selectedAll"
            @click="allClicked"
          >
            All
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
          label="Cancel"
        />
        <q-btn
          v-close-popup
          label="Filter"
          class="button"
          @click="$emit('ok', notifTypesList)"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'NotificationsFilterDialog',

  data () {
    return {
      notifTypesList: [
        {
          label: 'General',
          selected: true
        },
        {
          label: 'Transactions',
          selected: true
        },
        {
          label: 'Marketplace',
          selected: true
        },
        {
          label: 'Cashback',
          selected: true
        },
        {
          label: 'AnyHedge',
          selected: true
        },
        {
          label: 'Ramp P2P',
          selected: true
        },
        {
          label: 'Gifts',
          selected: true
        }
      ],

      selectedAll: true
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
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
    }
  }
}
</script>
