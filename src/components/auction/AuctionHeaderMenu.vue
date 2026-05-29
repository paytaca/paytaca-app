<template>
  <div class="pt-settings-icon">
    <q-btn flat round class="q-r-mr-sm q-r-mt-sm">
      <q-icon
        :color="darkMode ? 'grad' : undefined"
        name="person"
        size="40px"
      />
      <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <q-list>
          <q-item>
            <q-item-section avatar style="min-width:0px;">
              <q-icon name="person"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>Profile</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar style="min-width:0px;">
              <q-icon name="receipt"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>Bids and Auctions</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, defineComponent } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'AuctionHeaderMenu',
  setup() {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    // const customer = computed(() => $store.getters['marketplace/customer'])

    return {
      darkMode,

    //   customer,
      getDarkModeClass,
    }
  },
})
</script>
