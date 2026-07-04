<template>
  <div class="pt-settings-icon">
    <q-btn flat round class="q-r-mr-sm q-r-mt-sm">
      <q-icon
        :color="darkMode ? 'grad' : undefined"
        name="person"
        size="40px"
      />
      <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 200px;">
        <q-list>
          <q-item style="pointer-events: none;">
            <q-item-section avatar style="min-width:0px;">
              <q-icon name="account_circle" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ username || 'Guest' }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator spaced="xs" />
          <q-item
            clickable v-ripple
            @click="$router.push({ name: 'app-auction-profile' })"
          >
            <q-item-section avatar style="min-width:0px;">
              <q-icon name="person"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>Profile</q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            v-if="!isArbiter"
            clickable v-ripple
            @click="$router.push({ name: 'app-auction-activity' })"
          >
            <q-item-section avatar style="min-width:0px;">
              <q-icon name="receipt"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>Activity</q-item-label>
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
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'AuctionHeaderMenu',
  setup() {
    const $store = useStore()
    const $router = useRouter()
    
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const username = computed(() => $store.getters['auction/username'])
    const isArbiter = computed(() => !!$store.getters['auction/isArbiter'])

    return {
      darkMode,
      username,
      isArbiter,
      getDarkModeClass,
    }
  },
})
</script>